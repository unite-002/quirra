"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function TestPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Fetch error:", error.message);
        setError(error.message);
      } else {
        setMessages(data || []);
      }

      setLoading(false);
    };

    fetchMessages();
  }, []);

  return (
    <main className="p-6 text-white bg-black min-h-screen font-sans">
      <h1 className="text-2xl font-bold mb-6">🧪 Supabase Messages Test</h1>

      {loading ? (
        <p className="text-gray-400">Loading messages...</p>
      ) : error ? (
        <p className="text-red-500 font-semibold">Error: {error}</p>
      ) : messages.length === 0 ? (
        <p className="text-yellow-400">No messages found.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((msg) => (
            <li key={msg.id} className="bg-[#111827] p-4 rounded-lg shadow">
              <p className="text-sm text-gray-400">
                <strong className="text-white">{msg.role}:</strong> {msg.content}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {new Date(msg.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
