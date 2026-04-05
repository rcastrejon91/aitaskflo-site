/**
 * /api/lyra/browse
 *
 * Playwright-powered autonomous web browsing for Lyra.
 * Runs entirely server-side — no local agent needed.
 *
 * POST { action: "web_task",  url, task }              → streams result
 * POST { action: "walkthrough", gameUrl, gameName }    → streams walkthrough steps
 */

import { NextRequest } from "next/server";

export const maxDuration = 180; // 3 min — Playwright tasks can be slow

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action: "web_task" | "walkthrough";
    url?: string;
    task?: string;
    gameUrl?: string;
    gameName?: string;
  };

  const encoder = new TextEncoder();

  // ── Autonomous web task ───────────────────────────────────────────────────
  if (body.action === "web_task" && body.url && body.task) {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          try { controller.enqueue(encoder.encode(JSON.stringify(data) + "\n")); } catch { /* closed */ }
        };

        try {
          send({ type: "status", message: `Opening ${body.url}…` });

          const { runWebTask } = await import("@/lib/lyra/browser");
          const result = await runWebTask(
            body.url!,
            body.task!,
            (step, action, screenshot) => {
              send({ type: "step", step, action, screenshot });
            },
          );

          send({ type: "complete", result });
        } catch (err) {
          send({ type: "error", message: err instanceof Error ? err.message : String(err) });
        } finally {
          try { controller.close(); } catch { /* closed */ }
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
    });
  }

  // ── Game walkthrough ──────────────────────────────────────────────────────
  if (body.action === "walkthrough" && body.gameUrl && body.gameName) {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          try { controller.enqueue(encoder.encode(JSON.stringify(data) + "\n")); } catch { /* closed */ }
        };

        try {
          send({ type: "status", message: `Loading "${body.gameName}"…` });

          const { runGameWalkthrough } = await import("@/lib/lyra/browser");
          const steps = await runGameWalkthrough(
            body.gameUrl!,
            body.gameName!,
            (step) => {
              send({ type: "step", ...step });
            },
          );

          send({ type: "complete", steps, gameName: body.gameName });
        } catch (err) {
          send({ type: "error", message: err instanceof Error ? err.message : String(err) });
        } finally {
          try { controller.close(); } catch { /* closed */ }
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
    });
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}
