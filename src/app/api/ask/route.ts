// src/app/api/ask/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { response: "⚠️ Missing or invalid prompt." },
        { status: 400 }
      );
    }

    const isLocal = process.env.NODE_ENV !== "production";

    if (isLocal) {
      try {
        const response = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral",
            prompt,
            stream: false,
          }),
        });

        const data = await response.json();
        return NextResponse.json({ response: data.response });
      } catch {
        return NextResponse.json(
          { response: "⚠️ Local Quirra (Ollama) is not responding. Make sure it's running." },
          { status: 500 }
        );
      }
    } else {
      // 🌍 Cloud-based response using OpenRouter (or OpenAI)
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, // 🔑 Add this in Vercel → Env Vars
          },
          body: JSON.stringify({
            model: "openai/gpt-3.5-turbo", // ✅ or try another model
            messages: [
              { role: "system", content: "You are Quirra, a powerful AI assistant." },
              { role: "user", content: prompt },
            ],
          }),
        });

        const data = await response.json();
        return NextResponse.json({ response: data.choices[0].message.content });
      } catch {
        return NextResponse.json(
          { response: "⚠️ Quirra failed to connect to the cloud AI brain." },
          { status: 500 }
        );
      }
    }
  } catch {
    return NextResponse.json(
      { response: "⚠️ Invalid request to Quirra. Please check your input." },
      { status: 500 }
    );
  }
}
