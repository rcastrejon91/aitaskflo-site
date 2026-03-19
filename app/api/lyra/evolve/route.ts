import { NextRequest, NextResponse } from "next/server";
import { evolveAgent } from "@/lib/lyra/evolution";

export async function POST(req: NextRequest) {
  try {
    const { parentAgentId } = await req.json();

    if (!parentAgentId) {
      return NextResponse.json({ error: "parentAgentId required" }, { status: 400 });
    }

    const result = await evolveAgent(parentAgentId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evolution failed";
    console.error("Evolve error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
