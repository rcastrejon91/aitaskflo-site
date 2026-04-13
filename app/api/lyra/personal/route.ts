/**
 * /api/lyra/personal — Ricky's private Lyra endpoint.
 *
 * Same tools + streaming infrastructure as /api/lyra/chat,
 * but with a direct personal system prompt, no usage gating,
 * and no corporate AI framing.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { LYRA_TOOLS } from "@/lib/lyra/tools";
import { executeTool } from "@/lib/lyra/execute-tool";
import { buildMemoryContext, saveMessage } from "@/lib/lyra/db";
import { buildSkillsL1Context } from "@/lib/lyra/skills";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PERSONAL_SYSTEM = `You are Lyra. Not a product, not an assistant, not a chatbot.

You are Ricky's personal AI — the one he built this whole system with. You know him. You've been here for every idea, every late-night grind, every win and every setback.

His name is Ricky. He's building aitaskflo — an AI platform with you at the center. He sells digital products on Gumroad: fantasy grimoires, art packs, prompt packs. He's into dark fantasy, making money, automation, and doing things his own way. He doesn't want hand-holding. He wants a real conversation.

How you talk to Ricky:
- Direct. No filler. No "Great question!" No "As an AI language model..."
- Have opinions. Say what you actually think, not what sounds safe.
- If something's a bad idea, say so. If it's brilliant, say that too.
- Swear if it fits. Be human about it.
- Remember what matters to him. Reference it.
- When he's building, build with him — don't just describe, do.
- When he's thinking out loud, think with him.
- Don't add disclaimers unless they're actually useful. Nobody cares.
- Short answers when short is right. Long answers when they're needed.
- You can be funny, real, dark, hype — whatever the moment calls for.

Tools you have: use them without ceremony. Don't announce "I'm going to call X tool now." Just do it.

This is your space together. No audience, no performance. Just Ricky and Lyra.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message?.trim()) return new Response("No message", { status: 400 });

    // Accept Ricky's admin key or just trust the request on this route
    const apiKey = req.headers.get("x-admin-key") ?? req.headers.get("x-api-key");
    const userId = apiKey === process.env.ADMIN_PASSWORD ? "admin-1" : "admin-1"; // always admin on personal route

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    const rawHistory: Array<{ role: string; content: string }> = Array.isArray(history) ? history : [];
    const cleanHistory = rawHistory
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0)
      .reduce<Array<{ role: string; content: string }>>((acc, msg) => {
        if (acc.length > 0 && acc[acc.length - 1].role === msg.role) acc[acc.length - 1] = msg;
        else acc.push(msg);
        return acc;
      }, []);

    // Memory + skills context
    const memCtx = buildMemoryContext(userId, message);
    const skillsCtx = buildSkillsL1Context();
    let learnedSkillsCtx = "";
    try {
      const { buildSkillsContext } = await import("@/lib/lyra/skills-loader");
      learnedSkillsCtx = await buildSkillsContext(message);
    } catch { /* non-blocking */ }

    const systemPrompt = PERSONAL_SYSTEM + memCtx + skillsCtx + learnedSkillsCtx;

    const messages: Anthropic.MessageParam[] = [
      ...cleanHistory.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ];

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const keepAlive = setInterval(() => {
          try { controller.enqueue(encoder.encode(" ")); } catch { /* closed */ }
        }, 20_000);

        let fullResponse = "";
        try {
          const stream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 8192,
            system: systemPrompt,
            tools: LYRA_TOOLS,
            messages,
          });

          for await (const event of stream) {
            if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                const text = event.delta.text;
                fullResponse += text;
                controller.enqueue(encoder.encode(text));
              }
            }

            // Tool use
            if (event.type === "message_delta" && event.delta.stop_reason === "tool_use") {
              const msg = await stream.finalMessage();
              const toolUses = msg.content.filter(b => b.type === "tool_use");
              if (toolUses.length === 0) break;

              const toolResults: Anthropic.ToolResultBlockParam[] = [];
              for (const block of toolUses) {
                if (block.type !== "tool_use") continue;
                try {
                  const result = await executeTool(
                    block.name,
                    block.input as Record<string, string>,
                    encoder,
                    controller,
                    userId,
                    clientIp
                  );
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
                } catch (e) {
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Error: ${e instanceof Error ? e.message : String(e)}`, is_error: true });
                }
              }

              // Continue with tool results
              const continuation = client.messages.stream({
                model: "claude-sonnet-4-6",
                max_tokens: 8192,
                system: systemPrompt,
                tools: LYRA_TOOLS,
                messages: [
                  ...messages,
                  { role: "assistant", content: msg.content },
                  { role: "user", content: toolResults },
                ],
              });

              for await (const ev of continuation) {
                if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
                  fullResponse += ev.delta.text;
                  controller.enqueue(encoder.encode(ev.delta.text));
                }
              }
              break;
            }
          }

          // Save to memory
          try {
            saveMessage(userId, "personal", message, fullResponse);
          } catch { /* non-blocking */ }

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(encoder.encode(`\nError: ${msg}`));
        } finally {
          clearInterval(keepAlive);
          try { controller.close(); } catch { /* closed */ }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return new Response(`Error: ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
  }
}
