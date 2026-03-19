import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getActiveAgent, getAgent, incrementConversationCount } from "@/lib/lyra/agents";
import { getRelevantMemories, formatMemoriesForPrompt } from "@/lib/lyra/memories";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { message, history, conversationId, agentId } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response("Invalid message", { status: 400 });
    }

    const agent = agentId ? getAgent(agentId) : getActiveAgent();
    if (!agent) return new Response("Agent not found", { status: 404 });

    // Load relevant memories
    const memories = await getRelevantMemories(message, 5);
    const memoryContext = formatMemoriesForPrompt(memories);

    // Enhance system prompt with memories
    const systemPrompt = agent.systemPrompt + memoryContext;

    const messages: Anthropic.MessageParam[] = [
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];

    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: systemPrompt,
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

    // Increment conversation count async (don't await, don't block stream)
    incrementConversationCount(agent.id).catch(console.error);

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Agent-Id": agent.id,
        "X-Agent-Name": agent.name,
        "X-Memory-Count": String(memories.length),
        "X-Conversation-Id": conversationId ?? "",
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return new Response("Invalid API key", { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return new Response("Rate limited, please try again", { status: 429 });
    }
    console.error("Lyra chat error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
