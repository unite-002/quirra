import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  // Detect if it's running locally
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
    } catch (_) {
      return NextResponse.json(
        { response: "⚠️ Local Quirra (Ollama) not responding." },
        { status: 500 }
      );
    }
  } else {
    // Vercel fallback message
    return NextResponse.json({
      response:
        "🧠 Quirra's live brain is not connected yet (Ollama runs locally only). Try the dev version on your PC!",
    });
  }
}
