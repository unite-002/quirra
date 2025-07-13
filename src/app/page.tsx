"use client";
import { useState, useEffect, useRef } from "react";

type SpeechRecognitionEvent = Event & {
  results: SpeechRecognitionResultList;
};

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setMessages((prev) => [...prev, { role: "assistant", content: "▍" }]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.response },
      ]);
    } catch (_) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "⚠️ Failed to connect to Quirra's brain.",
        },
      ]);
    }
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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      setListening(false);
    };

    recognition.start();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex flex-col">
      <header className="text-center p-6 border-b border-gray-800">
        <h1 className="text-4xl font-bold text-white">Quirra AI</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-4">
          {messages.map((msg, idx) =>
            msg.content === "▍" ? (
              <div
                key={idx}
                className="rounded-2xl px-4 py-3 max-w-[80%] self-start text-white text-left bg-gray-900 border border-blue-800 shadow-md animate-pulse"
              >
                ▍
              </div>
            ) : (
              <div
                key={idx}
                className={`rounded-2xl px-4 py-3 max-w-[80%] whitespace-pre-line leading-relaxed tracking-wide text-base ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white self-end text-right"
                    : "bg-gray-900 text-white self-start text-left shadow-md border border-blue-800"
                }`}
              >
                {msg.content}
              </div>
            )
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl mx-auto p-4 flex gap-2 bg-black border-t border-gray-800"
      >
        <input
          type="text"
          placeholder="Ask Quirra anything..."
          className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-blue-600 focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold"
        >
          Send
        </button>
        <button
          type="button"
          onClick={handleVoiceInput}
          className={`px-4 py-2 rounded-lg font-semibold ${
            listening ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"
          } text-white`}
        >
          🎤
        </button>
      </form>
    </main>
  );
}
