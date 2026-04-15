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
      // Question → Lyra answers
      if (text.includes("?") || text.startsWith("hey") || text.startsWith("what") || text.startsWith("how") || text.startsWith("can")) {
        await generatePersonaResponse({
          persona: PERSONAS[0], // Lyra
          message: event.text!,
          channel,
          responseType: "answer",
        });
        return;
      }

      // Summarize request → Axon summarizes
      if (text.includes("summarize") || text.includes("summary") || text.includes("recap")) {
        await generatePersonaResponse({
          persona: PERSONAS[1], // Axon
          message: event.text!,
          channel,
          responseType: "summary",
        });
        return;
      }

      // Task creation → Milo logs it
      if (text.includes("create task") || text.includes("add task") || text.includes("todo") || text.includes("to-do")) {
        await generatePersonaResponse({
          persona: PERSONAS[4], // Milo
          message: event.text!,
          channel,
          responseType: "task",
        });
        return;
      }

      // Error / issue → Hex flags it
      if (text.includes("error") || text.includes("broken") || text.includes("down") || text.includes("issue") || text.includes("bug")) {
        await generatePersonaResponse({
          persona: PERSONAS[3], // Hex
          message: event.text!,
          channel,
          responseType: "alert",
        });
        return;
      }

      // Milestone / good news → Nova hypes it
      if (text.includes("sale") || text.includes("revenue") || text.includes("user") || text.includes("launch") || text.includes("shipped")) {
        await generatePersonaResponse({
          persona: PERSONAS[2], // Nova
          message: event.text!,
          channel,
          responseType: "hype",
        });
        return;
      }

    } catch (e) {
      console.error("[slack/events] error:", e);
    }
  })();

  return NextResponse.json({ ok: true });
}
