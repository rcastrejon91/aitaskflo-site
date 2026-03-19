"use client";

import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, TrendingDown, BookOpen } from "lucide-react";
import type { Reflection } from "@/lib/types/lyra";

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 8 ? "#22c55e" : score >= 5 ? "#a855f7" : "#ef4444";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold tabular-nums" style={{ color }}>
        {score}/10
      </span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function ReflectionCard({ reflection, index }: { reflection: Reflection; index: number }) {
  const date = new Date(reflection.createdAt);
  const timeLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-white/10 rounded-xl p-3 mb-3 bg-white/3 hover:bg-white/5 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-white/70 text-xs leading-relaxed flex-1 pr-3">
          {reflection.conversationSummary}
        </p>
        <span className="text-white/30 text-xs whitespace-nowrap">{timeLabel}</span>
      </div>

      <ScoreBar score={reflection.score} />

      <div className="mt-3 space-y-2">
        {reflection.whatWentWell.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400 text-xs font-medium">Went well</span>
            </div>
            <ul className="space-y-0.5">
              {reflection.whatWentWell.map((item, i) => (
                <li key={i} className="text-xs text-white/50 pl-4">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {reflection.whatToImprove.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-3 h-3 text-orange-400" />
              <span className="text-orange-400 text-xs font-medium">To improve</span>
            </div>
            <ul className="space-y-0.5">
              {reflection.whatToImprove.map((item, i) => (
                <li key={i} className="text-xs text-white/50 pl-4">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {reflection.lessonsLearned.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <BookOpen className="w-3 h-3 text-purple-400" />
              <span className="text-purple-400 text-xs font-medium">Lessons</span>
            </div>
            <ul className="space-y-0.5">
              {reflection.lessonsLearned.map((item, i) => (
                <li key={i} className="text-xs text-white/50 pl-4">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface Props {
  reflections: Reflection[];
  agentId?: string;
}

export function ReflectionLog({ reflections, agentId }: Props) {
  const filtered = agentId
    ? reflections.filter((r) => r.agentId === agentId)
    : reflections;

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const avgScore =
    sorted.length > 0
      ? sorted.reduce((sum, r) => sum + r.score, 0) / sorted.length
      : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-white">
            Reflections{" "}
            <span className="text-white/40 font-normal">({sorted.length})</span>
          </span>
        </div>
        {avgScore > 0 && (
          <span className="text-xs text-white/50">
            avg{" "}
            <span className="text-purple-400 font-semibold">
              {avgScore.toFixed(1)}/10
            </span>
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="text-center text-white/30 text-xs py-8">
            No reflections yet.
            <br />
            End a conversation to generate one.
          </div>
        ) : (
          sorted.map((r, i) => (
            <ReflectionCard key={r.id} reflection={r} index={i} />
          ))
        )}
      </div>
    </div>
  );
}
