/**
 * lib/lyra/subagents/CodeAgent.ts
 * Code generation, review, and debugging. Routes to Claude for quality.
 */

import { SubAgent, type AgentTask } from "./base";

export class CodeAgent extends SubAgent {
  readonly name = "CodeAgent";

  protected async execute(task: AgentTask, attempt: number): Promise<string> {
    // Prefer Claude for code quality; fall back to Groq
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    const systemPrompt = `You are CodeAgent, a specialist for code generation, review, and debugging.
Languages: TypeScript, JavaScript, Python, SQL, bash, Godot GDScript.
Always: include language identifiers in code blocks, explain what each section does, note edge cases.
Attempt ${attempt}. ${attempt > 1 ? "Previous attempt had issues — fix the specific problem and simplify." : ""}
${task.context ? `Context: ${task.context}` : ""}`;

    if (anthropicKey) {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: task.instruction }],
      });
      const text = response.content.find((b) => b.type === "text")?.text;
      return text ?? "No response from CodeAgent.";
    }

    if (!groqKey) throw new Error("No AI API key configured for CodeAgent");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2048,
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: task.instruction },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "No response from CodeAgent.";
  }
}
