/**
 * lib/lyra/llm.ts
 * Shared LLM helper — Groq first, Claude as fallback.
 * Use this instead of hardcoding Anthropic in route files.
 */

export async function llmChat(
  prompt: string,
  opts: { maxTokens?: number; system?: string; temperature?: number } = {}
): Promise<string> {
  const { maxTokens = 1000, system, temperature = 0.7 } = opts;

  // 1. Try Groq (free tier, fast)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const messages: Array<{ role: string; content: string }> = [];
      if (system) messages.push({ role: "system", content: system });
      messages.push({ role: "user", content: prompt });
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: maxTokens,
          temperature,
          messages,
        }),
      });
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (text) return text;
    } catch { /* fall through */ }
  }

  // 2. Try OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const messages: Array<{ role: string; content: string }> = [];
      if (system) messages.push({ role: "system", content: system });
      messages.push({ role: "user", content: prompt });
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: maxTokens, temperature, messages }),
      });
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (text) return text;
    } catch { /* fall through */ }
  }

  // 3. Last resort: Claude (most expensive)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: anthropicKey });
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: "user", content: prompt }],
      });
      return (msg.content[0] as { text: string }).text?.trim() ?? "";
    } catch { /* fall through */ }
  }

  return "";
}
