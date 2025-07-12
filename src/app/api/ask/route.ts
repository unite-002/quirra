// src/app/api/ask/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("❌ Missing OpenRouter API key.");
    return NextResponse.json(
      { response: "⚠️ Quirra is not connected to her brain. API key missing." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://quirra.vercel.app", // Change this if your domain is different
        "X-Title": "Quirra",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [
          {
            role: "system",
            content:
              "You are Quirra, an advanced AI assistant created to empower people, reason deeply, and help with any question.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("❌ OpenRouter API error:", data.error);
      return NextResponse.json(
        { response: `⚠️ OpenRouter Error: ${data.error.message}` },
        { status: 500 }
      );
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("⚠️ No valid response from model:", data);
      return NextResponse.json(
        { response: "⚠️ No valid response from Quirra's brain." },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: data.choices[0].message.content });
  } catch (error) {
    console.error("❌ Network or fetch error:", error);
    return NextResponse.json(
      { response: "⚠️ Network error. Quirra couldn't reach OpenRouter." },
      { status: 500 }
    );
  }
}
