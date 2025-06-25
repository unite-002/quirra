// src/app/api/ask/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral",      // ← the model you downloaded in Ollama
      prompt,
      stream: false,
    }),
  });

  const data = await response.json();
  return NextResponse.json({ response: data.response });
}
