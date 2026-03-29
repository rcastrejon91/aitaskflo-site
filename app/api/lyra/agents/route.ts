import { NextRequest, NextResponse } from "next/server";
import { getAllAgents, getLyraState, setActiveAgent, computeLineageGraph, getGameStudioAgents } from "@/lib/lyra/agents";
import { auth } from "@/auth";

export async function GET() {
  try {
    const agents = getAllAgents();
    const studioAgents = getGameStudioAgents();
    const allAgents = [...agents, ...studioAgents];
    const state = getLyraState();
    const lineage = computeLineageGraph(agents);

    return NextResponse.json({
      agents: allAgents,
      studioAgents,
      lineage,
      activeAgentId: state.activeAgentId,
    });
  } catch (error) {
    console.error("Agents GET error:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { activeAgentId } = await req.json();
    if (!activeAgentId) {
      return NextResponse.json({ error: "activeAgentId required" }, { status: 400 });
    }
    await setActiveAgent(activeAgentId);
    return NextResponse.json({ success: true, activeAgentId });
  } catch (error) {
    console.error("Agents PATCH error:", error);
    return NextResponse.json({ error: "Failed to update active agent" }, { status: 500 });
  }
}
