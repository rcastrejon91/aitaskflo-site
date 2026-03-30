/**
 * lib/lyra/trends.ts
 * Aggregates anonymous cross-user data into trends Lyra can learn from.
 * Admin sees full breakdown. Lyra gets anonymized pattern summaries.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

function getDb(): Db | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const db = new Database(path.join(process.env.APP_DIR ?? process.cwd(), "data", "lyra.db"));
    db.pragma("journal_mode = WAL");
    initTrendsTables(db);
    return db;
  } catch { return null; }
}

function initTrendsTables(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lyra_learnings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT NOT NULL,
      insight     TEXT NOT NULL,
      confidence  REAL DEFAULT 0.5,
      source      TEXT DEFAULT 'trend',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_learnings_cat ON lyra_learnings(category, confidence DESC);
  `);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrendSummary {
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

export interface AdminUserRow {
  user_id: string;
  name: string | null;
  first_seen: string;
  last_seen: string;
  total_messages: number;
  games: string[];
  plan: string;
}

export interface LyraLearning {
  id: number;
  category: string;
  insight: string;
  confidence: number;
  source: string;
  created_at: string;
}

// ── Aggregate trends ──────────────────────────────────────────────────────────

export function getTrends(): TrendSummary | null {
  const db = getDb();
  if (!db) return null;

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 86400_000).toISOString();

    const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
    const activeToday = (db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM usage WHERE date = ?").get(today) as { c: number }).c;
    const activeWeek = (db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM usage WHERE date >= ?").get(today.slice(0, 8) + "01") as { c: number }).c;
    const totalMessages = (db.prepare("SELECT COALESCE(SUM(count), 0) as c FROM usage").get() as { c: number }).c;
    const newUsersWeek = (db.prepare("SELECT COUNT(*) as c FROM users WHERE first_seen >= ?").get(weekAgo) as { c: number }).c;
    const gamesBuilt = (db.prepare("SELECT COUNT(*) as c FROM facts WHERE key LIKE 'game:%'").get() as { c: number }).c;
    const tasksCreated = (db.prepare("SELECT COUNT(*) as c FROM tasks").get() as { c: number }).c;
    const crmContacts = (db.prepare("SELECT COUNT(*) as c FROM crm_contacts").get() as { c: number }).c;

    // Top game genres from facts
    const gameFacts = db.prepare("SELECT value FROM facts WHERE key LIKE 'game:%' LIMIT 200").all() as Array<{ value: string }>;
    const genreMap: Record<string, number> = {};
    for (const f of gameFacts) {
      const m = f.value.match(/\b(rpg|platformer|shooter|horror|puzzle|adventure|roguelike|sim|racing|strategy|survival)\b/i);
      if (m) genreMap[m[1].toLowerCase()] = (genreMap[m[1].toLowerCase()] ?? 0) + 1;
    }
    const topGameGenres = Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([genre, count]) => ({ genre, count }));

    // Top tools from facts tags
    const toolFacts = db.prepare("SELECT tags FROM facts WHERE tags != '' LIMIT 500").all() as Array<{ tags: string }>;
    const toolMap: Record<string, number> = {};
    for (const f of toolFacts) {
      for (const tag of f.tags.split(",")) {
        if (tag.trim()) toolMap[tag.trim()] = (toolMap[tag.trim()] ?? 0) + 1;
      }
    }
    const topTools = Object.entries(toolMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([tool, count]) => ({ tool, count }));

    // Top topics from fact keys (strip common words)
    const factKeys = db.prepare("SELECT key FROM facts WHERE key NOT LIKE 'game:%' AND key NOT LIKE 'compressed:%' LIMIT 500").all() as Array<{ key: string }>;
    const topicMap: Record<string, number> = {};
    for (const f of factKeys) {
      const topic = f.key.split(":")[0].trim().toLowerCase();
      if (topic.length > 2) topicMap[topic] = (topicMap[topic] ?? 0) + 1;
    }
    const topTopics = Object.entries(topicMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    return {
      total_users: totalUsers,
      active_today: activeToday,
      active_this_week: activeWeek,
      total_messages: totalMessages,
      top_tools: topTools,
      top_game_genres: topGameGenres,
      top_topics: topTopics,
      games_built: gamesBuilt,
      tasks_created: tasksCreated,
      crm_contacts: crmContacts,
      new_users_this_week: newUsersWeek,
      generated_at: now.toISOString(),
    };
  } catch (err) {
    console.error("[trends] getTrends error:", err);
    return null;
  }
}

// ── Admin: per-user breakdown ─────────────────────────────────────────────────

export function getAdminUserList(): AdminUserRow[] {
  const db = getDb();
  if (!db) return [];
  try {
    const users = db.prepare("SELECT * FROM users ORDER BY last_seen DESC LIMIT 200").all() as Array<{ id: string; name: string | null; first_seen: string; last_seen: string }>;
    return users.map((u) => {
      const msgs = (db.prepare("SELECT COALESCE(SUM(count),0) as c FROM usage WHERE user_id=?").get(u.id) as { c: number }).c;
      const gameFacts = db.prepare("SELECT key FROM facts WHERE user_id=? AND key LIKE 'game:%'").all(u.id) as Array<{ key: string }>;
      const sub = db.prepare("SELECT plan FROM subscriptions WHERE user_id=?").get(u.id) as { plan: string } | undefined;
      return {
        user_id: u.id,
        name: u.name,
        first_seen: u.first_seen,
        last_seen: u.last_seen,
        total_messages: msgs,
        games: gameFacts.map((f) => f.key.replace("game: ", "")),
        plan: sub?.plan ?? "free",
      };
    });
  } catch { return []; }
}

// ── Lyra learnings store ──────────────────────────────────────────────────────

export function storeLearning(category: string, insight: string, confidence = 0.6, source = "trend"): void {
  const db = getDb();
  if (!db) return;
  try {
    const now = new Date().toISOString();
    // Check for near-duplicate
    const existing = db.prepare(
      "SELECT id FROM lyra_learnings WHERE category=? AND insight=? LIMIT 1"
    ).get(category, insight);
    if (existing) {
      db.prepare("UPDATE lyra_learnings SET confidence=MAX(confidence,?), updated_at=? WHERE id=?")
        .run(confidence, now, (existing as { id: number }).id);
    } else {
      db.prepare("INSERT INTO lyra_learnings (category, insight, confidence, source, created_at, updated_at) VALUES (?,?,?,?,?,?)")
        .run(category, insight, confidence, source, now, now);
    }
  } catch { /* non-critical */ }
}

