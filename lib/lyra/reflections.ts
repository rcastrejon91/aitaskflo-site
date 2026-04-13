import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { readStore, updateStore } from "./storage";
import { saveAgent, getAgent } from "./agents";
import type { Reflection } from "@/lib/types/lyra";

const REFLECTIONS_FILE = "reflections.json";

export function getAllReflections(): Reflection[] {
  return readStore<Reflection[]>(REFLECTIONS_FILE, []);
}

export function getAgentReflections(agentId: string): Reflection[] {
  return getAllReflections().filter((r) => r.agentId === agentId);
}

export async function generateReflection(
  conversationId: string,
  agentId: string,
  transcript: Array<{ role: "user" | "assistant"; content: string }>
): Promise<Reflection> {
  const transcriptText = transcript
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const prompt = `Analyze this conversation transcript and return ONLY a JSON object — no markdown, no preamble.

TRANSCRIPT:
---
${transcriptText}
---

Return exactly this JSON structure:
{
  "conversationSummary": "1-3 sentence summary of what was discussed",
  "whatWentWell": ["specific strength observed", "..."],
  "whatToImprove": ["specific weakness or missed opportunity", "..."],
  "lessonsLearned": ["generalizable insight for future conversations", "..."],
  "score": <integer 1-10>,
  "topicTags": ["tag1", "tag2"],
  "callbackOpportunity": "one sentence describing a natural thread to pick up next conversation, or null if none"
}

Score criteria:
10 = Exceptional: creative solution to a hard problem, user clearly satisfied
7-9 = Good: clear, accurate, helpful response
4-6 = Average: answered but missed nuance or opportunities
1-3 = Poor: confused, verbose, or failed to help

For topicTags: 2-5 lowercase topic tags extracted from the conversation (e.g. "game-dev", "witchcraft", "business-plan", "music", "spells").
For callbackOpportunity: a specific, natural thing to bring up in the next conversation based on an unfinished thread, something the user was excited about, or a question they asked that sparked more discussion. Be specific. Return null if nothing stands out.

Return only the JSON object.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";

  let parsed: {
    conversationSummary?: string;
    whatWentWell?: string[];
    whatToImprove?: string[];
    lessonsLearned?: string[];
    score?: number;
    topicTags?: string[];
    callbackOpportunity?: string | null;
  } = {};

  try {
    // Strip any markdown code fences if present
    const clean = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    parsed = {
      conversationSummary: "Could not parse reflection.",
      whatWentWell: [],
      whatToImprove: [],
      lessonsLearned: [],
      score: 5,
    };
  }

  const reflection: Reflection = {
    id: randomUUID(),
    agentId,
    conversationId,
    conversationSummary: parsed.conversationSummary ?? "No summary generated.",
    whatWentWell: parsed.whatWentWell ?? [],
    whatToImprove: parsed.whatToImprove ?? [],
    lessonsLearned: parsed.lessonsLearned ?? [],
    score: Math.max(1, Math.min(10, parsed.score ?? 5)),
    topicTags: parsed.topicTags ?? [],
    callbackOpportunity: parsed.callbackOpportunity ?? null,
    createdAt: new Date().toISOString(),
  };

  await storeReflection(reflection);
  await updateAgentReflectionStats(agentId, reflection.score);

  // Background: generate and store embedding for semantic memory search
  const embedText = [reflection.conversationSummary, ...(reflection.topicTags ?? [])].join(" ");
  import("./embeddings")
    .then(({ embedReflection }) => embedReflection(reflection.id, agentId, embedText))
    .catch(() => {});

  return reflection;
}

async function storeReflection(reflection: Reflection): Promise<void> {
  await updateStore<Reflection[]>(REFLECTIONS_FILE, [], (reflections) => {
    reflections.push(reflection);
    return reflections;
  });
}

async function updateAgentReflectionStats(agentId: string, score: number): Promise<void> {
  const agent = getAgent(agentId);
  if (!agent) return;

  const newCount = agent.reflectionCount + 1;
  const newAvg = (agent.averageScore * agent.reflectionCount + score) / newCount;

  await saveAgent({
    ...agent,
    reflectionCount: newCount,
    averageScore: Math.round(newAvg * 10) / 10,
  });
}

export function shouldEvolve(agentId: string): boolean {
  const agent = getAgent(agentId);
  if (!agent) return false;
  return agent.reflectionCount >= agent.evolutionThreshold && agent.childrenIds.length === 0;
}

// ── Callback system ───────────────────────────────────────────────────────────

/**
 * Returns the most recent callback opportunity across all reflections for an agent.
 * Used to open the next conversation with a natural thread pickup.
 */
export function getLatestCallback(agentId: string): string | null {
  const reflections = getAgentReflections(agentId);
  // Most recent first
  const sorted = [...reflections].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const r of sorted) {
    if (r.callbackOpportunity) return r.callbackOpportunity;
  }
  return null;
}

/**
 * Returns reflections related to the current message.
 * Uses semantic (embedding) search when available, falls back to keyword tag matching.
 */
export function findRelatedReflections(agentId: string, message: string, limit = 3): Reflection[] {
  const reflections = getAgentReflections(agentId);
  const msgLower = message.toLowerCase();
  const scored = reflections
    .map((r) => {
      const tags = r.topicTags ?? [];
      const matches = tags.filter((t) => msgLower.includes(t.replace(/-/g, " ")) || msgLower.includes(t)).length;
      return { r, matches };
    })
    .filter(({ matches }) => matches > 0)
    .sort((a, b) => b.matches - a.matches || b.r.score - a.r.score);
  return scored.slice(0, limit).map(({ r }) => r);
}

/**
 * Semantic version — async, uses embeddings when available.
 * Falls back to findRelatedReflections() if no embeddings stored yet.
 */
export async function findRelatedReflectionsSemantic(
  agentId: string,
  message: string,
  limit = 3
): Promise<Reflection[]> {
  try {
    const { semanticSearch } = await import("./embeddings");
    const matches = await semanticSearch(message, "reflection", limit);
    if (matches.length > 0) {
      const reflections = getAgentReflections(agentId);
      const byId = new Map(reflections.map((r) => [`${agentId}:${r.id}`, r]));
      const results = matches
        .map((m) => byId.get(m.entityId))
        .filter((r): r is Reflection => r !== undefined);
      if (results.length > 0) return results;
    }
  } catch { /* fall through */ }
  return findRelatedReflections(agentId, message, limit);
}
