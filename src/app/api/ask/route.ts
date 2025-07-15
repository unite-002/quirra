import { NextResponse } from "next/server";

// 🧠 Persistent in-memory message history (until reset)
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
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;

  if (!openRouterKey) {
    console.error("❌ Missing OpenRouter API key.");
    return NextResponse.json(
      { response: "⚠️ Quirra is not connected — missing brain connection." },
      { status: 500 }
    );
  }

  if (!prompt && !reset) {
    return NextResponse.json(
      { response: "⚠️ Please enter a prompt for Quirra to respond to." },
      { status: 400 }
    );
  }

  if (reset === true) {
    messageHistory = [messageHistory[0]];
    return NextResponse.json({
      response: "🧠 Conversation reset. Quirra is ready for a new session.",
    });
  }

  try {
    const needsLiveSearch = [
      "current year",
      "what year is it",
      "today's news",
      "latest news",
      "today's date",
      "weather",
      "president of",
      "who won",
      "how much is",
      "who is the ceo of",
      "latest update",
      "breaking news",
      "news now",
    ].some((keyword) => prompt.toLowerCase().includes(keyword));

    // 🌐 Web Search Integration (Serper)
    if (needsLiveSearch && serperKey) {
      const searchRes = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": serperKey,
        },
        body: JSON.stringify({ q: prompt }),
      });

      const searchData = await searchRes.json();

      type SearchResult = { title: string; snippet: string; link: string };

      const results = (searchData?.organic as SearchResult[] | undefined)?.filter(
        (r) => r.title && r.snippet && r.link
      );

      if (results && results.length > 0) {
        const topSummaries = results
          .slice(0, 3)
          .map((r) => `🔹 **${r.title}**\n${r.snippet}\n🔗 ${r.link}`)
          .join("\n\n");

        console.log("✅ Serper search results used.");
        return NextResponse.json({
          response: `🧠 Here's what I found:\n\n${topSummaries}`,
        });
      } else {
        console.warn("⚠️ No useful Serper results found.");
      }
    }

    // 🧠 Fallback to LLM
    messageHistory.push({ role: "user", content: prompt });

    const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://quirra.vercel.app",
        "X-Title": "Quirra",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: messageHistory.slice(-12),
      }),
    });

    const llmData = await llmRes.json();

    if (llmData.error) {
      console.error("❌ OpenRouter API error:", llmData.error);
      return NextResponse.json(
        { response: `⚠️ Error from brain: ${llmData.error.message}` },
        { status: 500 }
      );
    }

    const aiReply = llmData.choices?.[0]?.message?.content?.trim();

    if (!aiReply) {
      return NextResponse.json(
        { response: "⚠️ Quirra couldn’t think of a reply. Try again?" },
        { status: 500 }
      );
    }

    messageHistory.push({ role: "assistant", content: aiReply });
    return NextResponse.json({ response: aiReply });
  } catch (err) {
    console.error("❌ Network/fetch error:", err);
    return NextResponse.json(
      { response: "⚠️ Quirra encountered a network issue trying to think. Please try again." },
      { status: 500 }
    );
  }
}
