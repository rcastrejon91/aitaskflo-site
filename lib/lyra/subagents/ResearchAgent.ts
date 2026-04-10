/**
 * lib/lyra/subagents/ResearchAgent.ts
 * Web search + multi-source synthesis.
 */

import { SubAgent, type AgentTask } from "./base";

export class ResearchAgent extends SubAgent {
  readonly name = "ResearchAgent";

  protected async execute(task: AgentTask, attempt: number): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY not set");

    const systemPrompt = `You are ResearchAgent, a specialist for web research and synthesis.
Process: 1) Use search_web with 2-3 targeted queries. 2) Use read_url on top 2-3 results. 3) Use get_news for recent coverage. 4) Synthesize into a structured summary with sources.
Output format: Key findings → Supporting evidence → Confidence level → Sources.
Attempt ${attempt}. ${attempt > 1 ? "Previous attempt was insufficient — go deeper or broaden search terms." : ""}
${task.context ? `Context: ${task.context}` : ""}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1200,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: task.instruction },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "No response from ResearchAgent.";
  }
}
