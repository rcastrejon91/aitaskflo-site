import { NextRequest, NextResponse } from "next/server";
import { getAllMemories, storeMemory, getRelevantMemories } from "@/lib/lyra/memories";
import type { MemoryType, MemoryImportance } from "@/lib/types/lyra";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as MemoryType | null;
    const query = searchParams.get("query");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    if (query) {
      const memories = await getRelevantMemories(query, limit, type ?? undefined);
      return NextResponse.json({ memories });
    }

    let memories = getAllMemories();
    if (type) memories = memories.filter((m) => m.type === type);
    memories = memories
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({ memories });
  } catch (error) {
    console.error("Memories GET error:", error);
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, type, tags, importance, agentId, sourceConversationId } = body;

    if (!content || !type || !agentId) {
      return NextResponse.json({ error: "content, type, and agentId required" }, { status: 400 });
    }

    const memory = await storeMemory({
      content,
      type: type as MemoryType,
      tags: Array.isArray(tags) ? tags : [],
      importance: (importance as MemoryImportance) ?? "medium",
      agentId,
      sourceConversationId,
    });

    return NextResponse.json({ memory });
  } catch (error) {
    console.error("Memories POST error:", error);
    return NextResponse.json({ error: "Failed to store memory" }, { status: 500 });
  }
}
