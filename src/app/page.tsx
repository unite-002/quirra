"use client";
import { useState, useEffect, useRef } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setMessages((prev) => [...prev, { role: "assistant", content: "▍" }]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, history: messages }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "⚠️ Failed to connect to Quirra's brain.",
        },
      ]);
    }
  };

  const handleReset = () => {
    setMessages([]);
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      setListening(false);
    };

    recognition.start();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex flex-col">
      <header className="text-center p-6 border-b border-gray-800">
        <h1 className="text-4xl font-bold text-white">Quirra AI</h1>
        <p className="text-sm text-blue-300 mt-1">Empowering Intelligence by Hatem</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`group relative rounded-2xl px-4 py-3 max-w-[80%] whitespace-pre-line leading-relaxed tracking-wide text-base ${
                msg.role === "user"
                  ? "bg-blue-600 text-white self-end text-right"
                  : "bg-gray-900 text-white self-start text-left shadow-md border border-blue-800"
              }`}
            >
              {msg.content}
              <button
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-xs text-gray-300 hover:text-white transition"
                onClick={() => copyToClipboard(msg.content)}
                title="Copy"
              >
                📋
              </button>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl mx-auto p-4 bg-black border-t border-gray-800 relative flex items-center gap-3"
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setToolsOpen((prev) => !prev)}
            className="bg-gray-800 p-2 rounded-full border border-gray-700 hover:border-blue-500 text-white text-sm"
            title="Tools"
          >
            +
          </button>
          {toolsOpen && (
            <div className="absolute bottom-14 left-0 w-56 bg-gray-900 text-sm border border-gray-700 shadow-lg rounded-lg z-50">
              <button
                onClick={handleVoiceInput}
                className="block w-full px-4 py-2 text-left hover:bg-gray-800"
              >
                🎤 Voice Input {listening && "(on)"}
              </button>
              <button
                onClick={handleReset}
                className="block w-full px-4 py-2 text-left hover:bg-gray-800"
              >
                🔁 Reset Conversation
              </button>
              <div className="border-t border-gray-700 my-1" />
              <button disabled className="block w-full px-4 py-2 text-left text-gray-500">
                🔄 Think Longer (soon)
              </button>
              <button disabled className="block w-full px-4 py-2 text-left text-gray-500">
                🖼️ Generate Image (soon)
              </button>
              <button disabled className="block w-full px-4 py-2 text-left text-gray-500">
                🌐 Search Web (soon)
              </button>
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Ask Quirra anything..."
          className="flex-1 p-3 rounded-full bg-gray-800 text-white border border-blue-600 focus:outline-none"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
        />

        {input && (
          <button
            type="submit"
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm"
            title="Send"
          >
            ↑
          </button>
        )}
      </form>
    </main>
  );
}
