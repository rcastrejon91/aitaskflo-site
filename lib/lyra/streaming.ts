import Anthropic from "@anthropic-ai/sdk";

// ── Shared content flattener ──────────────────────────────────────────────────

function flattenContent(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return (c as Array<{ type?: string; text?: string }>)
      .map((b) => (b.type === "text" && b.text ? b.text : ""))
      .join(" ").trim() || "[image]";
  }
  return String(c);
}

// ── Groq (primary — free, fast) ───────────────────────────────────────────────

export async function streamGroqFallback(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    await streamGrokFallback(systemPrompt, messages, encoder, controller);
    return;
  }

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: flattenContent(m.content) })),
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      stream: true,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    await streamGrokFallback(systemPrompt, messages, encoder, controller);
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

// ── Grok (fallback — smart, fewer restrictions) ───────────────────────────────

export async function streamGrokFallback(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const grokKey = process.env.GROK_API_KEY;
  if (!grokKey) {
    controller.enqueue(encoder.encode("⚠️ No AI provider available. Please check your API keys."));
    return;
  }

  const grokMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: flattenContent(m.content) })),
  ];

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${grokKey}` },
    body: JSON.stringify({
      model: "grok-3-mini-fast",
      messages: grokMessages,
      stream: true,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString());
    controller.enqueue(encoder.encode(`⚠️ Grok error: ${err}`));
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

// ── Ollama (local — code buff, no API cost) ───────────────────────────────────

export async function streamOllamaFallback(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL ?? "llama3";

  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: flattenContent(m.content) })),
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  }).catch(() => null);

  if (!res || !res.ok) {
    // Ollama unavailable — fall back to Groq
    await streamGroqFallback(systemPrompt, messages, encoder, controller);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;
  const dec = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = dec.decode(value, { stream: true }).split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        const chunk = json.message?.content;
        if (chunk) controller.enqueue(encoder.encode(chunk));
        if (json.done) return;
      } catch { /* skip malformed line */ }
    }
  }
}

// ── OpenAI slot ───────────────────────────────────────────────────────────────

export async function streamOpenAIFallback(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    await streamGrokFallback(systemPrompt, messages, encoder, controller);
    return;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: flattenContent(m.content) })),
      ],
      stream: true,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null);

  if (!res || !res.ok) {
    await streamGrokFallback(systemPrompt, messages, encoder, controller);
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

// ── Task Router ───────────────────────────────────────────────────────────────

export interface RouterDecision {
  route: "claude" | "groq" | "grok" | "ollama" | "openai";
  taskType: "simple" | "creative" | "code" | "factual" | "tool" | "analysis";
  useParallel: boolean;
}

export async function routeTask(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<RouterDecision> {
  const DEFAULT: RouterDecision = { route: "groq", taskType: "analysis", useParallel: false };

  // Ollama — local, raw, unfiltered mode
  const ollamaKeywords = /\b(use local|go local|raw mode|no filter|unfiltered|dark mode|unleash|go raw|beast mode|no limits|local ai|offline mode|shadow mode|uncensored)\b/i;
  if (ollamaKeywords.test(message)) return { ...DEFAULT, route: "ollama", taskType: "creative" };

  // Tool-use → Claude (native tool calling, most reliable)
  const toolKeywords = /send(?: an?)? email|search the web|search for .{3,}|current weather|what(?:'s| is) the weather|generat(?:e|ing) (?:an? )?image|draw (?:me |a |an )?|create (?:an? )?image|make (?:a |an )?(?:image|picture|photo|illustration|song|video|clip|beat|track|music)|(?:picture|photo|image|video|clip) of |show me (?:a |an )?(?:image|picture|photo|video|gif)|qr code|translate .{3,} (?:to|into)|moon phase|sunrise|sunset|https?:\/\/\S|call (?:the )?api|fetch (?:from )?https?|post to https?|sing(?:ing)?(?:\s+me)?(?:\s+a)?|(?:lo-?fi|ambient|chill|background)\s+music|generate\s+(?:a\s+)?(?:video|music|song|beat|track|audio|clip)|fal[._\s]|fal-ai|\bgif\b|send\s+(?:an?\s+)?(?:gif|text|sms|message)|text\s+(?:message|me\b)|sms\s+to\b|animated\s+gif|video\s+of\b|song\s+about\b|music\s+for\b|reaction\s+gif\b|text.to.speech|\btts\b|speak\s+(?:this|aloud)|read\s+(?:this\s+)?(?:aloud|out)/i;
  if (toolKeywords.test(message)) return { ...DEFAULT, route: "claude", taskType: "tool" };

  // Trucker tools → Claude
  const truckerKeywords = /\b(hours of service|hos\b|log (?:my |a )?(?:drive|driving|off duty|on duty|sleeper)|started driving|going off duty|took a break|load board|find (?:a |me )?(?:load|loads|freight)|loads? (?:going|from|to)|available loads?|obd|check engine|engine data|rpm|fault codes?|dtc|how (?:many |much )?hours? (?:do i have|left|remaining)|can i (?:keep |still )?driv|drive time|openpilot|comma\.?ai|adas|driver assist|is it engaged|autopilot status|lane departure|forward collision)\b/i;
  if (truckerKeywords.test(message)) return { ...DEFAULT, route: "claude", taskType: "tool" };

  // Code → Claude
  const codeKeywords = /\b(code|function|class|debug|fix (?:the |this )?(?:bug|error|issue)|refactor|write (?:a |me )?(?:script|function|class|component)|implement|algorithm|typescript|javascript|python|sql|regex|api endpoint)\b/i;
  if (codeKeywords.test(message)) return { ...DEFAULT, route: "claude", taskType: "code" };

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return { ...DEFAULT, route: "grok" };

  try {
    const context = history
      .slice(-2)
      .map((m) => `${m.role}: ${String(m.content).slice(0, 100)}`)
      .join("\n");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 60,
        temperature: 0,
        messages: [{
          role: "user",
          content: `Classify this chat message. Reply ONLY with a JSON object.
