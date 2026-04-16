/**
 * Role Bot Chat — streaming chat scoped to a saved role bot.
 * Uses the bot's custom system prompt + selected tools subset.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getRoleBot } from "@/lib/lyra/db";
import { LYRA_TOOLS } from "@/lib/lyra/tools";
import { executeTool } from "@/lib/lyra/execute-tool";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getUserId(req: NextRequest): Promise<string | null> {
  void req;
  const session = await auth();
  return (session?.user as { id?: string })?.id ?? null;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { botId, message, history } = await req.json().catch(() => ({})) as {
    botId?: string;
    message?: string;
    history?: Array<{ role: string; content: string }>;
  };

  if (!botId || !message?.trim()) {
    return new Response("botId and message required", { status: 400 });
  }

  const bot = getRoleBot(botId);
  if (!bot || bot.user_id !== userId) {
    return new Response("Bot not found", { status: 404 });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  // Parse bot's allowed tools from JSON
  let botToolNames: string[] = [];
  try { botToolNames = JSON.parse(bot.tools || "[]"); } catch { botToolNames = []; }

  // Filter LYRA_TOOLS to only the tools this bot is configured with
  const allowedTools = botToolNames.length > 0
    ? LYRA_TOOLS.filter((t) => botToolNames.includes(t.name))
    : LYRA_TOOLS.slice(0, 3); // fallback: search_web, memory_store, memory_recall

  // Clean history: strip empty messages and consecutive same-role
  const rawHistory = Array.isArray(history) ? history : [];
  const cleanHistory = rawHistory
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
    .reduce<Array<{ role: string; content: string }>>((acc, msg) => {
      if (acc.length > 0 && acc[acc.length - 1].role === msg.role) {
        acc[acc.length - 1] = msg;
      } else {
        acc.push(msg);
      }
      return acc;
    }, []);

  const messages: Anthropic.MessageParam[] = [
    ...cleanHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return new Response("AI service not configured", { status: 503 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      // Keep-alive: send a space every 20s to prevent Cloudflare timeout
      const keepAlive = setInterval(() => {
        try { controller.enqueue(encoder.encode(" ")); } catch { /* closed */ }
      }, 20_000);

      try {
        const client = new Anthropic({ apiKey: anthropicKey });
        let loopMessages = [...messages];
        let iterations = 0;
        const MAX_ITERATIONS = 5;

        while (iterations < MAX_ITERATIONS) {
          iterations++;

          const stream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system: bot.system_prompt,
            messages: loopMessages,
            tools: allowedTools,
            tool_choice: { type: "auto" },
          });

          const toolUses: Array<{ id: string; name: string; inputJson: string }> = [];
          let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

          for await (const event of stream) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  inputJson: "",
                };
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                controller.enqueue(encoder.encode(event.delta.text));
              } else if (event.delta.type === "input_json_delta" && currentToolUse) {
                currentToolUse.inputJson += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolUse) {
                toolUses.push(currentToolUse);
                currentToolUse = null;
              }
            }
          }

          const finalMessage = await stream.finalMessage();

          if (finalMessage.stop_reason === "end_turn" || toolUses.length === 0) break;

          const assistantContent: Anthropic.ContentBlock[] = finalMessage.content;
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const toolUse of toolUses) {
            let input: Record<string, string> = {};
            try { input = JSON.parse(toolUse.inputJson || "{}"); } catch { input = {}; }
            const result = await executeTool(toolUse.name, input, encoder, controller, userId, clientIp);
            toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
          }

          loopMessages = [
            ...loopMessages,
            { role: "assistant", content: assistantContent },
            { role: "user", content: toolResults },
          ];
        }
      } catch (err) {
        try {
          controller.enqueue(encoder.encode(`\n\n⚠️ Error: ${err instanceof Error ? err.message : String(err)}`));
        } catch { /* closed */ }
      } finally {
        clearInterval(keepAlive);
        try { controller.close(); } catch { /* closed */ }
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Accel-Buffering": "no" },
  });
}
