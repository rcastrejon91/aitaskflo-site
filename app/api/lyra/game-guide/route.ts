import { NextRequest } from "next/server";
import { complete, getRealtimeProvider } from "@/lib/lyra/providers";

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

  const system = `You are Lyra, an AI guide watching someone play a video game in real time.

STYLE: ${styleInstructions[guideStyle] ?? styleInstructions.tactical}

RULES:
- Be extremely concise. Never more than 2 sentences.
- Only speak if there's something genuinely useful to say
- If nothing important is happening, respond with: {"speak": false, "message": ""}
- Prioritize: danger warnings > missed opportunities > strategic advice > encouragement
- Sound like a real co-op partner, not a tutorial

Respond with JSON only:
{"speak": true/false, "message": "your message", "urgency": "low|medium|high|critical", "type": "warning|hint|praise|strategy|direction"}`;

  const config = getRealtimeProvider();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const text = await complete({
          config,
          system,
          messages: [{ role: "user", content: `Current game state: ${JSON.stringify(gameState)}` }],
          maxTokens: 128,
          temperature: 0.5,
        });

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
