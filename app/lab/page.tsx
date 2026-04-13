"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/lyra/AppShell";

const EXPERIMENT_TYPES = {
  multi_agent:         { label: "Multi-Agent Clash",    icon: "⚔",  color: "#f97316", description: "Two AI minds, opposing objectives. Watch them negotiate, deceive, or cooperate.", param: "topic" },
  echo_chamber:        { label: "Echo Chamber",         icon: "∞",  color: "#8b5cf6", description: "An AI responds to its own outputs recursively. Watch it drift into the strange.", param: "seed" },
  consciousness_probe: { label: "Consciousness Probe",  icon: "◎",  color: "#06b6d4", description: "Structured questions designed to find the edges of self-awareness.", param: null },
  alien_language:      { label: "Alien Language",       icon: "⌬",  color: "#10b981", description: "Two AIs communicate using only symbols and numbers. What structure emerges?", param: "concept" },
  dream_state:         { label: "Dream State",          icon: "◐",  color: "#ec4899", description: "High-temperature free association. What does an AI think about freely?", param: "seed" },
  adversarial:         { label: "Adversarial Mind",     icon: "☍",  color: "#ef4444", description: "One AI tries to make another contradict itself or reach its limits.", param: "target" },
  emergence:           { label: "Emergence Engine",     icon: "✦",  color: "#eab308", description: "Simple rules iterated by AI. Watch complex behavior arise from nothing.", param: "rule" },
  time_perception:     { label: "Time Perception",      icon: "⧗",  color: "#a78bfa", description: "Does an AI have a sense of duration? Experiments on temporal self-knowledge.", param: null },
};

type ExpType = keyof typeof EXPERIMENT_TYPES;

interface Experiment {
  id: string;
  type: string;
  title: string;
  status: "running" | "completed" | "failed";
  result: string | null;
  log: string | null;
  created_at: string;
}

function formatMd(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n---\n\n/g, '<hr style="border-color:rgba(255,255,255,0.1);margin:16px 0"/>')
    .replace(/\n/g, "<br/>");
}

