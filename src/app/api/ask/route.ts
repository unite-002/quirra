// src/app/api/ask/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://quirra.vercel.app", // your production domain or localhost
      "X-Title": "Quirra Prototype",
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct", // You can also try: openchat/openchat-7b, meta-llama, etc.
      messages: [
        { role: "system", content: "You are Quirra, an advanced assistant AI. Be clear, helpful, and visionary." },
        { role: "user", content: prompt }
      ],
    }),
  });

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "⚠️ No response from Quirra";

  return NextResponse.json({ response: reply });
}
