"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Zap, BookOpen, Trash2, RefreshCw, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/lyra/AppShell";

interface IdeationEntry {
  id: string;
  task: string;
  approaches: string[];
  decided_not: string[];
  reasoning: string;
  created_at: string;
}

interface ExecutionEntry {
  id: string;
  task: string;
  tool_sequence: string[];
  outcome: string;
  success: boolean;
  skill_used: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  usage_count: number;
  success_rate: number;
  status: string;
  created_at: string;
  test_score: string | null;
}

interface MemoryData {
  ideations: IdeationEntry[];
  executions: ExecutionEntry[];
  skills: Skill[];
}

function CollapsibleCard({
  title, count, icon, color, children,
}: {
  title: string; count: number; icon: React.ReactNode;
  color: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span style={{ color }}>{icon}</span>
          <span className="font-semibold text-white text-sm">{title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
            {count}
          </span>
        </div>
        {open ? <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export default function MemoryClient({ userId }: { userId: string }) {
  const [data, setData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/lyra/memory");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function deleteItem(type: "ideation" | "execution" | "skill", id: string) {
    setDeleting(id);
    try {
      await fetch("/api/lyra/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      await load();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen text-white" style={{ background: "#09090f" }}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5" style={{ color: "rgb(196,181,253)" }} />
              Memory Tree
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              What Lyra has planned, executed, and learned — scoped to you
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {loading && !data && (
            <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.3)" }}>
              Loading memory tree…
            </div>
          )}

          {data && (
            <>
              {/* Skills */}
              <CollapsibleCard
                title="Learned Skills"
                count={data.skills.length}
                icon={<Sparkles className="w-4 h-4" />}
                color="rgb(196,181,253)"
              >
                {data.skills.length === 0 ? (
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No skills learned yet.</p>
                ) : (
                  <div className="space-y-3 mt-1">
                    {data.skills.map((s) => {
                      const score = s.test_score ? JSON.parse(s.test_score) as { passed: number; total: number } : null;
                      return (
                        <div key={s.id} className="flex items-start justify-between gap-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white">{s.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                                background: s.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(234,179,8,0.15)",
                                color: s.status === "active" ? "rgb(110,231,183)" : "rgb(252,211,77)",
                              }}>
                                {s.status}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.description}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                              <span>Used {s.usage_count}×</span>
                              <span>{(s.success_rate * 100).toFixed(0)}% success</span>
                              {score && <span>Tests: {score.passed}/{score.total}</span>}
                              <span>{s.created_at.slice(0, 10)}</span>
                            </div>
                          </div>
                          <button onClick={() => deleteItem("skill", s.id)} disabled={deleting === s.id}
                            className="p-1.5 rounded-lg opacity-30 hover:opacity-70 transition-opacity flex-shrink-0"
                            style={{ color: "rgb(248,113,113)" }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleCard>

              {/* Execution Memory */}
              <CollapsibleCard
                title="What Worked (Execution Memory)"
                count={data.executions.length}
                icon={<Zap className="w-4 h-4" />}
                color="rgb(110,231,183)"
              >
                {data.executions.length === 0 ? (
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No execution patterns recorded yet.</p>
                ) : (
                  <div className="space-y-3 mt-1">
                    {data.executions.map((e) => (
                      <div key={e.id} className="flex items-start justify-between gap-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-white truncate">{e.task}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{
                              background: e.success ? "rgba(16,185,129,0.15)" : "rgba(248,113,113,0.15)",
                              color: e.success ? "rgb(110,231,183)" : "rgb(248,113,113)",
                            }}>
                              {e.success ? "success" : "failed"}
                            </span>
                          </div>
                          {e.tool_sequence.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {e.tool_sequence.map((t, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                                  style={{ background: "rgba(79,70,229,0.15)", color: "rgb(165,180,252)" }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                            {e.created_at.slice(0, 10)}{e.skill_used ? ` · skill: ${e.skill_used}` : ""}
                          </div>
                        </div>
                        <button onClick={() => deleteItem("execution", e.id)} disabled={deleting === e.id}
                          className="p-1.5 rounded-lg opacity-30 hover:opacity-70 transition-opacity flex-shrink-0"
                          style={{ color: "rgb(248,113,113)" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleCard>

              {/* Ideation Memory */}
              <CollapsibleCard
                title="Planning & Reasoning (Ideation Memory)"
                count={data.ideations.length}
                icon={<BookOpen className="w-4 h-4" />}
                color="rgb(251,191,36)"
              >
                {data.ideations.length === 0 ? (
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No planning records yet.</p>
                ) : (
                  <div className="space-y-3 mt-1">
                    {data.ideations.map((entry) => (
                      <div key={entry.id} className="flex items-start justify-between gap-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white mb-1 truncate">{entry.task}</p>
                          {entry.decided_not.length > 0 && (
                            <p className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                              ✗ Decided not to: {entry.decided_not.join("; ")}
                            </p>
                          )}
                          {entry.reasoning && (
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                              → {entry.reasoning.slice(0, 120)}
                            </p>
                          )}
                          <div className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                            {entry.created_at.slice(0, 10)}
                          </div>
                        </div>
                        <button onClick={() => deleteItem("ideation", entry.id)} disabled={deleting === entry.id}
                          className="p-1.5 rounded-lg opacity-30 hover:opacity-70 transition-opacity flex-shrink-0"
                          style={{ color: "rgb(248,113,113)" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleCard>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
