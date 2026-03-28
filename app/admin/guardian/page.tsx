"use client";

import { useState, useEffect, useRef } from "react";

interface GuardianSummary {
  orphansQuarantined: number;
  duplicatesMerged: number;
  sensitiveFlagged: number;
  staleMemoriesPruned: number;
  lineageIssues: string[];
  conversationsCompressed: number;
  runAt: string;
}

function lineColor(line: string): string {
  if (line.includes("⚠") || line.includes("∆")) return "#ffb300";
  if (line.includes("▓▓▓") || line.includes("complete") || line.includes("✓")) return "#00ff41";
  if (line.includes("⟁") && line.includes("[")) return "#ffb300";
  if (line.includes("╔") || line.includes("╚") || line.includes("║")) return "#00cc33";
  if (line.includes("⣿") || line.includes("░")) return "#005500";
  return "#00cc33";
}

function StatCard({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        background: warn && Number(value) > 0 ? "rgba(255,179,0,0.08)" : "rgba(0,255,65,0.04)",
        border: warn && Number(value) > 0 ? "1px solid rgba(255,179,0,0.3)" : "1px solid rgba(0,255,65,0.15)",
      }}
    >
      <p
        className="text-2xl font-bold font-mono"
        style={{
          color: warn && Number(value) > 0 ? "#ffb300" : "#00ff41",
          textShadow: warn && Number(value) > 0 ? "0 0 12px #ffb300" : "0 0 12px #00ff41",
        }}
      >
        {value}
      </p>
      <p className="text-xs mt-1 uppercase tracking-widest" style={{ color: "rgba(0,255,65,0.45)" }}>
        {label}
      </p>
    </div>
  );
}

