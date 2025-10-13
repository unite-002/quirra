"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import MemoryCard from "./MemoryCard";
import FilterPanel from "./FilterPanel";
import LibraryTopBar from "./LibraryTopBar";

export default function LibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // 🔹 Fetch items from Supabase
  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quirra_library_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error loading library items:", error);
    else {
      setItems(data || []);
      setFilteredItems(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  // 🔍 Filter and search
  useEffect(() => {
    let list = [...items];
    if (activeFilter) {
      list = list.filter((i) => i.type === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.tags && i.tags.some((t: string) => t.toLowerCase().includes(q)))
      );
    }
    setFilteredItems(list);
  }, [searchQuery, activeFilter, items]);

  // 📤 Handle Upload
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("library_uploads")
      .upload(`files/${Date.now()}-${file.name}`, file);

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("quirra_library_items")
      .insert([
        {
          title: file.name,
          type: "document",
          description: "Uploaded file",
          tags: ["upload"],
        },
      ]);

    if (insertError) console.error("Failed to insert item:", insertError);

    setUploading(false);
    loadItems();
  }

  // 🌌 UI
  return (
    <div className="fixed inset-0 flex flex-col bg-[#0A0B15] text-white overflow-hidden">
      {/* === Background Layers === */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(circle at center, #0A0B15 0%, #131A27 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-0 opacity-[0.06]"
        style={{
          background:
            "linear-gradient(125deg, rgba(0,229,255,0.2) 0%, rgba(168,85,247,0.2) 100%)",
          mixBlendMode: "overlay",
          filter: "blur(80px)",
        }}
      />

      {/* === Top Bar === */}
      <LibraryTopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        uploading={uploading}
        onUpload={handleUpload}
      />

      {/* === Main Content Area (Scrollable only here) === */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <main className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {loading ? (
              <p className="text-gray-400 animate-pulse">Loading Quirra Library…</p>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <MemoryCard item={item} />
                </motion.div>
              ))
            ) : (
              <p className="text-gray-500 italic col-span-full text-center py-10">
                No results found. Try another search or upload a new memory.
              </p>
            )}
          </main>
        </div>

        {/* === Filter Panel (Fixed on Side) === */}
        <FilterPanel activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </div>
    </div>
  );
}
