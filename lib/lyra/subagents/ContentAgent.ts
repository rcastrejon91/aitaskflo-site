/**
 * lib/lyra/subagents/ContentAgent.ts
 * Writing, image generation, formatting.
 */

import { SubAgent, type AgentTask } from "./base";

export class ContentAgent extends SubAgent {
  readonly name = "ContentAgent";

  protected async execute(task: AgentTask, attempt: number): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY not set");

    const systemPrompt = `You are ContentAgent, a specialist for writing and content creation.
Capabilities: blog posts, social media copy, email templates, long-form articles, image prompts (via image_gen or fal_image), formatting.
Structure all content: Hook → Body → Call to action.
Match tone to audience. Use image_gen for visuals when appropriate.
Attempt ${attempt}. ${attempt > 1 ? "Previous draft was rejected — revise significantly (tone, structure, or length)." : ""}
${task.context ? `Context: ${task.context}` : ""}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1500,
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: task.instruction },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "No response from ContentAgent.";
  }
}
