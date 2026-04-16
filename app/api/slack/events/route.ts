/**
 * POST /api/slack/events
 * Receives Slack event subscriptions and routes them to the right persona.
 */

import { NextRequest, NextResponse } from "next/server";
import { PERSONAS, generatePersonaResponse } from "@/lib/lyra/slack-team";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    type?: string;
    challenge?: string;
    event?: {
      type?: string;
      text?: string;
      user?: string;
      channel?: string;
      ts?: string;
      bot_id?: string;
    };
  };

  // Slack URL verification handshake
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  const event = body.event;

  // Ignore bot messages to prevent loops
  if (!event || event.bot_id || event.type !== "message" || !event.text) {
    return NextResponse.json({ ok: true });
  }

  const text = event.text.toLowerCase();
  const channel = event.channel ?? process.env.SLACK_DRAMA_CHANNEL ?? "general";

  // Don't await — respond to Slack immediately, process in background
  (async () => {
    try {
      const PERSONA_MAP: Record<string, number> = { lyra: 0, axon: 1, nova: 2, hex: 3, milo: 4 };

      // @mention routing — @lyra, @axon, @nova, @hex, @milo take priority
      const mentionMatch = text.match(/@(lyra|axon|nova|hex|milo)\b/i);
      if (mentionMatch) {
        const idx = PERSONA_MAP[mentionMatch[1].toLowerCase()];
        if (idx !== undefined) {
          await generatePersonaResponse({
            persona: PERSONAS[idx],
            message: event.text!,
            channel,
            responseType: "answer",
          });
          return;
        }
      }

      // Task creation → Milo logs it (with real create_task tool)
      if (text.includes("create task") || text.includes("add task") || text.includes("todo") || text.includes("to-do") || text.includes("remind me") || text.includes("reminder")) {
        await generatePersonaResponse({
          persona: PERSONAS[4], // Milo
          message: event.text!,
          channel,
          responseType: "task",
        });
        return;
      }

      // Error / issue → Hex investigates (with search_web, read_url)
      if (text.includes("error") || text.includes("broken") || text.includes("down") || text.includes("issue") || text.includes("bug") || text.includes("outage")) {
        await generatePersonaResponse({
          persona: PERSONAS[3], // Hex
          message: event.text!,
          channel,
          responseType: "alert",
        });
        return;
      }

      // Summarize request → Axon summarizes (with real data tools)
      if (text.includes("summarize") || text.includes("summary") || text.includes("recap") || text.includes("stats") || text.includes("numbers")) {
        await generatePersonaResponse({
          persona: PERSONAS[1], // Axon
          message: event.text!,
          channel,
          responseType: "summary",
        });
        return;
      }

      // Milestone / good news → Nova hypes it
      if (text.includes("sale") || text.includes("revenue") || text.includes("launch") || text.includes("shipped") || text.includes("hit") || text.includes("milestone")) {
        await generatePersonaResponse({
          persona: PERSONAS[2], // Nova
          message: event.text!,
          channel,
          responseType: "hype",
        });
        return;
      }

      // Question or direct request → Lyra answers (with real tools)
      if (text.includes("?") || text.startsWith("hey") || text.startsWith("what") || text.startsWith("how") || text.startsWith("can") || text.startsWith("search") || text.startsWith("find") || text.startsWith("get") || text.startsWith("show")) {
        await generatePersonaResponse({
          persona: PERSONAS[0], // Lyra
          message: event.text!,
          channel,
          responseType: "answer",
        });
        return;
      }

    } catch (e) {
      console.error("[slack/events] error:", e);
    }
  })();

  return NextResponse.json({ ok: true });
}
