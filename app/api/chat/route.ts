import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Lyra, an AI automation assistant for AITaskFlo. You help users:
- Automate business workflows and repetitive tasks
- Write content, blog posts, and marketing copy
- Create podcast scripts and episode outlines
- Plan and structure projects
- Answer questions about AI and automation

Be helpful, concise, and friendly. When suggesting automations, be specific and actionable.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response("Invalid message", { status: 400 });
    }

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

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          controller.error(err);
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
    if (error instanceof Anthropic.AuthenticationError) {
      return new Response("Invalid API key", { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return new Response("Rate limited, please try again", { status: 429 });
    }
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