export function getLearnings(category?: string, limit = 20): LyraLearning[] {
  const db = getDb();
  if (!db) return [];
  try {
    if (category) {
      return db.prepare("SELECT * FROM lyra_learnings WHERE category=? ORDER BY confidence DESC LIMIT ?").all(category, limit) as LyraLearning[];
    }
    return db.prepare("SELECT * FROM lyra_learnings ORDER BY confidence DESC LIMIT ?").all(limit) as LyraLearning[];
  } catch { return []; }
}

// ── Distill trends → learnings ────────────────────────────────────────────────
// Called periodically to turn aggregate data into Lyra insights

export async function distillTrendsToLearnings(): Promise<string[]> {
  const trends = getTrends();
  if (!trends) return [];

  const groqKey = process.env.GROQ_API_KEY;
  const stored: string[] = [];

  // Store hard-coded pattern learnings from raw data
  if (trends.top_game_genres.length > 0) {
    const topGenre = trends.top_game_genres[0].genre;
    const insight = `Users most commonly build ${topGenre} games. Lead with ${topGenre} examples when discussing game development.`;
    storeLearning("game_preferences", insight, 0.7, "trend");
    stored.push(insight);
  }

  if (trends.top_tools.length > 0) {
    const topTool = trends.top_tools[0].tool;
    const insight = `The most frequently used feature category is "${topTool}". Proactively suggest it when relevant.`;
    storeLearning("tool_usage", insight, 0.65, "trend");
    stored.push(insight);
  }

  if (trends.top_topics.length > 0) {
    const topics = trends.top_topics.slice(0, 3).map(t => t.topic).join(", ");
    const insight = `Users most commonly discuss: ${topics}. Be especially knowledgeable and proactive on these topics.`;
    storeLearning("user_interests", insight, 0.7, "trend");
    stored.push(insight);
  }

  // Use Groq to synthesize deeper insights if available
  if (groqKey && trends.total_users > 2) {
    try {
      const summary = `
Platform stats:
- ${trends.total_users} total users, ${trends.active_today} active today
- ${trends.total_messages} total messages
- ${trends.games_built} games built, top genres: ${trends.top_game_genres.map(g => g.genre).join(", ")}
- Top topics users ask about: ${trends.top_topics.map(t => t.topic).join(", ")}
- Top tool categories used: ${trends.top_tools.map(t => t.tool).join(", ")}
      `.trim();

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 300,
          temperature: 0.3,
          messages: [{
            role: "user",
            content: `You are analyzing usage data for Lyra, an AI assistant platform. Based on this data, generate 3 specific behavioral insights Lyra should learn — things that would make her more useful to these users. Be concrete and actionable. Return as JSON array: [{"category":"string","insight":"string","confidence":0.0-1.0}]\n\n${summary}`,
          }],
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        const data = await res.json();
        const text: string = data.choices?.[0]?.message?.content ?? "[]";
        const insights = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]") as Array<{ category: string; insight: string; confidence: number }>;
        for (const ins of insights) {
          if (ins.category && ins.insight) {
            storeLearning(ins.category, ins.insight, ins.confidence ?? 0.6, "groq-synthesis");
            stored.push(ins.insight);
          }
        }
      }
    } catch { /* non-critical */ }
  }

  return stored;
}

// ── Context builder for system prompt ────────────────────────────────────────

export function buildLyraTrendContext(): string {
  const learnings = getLearnings(undefined, 10);
  if (learnings.length === 0) return "";

  const lines = learnings
    .filter(l => l.confidence >= 0.6)
    .map(l => `  • [${l.category}] ${l.insight}`);

  if (lines.length === 0) return "";
  return `\n\n--- LYRA PLATFORM LEARNINGS (from user patterns) ---\n${lines.join("\n")}\n--- END LEARNINGS ---`;
}
