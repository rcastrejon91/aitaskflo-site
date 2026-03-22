"use client";

import { useState, useCallback } from "react";

interface TestResult {
  name: string;
  pass: boolean;
  ms: number;
  detail: string;
  error?: string;
}

interface Scorecard {
  score: number;
  passed: number;
  failed: number;
  total: number;
  totalMs: number;
  grade: string;
  timestamp: string;
  tests: TestResult[];
}

export default function AdminTestsPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [loading, setLoading] = useState(false);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [runError, setRunError] = useState("");

  // ── Auth gate ──────────────────────────────────────────────────────────────
  const handleAuth = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await fetch(`/api/lyra/test-all?key=${encodeURIComponent(key)}`, {
        headers: { "x-admin-key": key },
      });
      if (res.status === 401) {
        setAuthError("Wrong password.");
        return;
      }
      setAuthed(true);
      const data = await res.json();
      setScorecard(data);
    },
    [key]
  );

  // ── Run tests ──────────────────────────────────────────────────────────────
  const runTests = useCallback(async () => {
    setLoading(true);
    setRunError("");
    try {
      const res = await fetch(`/api/lyra/test-all?key=${encodeURIComponent(key)}`, {
        headers: { "x-admin-key": key },
      });
      if (!res.ok) { setRunError(`HTTP ${res.status}`); return; }
      setScorecard(await res.json());
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [key]);

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🔮</div>
            <h1 className="text-white text-xl font-semibold">Lyra Diagnostics</h1>
            <p className="text-white/40 text-sm mt-1">Admin access required</p>
          </div>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Admin password"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-violet-500/60"
          />
          {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3 font-semibold transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const gradeColor: Record<string, string> = {
    A: "text-emerald-400", B: "text-lime-400", C: "text-yellow-400",
    D: "text-orange-400",  F: "text-red-400",
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔮</span>
          <div>
            <h1 className="text-xl font-bold">Lyra Diagnostic Scanner</h1>
            <p className="text-white/40 text-sm">Full system health check</p>
          </div>
        </div>
        <button
          onClick={runTests}
          disabled={loading}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-semibold transition-colors text-sm"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Scanning...
            </>
          ) : (
            <>⚡ Run Diagnostics</>
          )}
        </button>
      </div>

      {runError && (
        <div className="mb-6 bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
          Error: {runError}
        </div>
      )}

      {scorecard && (
        <>
          {/* Score summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
              <span className={`text-5xl font-black ${gradeColor[scorecard.grade] ?? "text-white"}`}>
                {scorecard.grade}
              </span>
              <span className="text-white/40 text-xs mt-1">Grade</span>
            </div>
            <StatCard label="Score" value={`${scorecard.score}%`} />
            <StatCard label="Passed" value={String(scorecard.passed)} color="text-emerald-400" />
            <StatCard label="Failed" value={String(scorecard.failed)} color={scorecard.failed > 0 ? "text-red-400" : "text-white"} />
            <StatCard label="Total time" value={`${(scorecard.totalMs / 1000).toFixed(1)}s`} />
          </div>

          <p className="text-white/30 text-xs mb-4">
            Run at {new Date(scorecard.timestamp).toLocaleString()} · {scorecard.total} tests
          </p>

          {/* Test rows */}
          <div className="space-y-2">
            {scorecard.tests.map((t) => (
              <TestRow key={t.name} test={t} />
            ))}
          </div>
        </>
      )}

      {!scorecard && !loading && (
        <div className="text-center py-20 text-white/30">
          <div className="text-5xl mb-4">🧪</div>
          <p>Click &ldquo;Run Diagnostics&rdquo; to scan all features</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-white/40 text-xs mt-1">{label}</span>
    </div>
  );
}

function TestRow({ test }: { test: TestResult }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-left bg-white/4 hover:bg-white/7 border border-white/10 rounded-xl px-4 py-3 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg flex-shrink-0">
          {test.pass ? "✅" : "❌"}
        </span>
        <span className="flex-1 text-sm font-medium text-white/90 truncate">
          {test.name}
        </span>
        <span className={`text-xs flex-shrink-0 ${test.pass ? "text-emerald-400" : "text-red-400"}`}>
          {test.pass ? "PASS" : "FAIL"}
        </span>
        <span className="text-white/30 text-xs flex-shrink-0 w-12 text-right">
          {test.ms}ms
        </span>
      </div>
      {expanded && (
        <div className="mt-2 ml-8 space-y-1">
          <p className="text-white/60 text-xs break-words">{test.detail}</p>
          {test.error && (
            <p className="text-red-400 text-xs break-words">Error: {test.error}</p>
          )}
        </div>
      )}
    </button>
  );
}
