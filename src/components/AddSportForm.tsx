import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddSportFormProps {
  onAdded: () => void;
}

export default function AddSportForm({ onAdded }: AddSportFormProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [sportName, setSportName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!sportName.trim() || !user) return;
    setLoading(true);

    try {
      // Validate sport via AI
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Is "${sportName}" a real sport? Reply ONLY with JSON: {"valid": true/false, "name": "official name"}` }],
          chatType: "validate_sport",
          language: "en",
        }),
      });

      if (!resp.ok) throw new Error("Validation failed");

      // Read non-streaming response (collect all SSE data)
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {}
        }
      }

      // Try to parse the JSON from AI response
      const jsonMatch = fullText.match(/\{[^}]+\}/);
      if (!jsonMatch) throw new Error("Invalid response");

      const result = JSON.parse(jsonMatch[0]);
      if (!result.valid) {
        toast.error(lang === "ru" ? "Такой вид спорта не найден" : "Bunday sport turi mavjud emas");
        return;
      }

      // Fetch image from Unsplash
      const unsplashUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(result.name + " sport")}`;

      await supabase.from("fan_sports").insert({
        user_id: user.id,
        sport_name: result.name,
        image_url: unsplashUrl,
        verified: true,
      });

      toast.success(lang === "ru" ? `${result.name} добавлен!` : `${result.name} qo'shildi!`);
      setSportName("");
      onAdded();
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex gap-2">
        <Input
          value={sportName}
          onChange={(e) => setSportName(e.target.value)}
          placeholder={lang === "ru" ? "Введите название спорта..." : "Sport nomini kiriting..."}
          className="bg-secondary border-border"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button variant="ember" onClick={handleAdd} disabled={loading || !sportName.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "ru" ? "Добавить" : "Qo'shish")}
        </Button>
      </div>
    </div>
  );
}
