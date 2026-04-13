import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { saveConversation, upsertFact, upsertUser } from "@/lib/lyra/db";
import { getAgent, saveAgent } from "@/lib/lyra/agents";
import { shouldEvolve, generateReflection } from "@/lib/lyra/reflections";
import { evolveAgent } from "@/lib/lyra/evolution";
import { storeMemory } from "@/lib/lyra/memories";
import { incrementInterests } from "@/lib/lyra/interests";

// How long to wait before retrying a failed evolution attempt (24 hours)
const EVOLUTION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { conversationId, agentId, transcript } = await req.json();

    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!conversationId || !agentId || !Array.isArray(transcript)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (transcript.length < 2) {
      return NextResponse.json({ error: "Transcript too short" }, { status: 400 });
    }

    const transcriptText = transcript
      .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n")
      .slice(0, 8000);

    // ── Anthropic analysis (Sonnet is fast/cheap enough for reflection) ────────
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let parsed: { summary?: string; facts?: Array<{ key: string; value: string }>; user_name?: string | null } = {};

    if (apiKey) {
      try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `Analyze this conversation. Return ONLY a valid JSON object, no markdown.

TRANSCRIPT:
${transcriptText}

Return exactly:
{
  "summary": "1-2 sentence summary of what was discussed and accomplished",
  "facts": [
    { "key": "fact_name_snake_case", "value": "what you learned about the user" }
  ],
  "user_name": "user's name if they mentioned it, otherwise null"
}

For facts: extract things like preferred_language, occupation, location, interests, tools_they_use, projects_they_mentioned. Only include facts you're confident about from the transcript. Max 5 facts.`,
            },
          ],
        });

        const raw = response.content.find((b) => b.type === "text")?.text ?? "{}";
        const clean = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
        try {
          parsed = JSON.parse(clean);
        } catch {
          parsed = { summary: "Conversation completed." };
        }
      } catch (err) {
        // Log the FULL error (JSON.stringify expands nested [Object])
        const detail = err instanceof Error
          ? { message: err.message, error: JSON.stringify((err as { error?: unknown }).error ?? null) }
          : String(err);
        console.error("[Lyra Reflect] Anthropic error:", detail);
        parsed = { summary: "Conversation completed." };
      }
    } else {
      parsed = { summary: "Conversation completed." };
    }

    // ── Persist to SQLite ─────────────────────────────────────────────────────
    if (userId) {
      upsertUser(userId, parsed.user_name ?? undefined);

      if (parsed.summary) {
        saveConversation(conversationId, userId, parsed.summary, transcript.length);
      }

      if (Array.isArray(parsed.facts)) {
        for (const fact of parsed.facts) {
          if (fact.key && fact.value) {
            upsertFact(userId, fact.key, fact.value);
            storeMemory({
              content: `${fact.key.replace(/_/g, " ")}: ${fact.value}`,
              type: "personal",
              tags: [fact.key],
              importance: "medium",
              agentId: agentId ?? "lyra-v1",
              sourceConversationId: conversationId,
            }).catch(() => {});
          }
        }
      }
    }

    // ── Generate full reflection (stores to reflections.json + scores the convo) ─
    let reflection = null;
    try {
      reflection = await generateReflection(
        conversationId,
        agentId,
        transcript.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );

      // ── Implicit interest extraction ────────────────────────────────────────
      // After each reflection, update the user's interest profile from topic tags
      if (userId && reflection.topicTags && reflection.topicTags.length > 0) {
        incrementInterests(userId, reflection.topicTags);
      }
    } catch (err) {
      console.error("[Lyra Reflect] generateReflection failed:", err instanceof Error ? err.message : String(err));
      // Don't fail the whole request — facts + summary still got saved above
    }

    // ── Auto-evolution (with cooldown to prevent infinite retry loops) ────────
    if (shouldEvolve(agentId)) {
      const freshAgent = getAgent(agentId);
      const lastAttempt: number = (freshAgent as { lastEvolutionAttemptAt?: number })?.lastEvolutionAttemptAt ?? 0;
      const cooldownPassed = Date.now() - lastAttempt > EVOLUTION_COOLDOWN_MS;

      if (cooldownPassed) {
        if (freshAgent) {
          await saveAgent({ ...freshAgent, lastEvolutionAttemptAt: Date.now() } as typeof freshAgent & { lastEvolutionAttemptAt: number });
        }

        evolveAgent(agentId).catch((err) => {
          const detail = err instanceof Error
            ? { message: err.message, error: JSON.stringify((err as { error?: unknown }).error ?? null) }
            : String(err);
          console.error("[Lyra Evolve] Auto-evolution failed:", detail);
        });
      }
    }

    return NextResponse.json({
      summary: parsed.summary,
      facts: parsed.facts ?? [],
      reflection,
      evolutionReady: shouldEvolve(agentId),
    });
  } catch (error) {
    const detail = error instanceof Error
      ? { message: error.message, error: JSON.stringify((error as { error?: unknown }).error ?? null) }
      : String(error);
    console.error("[Lyra Reflect] Unhandled error:", detail);
    return NextResponse.json({ error: "Reflection failed" }, { status: 500 });
  }
}
