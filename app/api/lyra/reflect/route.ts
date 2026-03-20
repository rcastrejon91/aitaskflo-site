import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { saveConversation, upsertFact, upsertUser } from "@/lib/lyra/db";
import { getAgent, saveAgent } from "@/lib/lyra/agents";
import { shouldEvolve } from "@/lib/lyra/reflections";
import { evolveAgent } from "@/lib/lyra/evolution";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { conversationId, agentId, transcript, userId } = await req.json();

    if (!conversationId || !agentId || !Array.isArray(transcript)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (transcript.length < 2) {
      return NextResponse.json({ error: "Transcript too short" }, { status: 400 });
    }

    const transcriptText = transcript
      .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n")
      .slice(0, 8000); // cap to avoid huge tokens

    const response = await client.messages.create({
      model: "claude-opus-4-6",
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

    let parsed: {
      summary?: string;
      facts?: Array<{ key: string; value: string }>;
      user_name?: string | null;
    } = {};

    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = { summary: "Conversation completed." };
    }

    // Persist to SQLite
    if (userId) {
      upsertUser(userId, parsed.user_name ?? undefined);

      if (parsed.summary) {
        saveConversation(conversationId, userId, parsed.summary, transcript.length);
      }

      if (Array.isArray(parsed.facts)) {
        for (const fact of parsed.facts) {
          if (fact.key && fact.value) {
            upsertFact(userId, fact.key, fact.value);
          }
        }
      }
    }

    // Increment reflectionCount in agents.json so shouldEvolve() stays accurate
    const agent = getAgent(agentId);
    if (agent) {
      await saveAgent({ ...agent, reflectionCount: agent.reflectionCount + 1 });
    }

    // Auto-trigger evolution if ready (fire and forget — don't block the response)
    if (shouldEvolve(agentId)) {
      evolveAgent(agentId).catch((err) => console.error("Auto-evolution failed:", err));
    }

    return NextResponse.json({ summary: parsed.summary, facts: parsed.facts ?? [] });
  } catch (error) {
    console.error("Reflect error:", error);
    return NextResponse.json({ error: "Reflection failed" }, { status: 500 });
  }
}
