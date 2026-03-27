/**
 * /api/wl/[slug]/chat
 * White-label chat endpoint. Works identically to /api/lyra/chat but
 * loads the agency's branding + system prompt addendum and restricts
 * tools to the agency's allowed set.
 */
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getWhiteLabel } from "@/lib/lyra/whitelabel";
import { buildWhiteLabelSystemPrompt } from "@/lib/lyra/resume";
import { getActiveAgent } from "@/lib/lyra/agents";
import { LYRA_TOOLS } from "@/lib/lyra/tools";
import { streamGroqFallback } from "@/lib/lyra/streaming";
import { executeTool } from "@/lib/lyra/execute-tool";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const config = await getWhiteLabel(params.slug);
  if (!config) {
    return new Response(JSON.stringify({ error: "White-label not found" }), { status: 404 });
  }

  const { message, history } = await req.json();
  if (!message || typeof message !== "string") {
    return new Response("Invalid message", { status: 400 });
  }

  const agent = getActiveAgent();
  if (!agent) return new Response("Agent not found", { status: 404 });

  // Filter tools to agency's allowed set
  const allowedTools = LYRA_TOOLS.filter((t) => config.allowedTools.includes(t.name));

  // Build white-labeled system prompt
  const systemPrompt = buildWhiteLabelSystemPrompt(config, agent.systemPrompt);

  const rawHistory: Array<{ role: string; content: string }> = Array.isArray(history) ? history : [];
  const cleanHistory = rawHistory.filter((m) => {
    const text = typeof m.content === "string" ? m.content.trim() : "";
    return (m.role === "user" || m.role === "assistant") && text.length > 0;
  });

  const messages: Anthropic.MessageParam[] = [
    ...cleanHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) {
          await streamGroqFallback(systemPrompt, messages as Array<{ role: string; content: string }>, encoder, controller);
          return;
        }

        const client = new Anthropic({ apiKey: anthropicKey });
        let loopMessages = [...messages];
        let iterations = 0;

        while (iterations < 5) {
          iterations++;
          const stream = client.messages.stream({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2048,
            system: systemPrompt,
            messages: loopMessages,
            tools: allowedTools,
            tool_choice: { type: "auto" as const },
          });

          let textSoFar = "";
          const toolUses: Array<{ id: string; name: string; inputJson: string }> = [];
          let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

          for await (const event of stream) {
            if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
              currentToolUse = { id: event.content_block.id, name: event.content_block.name, inputJson: "" };
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                textSoFar += event.delta.text;
                controller.enqueue(encoder.encode(event.delta.text));
              } else if (event.delta.type === "input_json_delta" && currentToolUse) {
                currentToolUse.inputJson += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop" && currentToolUse) {
              toolUses.push(currentToolUse);
              currentToolUse = null;
            }
          }
          void textSoFar;

          const finalMessage = await stream.finalMessage();
          if (finalMessage.stop_reason === "end_turn" || toolUses.length === 0) break;

          const assistantContent = finalMessage.content;
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const toolUse of toolUses) {
            let input: Record<string, string> = {};
            try { input = JSON.parse(toolUse.inputJson || "{}"); } catch { /* ignore */ }
            const result = await executeTool(toolUse.name, input, encoder, controller);
            toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
          }

          loopMessages = [
            ...loopMessages,
            { role: "assistant", content: assistantContent },
            { role: "user", content: toolResults },
          ];
        }
      } catch {
        try {
          await streamGroqFallback(systemPrompt, messages as Array<{ role: string; content: string }>, encoder, controller);
        } catch {
          try { controller.enqueue(encoder.encode("⚠️ Service unavailable. Please try again.")); } catch { /* closed */ }
        }
      } finally {
        try { controller.close(); } catch { /* closed */ }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-WL-Slug": config.slug,
      "X-WL-Agent": config.agentName,
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