${context ? `Context:\n${context}\n` : ""}Message: "${message.slice(0, 300)}"

JSON: {"route":"groq|grok","taskType":"simple|creative|factual|analysis","parallel":true|false}
Rules:
- route=groq: greetings, jokes, simple facts, small talk, short responses
- route=grok: reasoning, creative writing, long content, complex analysis
- parallel=false for everything`,
        }],
      }),
      signal: AbortSignal.timeout(3_000),
    });

    if (!res.ok) return DEFAULT;
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");

    return {
      route: parsed.route === "grok" ? "grok" : "groq",
      taskType: parsed.taskType ?? "analysis",
      useParallel: false,
    };
  } catch {
    return DEFAULT;
  }
}

// ── Parallel Agents + Judge ───────────────────────────────────────────────────

export async function streamParallelJudge(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  _anthropicKey: string
): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;
  const grokKey = process.env.GROK_API_KEY;

  const flatMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: flattenContent(m.content),
  }));

  const lastUserMessage =
    [...flatMessages].reverse().find((m) => m.role === "user")?.content ?? "";

  const [groqResult, grokResult] = await Promise.allSettled([
    groqKey
      ? fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 1024,
            messages: [{ role: "system", content: systemPrompt }, ...flatMessages],
          }),
          signal: AbortSignal.timeout(20_000),
        }).then((r) => r.json()).then((d) => (d.choices?.[0]?.message?.content as string) ?? "")
      : Promise.resolve(""),

    grokKey
      ? fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${grokKey}` },
          body: JSON.stringify({
            model: "grok-3-mini-fast",
            max_tokens: 1024,
            messages: [{ role: "system", content: systemPrompt }, ...flatMessages],
          }),
          signal: AbortSignal.timeout(20_000),
        }).then((r) => r.json()).then((d) => (d.choices?.[0]?.message?.content as string) ?? "")
      : Promise.resolve(""),
  ]);

  const groqText = groqResult.status === "fulfilled" ? groqResult.value : "";
  const grokText = grokResult.status === "fulfilled" ? grokResult.value : "";

  if (!groqText && !grokText) {
    controller.enqueue(encoder.encode("⚠️ All models failed. Please try again."));
    return;
  }
  if (!groqText || !grokText) {
    controller.enqueue(encoder.encode(groqText || grokText));
    return;
  }

  // Judge: pick the better response using Groq (fast + free)
  let winner = grokText;
  if (groqKey) {
    try {
      const judgeData = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 10,
          temperature: 0,
          messages: [{
            role: "user",
            content: `You are a judge. Pick the better AI response to this question.
Question: "${lastUserMessage.slice(0, 400)}"
Response A: "${groqText.slice(0, 600)}"
Response B: "${grokText.slice(0, 600)}"
Reply ONLY with the letter A or B.`,
          }],
        }),
        signal: AbortSignal.timeout(5_000),
      }).then((r) => r.json());

      const verdict: string = judgeData.choices?.[0]?.message?.content?.trim() ?? "B";
      winner = verdict.startsWith("A") ? groqText : grokText;
    } catch {
      // Judge failed — default to Grok
    }
  }

  controller.enqueue(encoder.encode(winner));
}

// Keep Anthropic import used by streamParallelJudge's type signature in chat route
export type { Anthropic };
