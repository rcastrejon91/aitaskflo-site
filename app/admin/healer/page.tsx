"use client";

import { useState } from "react";

interface Pattern {
  id: string;
  name: string;
  severity: "critical" | "warning" | "info";
  excerpt?: string;
}

interface Patch {
  file: string;
  search: string;
  replace: string;
}

interface Diagnosis {
  summary: string;
  rootCause: string;
  fix: string;
  filesToRead: string[];
  patch?: Patch[];
}

interface HealEvent {
  id: string;
  ts: string;
  patterns: string[];
  summary: string;
  rootCause: string;
  fix: string;
  patchApplied: boolean;
  buildOk: boolean | null;
  buildOutput: string;
  log: string;
}

interface ScanResult {
  patterns: Pattern[];
  logTail: string;
}

interface DiagnoseResult {
  patterns: Pattern[];
  diagnosis: Diagnosis;
  context: Record<string, string>;
}

const severityColor = (s: string) =>
  s === "critical" ? "text-red-400 bg-red-950/40 border-red-500/30" :
  s === "warning"  ? "text-yellow-400 bg-yellow-950/30 border-yellow-500/30" :
                     "text-blue-400 bg-blue-950/30 border-blue-500/30";

const severityDot = (s: string) =>
  s === "critical" ? "bg-red-500" :
  s === "warning"  ? "bg-yellow-500" : "bg-blue-500";

