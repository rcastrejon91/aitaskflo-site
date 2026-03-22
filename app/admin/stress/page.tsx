"use client";

import { useState } from "react";

interface TestStats {
  name: string;
  runs: number;
  passed: number;
  failed: number;
  passRate: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  errors: string[];
}

interface StressResult {
  mode: string;
  concurrency: number;
  overallPassRate: number;
  totalRuns: number;
  totalPassed: number;
  totalFailed: number;
  wallMs: number;
  memoryDeltaMb: number;
  grade: string;
  timestamp: string;
  tests: TestStats[];
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 bg-white/[0.04] rounded-xl border border-white/[0.06]">
      <span className="text-[10px] text-white/35 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-mono font-semibold text-white/85">{value}</span>
    </div>
  );
}

export default function StressPage() {
  const [key, setKey]         = useState("");
  const [mode, setMode]       = useState<"fast" | "full">("fast");
  const [conc, setConc]       = useState(10);
  const [running, setRunning] = useState(false);
  const [result, setResult]   = useState<StressResult | null>(null);
  const [error, setError]     = useState("");

  async function run() {
    if (!key) return;
    setRunning(true);
    setResult(null);
    setError("");
    try {
      const res = await fetch(
        `/api/lyra/stress-test?key=${encodeURIComponent(key)}&mode=${mode}&c=${conc}`
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setResult(data as StressResult);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  const gradeColor = (g: string) =>
    g === "A" ? "text-emerald-400" :
    g === "B" ? "text-green-400" :
    g === "C" ? "text-yellow-400" :
    g === "D" ? "text-orange-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Lyra Stress Test</h1>
        <p className="text-white/40 text-sm">
          Fast mode: 100 runs × 6 free tools + 50 NPC calls — Full mode adds 20 runs × 6 AI tools
        </p>
      </div>

      {/* Config */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Admin password"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 w-48"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "fast" | "full")}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
        >
          <option value="fast">Fast (free tools only)</option>
          <option value="full">Full (includes AI tools)</option>
        </select>
        <select
          value={conc}
          onChange={(e) => setConc(Number(e.target.value))}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
        >
          {[1, 5, 10, 15, 20].map((n) => (
            <option key={n} value={n}>{n} concurrent</option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={running || !key}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
        >
          {running ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Running…
            </>
          ) : "Run Stress Test"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-sm text-red-300">
          {error}
        </div>
      )}

      {running && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">
            {mode === "fast" ? "Running 650+ requests…" : "Running 770+ requests (AI tools take ~2 min)…"}
          </p>
        </div>
      )}

      {result && !running && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <span className={`text-5xl font-black ${gradeColor(result.grade)}`}>{result.grade}</span>
              <span className="text-xs text-white/30 mt-1">Overall grade</span>
            </div>
            <StatPill label="Pass rate" value={`${result.overallPassRate}%`} />
            <StatPill label="Total runs" value={result.totalRuns.toLocaleString()} />
            <StatPill label="Failed" value={result.totalFailed} />
            <StatPill label="Wall time" value={`${(result.wallMs / 1000).toFixed(1)}s`} />
            <StatPill label="Concurrency" value={result.concurrency} />
            <StatPill label="Mem delta" value={`${result.memoryDeltaMb > 0 ? "+" : ""}${result.memoryDeltaMb} MB`} />
            <StatPill label="Mode" value={result.mode} />
          </div>

          {/* Per-test table */}
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-white/[0.06] text-[10px] text-white/35 uppercase tracking-wide">
              <span>Test</span>
              <span className="text-right">Rate</span>
              <span className="text-right">p50</span>
              <span className="text-right">p95</span>
              <span className="text-right">p99</span>
              <span className="text-right">min</span>
              <span className="text-right">max</span>
            </div>
            {result.tests.map((t) => {
              const rateColor = t.passRate >= 95 ? "text-emerald-400" : t.passRate >= 80 ? "text-yellow-400" : "text-red-400";
              const barColor  = t.passRate >= 95 ? "bg-emerald-500" : t.passRate >= 80 ? "bg-yellow-500" : "bg-red-500";
              return (
                <div key={t.name} className="border-b border-white/[0.04] last:border-0">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-x-4 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors">
                    <div>
                      <div className="text-sm text-white/85 mb-1">{t.name}</div>
                      <Bar pct={t.passRate} color={barColor} />
                    </div>
                    <span className={`text-sm font-mono font-semibold ${rateColor} text-right`}>{t.passRate}%</span>
                    <span className="text-xs font-mono text-white/50 text-right">{t.p50}ms</span>
                    <span className="text-xs font-mono text-white/50 text-right">{t.p95}ms</span>
                    <span className="text-xs font-mono text-white/50 text-right">{t.p99}ms</span>
                    <span className="text-xs font-mono text-white/30 text-right">{t.min}ms</span>
                    <span className="text-xs font-mono text-white/30 text-right">{t.max}ms</span>
                  </div>
                  {t.errors.length > 0 && (
                    <div className="px-4 pb-3 space-y-1">
                      {t.errors.map((e, i) => (
                        <p key={i} className="text-[10px] text-red-400/70 font-mono">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-white/20 text-right">
            Run at {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
