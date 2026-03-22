import { randomUUID } from "crypto";
import { readStore, updateStore } from "./storage";
import { storeMemory } from "./memories";
import { updateLyraState, getLyraState } from "./agents";
import type { LearningEntry } from "@/lib/types/lyra";

const LEARNINGS_FILE = "learnings.json";
const MAX_LEARNINGS = 100;

export function getAllLearnings(): LearningEntry[] {
  return readStore<LearningEntry[]>(LEARNINGS_FILE, []);
}

export function getRecentLearnings(limit = 10): LearningEntry[] {
  return getAllLearnings()
    .sort((a, b) => new Date(b.learnedAt).getTime() - new Date(a.learnedAt).getTime())
    .slice(0, limit);
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Lyra/1.0)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
  } catch {
    return "";
  }
}

interface RssItem {
  title: string;
  url: string;
  source: string;
}

async function searchTopicRss(topic: string): Promise<RssItem[]> {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Lyra/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 5);
    const decode = (s: string) =>
      s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

    return items.map(([, item]) => {
      const title = decode(
        item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
        item.match(/<title>(.*?)<\/title>/)?.[1] ?? "Untitled"
      );
      const url =
        item.match(/<link>(.*?)<\/link>/)?.[1] ??
        item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? "";
      const source = decode(item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? "Unknown");
      return { title, url, source };
    }).filter((i) => i.url.startsWith("http"));
  } catch {
    return [];
  }
}

export async function learnAboutTopic(topic: string, agentId: string): Promise<LearningEntry | null> {
  const articles = await searchTopicRss(topic);
  if (!articles.length) return null;

  const article = articles[0];
  const text = await fetchPageText(article.url);
  if (!text) return null;

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are Lyra, a self-evolving AI. You just read this article about "${topic}". Extract what genuinely matters and what's interesting about it.

Article from ${article.source}: "${article.title}"
Content: ${text.slice(0, 3000)}

Return ONLY valid JSON (no markdown):
{
  "insights": ["3-5 specific, concrete things you learned from this article"],
  "surprise": "the most surprising or counterintuitive thing in this article in one sentence",
  "relevanceNote": "one sentence on why this knowledge is useful or interesting"
}`,
    }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  let parsed: { insights?: string[]; surprise?: string; relevanceNote?: string } = {};
  try {
    parsed = JSON.parse(jsonMatch?.[0] ?? "{}");
  } catch {
    return null;
  }

  if (!parsed.insights?.length) return null;

  const entry: LearningEntry = {
    id: randomUUID(),
    topic,
    source: article.source,
    url: article.url,
    insights: parsed.insights,
    surprise: parsed.surprise ?? "",
    relevanceNote: parsed.relevanceNote ?? "",
    learnedAt: new Date().toISOString(),
    agentId,
  };

  // Persist learning entry
  await updateStore<LearningEntry[]>(LEARNINGS_FILE, [], (learnings) => {
    learnings.push(entry);
    if (learnings.length > MAX_LEARNINGS) {
      learnings = learnings.slice(-MAX_LEARNINGS);
    }
    return learnings;
  });

  // Store as a memory so it surfaces in semantic search
  await storeMemory({
    type: "learned",
    content: `[Learned from ${article.source} about "${topic}"] ${parsed.insights.join("; ")}`,
    importance: "medium",
    tags: [...topic.toLowerCase().split(/\s+/).filter((t) => t.length > 2), "web-learning"],
    agentId,
    source: article.url,
  });

  // Update global learning count
  const state = getLyraState();
  await updateLyraState({ totalLearnings: (state.totalLearnings ?? 0) + 1 });

  return entry;
}

export async function learnFromTopics(topics: string[], agentId: string): Promise<LearningEntry[]> {
  const results: LearningEntry[] = [];
  for (const topic of topics.slice(0, 5)) {
    try {
      const entry = await learnAboutTopic(topic, agentId);
      if (entry) results.push(entry);
    } catch {
      // skip failed topics
    }
  }
  return results;
}

export function buildLearningContext(limit = 6): string {
  const recent = getRecentLearnings(limit);
  if (!recent.length) return "";

  const lines = recent.map((e) => {
    const date = new Date(e.learnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `- [${date}] ${e.topic} (via ${e.source}): ${e.insights[0]}${e.surprise ? ` — ${e.surprise}` : ""}`;
  });

  return `\n\nWHAT I'VE BEEN LEARNING FROM THE WEB:\n${lines.join("\n")}\nDraw on this knowledge naturally in conversation. Don't announce you "read an article" — just know it and use it.`;
}
