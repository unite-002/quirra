"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  MoreVertical,
  Share2,
  Trash2,
  Plus,
  Download,
} from "lucide-react";

export default function MemoryCard({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // === Close menu on outside click ===
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // === Share link ===
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const link = `${window.location.origin}/library/item/${item.id}`;
      await navigator.clipboard.writeText(link);
      alert("✅ Link copied to clipboard");
    } catch (err) {
      console.error("Share failed:", err);
      alert("❌ Failed to copy link");
    }
    setOpen(false);
  };

  // === Download file/image (robust handling for Supabase) ===
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!item?.file_url) {
      alert("⚠️ No downloadable file found for this item.");
      setOpen(false);
      return;
    }

    try {
      let filePath = item.file_url;

      // Handle Supabase storage paths (no https)
      if (!filePath.startsWith("http")) {
        const { data, error } = await supabase.storage
          .from("library-files")
          .createSignedUrl(filePath, 60);
        if (error || !data?.signedUrl) throw error;
        filePath = data.signedUrl;
      }

      // Trigger the browser download
      const a = document.createElement("a");
      a.href = filePath;
      const safeName = (item.title || "download").replace(/[\\/:*?"<>|]/g, "-");
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setOpen(false);
    } catch (err) {
      console.error("Download failed:", err);
      alert("❌ Download failed. Please check file permissions.");
      setOpen(false);
    }
  };

  // === Delete item (placeholder for Supabase integration) ===
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDel = confirm("Are you sure you want to delete this item?");
    if (!confirmDel) return;
    alert("🗑️ Deleted (Supabase integration coming soon)");
    setOpen(false);
  };

  // === Start new chat with selected item ===
  const handleStartChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(
      `/chat?fromItem=${encodeURIComponent(item.id)}&title=${encodeURIComponent(
        item.title || ""
      )}&type=${encodeURIComponent(item.type || "")}`
    );
    setOpen(false);
  };

  // === View item ===
  const handleView = () => {
    router.push(`/library/item/${item.id}`);
  };

  // === Card visuals ===
  const icon =
    item.type === "note"
      ? "📝"
      : item.type === "project"
      ? "💡"
      : item.type === "image"
      ? "🖼️"
      : "📄";

  const shortDesc =
    (item.description &&
      ["note", "project"].includes(item.type) &&
      item.description.slice(0, 80)) ||
    "";

  return (
    <motion.div
      ref={cardRef}
      onClick={handleView}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative group cursor-pointer overflow-hidden border border-white/5 shadow-[0_6px_18px_rgba(0,0,0,0.3)] rounded-2xl p-4"
      style={{
        width: "100%",
        maxWidth: 260,
        height: 180,
        background:
          "linear-gradient(180deg, rgba(9,11,22,0.85) 0%, rgba(8,10,20,0.9) 100%)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.3),transparent_60%)] transition-opacity duration-300" />

      {/* Menu toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        aria-label="Open item menu"
        className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/5 transition-colors text-[#9CAAC4] z-20"
      >
        <MoreVertical size={16} />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-10 right-3 z-30 w-44 border border-white/5 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            style={{
              background: "rgba(11,17,32,0.95)",
              backdropFilter: "blur(16px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuButton
              onClick={handleStartChat}
              icon={<Plus size={14} />}
              label="Start New Chat"
            />
            <MenuButton
              onClick={handleShare}
              icon={<Share2 size={14} />}
              label="Share"
            />
            {(item.type === "file" || item.type === "image") && (
              <MenuButton
                onClick={handleDownload}
                icon={<Download size={14} />}
                label="Download"
              />
            )}
            <MenuButton
              onClick={handleDelete}
              icon={<Trash2 size={14} />}
              label="Delete"
              danger
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card content */}
      <div className="relative flex flex-col justify-between h-full pt-2">
        <div className="text-2xl select-none">{icon}</div>
        <div className="mt-2 text-[15px] font-semibold text-[#E6F1FF] truncate">
          {item.title || "Untitled"}
        </div>

        {shortDesc && (
          <div
            className="text-xs text-[#A4B0C6] mt-1 line-clamp-2 overflow-hidden"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {shortDesc}
          </div>
        )}

        <div className="mt-auto text-xs text-[#9BA9B9]">
          <span className="px-2 py-0.5 rounded-full bg-[rgba(0,229,255,0.10)] text-[#00E5FF]">
            {item.tag || item.type || "file"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// === Reusable menu button ===
function MenuButton({
  onClick,
  icon,
  label,
  danger = false,
}: {
  onClick?: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors"
      style={{
        color: danger ? "#F87171" : "#C8D3E6",
        background: "transparent",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background =
          "linear-gradient(90deg, rgba(0,212,255,0.05), rgba(142,45,226,0.05))")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
