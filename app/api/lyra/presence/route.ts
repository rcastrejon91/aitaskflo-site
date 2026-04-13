import { NextRequest, NextResponse } from "next/server";

// ── In-memory presence bus ─────────────────────────────────────────────────────
// All connected screens subscribe here. When anything triggers Lyra, we broadcast.

export interface PresenceEvent {
  type: "wake" | "showoff" | "thinking" | "idle" | "speaking" | "listening";
  message?: string;
  detail?: string;   // e.g. "just built a game called neon-blitz"
  timestamp: number;
}

// Global subscriber list (persists across requests in the same process)
const subscribers = new Set<(e: PresenceEvent) => void>();

export function broadcastPresence(event: PresenceEvent) {
  for (const cb of subscribers) {
    try { cb(event); } catch { /* dead connection */ }
  }
}

// ── GET — SSE stream for screen clients ───────────────────────────────────────
export async function GET() {
  let unsub: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(event: PresenceEvent) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          unsub?.();
        }
      }

      // Send initial idle state
      send({ type: "idle", timestamp: Date.now() });

      subscribers.add(send);
      unsub = () => subscribers.delete(send);
    },
    cancel() {
      unsub?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── POST — trigger a presence event ───────────────────────────────────────────
// Called internally when Lyra does something notable, or from the Pi agent
export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<PresenceEvent>;
  const event: PresenceEvent = {
    type: body.type ?? "idle",
    message: body.message,
    detail: body.detail,
    timestamp: Date.now(),
  };
  broadcastPresence(event);
  return NextResponse.json({ ok: true, subscribers: subscribers.size });
}
