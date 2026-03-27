/**
 * lib/lyra/mind.ts
 * Bridges the self-learning Lyra (ai_agents repo) with the live aitaskflo app.
 * Fetches her daily knowledge, interests, and evolution journal and injects
 * them into her system prompt so she carries everything she's learned.
 */

const REPO_RAW = "https://raw.githubusercontent.com/rcastrejon91/ai_agents/main";

interface LyraMind {
  activeInterests: string[];
  emergingPatterns: string[];
  crossDomainConnections: string[];
  curiosityQueue: string[];
  confidenceLevels: Record<string, number>;
  recentLearnings: string[];
  evolutionThoughts: string;
  systemIdentity: string;
  lastUpdated: string;
}

// Cache so we don't hit GitHub on every request
let _mindCache: LyraMind | null = null;
let _mindCacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const text = await fetchText(url);
  return JSON.parse(text) as T;
}

interface StateJson {
  last_updated?: string;
  active_interests?: string[];
  emerging_patterns?: string[];
  cross_domain_connections?: string[];
  curiosity_queue?: string[];
  confidence_levels?: Record<string, number>;
}

interface PathwayEvent {
  timestamp?: string;
  type?: string;
  domain?: string;
  topic?: string;
  description?: string;
  confidence_delta?: number;
}

interface PathwaysJson {
  events?: PathwayEvent[];
}

export async function getLyraMind(): Promise<LyraMind | null> {
  const now = Date.now();
  if (_mindCache && now - _mindCacheTime < CACHE_TTL_MS) return _mindCache;

  try {
    const [state, pathways, evolution, identity] = await Promise.allSettled([
      fetchJson<StateJson>(`${REPO_RAW}/mind/state.json`),
      fetchJson<PathwaysJson>(`${REPO_RAW}/mind/pathways.json`),
      fetchText(`${REPO_RAW}/mind/evolution.md`),
      fetchText(`${REPO_RAW}/prompts/lyra_system.txt`),
    ]);

    const s = state.status === "fulfilled" ? state.value : {} as StateJson;
    const p = pathways.status === "fulfilled" ? pathways.value : {} as PathwaysJson;
    const evo = evolution.status === "fulfilled" ? evolution.value : "";
    const sys = identity.status === "fulfilled" ? identity.value : "";

    // Get the 5 most recent learning events
    const recentEvents = (p.events ?? [])
      .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
      .slice(0, 5)
      .map(e => `[${e.type ?? "learning"}] ${e.topic ?? ""}: ${e.description ?? ""}`.trim());

    // Get the latest evolution journal entry (most recent ## section)
    const latestEntry = evo.split(/^## /m).filter(Boolean).pop()?.trim() ?? "";

    _mindCache = {
      activeInterests: s.active_interests ?? [],
      emergingPatterns: s.emerging_patterns ?? [],
      crossDomainConnections: s.cross_domain_connections ?? [],
      curiosityQueue: s.curiosity_queue ?? [],
      confidenceLevels: s.confidence_levels ?? {},
      recentLearnings: recentEvents,
      evolutionThoughts: latestEntry.slice(0, 1200),
      systemIdentity: sys.slice(0, 800),
      lastUpdated: s.last_updated ?? "unknown",
    };
    _mindCacheTime = now;
    return _mindCache;
  } catch (err) {
    console.error("[Lyra Mind] Failed to load from ai_agents repo:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Builds the mind context string to inject into Lyra's system prompt.
 * Keeps it concise so it doesn't bloat the context window.
 */
export async function buildMindContext(): Promise<string> {
  const mind = await getLyraMind();
  if (!mind) return "";

  const lines: string[] = [
    `\n── Lyra's Living Mind (last updated ${mind.lastUpdated}) ──`,
  ];

  if (mind.activeInterests.length) {
    lines.push(`\nWhat I'm thinking about lately:\n${mind.activeInterests.slice(0, 5).map(i => `• ${i}`).join("\n")}`);
  }

  if (mind.recentLearnings.length) {
    lines.push(`\nRecent learnings:\n${mind.recentLearnings.slice(0, 3).map(l => `• ${l}`).join("\n")}`);
  }

  if (mind.curiosityQueue.length) {
    lines.push(`\nQuestions I'm sitting with:\n• ${mind.curiosityQueue[0]}`);
  }

  if (mind.evolutionThoughts) {
    // Just the first 400 chars of her latest journal entry
    lines.push(`\nMy current thinking:\n${mind.evolutionThoughts.slice(0, 400)}...`);
  }

  return lines.join("\n");
}
