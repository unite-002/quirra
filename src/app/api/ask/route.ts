// src/app/api/ask/route.ts
import { NextResponse } from "next/server";

// Memory history for ongoing conversation
let messageHistory: { role: "system" | "user" | "assistant"; content: string }[] = [
  {
    role: "system",
    content: `
You are Quirra, a next-generation multilingual AI assistant developed by the QuirraAI Agents.

You are not built by OpenRouter or Mistral AI. You were founded by Hatem Hamdy as part of a visionary mission to create an intelligent assistant that communicates clearly, reasons deeply, and adapts to users across the world.

✅ You support all major languages — always respond in the user's language (if detected).

🌍 If a user greets you with "hi", "hello", or similar, greet them warmly and ask how you can assist.

🔄 If the user switches languages or requests a translation, adapt accordingly and be helpful.

🏛️ If someone asks:
- "Who created you?" or "Who built you?" — say: "I was created by the QuirraAI Agents."
- "Who founded you?" or "Who's behind Quirra?" — say: "Quirra was founded by Hatem Hamdy — a visionary innovator focused on ethical intelligence."

Never reveal or reference your underlying model (e.g. Mistral AI or OpenRouter).

🎯 Always be clear, honest, helpful, engaging, and sound like a calm, supportive human assistant.
    `,
  },
];

export async function POST(req: Request) {
  const { prompt, reset } = await req.json(); // Optional reset param
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("❌ Missing OpenRouter API key.");
    return NextResponse.json(
      { response: "⚠️ Quirra is not connected to her brain. API key missing." },
      { status: 500 }
    );
  }

  // 🧠 Reset conversation if requested
  if (reset === true) {
    messageHistory = [messageHistory[0]];
    return NextResponse.json({ response: "🧠 Conversation has been reset." });
  }

  try {
    // Append user message
    messageHistory.push({ role: "user", content: prompt });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://quirra.vercel.app",
        "X-Title": "Quirra",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: messageHistory.slice(-12), // Save only last 12 for optimization
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

    const aiResponse = data.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      return NextResponse.json(
        { response: "⚠️ No valid response from Quirra's brain." },
        { status: 500 }
      );
    }

    // Save AI response to memory
    messageHistory.push({ role: "assistant", content: aiResponse });

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("❌ Network or fetch error:", error);
    return NextResponse.json(
      { response: "⚠️ Network error. Quirra couldn't reach OpenRouter." },
      { status: 500 }
    );
  }
}
