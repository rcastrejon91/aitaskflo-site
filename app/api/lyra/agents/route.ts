import { NextRequest, NextResponse } from "next/server";
import { getAllAgents, getLyraState, setActiveAgent, computeLineageGraph } from "@/lib/lyra/agents";

export async function GET() {
  try {
    const agents = getAllAgents();
    const state = getLyraState();
    const lineage = computeLineageGraph(agents);

    return NextResponse.json({
      agents,
      lineage,
      activeAgentId: state.activeAgentId,
    });
  } catch (error) {
    console.error("Agents GET error:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
