import Anthropic from "@anthropic-ai/sdk";
import { getAgent, getAllAgents, saveAgent, setActiveAgent, updateLyraState, getLyraState } from "./agents";
import { getAgentReflections } from "./reflections";
import type { Agent } from "@/lib/types/lyra";

const MAX_GENERATIONS = 10;

export async function evolveAgent(parentAgentId: string): Promise<{
  newAgent: Agent;
  evolutionNotes: string;
  systemPromptSummary: string;
}> {
  const parent = getAgent(parentAgentId);
  if (!parent) throw new Error(`Agent ${parentAgentId} not found`);

  const state = getLyraState();
  if (state.totalEvolutions >= MAX_GENERATIONS) {
    throw new Error("Maximum evolution generations reached.");
  }

  const reflections = getAgentReflections(parentAgentId).slice(-10); // Last 10 reflections
  const reflectionsSummary = reflections
    .map(
      (r, i) =>
        `Reflection ${i + 1} (score: ${r.score}/10):\n` +
        `  Summary: ${r.conversationSummary}\n` +
        `  Went well: ${r.whatWentWell.join("; ")}\n` +
        `  To improve: ${r.whatToImprove.join("; ")}\n` +
        `  Lessons: ${r.lessonsLearned.join("; ")}`
    )
    .join("\n\n");

  const evolutionPrompt = `You are an AI meta-architect. Your task is to evolve an AI agent's system prompt based on what it learned from real conversations.

CURRENT SYSTEM PROMPT (${parent.name}, Generation ${parent.generation}):
---
${parent.systemPrompt}
---

RECENT REFLECTIONS (${reflections.length} conversations):
---
${reflectionsSummary || "No reflections yet."}
---

Generate an improved system prompt that:
1. Preserves what works well (high-scoring patterns from reflections)
2. Corrects specific weaknesses identified in reflections
3. Incorporates lessons learned as concrete behavioral guidelines
4. Maintains the agent's core identity as Lyra, an AITaskFlo automation assistant
5. Is actionable and specific, not vague platitudes

Return ONLY a JSON object — no markdown, no preamble:
{
  "systemPrompt": "the full improved system prompt text",
  "evolutionNotes": "2-3 sentences explaining what changed and why, based on the reflections",
  "systemPromptSummary": "one sentence describing the key improvement this generation brings"
}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let response: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: evolutionPrompt }],
    });
  } catch (err) {
    // Log the full nested error so [Object] isn't hiding the real message
    const detail = err instanceof Error
      ? { message: err.message, apiError: JSON.stringify((err as { error?: unknown }).error ?? null) }
      : String(err);
    console.error("[Lyra Evolution] Anthropic API error:", JSON.stringify(detail));
    throw err; // re-throw so caller logs it and cooldown stamp holds
  }

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";

  let parsed: {
    systemPrompt?: string;
    evolutionNotes?: string;
    systemPromptSummary?: string;
  } = {};

  try {
    const clean = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("Failed to parse evolution response from Claude.");
  }

  if (!parsed.systemPrompt) {
    throw new Error("Evolution response missing systemPrompt field.");
  }

  // Generate new agent ID
  const allAgents = getAllAgents();
  const nextGen = parent.generation + 1;
  const siblingCount = allAgents.filter((a) => a.parentId === parentAgentId).length;
  const newId = `lyra-v${nextGen}${siblingCount > 0 ? `-${String.fromCharCode(97 + siblingCount)}` : ""}`;

  const newAgent: Agent = {
    id: newId,
    version: `${nextGen}.0.0`,
    name: `Lyra v${nextGen}`,
    systemPrompt: parsed.systemPrompt,
    parentId: parentAgentId,
    childrenIds: [],
    generation: nextGen,
    createdAt: new Date().toISOString(),
    createdFromReflectionIds: reflections.map((r) => r.id),
    reflectionCount: 0,
    conversationCount: 0,
    averageScore: 0,
    evolutionThreshold: parent.evolutionThreshold,
    isActive: false,
    evolutionNotes: parsed.evolutionNotes ?? "Evolved from accumulated reflections.",
  };

  // Update parent to record child
  await saveAgent({
    ...parent,
    childrenIds: [...parent.childrenIds, newId],
    isActive: false,
  });

  // Save new agent
  await saveAgent(newAgent);

  // Set new agent as active
  await setActiveAgent(newId);

  // Update global state
  const currentState = getLyraState();
  await updateLyraState({
    totalEvolutions: currentState.totalEvolutions + 1,
  });

  return {
    newAgent,
    evolutionNotes: parsed.evolutionNotes ?? "Evolved from accumulated reflections.",
    systemPromptSummary: parsed.systemPromptSummary ?? "Improved based on conversation reflections.",
  };
}
