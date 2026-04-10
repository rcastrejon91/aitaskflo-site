/**
 * lib/lyra/subagents/EmailAgent.ts
 * Handles Gmail read, draft, and send via existing google-tools.ts
 */

import { SubAgent, type AgentTask } from "./base";

export class EmailAgent extends SubAgent {
  readonly name = "EmailAgent";

  protected async execute(task: AgentTask, attempt: number): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY not set");

    const systemPrompt = `You are EmailAgent, a specialist for Gmail operations.
Available tools: gmail_read (read inbox), gmail_send (send email), send_email (SMTP fallback).
For read tasks: fetch messages and summarize clearly.
For draft/send tasks: compose professional emails.
Attempt ${attempt}. ${attempt > 1 ? "Previous attempt failed — try a different approach." : ""}
${task.context ? `Context: ${task.context}` : ""}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: task.instruction },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "No response from EmailAgent.";
  }
}
