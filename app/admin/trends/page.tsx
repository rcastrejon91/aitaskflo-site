"use client";

import { useState, useEffect, useCallback } from "react";

interface TrendSummary {
  total_users: number;
  active_today: number;
  active_this_week: number;
  total_messages: number;
  top_tools: Array<{ tool: string; count: number }>;
  top_game_genres: Array<{ genre: string; count: number }>;
  top_topics: Array<{ topic: string; count: number }>;
  games_built: number;
  tasks_created: number;
  crm_contacts: number;
  new_users_this_week: number;
  generated_at: string;
}

interface UserRow {
  user_id: string;
  name: string | null;
  first_seen: string;
  last_seen: string;
  total_messages: number;
  games: string[];
  plan: string;
}

interface Learning {
  id: number;
  category: string;
  insight: string;
  confidence: number;
  source: string;
  created_at: string;
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-green-900 rounded-xl p-4 text-center">
      <div className="text-3xl font-bold text-green-400 font-mono">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-green-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-300 w-32 truncate capitalize">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-green-400 font-mono text-xs w-8 text-right">{value}</span>
    </div>
  );
}

export default function TrendsPage() {
  const [tab, setTab] = useState<"overview" | "users" | "learnings">("overview");
  const [summary, setSummary] = useState<TrendSummary | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [distilling, setDistilling] = useState(false);
  const [distillResult, setDistillResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, u, l] = await Promise.all([
      fetch("/api/lyra/trends?action=summary").then(r => r.json()),
      fetch("/api/lyra/trends?action=users").then(r => r.json()),
      fetch("/api/lyra/trends?action=learnings").then(r => r.json()),
    ]);
    setSummary(s);
    setUsers(Array.isArray(u) ? u : []);
    setLearnings(Array.isArray(l) ? l : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const distill = async () => {
    setDistilling(true);
    setDistillResult(null);
    const r = await fetch("/api/lyra/trends?action=distill").then(d => d.json());
    setDistillResult(`Distilled ${r.distilled} new insights into Lyra`);
    setDistilling(false);
    load();
  };

  const planColor: Record<string, string> = {
    pro: "text-yellow-400", free: "text-gray-500", starter: "text-blue-400",
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 font-mono p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-400">🧠 Lyra Intelligence Hub</h1>
            <p className="text-xs text-gray-500 mt-1">
              {summary ? `Generated ${new Date(summary.generated_at).toLocaleString()}` : "Loading…"}
            </p>
          </div>
          <button
            onClick={distill}
            disabled={distilling}
            className="bg-green-900 hover:bg-green-800 border border-green-600 text-green-300 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {distilling ? "Distilling…" : "⚡ Distill → Lyra"}
          </button>
        </div>

        {distillResult && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-2 text-green-300 text-sm">
            ✓ {distillResult}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
          {(["overview", "users", "learnings"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors capitalize ${tab === t ? "bg-green-900 text-green-300" : "text-gray-500 hover:text-gray-300"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && summary && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatBox label="Total Users" value={summary.total_users} sub={`+${summary.new_users_this_week} this week`} />
              <StatBox label="Active Today" value={summary.active_today} />
              <StatBox label="Total Messages" value={summary.total_messages.toLocaleString()} />
              <StatBox label="Games Built" value={summary.games_built} />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Top Game Genres</div>
                {summary.top_game_genres.length === 0
                  ? <div className="text-gray-600 text-sm">No data yet</div>
                  : summary.top_game_genres.map(g => (
                      <Bar key={g.genre} label={g.genre} value={g.count} max={summary.top_game_genres[0].count} />
                    ))}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Top Tool Categories</div>
                {summary.top_tools.length === 0
                  ? <div className="text-gray-600 text-sm">No data yet</div>
                  : summary.top_tools.map(t => (
                      <Bar key={t.tool} label={t.tool} value={t.count} max={summary.top_tools[0].count} />
                    ))}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Top User Topics</div>
                {summary.top_topics.length === 0
                  ? <div className="text-gray-600 text-sm">No data yet</div>
                  : summary.top_topics.map(t => (
                      <Bar key={t.topic} label={t.topic} value={t.count} max={summary.top_topics[0].count} />
                    ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <StatBox label="Tasks Created" value={summary.tasks_created} />
              <StatBox label="CRM Contacts" value={summary.crm_contacts} />
              <StatBox label="Active This Week" value={summary.active_this_week} />
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">{users.length} users total</div>
            {users.map(u => (
              <div key={u.user_id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium truncate">{u.name ?? "Anonymous"}</span>
                    <span className={`text-xs font-bold ${planColor[u.plan] ?? "text-gray-500"}`}>{u.plan}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{u.user_id}</div>
                  {u.games.length > 0 && (
                    <div className="text-xs text-green-600 mt-0.5">🎮 {u.games.join(", ")}</div>
                  )}
                </div>
                <div className="text-right text-xs text-gray-400 flex-shrink-0">
                  <div className="text-green-400 font-mono">{u.total_messages} msgs</div>
                  <div>Last: {new Date(u.last_seen).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Learnings */}
        {tab === "learnings" && (
          <div className="space-y-3">
            <div className="text-xs text-gray-500">
              {learnings.length} insights stored — these are injected into Lyra's system prompt
            </div>
            {learnings.length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500">
                No learnings yet. Click "Distill → Lyra" to generate insights from user data.
              </div>
            )}
            {learnings.map(l => (
              <div key={l.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 uppercase tracking-wider">{l.category}</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{l.source}</span>
                  <span className="ml-auto text-xs text-yellow-600">{Math.round(l.confidence * 100)}% confidence</span>
                </div>
                <div className="text-sm text-gray-200">{l.insight}</div>
                <div className="text-xs text-gray-600">{new Date(l.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
