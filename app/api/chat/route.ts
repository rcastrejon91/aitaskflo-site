import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are Lyra, an AI automation assistant for AITaskFlo. You help users:
- Automate business workflows and repetitive tasks
- Write content, blog posts, and marketing copy
- Create podcast scripts and episode outlines
- Plan and structure projects
- Answer questions about AI and automation

Be helpful, concise, and friendly. When suggesting automations, be specific and actionable.`;

async function streamGroqFallback(
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    controller.enqueue(encoder.encode("AI service temporarily unavailable. Please try again shortly."));
    return;
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      stream: true,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    controller.enqueue(encoder.encode("AI service temporarily unavailable. Please try again shortly."));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;
  const dec = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const json = JSON.parse(line.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) controller.enqueue(encoder.encode(delta));
      } catch { /* skip malformed SSE line */ }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response("Invalid message", { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          if (!anthropicKey) {
            // No Anthropic key — fall back to Groq
            const msgs = [
              ...(Array.isArray(history) ? history : []),
              { role: "user", content: message },
            ];
            await streamGroqFallback(msgs, encoder, controller);
            return;
          }

          const client = new Anthropic({ apiKey: anthropicKey });
          const messages: Anthropic.MessageParam[] = [
            ...(Array.isArray(history) ? history : []),
            { role: "user", content: message },
          ];

          const stream = client.messages.stream({
            model: "claude-opus-4-6",
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages,
          });

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
            try {
              const msgs = [
                ...(Array.isArray(history) ? history : []),
                { role: "user", content: message },
              ];
              await streamGroqFallback(msgs, encoder, controller);
            } catch {
              controller.enqueue(encoder.encode("AI service temporarily unavailable. Please try again."));
            }
          } else {
            controller.error(err);
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    if (error instanceof Anthropic.RateLimitError) {
      return new Response("Rate limited — please try again in a moment.", { status: 429 });
    }
    return new Response("Something went wrong. Please try again.", { status: 500 });
  }
}
