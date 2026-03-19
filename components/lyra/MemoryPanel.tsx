"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Plus, Star, Clock, Users } from "lucide-react";
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

interface Props {
  memories: Memory[];
  activeAgentId: string;
  onMemoryAdded: () => void;
}

function MemoryCard({ memory }: { memory: Memory }) {
  const colorClass = IMPORTANCE_COLOR[memory.importance];
  const glowClass = IMPORTANCE_GLOW[memory.importance];
  const ageMs = Date.now() - new Date(memory.createdAt).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const ageLabel = ageDays === 0 ? "today" : ageDays === 1 ? "1d ago" : `${ageDays}d ago`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-xl p-3 shadow-lg ${glowClass} ${colorClass} mb-2`}
    >
      <p className="text-white/90 text-sm leading-relaxed mb-2">{memory.content}</p>
      <div className="flex items-center gap-3 text-xs opacity-60">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {ageLabel}
        </span>
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3" />
          {memory.accessCount}x accessed
        </span>
        {memory.type === "shared" && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            shared
          </span>
        )}
        {memory.tags.length > 0 && (
          <span className="flex gap-1 flex-wrap">
            {memory.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded bg-white/10">
                {tag}
              </span>
            ))}
          </span>
        )}
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
