"use client";
import React, {
  useState, useEffect, useRef, KeyboardEvent, FormEvent,
} from "react";

interface Message {
  role: "user" | "gpt" | "gemini";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIndex, setHIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [battle, setBattle] = useState(false);
  const [theme, setTheme] = useState<"dark"|"light">("dark");
  const [config, setConfig] = useState({
    searchPrompt: "Search the web and summarize:",
    imagePrompt: "Describe a futuristic AI scene:",
    codePrompt: "Explain this code in simple terms:",
    gptPrompt: "Helpful assistant:",
    geminiPrompt: "Concise factual response:",
    useStreaming: true,
  });

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const recallHistory = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" && history.length) {
      const ni = Math.min(hIndex + 1, history.length - 1);
      setHIndex(ni);
      setInput(history[history.length - 1 - ni]);
    }
    if (e.key === "ArrowDown") {
      const ni = Math.max(hIndex - 1, -1);
      setHIndex(ni);
      setInput(ni >= 0 ? history[history.length - 1 - ni] : "");
    }
  };

  const sendStream = (prompt: string, role: Message["role"]) => {
    setMessages((m) => [...m, { role, content: "" }]);
    const src = new EventSource("/api/stream?prompt=" + encodeURIComponent(prompt) + `&role=${role}`);
    src.onmessage = (e) => {
      if (e.data === "[DONE]") { src.close(); setLoading(false); return; }
      setMessages((m) => {
        const last = [...m].reverse().findIndex(x => x.role === role);
        if (last === -1) return m;
        const idx = m.length - 1 - last;
        const cp = [...m];
        cp[idx].content += e.data;
        return cp;
      });
    };
    src.onerror = () => { src.close(); setLoading(false); };
  };

  const handleTool = (type: "search"|"image"|"code") => {
    const toolPrompt = {
      search: config.searchPrompt,
      image: config.imagePrompt,
      code: config.codePrompt,
    }[type] + "\nUser: " + input;
    setLoading(true);
    sendStream(toolPrompt, "gpt");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setHistory(h => [...h, input]);
    setHIndex(-1);
    const userInput = input;
    setInput("");

    const gptP = `${config.gptPrompt}\nUser: ${userInput}`;
    if (battle) {
      const gemP = `${config.geminiPrompt}\nUser: ${userInput}`;
      sendStream(gptP, "gpt");
      sendStream(gemP, "gemini");
    } else {
      sendStream(gptP, "gpt");
    }
  };

  return (
    <main className={`min-h-screen px-4 py-8 ${theme==="dark"?"bg-gradient-to-b from-[#000011] to-[#001133]":"bg-white text-black"}`}>
      <header className="flex justify-between items-center max-w-2xl mx-auto mb-6">
        <h1 className="text-5xl font-bold" style={{ color: theme === "dark" ? "#00ccff" : "#003366" }}>Quirra 💎</h1>
        <div className="space-x-2">
          <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} className="btn">🌙/☀️</button>
          <button onClick={()=>setBattle(b=>!b)} className="btn">{battle?"Solo":"Battle"}</button>
        </div>
      </header>

      <div className="config-panel max-w-2xl mx-auto mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {["gptPrompt","geminiPrompt","searchPrompt","imagePrompt","codePrompt"].map(k => (
          <textarea
            key={k}
            value={(config as any)[k]}
            onChange={e=>setConfig(c=>({...c, [k]:e.target.value}))}
            className="p-2 border rounded"
            rows={2}
            placeholder={k}
          />
        ))}
      </div>

      <div className="max-w-2xl mx-auto bg-[#00001a] border border-[#003366] rounded-lg h-[400px] overflow-y-auto p-4 space-y-3">
        {messages.map((m,i)=>(
          <div key={i} className={`p-3 rounded-lg max-w-[75%] ${m.role==="user"?"bg-[#001133] self-end text-right":"bg-[#003344] self-start"} ${m.role==="gpt"?"text-[#00ccff]":m.role==="gemini"?"text-[#ffcc00]":"text-white"} mx-auto`}>
            {battle && m.role!=="user" && <strong className="block">{m.role.toUpperCase()}:</strong>}
            {m.content || (loading ? <TypingDots /> : "")}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-2xl mx-auto mt-4 gap-2">
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={recallHistory}
          disabled={loading}
          className="flex-1 px-4 py-2 rounded border bg-[#000030] border-[#004477] text-white"
          placeholder="Ask Quirra..."
        />
        <button type="button" onClick={()=>handleTool("search")} className="btn">Search</button>
        <button type="button" onClick={()=>handleTool("image")} className="btn">Image</button>
        <button type="button" onClick={()=>handleTool("code")} className="btn">Code</button>
        <button type="submit" disabled={loading} className="btn">{loading?"...":"Send"}</button>
      </form>
    </main>
  );
}

function TypingDots() {
  return <span className="inline-flex space-x-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-200">.</span><span className="animate-bounce delay-400">.</span></span>;
}
