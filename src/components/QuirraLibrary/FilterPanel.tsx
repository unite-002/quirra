"use client";
import { motion } from "framer-motion";

type Props = {
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
};

const FILTERS = [
  { label: "All", value: null },
  { label: "Documents", value: "document" },
  { label: "Notes", value: "note" },
  { label: "Media", value: "media" },
  { label: "Datasets", value: "dataset" },
  { label: "Projects", value: "project" },
];

export default function FilterPanel({ activeFilter, onFilterChange }: Props) {
  return (
    <aside className="hidden md:flex flex-col w-56 border-l border-white/10 bg-[#0E121D]/70 backdrop-blur-lg p-4">
      <h3 className="text-sm font-semibold text-[#E6F1FF] mb-3">Filters</h3>
      <motion.div
        className="flex flex-col gap-2"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.06 } },
        }}
      >
        {FILTERS.map((f) => (
          <motion.button
            key={f.label}
            onClick={() => onFilterChange(f.value)}
            className={`px-3 py-2 rounded-lg text-left text-sm transition-all ${
              activeFilter === f.value
                ? "bg-gradient-to-r from-[#00E5FF] to-[#A855F7] text-white"
                : "bg-white/5 text-[#A0B3C2] hover:bg-white/10"
            }`}
            whileHover={{ scale: 1.02 }}
          >
            {f.label}
          </motion.button>
        ))}
      </motion.div>
    </aside>
  );
}
