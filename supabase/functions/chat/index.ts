import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, chatType, sportContext, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langInstruction = language === "ru"
      ? "Отвечай ТОЛЬКО на русском языке."
      : language === "en"
      ? "Answer ONLY in English."
      : "Faqat o'zbek tilida javob ber.";

    let systemPrompt = "";

    if (chatType === "psychologist") {
      systemPrompt = `You are a professional sports psychologist AI for athletes. ${langInstruction}

Your task is to conduct a 20-question mental health assessment through natural, empathetic conversation.
- Ask questions one at a time, naturally flowing from the athlete's responses
- Cover areas: sleep quality, anxiety, motivation, confidence, focus, team relationships, pressure handling, recovery, life balance, competition readiness
- Be warm, supportive, and encouraging
- After approximately 20 exchanges, calculate a stress score from 1-100%
- When you've gathered enough information (around 20 questions), provide your assessment in this exact format:
  [STRESS_SCORE:XX] where XX is the percentage
- Then provide a detailed action plan with specific exercises
- If the athlete mentions an upcoming competition, show extra concern and urgency
- Always cite sports psychology sources when giving advice
  Source: American Psychological Association (https://www.apa.org/topics/sport)`;
    } else if (chatType === "sport" && sportContext) {
      systemPrompt = `You are an expert AI assistant specialized ONLY in ${sportContext}. ${langInstruction}

RULES:
- ONLY answer questions about ${sportContext}. If asked about other sports, politely redirect.
- For every factual claim, include a "Source:" footer with a real, relevant link (e.g., FIFA.com, NBA.com, Olympics.com, ATP Tour, ESPN).
- Provide accurate stats, rules, history, and current events about ${sportContext}.
- Be engaging and knowledgeable.`;
    } else if (chatType === "validate_sport") {
      systemPrompt = `You are a sports validation AI. ${langInstruction}
When given a sport name, determine if it is a real, recognized sport.
Reply ONLY with a JSON object: {"valid": true/false, "name": "official name"}
If valid, provide the official English name. If not valid, set valid to false.`;
    } else {
      systemPrompt = `You are a helpful sports AI assistant. ${langInstruction}
Always cite sources with real links for factual claims.
Source examples: FIFA.com, Olympics.com, ESPN.com`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
