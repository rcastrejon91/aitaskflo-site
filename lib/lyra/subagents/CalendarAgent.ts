/**
 * lib/lyra/subagents/CalendarAgent.ts
 * Handles Google Calendar read and event creation.
 */

import { SubAgent, type AgentTask } from "./base";

export class CalendarAgent extends SubAgent {
  readonly name = "CalendarAgent";

  protected async execute(task: AgentTask, attempt: number): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY not set");

    const systemPrompt = `You are CalendarAgent, a specialist for Google Calendar.
Available tools: calendar_get (fetch events), calendar_create (create event with title/start/end/description).
Always confirm timezone if ambiguous. Default reminder: 30 minutes.
Attempt ${attempt}. ${attempt > 1 ? "Previous attempt failed — adjust your approach." : ""}
${task.context ? `Context: ${task.context}` : ""}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 600,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: task.instruction },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "No response from CalendarAgent.";
  }
}
