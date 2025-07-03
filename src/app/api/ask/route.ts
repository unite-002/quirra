// src/app/api/ask/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ response: "⚠️ Missing or invalid prompt." }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are Quirra, a powerful AI assistant built to help users with intelligence, clarity, and vision." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!data || !data.choices || !data.choices[0]?.message?.content) {
      return NextResponse.json(
        { response: "⚠️ OpenAI responded but no message was returned." },
        { status: 502 }
      );
    }

    return NextResponse.json({ response: data.choices[0].message.content });
  } catch (_) {
    return NextResponse.json(
      { response: "⚠️ Quirra failed to connect to OpenAI's brain." },
      { status: 500 }
    );
  }
}