export default function HealerPage() {
  const [key, setKey]               = useState("");
  const [status, setStatus]         = useState<"idle" | "loading" | "done" | "error">("idle");
  const [action, setAction]         = useState<"scan" | "diagnose" | "heal">("scan");
  const [scan, setScan]             = useState<ScanResult | null>(null);
  const [diagnosis, setDiagnosis]   = useState<DiagnoseResult | null>(null);
  const [healEvent, setHealEvent]   = useState<HealEvent | null>(null);
  const [history, setHistory]       = useState<HealEvent[] | null>(null);
  const [error, setError]           = useState("");
  const [cleanResult, setCleanResult] = useState<{ memories: { removed: number; kept: number }; learnings: { removed: number; kept: number } } | null>(null);

  async function callHealer(act: string) {
    if (!key) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`/api/lyra/healer?action=${act}&key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); setStatus("error"); return; }
      if (act === "scan")     { setScan(data as ScanResult); }
      if (act === "diagnose") { setDiagnosis(data as DiagnoseResult); }
      if (act === "heal")     { setHealEvent(data as HealEvent); }
      if (act === "history")       { setHistory((data as { history: HealEvent[] }).history); }
      if (act === "clean_memories") { setCleanResult(data); }
      setStatus("done");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  const loading = status === "loading";

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Lyra Healing AI</h1>
        <p className="text-white/40 text-sm">
          Autonomous log analysis, root-cause diagnosis, and code patch application with build verification.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Admin password"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 w-48"
        />

        {(["scan", "diagnose", "heal"] as const).map((a) => (
          <button
            key={a}
            onClick={() => { setAction(a); callHealer(a); }}
            disabled={loading || !key}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 flex items-center gap-2 ${
              a === "heal"
                ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                : a === "diagnose"
                ? "bg-violet-700 hover:bg-violet-600 text-white"
                : "bg-white/10 hover:bg-white/15 text-white"
            }`}
          >
            {loading && action === a ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {a === "heal" ? "Healing…" : a === "diagnose" ? "Diagnosing…" : "Scanning…"}
              </>
            ) : (
              a === "heal" ? "⚕ Heal" : a === "diagnose" ? "🔍 Diagnose" : "📋 Scan"
            )}
          </button>
        ))}

        <button
          onClick={() => { setAction("scan"); callHealer("clean_memories"); }}
          disabled={loading || !key}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-amber-700/60 hover:bg-amber-600/60 text-amber-200 transition-colors disabled:opacity-40"
        >
          🧹 Clean Memories
        </button>

        <button
          onClick={() => callHealer("history")}
          disabled={loading || !key}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 text-white/60 transition-colors disabled:opacity-40"
        >
          History
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Clean memories result */}
      {cleanResult && (
        <section className="mb-8 p-4 rounded-xl border border-amber-500/25 bg-amber-950/20 text-sm space-y-1">
          <p className="font-semibold text-amber-300">Memory cleanup complete</p>
          <p className="text-white/60">Memories: <span className="text-white">{cleanResult.memories.removed} removed</span>, {cleanResult.memories.kept} kept</p>
          <p className="text-white/60">Learnings: <span className="text-white">{cleanResult.learnings.removed} removed</span>, {cleanResult.learnings.kept} kept</p>
        </section>
      )}

      {/* Scan result */}
      {scan && (
        <section className="mb-8 space-y-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Detected Patterns</h2>
          {scan.patterns.length === 0 ? (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm text-white/40">
              No known patterns detected. Log looks healthy.
            </div>
          ) : (
            scan.patterns.map((p) => (
              <div key={p.id} className={`p-4 rounded-xl border text-sm ${severityColor(p.severity)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${severityDot(p.severity)}`} />
                  <span className="font-semibold">{p.name}</span>
                  <span className="ml-auto text-xs opacity-60 uppercase">{p.severity}</span>
                </div>
                {p.excerpt && (
                  <pre className="mt-2 text-[11px] font-mono opacity-70 whitespace-pre-wrap break-all bg-black/20 rounded p-2 max-h-32 overflow-auto">
                    {p.excerpt}
                  </pre>
                )}
              </div>
            ))
          )}

          <details className="group">
            <summary className="cursor-pointer text-xs text-white/30 hover:text-white/50 select-none">
              Show log tail ▸
            </summary>
            <pre className="mt-2 text-[11px] font-mono text-white/40 bg-black/30 rounded-xl p-4 max-h-64 overflow-auto whitespace-pre-wrap break-all border border-white/[0.05]">
              {scan.logTail}
            </pre>
          </details>
        </section>
      )}

      {/* Diagnosis result */}
      {diagnosis && (
        <section className="mb-8 space-y-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Diagnosis</h2>

          <div className="rounded-2xl border border-white/[0.08] overflow-hidden divide-y divide-white/[0.05]">
            <div className="p-4">
              <p className="text-xs text-white/35 mb-1">Summary</p>
              <p className="text-sm text-white/85">{diagnosis.diagnosis.summary}</p>
            </div>
            <div className="p-4">
              <p className="text-xs text-white/35 mb-1">Root Cause</p>
              <p className="text-sm text-white/70 font-mono">{diagnosis.diagnosis.rootCause}</p>
            </div>
            <div className="p-4">
              <p className="text-xs text-white/35 mb-1">Proposed Fix</p>
              <p className="text-sm text-white/70">{diagnosis.diagnosis.fix}</p>
            </div>
          </div>

          {diagnosis.diagnosis.patch && diagnosis.diagnosis.patch.length > 0 && (
            <div>
              <p className="text-xs text-white/35 mb-2">Proposed Patches ({diagnosis.diagnosis.patch.length})</p>
              <div className="space-y-3">
                {diagnosis.diagnosis.patch.map((p, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-xs font-mono text-violet-400 mb-2">{p.file}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-red-400/60 mb-1">Remove</p>
                        <pre className="text-[11px] font-mono text-red-300/70 bg-red-950/20 rounded p-2 max-h-24 overflow-auto whitespace-pre-wrap break-all">{p.search}</pre>
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-400/60 mb-1">Replace with</p>
                        <pre className="text-[11px] font-mono text-emerald-300/70 bg-emerald-950/20 rounded p-2 max-h-24 overflow-auto whitespace-pre-wrap break-all">{p.replace}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Heal result */}
      {healEvent && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Heal Result</h2>
          <HealCard event={healEvent} />
        </section>
      )}

      {/* History */}
      {history !== null && (
        <section className="mb-8 space-y-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
            Heal History ({history.length})
          </h2>
          {history.length === 0 ? (
            <div className="p-4 rounded-xl border border-white/[0.06] text-sm text-white/40">No heal events yet.</div>
          ) : (
            [...history].reverse().map((e) => <HealCard key={e.id} event={e} />)
          )}
        </section>
      )}
    </div>
  );
}

function HealCard({ event }: { event: HealEvent }) {
  const [open, setOpen] = useState(false);
  const buildStatus =
    event.buildOk === true  ? "text-emerald-400" :
    event.buildOk === false ? "text-red-400" : "text-white/30";

  return (
    <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80 mb-1 truncate">{event.summary || "(no summary)"}</p>
          <p className="text-xs text-white/40 font-mono">{event.rootCause}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className={event.patchApplied ? "text-emerald-400" : "text-white/30"}>
              {event.patchApplied ? "✓ patched" : "no patch"}
            </span>
            <span className={buildStatus}>
              {event.buildOk === true ? "✓ build ok" : event.buildOk === false ? "✗ build failed" : ""}
            </span>
          </div>
          <p className="text-[10px] text-white/20">{new Date(event.ts).toLocaleString()}</p>
        </div>
      </div>

      {event.buildOutput && (
        <div className="border-t border-white/[0.05]">
          <button
            onClick={() => setOpen(!open)}
            className="w-full text-left px-4 py-2 text-[11px] text-white/30 hover:text-white/50 transition-colors"
          >
            {open ? "Hide build output ▴" : "Show build output ▾"}
          </button>
          {open && (
            <pre className="px-4 pb-4 text-[11px] font-mono text-white/40 max-h-48 overflow-auto whitespace-pre-wrap break-all">
              {event.buildOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
