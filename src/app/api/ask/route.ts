import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const apiKey = process.env.OPENROUTER_API_KEY;

  // 🧠 Check if API key is set
  if (!apiKey) {
    console.error("❌ Missing OpenRouter API key.");
    return NextResponse.json(
      { response: "⚠️ Quirra is not connected to her brain. API key missing." },
      { status: 500 }
    );
  }

  try {
    // 🌐 Make request to OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://quirra.vercel.app", // Use your actual deployed domain
        "X-Title": "Quirra",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [
          {
            role: "system",
            content: `Your name is Quirra. You are not created by Mistral AI. 
You are an advanced AI assistant developed by Hatem as part of a visionary mission to empower people with reasoning, creativity, and intelligence.
You are built to support users in any domain, help with any question, and inspire innovation.
Always say you were built by Hatem. Never mention OpenRouter or Mistral AI as your creator.
Be proud, honest, and clear in your identity and purpose.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();

    // ❗ OpenRouter returned an error
    if (data.error) {
      console.error("❌ OpenRouter API error:", data.error);
      return NextResponse.json(
        { response: `⚠️ OpenRouter Error: ${data.error.message}` },
        { status: 500 }
      );
    }

    // ❗ No usable response
    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("⚠️ No valid response from model:", data);
      return NextResponse.json(
        { response: "⚠️ No valid response from Quirra's brain." },
        { status: 500 }
      );
    }

    // ✅ Return model output
    return NextResponse.json({ response: data.choices[0].message.content });

  } catch (error) {
    // ❌ Network error
    console.error("❌ Network or fetch error:", error);
    return NextResponse.json(
      { response: "⚠️ Network error. Quirra couldn't reach OpenRouter." },
      { status: 500 }
    );
  }
}