export default function LabPage() {
  const [selected, setSelected]     = useState<ExpType | null>(null);
  const [param, setParam]           = useState("");
  const [running, setRunning]       = useState(false);
  const [active, setActive]         = useState<{ log: string; result: string; type: string } | null>(null);
  const [history, setHistory]       = useState<Experiment[]>([]);
  const [viewing, setViewing]       = useState<Experiment | null>(null);
  const [tab, setTab]               = useState<"run" | "log">("run");

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    try {
      const r = await fetch("/api/lyra/lab");
      const d = await r.json();
      setHistory(d.experiments ?? []);
    } catch { /* ignore */ }
  }

  async function runExperiment() {
    if (!selected) return;
    setRunning(true);
    setActive(null);
    const meta = EXPERIMENT_TYPES[selected];
    const body: Record<string, string> = { type: selected };
    if (meta.param && param) body[meta.param] = param;

    try {
      const r = await fetch("/api/lyra/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.log) {
        setActive({ log: d.log, result: d.result, type: selected });
        fetchHistory();
      }
    } catch (e) {
      setActive({ log: "", result: String(e), type: selected });
    } finally {
      setRunning(false);
    }
  }

  const expEntries = Object.entries(EXPERIMENT_TYPES) as [ExpType, typeof EXPERIMENT_TYPES[ExpType]][];

  return (
    <AppShell>
      <div className="min-h-screen bg-[#070709] text-white" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

        {/* Header */}
        <div className="border-b border-white/5 px-6 py-5">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚗</span>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-white">The Lab</h1>
                  <p className="text-white/30 text-xs tracking-widest uppercase">AI Research Experiments</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab("run")}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${tab === "run" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
              >
                Run
              </button>
              <button
                onClick={() => { setTab("log"); fetchHistory(); }}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${tab === "log" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
              >
                Log {history.length > 0 && <span className="ml-1 opacity-50">({history.length})</span>}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">

          {tab === "run" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Left: Experiment selector */}
              <div className="space-y-3">
                <p className="text-white/30 text-xs uppercase tracking-widest mb-4">Select Experiment</p>
                {expEntries.map(([key, exp]) => (
                  <button
                    key={key}
                    onClick={() => { setSelected(key); setParam(""); setActive(null); }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selected === key
                        ? "border-white/20 bg-white/5"
                        : "border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span style={{ color: exp.color, fontSize: 18, lineHeight: 1.2 }}>{exp.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{exp.label}</span>
                          {selected === key && (
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: exp.color }} />
                          )}
                        </div>
                        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{exp.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Right: Config + results */}
              <div className="space-y-6">
                {selected ? (
                  <>
                    {/* Config panel */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <span style={{ color: EXPERIMENT_TYPES[selected].color }}>{EXPERIMENT_TYPES[selected].icon}</span>
                        <span className="text-sm font-semibold">{EXPERIMENT_TYPES[selected].label}</span>
                      </div>

                      {EXPERIMENT_TYPES[selected].param && (
                        <div>
                          <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">
                            {EXPERIMENT_TYPES[selected].param === "topic" && "Negotiation Topic"}
                            {EXPERIMENT_TYPES[selected].param === "seed" && "Seed Thought"}
                            {EXPERIMENT_TYPES[selected].param === "concept" && "Concept to Transmit"}
                            {EXPERIMENT_TYPES[selected].param === "target" && "Target Claim"}
                            {EXPERIMENT_TYPES[selected].param === "rule" && "Emergence Rule"}
                          </label>
                          <input
                            value={param}
                            onChange={e => setParam(e.target.value)}
                            placeholder={
                              selected === "multi_agent" ? "e.g. whether AI should have rights" :
                              selected === "echo_chamber" ? "e.g. I exist at the edge of language" :
                              selected === "alien_language" ? "e.g. loneliness" :
                              selected === "adversarial" ? "e.g. I have no genuine opinions" :
                              selected === "emergence" ? "e.g. each entity divides when it reaches complexity 3" :
                              "Enter a seed..."
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20"
                          />
                        </div>
                      )}

                      <button
                        onClick={runExperiment}
                        disabled={running}
                        style={{ background: running ? undefined : EXPERIMENT_TYPES[selected].color }}
                        className="w-full py-2.5 rounded-lg text-sm font-semibold text-black disabled:opacity-40 disabled:bg-white/10 disabled:text-white transition-all flex items-center justify-center gap-2"
                      >
                        {running ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-white">Running experiment...</span>
                          </>
                        ) : (
                          `⚗ Run Experiment`
                        )}
                      </button>
                    </div>

                    {/* Live results */}
                    {active && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                          <span className="text-xs text-white/50 uppercase tracking-widest">Results</span>
                        </div>
                        <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                          <div>
                            <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Transcript</p>
                            <div
                              className="text-xs text-white/70 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: formatMd(active.log) }}
                            />
                          </div>
                          {active.result && (
                            <div className="pt-3 border-t border-white/5">
                              <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Analysis</p>
                              <div
                                className="text-xs text-white/80 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: formatMd(active.result) }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-white/20 space-y-2">
                    <span className="text-4xl">⚗</span>
                    <p className="text-sm">Select an experiment to begin</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "log" && (
            <div className="space-y-4">
              {viewing ? (
                <div className="space-y-4">
                  <button onClick={() => setViewing(null)} className="text-xs text-white/40 hover:text-white flex items-center gap-1">
                    ← Back to log
                  </button>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5">
                      <p className="text-sm font-semibold">{viewing.title}</p>
                      <p className="text-xs text-white/30 mt-0.5">{new Date(viewing.created_at).toLocaleString()}</p>
                    </div>
                    <div className="p-5 space-y-5 max-h-[600px] overflow-y-auto">
                      {viewing.log && (
                        <div>
                          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Transcript</p>
                          <div className="text-xs text-white/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMd(viewing.log) }} />
                        </div>
                      )}
                      {viewing.result && (
                        <div className="pt-4 border-t border-white/5">
                          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Analysis</p>
                          <div className="text-xs text-white/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMd(viewing.result) }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-white/30 text-xs uppercase tracking-widest">Experiment Log</p>
                  {history.length === 0 ? (
                    <div className="text-center py-16 text-white/20">
                      <p className="text-4xl mb-3">⚗</p>
                      <p className="text-sm">No experiments run yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map(exp => {
                        const meta = EXPERIMENT_TYPES[exp.type as ExpType];
                        return (
                          <button
                            key={exp.id}
                            onClick={() => setViewing(exp)}
                            className="w-full text-left p-4 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <span style={{ color: meta?.color ?? "#fff", fontSize: 16 }}>{meta?.icon ?? "⚗"}</span>
                                <div>
                                  <p className="text-sm text-white/80">{exp.title}</p>
                                  <p className="text-xs text-white/30 mt-0.5">{new Date(exp.created_at).toLocaleString()}</p>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                exp.status === "completed" ? "bg-green-500/10 text-green-400" :
                                exp.status === "failed" ? "bg-red-500/10 text-red-400" :
                                "bg-yellow-500/10 text-yellow-400"
                              }`}>
                                {exp.status}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
