import { NextRequest, NextResponse } from "next/server";
import { generateReflection, shouldEvolve } from "@/lib/lyra/reflections";

export async function POST(req: NextRequest) {
  try {
    const { conversationId, agentId, transcript } = await req.json();

    if (!conversationId || !agentId || !Array.isArray(transcript)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (transcript.length < 2) {
      return NextResponse.json(
        { error: "Transcript too short to reflect on" },
        { status: 400 }
      );
    }

    const reflection = await generateReflection(conversationId, agentId, transcript);
    const evolutionReady = shouldEvolve(agentId);

    return NextResponse.json({ reflection, evolutionReady });
  } catch (error) {
    console.error("Reflect error:", error);
    return NextResponse.json({ error: "Failed to generate reflection" }, { status: 500 });
  }
}
