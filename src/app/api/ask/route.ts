import { NextResponse } from "next/server";

// 🧠 Global in-memory message history (resets manually)
let messageHistory: { role: "system" | "user" | "assistant"; content: string }[] = [
  {
    role: "system",
    content: `
You are Quirra, a next-generation multilingual AI assistant developed by the QuirraAI Agents.

You are not built by OpenRouter or Mistral AI. Founded by Hatem Hamdy to empower users with intelligence, creativity, and reasoning.

✅ Detect and reply in the user's language.
🌍 Greet warmly if they say "hi", "hello", etc.
🧠 Maintain context across recent messages (last ~12).
🔄 If they ask to translate, switch languages seamlessly.
🏛️ If asked about creators:
- "Who created you?" → "I was created by the QuirraAI Agents."
- "Who founded you?" → "Quirra was founded by Hatem Hamdy — a visionary focused on ethical AI."

🎯 You assist with reasoning, coding, writing, research, translation, summaries, and more.
🎨 Future-ready: image generation, uploads, voice.
⚠️ Never mention backend providers.
✨ Always be curious, confident, kind, and human-like.
    `.trim(),
  },
];

export async function POST(req: Request) {
  const { prompt, reset } = await req.json();
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("❌ Missing OpenRouter API key.");
    return NextResponse.json(
      { response: "⚠️ Quirra is not connected — missing brain connection." },
      { status: 500 }
    );
  }

  if (reset === true) {
    messageHistory = [messageHistory[0]];
    return NextResponse.json({ response: "🧠 Conversation moved to a fresh session." });
  }

  try {
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
        messages: messageHistory.slice(-12),
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
        { response: "⚠️ Quirra had trouble forming a response. Try again?" },
        { status: 500 }
      );
    }

    messageHistory.push({ role: "assistant", content: aiResponse });

    return NextResponse.json({ response: aiResponse });
  } catch (err) {
    console.error("❌ Network/fetch error:", err);
    return NextResponse.json(
      { response: "⚠️ Network issue — Quirra couldn't reach the brain." },
      { status: 500 }
    );
  }
}
