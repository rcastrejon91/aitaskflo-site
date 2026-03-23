"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Plus, Star, Clock } from "lucide-react";
import type { Memory, MemoryImportance, MemoryType } from "@/lib/types/lyra";

const IMPORTANCE_COLOR: Record<MemoryImportance, string> = {
  critical: "text-red-400 border-red-400/30 bg-red-400/10",
  high: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  medium: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  low: "text-white/40 border-white/10 bg-white/5",
};

const IMPORTANCE_GLOW: Record<MemoryImportance, string> = {
  critical: "shadow-red-500/20",
  high: "shadow-orange-500/20",
  medium: "shadow-purple-500/20",
  low: "",
};

const TYPE_PILL: Record<string, string> = {
  personal: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  shared:   "bg-purple-500/15 text-purple-300 border-purple-500/25",
  learned:  "bg-amber-500/15 text-amber-300 border-amber-500/25",
};

const TAG_PILL = "bg-white/[0.07] text-white/50 border border-white/[0.08]";

interface Props {
  memories: Memory[];
  activeAgentId: string;
  onMemoryAdded: () => void;
}

function MemoryCard({ memory }: { memory: Memory }) {
  const glowClass = IMPORTANCE_GLOW[memory.importance];
  const typePill = TYPE_PILL[memory.type] ?? TYPE_PILL.personal;
  const ageMs = Date.now() - new Date(memory.createdAt).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const ageLabel = ageDays === 0 ? "today" : ageDays === 1 ? "1d ago" : `${ageDays}d ago`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border border-white/[0.07] rounded-xl p-3 shadow-lg bg-white/[0.03] ${glowClass} mb-2`}
    >
      <p className="text-white/85 text-xs leading-relaxed mb-2.5" style={{ lineHeight: 1.6 }}>{memory.content}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${typePill}`}>
          {memory.type}
        </span>
        <span className="text-[10px] text-white/30 flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />{ageLabel}
        </span>
        {memory.accessCount > 0 && (
          <span className="text-[10px] text-white/30 flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5" />{memory.accessCount}x
          </span>
        )}
        {memory.tags.slice(0, 3).map((tag) => (
          <span key={tag} className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] border ${TAG_PILL}`}>
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export function MemoryPanel({ memories, activeAgentId, onMemoryAdded }: Props) {
  const [filter, setFilter] = useState<"all" | MemoryType>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newImportance, setNewImportance] = useState<MemoryImportance>("medium");
  const [newType, setNewType] = useState<MemoryType>("personal");
  const [saving, setSaving] = useState(false);

  const filtered = filter === "all" ? memories : memories.filter((m) => m.type === filter);
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  async function addMemory() {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/lyra/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent.trim(),
          type: newType,
          importance: newImportance,
          tags: newContent
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 4)
            .slice(0, 5),
          agentId: activeAgentId,
        }),
      });
      setNewContent("");
      setShowAdd(false);
      onMemoryAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">
            Memory <span className="text-white/40 font-normal">({memories.length})</span>
          </span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-6 h-6 rounded-full bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 flex items-center justify-center transition-all"
        >
          <Plus className="w-3.5 h-3.5 text-purple-400" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {(["all", "personal", "shared"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 rounded text-xs transition-all ${
              filter === f
                ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Add memory form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What should Lyra remember?"
                className="w-full bg-transparent text-white text-xs placeholder-white/30 resize-none focus:outline-none"
                rows={3}
              />
              <div className="flex gap-2">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MemoryType)}
                  className="flex-1 bg-white/5 border border-white/10 rounded text-xs text-white px-2 py-1 focus:outline-none"
                >
                  <option value="personal">Personal</option>
                  <option value="shared">Shared</option>
                </select>
                <select
                  value={newImportance}
                  onChange={(e) => setNewImportance(e.target.value as MemoryImportance)}
                  className="flex-1 bg-white/5 border border-white/10 rounded text-xs text-white px-2 py-1 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <button
                  onClick={addMemory}
                  disabled={saving || !newContent.trim()}
                  className="px-3 py-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white text-xs rounded transition-all"
                >
                  {saving ? "..." : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="text-center text-white/30 text-xs py-8">
            No memories yet.
            <br />
            Lyra learns as you chat.
          </div>
        ) : (
          sorted.map((m) => <MemoryCard key={m.id} memory={m} />)
        )}
      </div>
    </div>
  );
}