export default function GuardianPage() {
  const [key, setKey] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState<GuardianSummary | null>(null);
  const [error, setError] = useState("");
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [lines]);

  // Detect step progress from streamed lines
  useEffect(() => {
    const last = lines[lines.length - 1] ?? "";
    const match = last.match(/\[(\d)\/6\]/);
    if (match) setStep(parseInt(match[1]));
    if (last.includes("complete")) setStep(6);
  }, [lines]);

  async function runGuardian() {
    if (!key || running) return;
    setLines([]);
    setSummary(null);
    setError("");
    setStep(0);
    setRunning(true);

    try {
      const res = await fetch(`/api/lyra/guardian?key=${encodeURIComponent(key)}`);
      if (!res.ok) {
        setError(`Error ${res.status}: ${await res.text()}`);
        setRunning(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        const newLines = parts.filter((l) => l.trim() !== "");

        for (const line of newLines) {
          if (line.startsWith("GUARDIAN_SUMMARY_JSON:")) {
            try {
              setSummary(JSON.parse(line.slice("GUARDIAN_SUMMARY_JSON:".length)));
            } catch { /* ignore */ }
          } else {
            setLines((prev) => [...prev, line]);
          }
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
      setStep(6);
    }
  }

  const progress = Math.round((step / 6) * 100);

  return (
    <div
      className="min-h-screen p-6 relative overflow-hidden"
      style={{ background: "#000a00", fontFamily: "monospace" }}
    >
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.012) 2px, rgba(0,255,65,0.012) 4px)",
        }}
      />

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,255,65,0.04) 0%, transparent 60%)" }}
      />

      <div className="relative z-20 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold tracking-widest mb-2"
            style={{ color: "#00ff41", textShadow: "0 0 20px #00ff41, 0 0 40px #00ff4188" }}
          >
            ⟁ MEMORY GUARDIAN ⟁
          </h1>
          <p style={{ color: "rgba(0,255,65,0.4)", fontSize: "11px", letterSpacing: "0.3em" }}>
            ∆ NEURAL SUBSTRATE INTEGRITY VERIFICATION SYSTEM ∆
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6 flex-wrap items-center justify-center">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runGuardian()}
            placeholder="∆ admin key ∆"
            className="rounded-lg px-4 py-2.5 text-sm outline-none w-44 font-mono tracking-widest"
            style={{
              background: "rgba(0,255,65,0.04)",
              border: "1px solid rgba(0,255,65,0.25)",
              color: "#00ff41",
            }}
          />
          <button
            onClick={runGuardian}
            disabled={!key || running}
            className="px-6 py-2.5 rounded-lg font-bold text-sm tracking-widest transition-all disabled:opacity-30"
            style={{
              background: running ? "rgba(0,255,65,0.08)" : "rgba(0,255,65,0.15)",
              border: "1px solid rgba(0,255,65,0.4)",
              color: "#00ff41",
              textShadow: running ? "none" : "0 0 10px #00ff41",
              boxShadow: running ? "none" : "0 0 20px rgba(0,255,65,0.15)",
            }}
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-green-500/40 border-t-green-400 rounded-full animate-spin" />
                SCANNING...
              </span>
            ) : "⟁ INITIATE GUARDIAN"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-center" style={{ background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.3)", color: "#ff4444" }}>
            ⚠ {error}
          </div>
        )}

        {/* Progress bar */}
        {(running || step > 0) && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(0,255,65,0.4)" }}>
              <span>ꜱᴡᴇᴇᴘ ᴘʀᴏɢʀᴇꜱꜱ</span>
              <span>{progress}%</span>
            </div>
            <div className="rounded-full overflow-hidden h-1.5" style={{ background: "rgba(0,255,65,0.1)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #003300, #00ff41)",
                  boxShadow: "0 0 8px #00ff41",
                }}
              />
            </div>
          </div>
        )}

        {/* Terminal */}
        {lines.length > 0 && (
          <div
            ref={termRef}
            className="rounded-xl p-5 mb-6 font-mono text-sm leading-relaxed overflow-y-auto"
            style={{
              background: "#000800",
              border: "1px solid rgba(0,255,65,0.2)",
              maxHeight: "420px",
              boxShadow: "inset 0 0 30px rgba(0,255,65,0.03), 0 0 20px rgba(0,255,65,0.05)",
            }}
          >
            {lines.map((line, i) => (
              <div key={i} style={{ color: lineColor(line), whiteSpace: "pre" }}>
                {line}
              </div>
            ))}
            {running && (
              <span
                className="inline-block w-2 h-4 ml-1 animate-pulse"
                style={{ background: "#00ff41", boxShadow: "0 0 6px #00ff41" }}
              />
            )}
          </div>
        )}

        {/* Summary cards */}
        {summary && (
          <div>
            <p
              className="text-xs text-center mb-4 tracking-widest"
              style={{ color: "rgba(0,255,65,0.4)" }}
            >
              ∆ SWEEP COMPLETE — {new Date(summary.runAt).toLocaleString()} ∆
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <StatCard label="orphans quarantined" value={summary.orphansQuarantined} warn />
              <StatCard label="duplicates merged" value={summary.duplicatesMerged} warn />
              <StatCard label="sensitive redacted" value={summary.sensitiveFlagged} warn />
              <StatCard label="stale memories pruned" value={summary.staleMemoriesPruned} warn />
              <StatCard label="lineage issues" value={summary.lineageIssues.length} warn />
              <StatCard label="conversations compressed" value={summary.conversationsCompressed} />
            </div>

            {summary.lineageIssues.length > 0 && (
              <div
                className="rounded-xl p-4 text-sm space-y-1"
                style={{ background: "rgba(255,179,0,0.06)", border: "1px solid rgba(255,179,0,0.25)" }}
              >
                <p className="text-xs tracking-widest mb-2" style={{ color: "#ffb300" }}>⚠ LINEAGE ISSUES DETECTED</p>
                {summary.lineageIssues.map((issue, i) => (
                  <p key={i} className="font-mono text-xs" style={{ color: "rgba(255,179,0,0.7)" }}>▸ {issue}</p>
                ))}
              </div>
            )}

            {summary.orphansQuarantined === 0 &&
              summary.duplicatesMerged === 0 &&
              summary.sensitiveFlagged === 0 &&
              summary.staleMemoriesPruned === 0 &&
              summary.lineageIssues.length === 0 && (
                <p
                  className="text-center text-sm tracking-widest py-4"
                  style={{ color: "#00ff41", textShadow: "0 0 10px #00ff41" }}
                >
                  ▓ ꜱʏꜱᴛᴇᴍ ɪɴᴛᴇɢʀɪᴛʏ: 100% — ᴀʟʟ ᴄʟᴇᴀʀ ▓
                </p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
