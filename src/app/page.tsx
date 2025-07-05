"use client";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "⏳ Quirra is thinking..." },
    ]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are Quirra, an advanced AI assistant. Answer clearly and helpfully.\n\nUser: ${input}`,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.response },
      ]);
    } catch (err) {
      console.error("Error:", err); // Log the error for debugging (optional)
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "⚠️ Failed to connect to Quirra's brain." },
      ]);
    }
  };

  const handleTool = async (type: string) => {
    let toolPrompt: string = "";

    switch (type) {
      case "search":
        toolPrompt = "Search the web and summarize: What are the latest trends in AI?";
        break;
      case "image":
        toolPrompt = "Describe an image of the future of AI — futuristic, powerful, beautiful.";
        break;
      case "code":
        toolPrompt = "Explain this Python code in simple terms:\n\nfor i in range(5): print(i)";
        break;
      default:
        return;
    }

    const userMessage = { role: "user", content: `Use tool: ${type}` };
    setMessages((prev) => [...prev, userMessage]);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "⏳ Quirra is processing your tool request..." },
    ]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: toolPrompt }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.response },
      ]);
    } catch (err) {
      console.error("Error:", err); // Log the error for debugging (optional)
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "⚠️ Tool failed to respond." },
      ]);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-blue-900 to-black text-white flex flex-col items-center justify-start p-4">
      <h1 className="text-4xl font-bold mb-2 text-white">Quirra</h1>
      <p className="text-lg text-blue-200 text-center">
        Next generation of intelligence, built by vision.
      </p>

      {/* TOOL PANEL */}
      <div className="mt-6 flex gap-4 flex-wrap justify-center">
        <button
          onClick={() => handleTool("search")}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-800 rounded-lg text-white"
        >
          🕸️ Search
        </button>
        <button
          onClick={() => handleTool("image")}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-white"
        >
          🎨 Image Generator
        </button>
        <button
          onClick={() => handleTool("code")}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white"
        >
          🧠 Code Helper
        </button>
      </div>

      {/* CHAT WINDOW */}
      <div className="mt-6 w-full max-w-2xl bg-black border border-blue-800 rounded-2xl p-6 shadow-lg">
        <div className="h-96 overflow-y-auto flex flex-col space-y-2">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-xl max-w-[75%] ${
                msg.role === "user"
                  ? "bg-blue-700 self-end text-white text-right"
                  : "bg-gray-800 self-start text-green-300 text-left"
              }`}
            >
              <span>{msg.content}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Ask Quirra something..."
            className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-blue-700 focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
