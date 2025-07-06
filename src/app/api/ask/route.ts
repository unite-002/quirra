// src/app/api/ask/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ response: "⚠️ Invalid prompt." }, { status: 400 });
    }

    const response = await fetch("https://api-inference.huggingface.co/models/tiiuae/falcon-rw-1b", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const data = await response.json();

    const text = Array.isArray(data) && data[0]?.generated_text
      ? data[0].generated_text
      : "⚠️ Hugging Face returned no output.";

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("HF API error:", error);
    return NextResponse.json({ response: "⚠️ Failed to connect to Hugging Face." }, { status: 500 });
  }
}
