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
            model: "mistral", // Your local Ollama model
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
      // Fallback for Vercel (no live Ollama access)
      return NextResponse.json({
        response:
          "🧠 Quirra's brain is not online in production yet. Try it locally or wait for the cloud version to be ready.",
      });
    }
  } catch {
    return NextResponse.json(
      { response: "⚠️ Invalid request to Quirra. Please check your input." },
      { status: 500 }
    );
  }
}
