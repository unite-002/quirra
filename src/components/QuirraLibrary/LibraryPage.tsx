"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import FilterPanel from "./FilterPanel";
import MemoryCard from "./MemoryCard";
import "@/components/QuirraLibrary/library.css";

type LibraryItem = {
  id: string;
  title: string;
  type: "note" | "file" | "project" | "image";
  tag?: string;
  description?: string;
  content?: string;
  file_url?: string;
  created_at?: string;
};

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // === Load items from Supabase ===
  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quirra_library_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load items:", error);
      setItems([]);
      setFilteredItems([]);
    } else {
      setItems(data || []);
      setFilteredItems(data || []);
    }
    setLoading(false);
  }

  // === Realtime sync ===
  useEffect(() => {
    loadItems();

    const channel = supabase
      .channel("realtime:quirra_library_items")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quirra_library_items" },
        (payload) => {
          setItems((prev) => [payload.new as LibraryItem, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quirra_library_items" },
        (payload) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === payload.new.id ? (payload.new as LibraryItem) : item
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "quirra_library_items" },
        (payload) => {
          setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
        }
      );

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // === Filter + Grouped Logic ===
  useEffect(() => {
    let list = [...items];
    if (activeFilter) list = list.filter((i) => i.type === activeFilter);
    setFilteredItems(list);
  }, [activeFilter, items]);

  // === Helper: group by type ===
  const groupItemsByType = (items: LibraryItem[]) => {
    const groups: Record<string, LibraryItem[]> = {};
    items.forEach((item) => {
      const key = item.type || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  const grouped = groupItemsByType(filteredItems);

  // === UI ===
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* === Static Background === */}
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

      {/* === Top Filter Bar === */}
      <FilterPanel
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* === Main Grid === */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pl-[8rem] pr-12 pt-8 pb-8 sm:pl-[10rem] sm:pr-14">
        {loading ? (
          <div className="text-[#9CAAC4] text-center py-24 text-sm">
            Loading Quirra Library...
          </div>
        ) : filteredItems.length > 0 ? (
          activeFilter === null ? (
            // === Grouped "All" view ===
            <div className="flex flex-col gap-12">
              {Object.entries(grouped).map(([type, group]) => (
                <div key={type}>
                  <h3 className="text-[#9CAAC4] text-sm uppercase mb-4 tracking-wide select-none">
                    {type === "note"
                      ? "📝 Notes"
                      : type === "file"
                      ? "📁 Files"
                      : type === "project"
                      ? "🚀 Projects"
                      : type === "image"
                      ? "🖼️ Images"
                      : "📦 Other"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-start">
                    {group.map((item) => (
                      <MemoryCard item={item} key={item.id} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // === Filtered specific view ===
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-start">
              {filteredItems.map((item) => (
                <MemoryCard item={item} key={item.id} />
              ))}
            </div>
          )
        ) : (
          <div className="text-[#7A859C] text-center py-24 italic text-sm">
            No results found.
          </div>
        )}
      </div>
    </div>
  );
}
