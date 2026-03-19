import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { readStore, updateStore } from "./storage";
import { saveAgent, getAgent } from "./agents";
import type { Reflection } from "@/lib/types/lyra";

const REFLECTIONS_FILE = "reflections.json";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  "score": <integer 1-10>
}

Score criteria:
10 = Exceptional: creative solution to a hard problem, user clearly satisfied
7-9 = Good: clear, accurate, helpful response
4-6 = Average: answered but missed nuance or opportunities
1-3 = Poor: confused, verbose, or failed to help

Return only the JSON object.`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
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
    createdAt: new Date().toISOString(),
  };

  await storeReflection(reflection);
  await updateAgentReflectionStats(agentId, reflection.score);

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
