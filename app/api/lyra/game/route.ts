import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Default NPC persona — overridden per-NPC via request body
const DEFAULT_NPC_SYSTEM = `You are an ancient forest spirit in The 13th Witch, a dark fantasy RPG.
Speak in short, cryptic riddles. You are otherworldly — unsettling but not evil.
Keep responses under 3 sentences. Never break character.
You know the player seeks forbidden knowledge. You may help — at a price.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, npc, context } = body as {
      message: string;
      npc?: { name?: string; system?: string };
      context?: Array<{ role: string; content: string }>;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const systemPrompt = npc?.system?.trim() || DEFAULT_NPC_SYSTEM;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: "*The spirit is silent — no API key configured.*",
      });
    }

    // Build history — cap at last 10 messages to control cost
    const safeHistory = (Array.isArray(context) ? context : [])
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001", // Fast + cheap for real-time NPC dialogue
      max_tokens: 256,
      system: systemPrompt,
      messages: [
        ...safeHistory,
        { role: "user", content: message },
      ],
    });

    const reply =
      response.content.find((b) => b.type === "text")?.text ?? "...";

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Game API] Error:", msg);
    return NextResponse.json(
      { reply: "*The spirit recoils* (server error)" },
      { status: 500 }
    );
  }
}
