/**
 * /api/lyra/computer
 *
 * Bridge between Lyra and the user's local desktop agent.
 * Local agent polls this endpoint to get tasks and submit screenshots.
 * Lyra uses Claude's vision to decide the next action.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  createComputerSession,
  getComputerSession,
  getPendingComputerSession,
  updateComputerSession,
} from "@/lib/lyra/db";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── POST /api/lyra/computer ───────────────────────────────────────────────────
// Called by: Lyra tool executor to start a computer session
// Called by: local agent to submit a screenshot and get the next action

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action?: "start" | "screenshot" | "done";
    userId?: string;
    task?: string;
    sessionId?: string;
    screenshot?: string; // base64 PNG
    agentKey?: string;
  };

  // ── Start a new session (called by Lyra) ──────────────────────────────────
  if (body.action === "start" && body.userId && body.task) {
    const id = createComputerSession(body.userId, body.task);
    return NextResponse.json({ sessionId: id });
  }

  // ── Submit screenshot + get next action (called by local agent) ───────────
  if (body.action === "screenshot" && body.sessionId && body.screenshot) {
    // Validate agent key
    const agentKey = process.env.COMPUTER_AGENT_KEY ?? process.env.ADMIN_PASSWORD;
    if (agentKey && body.agentKey !== agentKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = getComputerSession(body.sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status === "done") return NextResponse.json({ action: "done", message: session.result });

    updateComputerSession(body.sessionId, { status: "running", screenshot: body.screenshot });

    // Ask Claude what to do next using computer use
    try {
      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: "computer_20241022", name: "computer", display_width_px: 1920, display_height_px: 1080 }] as any,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are controlling a real computer. Task: "${session.task}"\n\nLook at the current screenshot and decide the single best next action to make progress. Be precise with coordinates.`,
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: body.screenshot,
                },
              },
            ],
          },
        ],
      });

      // Extract action from response
      const toolUse = response.content.find(c => c.type === "tool_use");
      const textBlock = response.content.find(c => c.type === "text");

      if (response.stop_reason === "end_turn" || !toolUse) {
        // Claude thinks we're done
        const result = textBlock && "text" in textBlock ? textBlock.text : "Task complete.";
        updateComputerSession(body.sessionId, { status: "done", result });
        return NextResponse.json({ action: "done", message: result });
      }

      if (toolUse && "input" in toolUse) {
        const actionJson = JSON.stringify(toolUse.input);
        updateComputerSession(body.sessionId, { status: "waiting_screenshot", action: actionJson });
        return NextResponse.json({ action: "execute", command: toolUse.input });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      updateComputerSession(body.sessionId, { status: "error", result: msg });
      return NextResponse.json({ action: "error", message: msg });
    }
  }

  // ── Mark session done (called by local agent when task complete) ───────────
  if (body.action === "done" && body.sessionId) {
    updateComputerSession(body.sessionId, { status: "done", result: "Agent confirmed complete." });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// ── GET /api/lyra/computer?userId=xxx ─────────────────────────────────────────
// Local agent polls this to check if there's a pending task for them

export async function GET(req: NextRequest) {
  const agentKey = process.env.COMPUTER_AGENT_KEY ?? process.env.ADMIN_PASSWORD;
  const providedKey = req.headers.get("x-agent-key");
  if (agentKey && providedKey !== agentKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (sessionId) {
    const session = getComputerSession(sessionId);
    return NextResponse.json({ session });
  }

  if (userId) {
    const session = getPendingComputerSession(userId);
    return NextResponse.json({ session });
  }

  return NextResponse.json({ error: "userId or sessionId required" }, { status: 400 });
}
