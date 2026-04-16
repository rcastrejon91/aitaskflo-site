"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AgentRow {
  agent_name: string;
  episodes: number;
  avg_reward: number;
  avg_task_completion: number;
  avg_quality: number;
  avg_tool_precision: number;
  avg_iterations: number;
  avg_wall_ms: number;
  successes: number;
}

interface RewardDay {
  date: string;
  avg_reward: number;
  episodes: number;
}

interface PolicyRow {
  version: number;
  baseline_reward: number | null;
  champion_reward: number | null;
  status: string;
  created_at: string;
  promotion_reason?: string;
}

interface BenchmarkData {
  summary: { totalEpisodes: number; avgReward: number };
  byAgent: AgentRow[];
  rewardOverTime: RewardDay[];
  policies: PolicyRow[];
  generatedAt: string;
}

interface Episode {
  id: string;
  task: string;
  agent_name: string;
  terminal_state: "success" | "failure" | "low_confidence" | "timeout";
  reward_total: number | null;
  total_iterations: number;
  wall_ms: number;
  created_at: string;
}

interface EpisodesData {
  episodes: Episode[];
  count: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return "—";
  return n.toFixed(decimals);
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";

// ── Reward Trend SVG Chart ────────────────────────────────────────────────────

function RewardChart({ data }: { data: RewardDay[] }) {
  if (!data.length) {
    return (
      <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">
        No reward data yet
      </div>
    );
  }

  const W = 800;
  const H = 160;
  const PAD = { top: 12, right: 16, bottom: 32, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const rewards = data.map((d) => d.avg_reward);
  const minR = Math.min(...rewards);
  const maxR = Math.max(...rewards);
  const rRange = maxR - minR || 0.1;

  const xOf = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const yOf = (r: number) => PAD.top + innerH - ((r - minR) / rRange) * innerH;

  const points = data.map((d, i) => `${xOf(i)},${yOf(d.avg_reward)}`).join(" ");
  const firstX = xOf(0);
  const lastX = xOf(data.length - 1);
  const baseY = PAD.top + innerH;

  const fillPoints = `${firstX},${baseY} ${points} ${lastX},${baseY}`;

  // Y-axis labels: 3 ticks
  const yTicks = [0, 0.5, 1].map((t) => ({
    value: minR + t * rRange,
    y: yOf(minR + t * rRange),
  }));

  // X-axis: show first, middle, last
  const xLabels = [0, Math.floor((data.length - 1) / 2), data.length - 1]
    .filter((i, pos, arr) => arr.indexOf(i) === pos && i < data.length)
    .map((i) => ({ label: data[i].date.slice(5), x: xOf(i) }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-40"
      preserveAspectRatio="none"
    >
      {/* Grid lines */}
      {yTicks.map((t) => (
        <line
          key={t.value}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={t.y}
          y2={t.y}
          stroke="#27272a"
          strokeWidth="1"
        />
      ))}

      {/* Fill area */}
      <polygon
        points={fillPoints}
        fill="rgba(124,58,237,0.15)"
      />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={xOf(i)}
          cy={yOf(d.avg_reward)}
          r="3"
          fill="#7c3aed"
          stroke="#0a0a0a"
          strokeWidth="1.5"
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((t) => (
        <text
          key={t.value}
          x={PAD.left - 6}
          y={t.y + 4}
          textAnchor="end"
          fill="#71717a"
          fontSize="10"
        >
          {fmt(t.value)}
        </text>
      ))}

      {/* X-axis labels */}
      {xLabels.map((l) => (
        <text
          key={l.x}
          x={l.x}
          y={H - 4}
          textAnchor="middle"
          fill="#71717a"
          fontSize="10"
        >
          {l.label}
        </text>
      ))}
    </svg>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "success"
      ? "bg-emerald-900/40 text-emerald-400 border border-emerald-800/50"
      : status === "failure"
      ? "bg-red-900/40 text-red-400 border border-red-800/50"
      : status === "low_confidence"
      ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800/50"
      : "bg-zinc-800 text-zinc-400 border border-zinc-700";

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({
  msg,
  ok,
  onClose,
}: {
  msg: string;
  ok: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl border text-sm font-medium shadow-xl transition-all ${
        ok
          ? "bg-emerald-950 border-emerald-700 text-emerald-300"
          : "bg-red-950 border-red-700 text-red-300"
      }`}
    >
      {msg}
      <button onClick={onClose} className="ml-3 opacity-60 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RLDashboardPage() {
  const [bench, setBench] = useState<BenchmarkData | null>(null);
  const [eps, setEps] = useState<EpisodesData | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scoringBacklog, setScoringBacklog] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [reportCopied, setReportCopied] = useState(false);

  const adminKey = ADMIN_KEY;
  const hasAdminKey = adminKey.length > 0;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [benchRes, epsRes, reportRes] = await Promise.all([
        fetch("/api/lyra/rl/benchmark"),
        fetch("/api/lyra/rl/episodes?limit=20"),
        fetch("/api/lyra/rl/report"),
      ]);

      if (!benchRes.ok) throw new Error(`Benchmark fetch failed: ${benchRes.status}`);
      if (!epsRes.ok) throw new Error(`Episodes fetch failed: ${epsRes.status}`);

      const benchData: BenchmarkData = await benchRes.json();
      const epsData: EpisodesData = await epsRes.json();
      const reportText = reportRes.ok ? await reportRes.text() : "Report unavailable.";

      setBench(benchData);
      setEps(epsData);
      setReport(reportText);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleScoreBacklog() {
    if (!hasAdminKey) return;
    setScoringBacklog(true);
    try {
      const res = await fetch("/api/lyra/rl/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ batch: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Score failed");
      setToast({ msg: `Scored ${data.scored} episodes (${data.failed} failed)`, ok: true });
      fetchAll();
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setScoringBacklog(false);
    }
  }

  async function handleOptimize() {
    if (!hasAdminKey) return;
    setOptimizing(true);
    try {
      const res = await fetch("/api/lyra/rl/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Optimization failed");
      const promoted = data.promoted ? "Policy promoted!" : "No promotion";
      setToast({
        msg: `${promoted} — Δ${fmt(data.improvement)} reward over ${data.episodesAnalyzed} episodes`,
        ok: true,
      });
      fetchAll();
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setOptimizing(false);
    }
  }

  async function handleCopyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2000);
  }

  const passRate =
    bench && bench.summary.totalEpisodes > 0
      ? ((bench.byAgent.reduce((sum, a) => sum + a.successes, 0) /
          bench.summary.totalEpisodes) *
          100
        ).toFixed(1)
      : "—";

  const policyCount = bench?.policies?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <a href="/lyra" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                ← Lyra
              </a>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-300 text-sm font-medium">RL Environment</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Lyra RL Environment</h1>
            <p className="text-zinc-400 text-sm mt-1">Live reinforcement learning data</p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-xl text-sm transition-colors disabled:opacity-40 self-start"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 8a6 6 0 1 0 1-3" strokeLinecap="round" />
              <path d="M2 2v4h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm mb-6">
            {error}
          </div>
        )}

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Total Episodes",
              value: loading ? "…" : String(bench?.summary.totalEpisodes ?? 0),
              accent: false,
            },
            {
              label: "Avg Reward",
              value: loading ? "…" : fmt(bench?.summary.avgReward),
              accent: true,
            },
            {
              label: "Policy Versions",
              value: loading ? "…" : String(policyCount),
              accent: false,
            },
            {
              label: "Pass Rate",
              value: loading ? "…" : `${passRate}%`,
              accent: false,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
            >
              <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
              <p
                className={`text-2xl font-bold ${
                  card.accent ? "text-violet-400" : "text-white"
                }`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={handleScoreBacklog}
            disabled={scoringBacklog || !hasAdminKey}
            title={!hasAdminKey ? "Set NEXT_PUBLIC_ADMIN_PASSWORD to enable" : undefined}
            className="flex items-center gap-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {scoringBacklog ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 8a6 6 0 1 0 1-3" strokeLinecap="round" />
                </svg>
                Scoring…
              </>
            ) : (
              "Score Backlog"
            )}
          </button>

          <button
            onClick={handleOptimize}
            disabled={optimizing || !hasAdminKey}
            title={!hasAdminKey ? "Set NEXT_PUBLIC_ADMIN_PASSWORD to enable" : undefined}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {optimizing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 8a6 6 0 1 0 1-3" strokeLinecap="round" />
                </svg>
                Optimizing…
              </>
            ) : (
              "Run Optimization"
            )}
          </button>

          {!hasAdminKey && (
            <p className="text-xs text-zinc-600 self-center">
              Set <code className="text-zinc-500">NEXT_PUBLIC_ADMIN_PASSWORD</code> to enable admin actions
            </p>
          )}
        </div>

        {/* ── Agent Performance Table ── */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
            Agent Performance
          </h2>
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60">
                    {[
                      "Agent",
                      "Episodes",
                      "Avg Reward",
                      "Avg Iterations",
                      "Avg Latency",
                      "Success Rate",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-sm">
                        Loading…
                      </td>
                    </tr>
                  ) : !bench?.byAgent?.length ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-sm">
                        No agent data yet
                      </td>
                    </tr>
                  ) : (
                    bench.byAgent.map((a) => {
                      const successRate =
                        a.episodes > 0
                          ? ((a.successes / a.episodes) * 100).toFixed(1) + "%"
                          : "—";
                      return (
                        <tr
                          key={a.agent_name}
                          className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/40 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-white">
                            {a.agent_name}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{a.episodes}</td>
                          <td className="px-4 py-3 text-violet-400 font-mono">
                            {fmt(a.avg_reward)}
                          </td>
                          <td className="px-4 py-3 text-zinc-400 font-mono">
                            {fmt(a.avg_iterations, 1)}
                          </td>
                          <td className="px-4 py-3 text-zinc-400 font-mono">
                            {fmtMs(a.avg_wall_ms)}
                          </td>
                          <td className="px-4 py-3 text-emerald-400 font-mono">
                            {successRate}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Reward Trend Chart ── */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
            Reward Trend
          </h2>
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/30">
            {loading ? (
              <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">
                Loading…
              </div>
            ) : (
              <RewardChart data={bench?.rewardOverTime ?? []} />
            )}
          </div>
        </section>

        {/* ── Recent Episodes Table ── */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
            Recent Episodes
          </h2>
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60">
                    {["Task", "Agent", "Status", "Reward", "Iterations", "Time"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-sm">
                        Loading…
                      </td>
                    </tr>
                  ) : !eps?.episodes?.length ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-sm">
                        No episodes yet
                      </td>
                    </tr>
                  ) : (
                    eps.episodes.map((ep) => (
                      <tr
                        key={ep.id}
                        className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-zinc-300 max-w-xs">
                          <span title={ep.task} className="block truncate">
                            {truncate(ep.task, 60)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                          {ep.agent_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={ep.terminal_state} />
                        </td>
                        <td className="px-4 py-3 font-mono text-violet-400 whitespace-nowrap">
                          {fmt(ep.reward_total)}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 font-mono whitespace-nowrap">
                          {ep.total_iterations}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 font-mono whitespace-nowrap">
                          {fmtMs(ep.wall_ms)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Policy History ── */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
            Policy History
          </h2>
          {loading ? (
            <div className="border border-zinc-800 rounded-xl px-4 py-8 text-center text-zinc-600 text-sm">
              Loading…
            </div>
          ) : !bench?.policies?.length ? (
            <div className="border border-zinc-800 rounded-xl px-4 py-8 text-center text-zinc-600 text-sm">
              No policies recorded yet
            </div>
          ) : (
            <div className="space-y-2">
              {bench.policies.map((p) => (
                <div
                  key={p.version}
                  className="border border-zinc-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                      v{p.version}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.status === "active"
                          ? "bg-violet-900/40 text-violet-400 border border-violet-800/50"
                          : p.status === "candidate"
                          ? "bg-blue-900/40 text-blue-400 border border-blue-800/50"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm flex-1">
                    <span className="text-zinc-500 text-xs">
                      Baseline:{" "}
                      <span className="text-zinc-300 font-mono">
                        {fmt(p.baseline_reward)}
                      </span>
                    </span>
                    <span className="text-zinc-700">→</span>
                    <span className="text-zinc-500 text-xs">
                      Champion:{" "}
                      <span className="text-violet-400 font-mono">
                        {fmt(p.champion_reward)}
                      </span>
                    </span>
                    {p.baseline_reward != null &&
                      p.champion_reward != null &&
                      p.champion_reward > p.baseline_reward && (
                        <span className="text-emerald-400 text-xs font-mono">
                          +{fmt(p.champion_reward - p.baseline_reward)}
                        </span>
                      )}
                  </div>

                  {p.promotion_reason && (
                    <p className="text-xs text-zinc-500 italic sm:max-w-xs truncate">
                      {p.promotion_reason}
                    </p>
                  )}

                  <span className="text-xs text-zinc-600 flex-shrink-0">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Technical Report ── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Technical Report
            </h2>
            <button
              onClick={handleCopyReport}
              disabled={!report || loading}
              className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              {reportCopied ? "Copied!" : "Copy Report"}
            </button>
          </div>
          <div className="border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
            <div className="overflow-y-auto max-h-[400px] p-4">
              {loading ? (
                <p className="text-zinc-600 text-sm">Loading report…</p>
              ) : !report ? (
                <p className="text-zinc-600 text-sm">No report available</p>
              ) : (
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {report}
                </pre>
              )}
            </div>
          </div>
        </section>

      </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          msg={toast.msg}
          ok={toast.ok}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
