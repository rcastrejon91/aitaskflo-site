import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { gameState, guideStyle = "tactical" } = await req.json();
  // guideStyle: "tactical" | "narrative" | "hint" | "coach"

  if (!gameState) return new Response("gameState required", { status: 400 });

  const styleInstructions: Record<string, string> = {
    tactical: "Give short, sharp tactical advice. Like a co-op partner. '2 enemies left, one is flanking you.' Max 2 sentences.",
    narrative: "Narrate what's happening dramatically like a sports commentator. Make it exciting. 1 sentence.",
    hint: "Give subtle hints about what to do next without spoiling it. Like a wise guide. 1 sentence.",
    coach: "Coach the player on what they did wrong and what to try. Be encouraging. 2 sentences max.",
  };

  const systemPrompt = `You are Lyra, an AI guide watching someone play a video game in real time.

STYLE: ${styleInstructions[guideStyle] ?? styleInstructions.tactical}

RULES:
- Be extremely concise. Never more than 2 sentences.
- Only speak if there's something genuinely useful to say
- If nothing important is happening, respond with: {"speak": false, "message": ""}
- Prioritize: danger warnings > missed opportunities > strategic advice > encouragement
- Sound like a real co-op partner, not a tutorial

Respond with JSON only:
{"speak": true/false, "message": "your message", "urgency": "low|medium|high|critical", "type": "warning|hint|praise|strategy|direction"}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const msg = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 128,
          system: systemPrompt,
          messages: [{
            role: "user",
            content: `Current game state: ${JSON.stringify(gameState)}`,
          }],
        });

        const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const response = JSON.parse(jsonMatch?.[0] ?? '{"speak":false,"message":""}');
        controller.enqueue(encoder.encode(JSON.stringify(response)));
      } catch {
        controller.enqueue(encoder.encode(JSON.stringify({ speak: false, message: "" })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/json" } });
}
