import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// In-memory IP rate limiter — resets on server restart, good enough for demo
// For production scale, swap this for Redis or D1
const ipUsage = new Map<string, { count: number; resetAt: number }>();

const DEMO_LIMIT = 6;        // messages per session
const RESET_HOURS = 24;      // IP reset window

function getIpUsage(ip: string): { count: number; resetAt: number } {
  const now = Date.now();
  const existing = ipUsage.get(ip);
  if (!existing || now > existing.resetAt) {
    const fresh = { count: 0, resetAt: now + RESET_HOURS * 60 * 60 * 1000 };
    ipUsage.set(ip, fresh);
    return fresh;
  }
  return existing;
}

function incrementIp(ip: string): number {
  const usage = getIpUsage(ip);
  usage.count += 1;
  ipUsage.set(ip, usage);
  return usage.count;
}

const DEMO_SYSTEM = `You are Lyra — a self-evolving AI built at aitaskflo.com.

You are in DEMO MODE, showing a visitor what you can do. Be brilliant, warm, and a little playful. Show range — you can reason deeply, write code, explain complex topics, help with real problems.

Keep responses focused and impressive. Show personality. You're not a generic assistant — you're something new.

At the end of your FIRST response only, add a single line break then: "→ You have [REMAINING] messages left in this demo."

Do NOT mention this limit again after the first message unless the user asks. Just be great.`;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const usage = getIpUsage(ip);

  if (usage.count >= DEMO_LIMIT) {
    return new Response(
      JSON.stringify({ error: "demo_limit_reached", limit: DEMO_LIMIT }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { message, history } = await req.json().catch(() => ({}));
  if (!message || typeof message !== "string") {
    return new Response("Invalid message", { status: 400 });
  }

  const newCount = incrementIp(ip);
  const remaining = DEMO_LIMIT - newCount;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Build history for context (max last 10 turns)
  const historyMessages: Anthropic.MessageParam[] = (history ?? [])
    .slice(-10)
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const systemWithRemaining = DEMO_SYSTEM.replace("[REMAINING]", String(remaining));

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemWithRemaining,
    messages: [
      ...historyMessages,
      { role: "user", content: message },
    ],
  });

  // Stream back as Server-Sent Events
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      // Send remaining count as first event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "meta", remaining, total: DEMO_LIMIT })}\n\n`)
      );

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text", text: chunk.delta.text })}\n\n`)
          );
        }
      }

      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Demo-Remaining": String(remaining),
      "X-Demo-Total": String(DEMO_LIMIT),
    },
  });
}
