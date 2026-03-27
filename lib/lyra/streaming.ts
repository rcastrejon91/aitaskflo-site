import Anthropic from "@anthropic-ai/sdk";

// ── Groq fallback (text-only, no tools) ──────────────────────────────────────
export async function streamGroqFallback(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    // No Groq key — try local Ollama
    await streamOllamaFallback(systemPrompt, messages, encoder, controller);
    return;
  }

  // Groq is text-only — flatten any image content blocks to their text parts
  const flattenContent = (c: unknown): string => {
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return c
        .filter((b): b is { type: string; text?: string } => typeof b === "object" && b !== null)
        .map((b) => (b.type === "text" && b.text ? b.text : ""))
        .join(" ")
        .trim() || "[image]";
    }
    return String(c);
  };

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: flattenContent(m.content) })),
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      stream: true,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    // Groq failed — fall through to local Ollama
    await streamOllamaFallback(systemPrompt, messages, encoder, controller);
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

// ── Ollama fallback (local, unfiltered) ───────────────────────────────────────
export async function streamOllamaFallback(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL ?? "llama3";

  const flattenContent = (c: unknown): string => {
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return (c as Array<{ type?: string; text?: string }>)
        .map((b) => (b.type === "text" && b.text ? b.text : ""))
        .join(" ").trim() || "[image]";
    }
    return String(c);
  };

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
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.status.toString());
    controller.enqueue(encoder.encode(`⚠️ Ollama error: ${errText}`));
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

// ── Task Router (Option 2) ────────────────────────────────────────────────────

export interface RouterDecision {
  route: "claude" | "groq" | "ollama";
  taskType: "simple" | "creative" | "code" | "factual" | "tool" | "analysis";
  useParallel: boolean;
}

export async function routeTask(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<RouterDecision> {
  const DEFAULT: RouterDecision = { route: "claude", taskType: "analysis", useParallel: false };

  // Tool-use requests always go to Claude (only model with tools)
  // Only route to Claude when a real tool call is needed — keep Groq for everything else
  const toolKeywords = /send(?: an?)? email|search the web|search for .{3,}|current weather|what(?:'s| is) the weather|generat(?:e|ing) (?:an? )?image|draw (?:me |a |an )?|create (?:an? )?image|make (?:a |an )?(?:image|picture|photo|illustration)|(?:picture|photo|image) of |show me (?:a |an )?(?:image|picture|photo)|qr code|translate .{3,} (?:to|into)|moon phase|sunrise|sunset|https?:\/\/\S|call (?:the )?api|fetch (?:from )?https?|post to https?/i;
  if (toolKeywords.test(message)) return { ...DEFAULT, taskType: "tool" };

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return DEFAULT;

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
          content: `Classify this chat message. Reply ONLY with a JSON object — no explanation.
${context ? `Context:\n${context}\n` : ""}Message: "${message.slice(0, 300)}"

JSON: {"route":"claude|groq","taskType":"simple|creative|code|factual|analysis","parallel":true|false}
Rules:
- route=groq: greetings, jokes, simple facts, small talk, one-liners
- route=claude: code, reasoning, creative writing, long content, anything complex
- parallel=true only for: analysis, comparisons, explanations where multiple AI perspectives help
- parallel=false for everything else`,
        }],
      }),
      signal: AbortSignal.timeout(3_000),
    });

    if (!res.ok) return DEFAULT;
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");

    return {
      route: parsed.route === "groq" ? "groq" : "claude",
      taskType: parsed.taskType ?? "analysis",
      useParallel: parsed.parallel === true && process.env.ENABLE_PARALLEL !== "false",
    };
  } catch {
    return DEFAULT;
  }
}

// ── Parallel Agents + Judge (Option 3) ───────────────────────────────────────

export async function streamParallelJudge(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  anthropicKey: string
): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;

  const flatMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  const lastUserMessage =
    [...flatMessages].reverse().find((m) => m.role === "user")?.content ?? "";

  // Run Claude Sonnet + Groq simultaneously (non-streaming for comparison)
  const [claudeResult, groqResult] = await Promise.allSettled([
    new Anthropic({ apiKey: anthropicKey }).messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: flatMessages,
    }).then((r) => (r.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined)?.text ?? ""),

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
        })
          .then((r) => r.json())
          .then((d) => (d.choices?.[0]?.message?.content as string) ?? "")
      : Promise.resolve(""),
  ]);

  const claudeText = claudeResult.status === "fulfilled" ? claudeResult.value : "";
  const groqText   = groqResult.status   === "fulfilled" ? groqResult.value   : "";

  // If only one succeeded, use it
  if (!claudeText && !groqText) {
    controller.enqueue(encoder.encode("⚠️ All models failed. Please try again."));
    return;
  }
  if (!groqText || !claudeText) {
    controller.enqueue(encoder.encode(claudeText || groqText));
    return;
  }

  // Judge: pick the better response
  let winner = claudeText;
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
Response A: "${claudeText.slice(0, 600)}"
Response B: "${groqText.slice(0, 600)}"
Reply ONLY with the letter A or B.`,
          }],
        }),
        signal: AbortSignal.timeout(5_000),
      }).then((r) => r.json());

      const verdict: string = judgeData.choices?.[0]?.message?.content?.trim() ?? "A";
      winner = verdict.startsWith("B") ? groqText : claudeText;
    } catch {
      // Judge failed — default to Claude
    }
  }

  controller.enqueue(encoder.encode(winner));
}
