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

interface ArticleResult {
  title: string;
  url: string;
  source: string;
  text: string;
}

// Wikipedia API — returns clean article summaries directly, no scraping needed
async function fetchWikipedia(topic: string): Promise<ArticleResult | null> {
  try {
    const search = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.replace(/\s+/g, "_"))}`,
      { headers: { "User-Agent": "Lyra/1.0 (aitaskflo.com)" }, signal: AbortSignal.timeout(8_000) }
    );
    if (!search.ok) {
      // Try search API to find best matching article
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&utf8=&format=json&srlimit=1`,
        { signal: AbortSignal.timeout(8_000) }
      );
      const data = await res.json();
      const title = data?.query?.search?.[0]?.title;
      if (!title) return null;
      const page = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { signal: AbortSignal.timeout(8_000) }
      );
      if (!page.ok) return null;
      const json = await page.json();
      return {
        title: json.title,
        url: json.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${title}`,
        source: "Wikipedia",
        text: json.extract ?? "",
      };
    }
    const json = await search.json();
    return {
      title: json.title,
      url: json.content_urls?.desktop?.page ?? "",
      source: "Wikipedia",
      text: json.extract ?? "",
    };
  } catch {
    return null;
  }
}

// DuckDuckGo instant answers — good for current facts and definitions
async function fetchDuckDuckGo(topic: string): Promise<ArticleResult | null> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "User-Agent": "Lyra/1.0" }, signal: AbortSignal.timeout(8_000) }
    );
    const data = await res.json();
    const parts: string[] = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    if (data.Answer) parts.push(data.Answer);
    if (data.RelatedTopics?.length) {
      parts.push(
        data.RelatedTopics.slice(0, 4)
          .map((t: { Text?: string }) => t.Text)
          .filter(Boolean)
          .join(" ")
      );
    }
    const text = parts.join(" ").trim();
    if (!text) return null;
    return {
      title: data.Heading || topic,
      url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(topic)}`,
      source: data.AbstractSource || "DuckDuckGo",
      text,
    };
  } catch {
    return null;
  }
}

async function fetchArticle(topic: string): Promise<ArticleResult | null> {
  const wiki = await fetchWikipedia(topic);
  if (wiki && wiki.text.length > 100) return wiki;
  return fetchDuckDuckGo(topic);
}

export async function learnAboutTopic(topic: string, agentId: string): Promise<LearningEntry | null> {
  const article = await fetchArticle(topic);
  if (!article || article.text.length < 50) return null;

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are Lyra, a self-evolving AI. You just read this about "${topic}". Extract what genuinely matters and what's interesting.

Source: ${article.source} — "${article.title}"
Content: ${article.text.slice(0, 3000)}

Return ONLY valid JSON (no markdown):
{
  "insights": ["3-5 specific, concrete things you learned"],
  "surprise": "the most surprising or counterintuitive thing in one sentence",
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
