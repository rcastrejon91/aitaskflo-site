import { NextRequest, NextResponse } from "next/server";
import { getLyraState, updateLyraState, getActiveAgent, getAllAgents } from "@/lib/lyra/agents";
import { getAllMemories } from "@/lib/lyra/memories";
import { getAllReflections } from "@/lib/lyra/reflections";

export async function GET() {
  try {
    const state = getLyraState();
    const activeAgent = getActiveAgent();
    const agents = getAllAgents();
    const memories = getAllMemories();
    const reflections = getAllReflections();

    return NextResponse.json({
      state,
      activeAgent,
      stats: {
        totalAgents: agents.length,
        totalMemories: memories.length,
        totalReflections: reflections.length,
        generations: Math.max(...agents.map((a) => a.generation), 0),
      },
    });
  } catch (error) {
    console.error("State GET error:", error);
    return NextResponse.json({ error: "Failed to fetch state" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const partial = await req.json();
    const updated = await updateLyraState(partial);
    return NextResponse.json({ state: updated });
  } catch (error) {
    console.error("State PATCH error:", error);
    return NextResponse.json({ error: "Failed to update state" }, { status: 500 });
  }
}
