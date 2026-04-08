import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { streamChat } from "@/lib/ai-stream";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

interface AIChatProps {
  chatType: "sport" | "psychologist" | "general";
  sportContext?: string;
  onStressScore?: (score: number) => void;
}

export default function AIChat({ chatType, sportContext, onStressScore }: AIChatProps) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load previous messages
  useEffect(() => {
    if (!user) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .eq("chat_type", chatType)
        .eq("sport_context", sportContext || "")
        .order("created_at", { ascending: true })
        .limit(50);
      if (data && data.length > 0) {
        setMessages(data.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
      }
    };
    loadMessages();
  }, [user, chatType, sportContext]);

  const saveMessage = async (role: string, content: string) => {
    if (!user) return;
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      chat_type: chatType,
      sport_context: sportContext || "",
      role,
      content,
    });
  };

  const checkStressScore = (text: string) => {
    const match = text.match(/\[STRESS_SCORE:(\d+)\]/);
    if (match) {
      const score = parseInt(match[1], 10);
      onStressScore?.(score);
      return score;
    }
    return null;
  };

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    await saveMessage("user", userMsg.content);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        chatType,
        sportContext,
        language: lang,
        onDelta: upsertAssistant,
        onDone: async () => {
          setIsLoading(false);
          await saveMessage("assistant", assistantSoFar);
          const score = checkStressScore(assistantSoFar);
          if (score !== null && user) {
            // Save stress score to DB
            const { data: athlete } = await supabase
              .from("athletes")
              .select("id")
              .eq("user_id", user.id)
              .single();
            if (athlete) {
              await supabase.from("stress_scores").insert({
                athlete_id: athlete.id,
                score,
                notes: `AI assessment - ${new Date().toISOString()}`,
              });
              await supabase
                .from("athletes")
                .update({ stress_level: score })
                .eq("user_id", user.id);
            }
          }
        },
      });
    } catch (e: any) {
      setIsLoading(false);
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${e.message}` }]);
    }
  };

  const welcomeMsg = chatType === "psychologist"
    ? (lang === "ru" ? "Здравствуйте! Я ваш спортивный психолог. Как вы себя чувствуете сегодня?" : lang === "en" ? "Hello! I'm your sports psychologist. How are you feeling today?" : "Salom! Men sizning sport psixologingizman. Bugun o'zingizni qanday his qilyapsiz?")
    : (lang === "ru" ? `Спросите меня о ${sportContext || "спорте"}!` : lang === "en" ? `Ask me about ${sportContext || "sports"}!` : `${sportContext || "sport"} haqida so'rang!`);

  return (
    <div className="flex flex-col h-[500px] glass-card rounded-xl overflow-hidden">
      <div className="bg-primary/10 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-display font-semibold text-foreground text-sm">
            {chatType === "psychologist" ? (lang === "ru" ? "Психолог AI" : "Psixolog AI") : `${sportContext || "Sport"} AI`}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">{welcomeMsg}</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && <Bot className="h-6 w-6 text-primary mt-1 shrink-0" />}
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === "user" 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-foreground"
            }`}>
              {msg.content}
            </div>
            {msg.role === "user" && <User className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <Bot className="h-6 w-6 text-primary mt-1" />
            <div className="bg-secondary rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={lang === "ru" ? "Напишите сообщение..." : "Xabar yozing..."}
          className="bg-secondary border-border"
          disabled={isLoading}
        />
        <Button variant="ember" size="icon" onClick={send} disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
