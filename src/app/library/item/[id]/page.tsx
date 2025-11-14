"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Share2, Download } from "lucide-react";

export default function LibraryItemPage() {
  const { id } = useParams();
  const router = useRouter();
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // === Load single item from Supabase ===
  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      const { data, error } = await supabase
        .from("quirra_library_items")
        .select("*")
        .eq("id", id)
        .single();

      if (error) console.error("Failed to load item:", error);
      setItem(data);
      setLoading(false);
    }

    if (id) fetchItem();
  }, [id]);

  // === Share the item ===
  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/library/item/${id}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("✅ Link copied to clipboard");
    } catch (err) {
      console.error("Share error:", err);
      alert("❌ Failed to copy link");
    }
  };

  // === Download (robust: works for private + public Supabase storage) ===
  const handleDownload = async () => {
    if (!item?.file_url) {
      alert("⚠️ No downloadable file found for this item.");
      return;
    }

    try {
      let filePath = item.file_url;

      // If file_url is a Supabase path (not a full URL)
      if (!filePath.startsWith("http")) {
        const { data, error } = await supabase.storage
          .from("library-files")
          .createSignedUrl(filePath, 60);
        if (error || !data?.signedUrl) throw error;
        filePath = data.signedUrl;
      }

      // Force file download
      const a = document.createElement("a");
      a.href = filePath;
      const safeName = (item.title || "download").replace(/[\\/:*?"<>|]/g, "-");
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      alert("❌ Download failed. Please check your storage permissions.");
    }
  };

  // === Go back to Library (keeps sidebar visible) ===
  const handleBack = () => {
    if (document.referrer.includes("/library")) router.back();
    else router.push("/library");
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* === Background === */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#05060F]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0B1A] to-[#0F172A]" />
        <div
          className="absolute top-[-22%] left-[-12%] w-[62vw] h-[62vh] rounded-full blur-[180px]"
          style={{ background: "rgba(63,81,181,0.10)" }}
        />
        <div
          className="absolute bottom-[-12%] right-[-12%] w-[50vw] h-[50vh] rounded-full blur-[160px]"
          style={{ background: "rgba(142,45,226,0.10)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 52% 48%, rgba(0,212,255,0.10), transparent 55%)",
            filter: "blur(60px)",
            opacity: 0.18,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
      </div>

      {/* === Top bar === */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[rgba(10,13,25,0.5)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-[#9CAAC4]"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-[#E4E9F7] font-semibold text-[15px]">
            {item?.title || "Loading..."}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="px-3 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors text-[#A0AEC0]"
          >
            <Share2 size={15} className="inline-block mr-1" /> Share
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors text-[#A0AEC0]"
          >
            <Download size={15} className="inline-block mr-1" /> Download
          </button>
        </div>
      </div>

      {/* === Content === */}
      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar text-[#C9D3E1]">
        {loading ? (
          <div className="text-center text-[#9CAAC4] mt-40 text-sm">
            Loading item...
          </div>
        ) : item ? (
          <div className="max-w-3xl mx-auto">
            <div className="text-6xl mb-4">
              {item.type === "note"
                ? "📝"
                : item.type === "project"
                ? "💡"
                : item.type === "image"
                ? "🖼️"
                : "📄"}
            </div>
            <h1 className="text-2xl font-bold mb-3 text-[#E6F1FF]">
              {item.title || "Untitled"}
            </h1>
            <p className="text-sm mb-4 text-[#A0AEC0]">
              {item.type?.toUpperCase()}
            </p>
            <p className="leading-relaxed text-[#C9D3E1] whitespace-pre-line">
              {item.content || item.description || "No content available for this item."}
            </p>
          </div>
        ) : (
          <div className="text-center text-[#9CAAC4] mt-40 text-sm">
            Item not found.
          </div>
        )}
      </div>
    </div>
  );
}
