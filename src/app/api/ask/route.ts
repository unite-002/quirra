// src/app/api/ask/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ response: "⚠️ Missing or invalid prompt." }, { status: 400 });
    }

    // Call Hugging Face API
    const response = await fetch("https://api-inference.huggingface.co/models/gpt2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const data = await response.json();

    // Handle Hugging Face response
    if (!data || !data.generated_text) {
      return NextResponse.json(
        { response: "⚠️ Hugging Face responded but no message was returned." },
        { status: 502 }
      );
    }

    return NextResponse.json({ response: data.generated_text });
  } catch (_) {
    return NextResponse.json(
      { response: "⚠️ Quirra failed to connect to Hugging Face's brain." },
      { status: 500 }
    );
  }
}
