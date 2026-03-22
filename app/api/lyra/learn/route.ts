import { NextRequest, NextResponse } from "next/server";
import { getActiveAgent } from "@/lib/lyra/agents";
import { learnFromTopics, getRecentLearnings, getAllLearnings } from "@/lib/lyra/weblearner";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Default curiosity topics — what Lyra explores when not given specific topics
const DEFAULT_TOPICS = [
  "artificial intelligence breakthroughs",
  "human psychology and behavior",
  "technology and society",
  "scientific discoveries",
  "future of work and automation",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topics: string[] = Array.isArray(body.topics) && body.topics.length
      ? body.topics.slice(0, 5)
      : DEFAULT_TOPICS.sort(() => Math.random() - 0.5).slice(0, 3);

    const agent = getActiveAgent();
    const entries = await learnFromTopics(topics, agent.id);

    return NextResponse.json({
      learned: entries.length,
      topics,
      entries: entries.map((e) => ({
        topic: e.topic,
        source: e.source,
        insights: e.insights,
        surprise: e.surprise,
        relevanceNote: e.relevanceNote,
        learnedAt: e.learnedAt,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Lyra Learn] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");
  const all = req.nextUrl.searchParams.get("all") === "true";

  const entries = all ? getAllLearnings() : getRecentLearnings(Math.min(limit, 50));

  return NextResponse.json({
    total: getAllLearnings().length,
    entries: entries.map((e) => ({
      id: e.id,
      topic: e.topic,
      source: e.source,
      url: e.url,
      insights: e.insights,
      surprise: e.surprise,
      relevanceNote: e.relevanceNote,
      learnedAt: e.learnedAt,
      agentId: e.agentId,
    })),
  });
}
