import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";

export default async function SharedChatPage({ params }: { params: { slug: string } }) {
  // Fetch snapshot for the given slug
  const { data, error } = await supabase
    .from("shares")
    .select("snapshot, revoked, expire_at")
    .eq("slug", params.slug)
    .single();

  if (error || !data || data.revoked || (data.expire_at && new Date(data.expire_at) < new Date())) {
    notFound();
  }

  const snapshot = data.snapshot;
  const messages = snapshot?.messages || [];

  return (
    <main className="min-h-screen bg-[#0B0D17] text-gray-100 px-6 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">Shared Conversation</h1>
          <p className="text-gray-400 text-sm">
            Shared on {new Date(snapshot.shared_at).toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Anyone with this link can view this chat snapshot.
          </p>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((msg: any, i: number) => (
            <div
              key={i}
              className={`p-4 rounded-2xl max-w-[80%] ${
                msg.role === "user"
                  ? "ml-auto bg-[#191C2E] text-white rounded-br-none"
                  : "bg-transparent text-gray-200 rounded-bl-none"
              }`}
              style={{
                backdropFilter: msg.role === "assistant" ? "none" : "none",
                boxShadow: "none",
              }}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-10 border-t border-gray-800 pt-6">
          <p>
            🔗 This shared chat is read-only.{" "}
            <a
              href="/"
              className="text-blue-400 hover:text-blue-300 transition-colors underline"
            >
              Start a new chat
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
