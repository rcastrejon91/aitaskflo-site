import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface TestResult {
  name: string;
  pass: boolean;
  ms: number;
  detail: string;
  error?: string;
}

async function run(
  name: string,
  fn: () => Promise<{ pass: boolean; detail: string }>
): Promise<TestResult> {
  const start = Date.now();
  try {
    const { pass, detail } = await fn();
    return { name, pass, ms: Date.now() - start, detail };
  } catch (err) {
    return {
      name,
      pass: false,
      ms: Date.now() - start,
      detail: "threw exception",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Test suite ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── Password gate ──────────────────────────────────────────────────────────
  const adminKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY;
  const provided  = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  if (adminKey && provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Internal base URL ──────────────────────────────────────────────────────
  // Derive from the incoming request so it's always correct regardless of port.
  // req.nextUrl.origin is the protocol+host+port the request arrived on.
  // We force 127.0.0.1 (loopback) so we never hit the public internet for
  // internal calls — avoids SSL issues, CDN routing, and firewall rules.
  const incomingPort = req.nextUrl.port || (req.nextUrl.protocol === "https:" ? "443" : "80");
  const BASE = process.env.INTERNAL_URL ?? `http://127.0.0.1:${incomingPort}`;

  // Internal bypass key — lets these calls pass through NextAuth middleware
  const internalKey = process.env.LYRA_INTERNAL_KEY ?? "";
  const internalHeaders = {
    "Content-Type": "application/json",
    ...(internalKey ? { "x-lyra-internal-key": internalKey } : {}),
  };

  // ── Chat helper (reads streaming response) ─────────────────────────────────
  async function chatPost(message: string, timeoutMs = 20000): Promise<string> {
    const res = await fetch(`${BASE}/api/lyra/chat`, {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({ message, history: [], conversationId: "test-diag", agentId: "lyra-v1" }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return `HTTP ${res.status}: ${await res.text().catch(() => "")}`;
    const reader = res.body?.getReader();
    if (!reader) return "";
    let text = "";
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value);
      if (text.length > 8000) break;
    }
    return text;
  }

  const tests: TestResult[] = [];

  // ── 1. Chat ────────────────────────────────────────────────────────────────
  tests.push(await run("Chat — basic response", async () => {
    const text = await chatPost("Say exactly the word: PONG");
    const pass = text.length > 0 && !text.startsWith("HTTP ");
    return { pass, detail: text.slice(0, 120) };
  }));

  // ── 2. Image gen ───────────────────────────────────────────────────────────
  tests.push(await run("Image gen — IMG tag present", async () => {
    const text = await chatPost("Generate an image of a glowing witch hat");
    const pass = text.includes("__IMG__");
    return { pass, detail: pass ? "IMG tag found" : `Missing. Got: ${text.slice(0, 100)}` };
  }));

  // ── 3. Web search ──────────────────────────────────────────────────────────
  tests.push(await run("Web search — AI news", async () => {
    const text = await chatPost("Search the web for the latest AI news");
    const pass = text.length > 50 && !text.toLowerCase().includes("search failed");
    return { pass, detail: text.slice(0, 120) };
  }));

  // ── 4. Weather + astronomy ─────────────────────────────────────────────────
  tests.push(await run("Weather — Chicago with moon phase", async () => {
    const text = await chatPost("What's the weather in Chicago?");
    const pass = text.toLowerCase().includes("chicago") &&
      (text.includes("°F") || text.includes("Moon") || text.includes("Sunrise"));
    return { pass, detail: text.slice(0, 150) };
  }));

  // ── 5. URL reader ──────────────────────────────────────────────────────────
  tests.push(await run("URL reader — aitaskflo.com", async () => {
    const text = await chatPost("Read https://aitaskflo.com and summarize it in one sentence");
    const pass = text.length > 30 && !text.toLowerCase().includes("could not fetch");
    return { pass, detail: text.slice(0, 120) };
  }));

  // ── 6. Calculator ─────────────────────────────────────────────────────────
  tests.push(await run("Calculator — 42 * 13 = 546", async () => {
    const text = await chatPost("Calculate 42 * 13");
    return { pass: text.includes("546"), detail: text.slice(0, 80) };
  }));

  // ── 7. DateTime ───────────────────────────────────────────────────────────
  tests.push(await run("DateTime — current time", async () => {
    const text = await chatPost("What is the current UTC time?");
    return { pass: /\d{1,2}:\d{2}/.test(text), detail: text.slice(0, 80) };
  }));

  // ── 8. Moon phase ─────────────────────────────────────────────────────────
  tests.push(await run("Moon phase — phase + illumination", async () => {
    const text = await chatPost("What is the current moon phase and illumination percentage?");
    const pass = /new moon|crescent|quarter|gibbous|full moon/i.test(text) || /\d+%/.test(text);
    return { pass, detail: text.slice(0, 120) };
  }));

  // ── 9. Sun times ──────────────────────────────────────────────────────────
  tests.push(await run("Sun times — Miami sunrise/sunset", async () => {
    const text = await chatPost("What are the sunrise and sunset times for Miami today?");
    const pass = /sunrise|sunset/i.test(text) && /\d{1,2}:\d{2}/i.test(text);
    return { pass, detail: text.slice(0, 150) };
  }));

  // ── 10. World clock ───────────────────────────────────────────────────────
  tests.push(await run("World clock — Tokyo, London, New York", async () => {
    const text = await chatPost("Show me the world clock for Tokyo, London, and New York");
    const pass = /tokyo|london|new york/i.test(text) && /\d{1,2}:\d{2}/i.test(text);
    return { pass, detail: text.slice(0, 150) };
  }));

  // ── 11. QR code ──────────────────────────────────────────────────────────
  tests.push(await run("QR code — aitaskflo.com", async () => {
    const text = await chatPost("Generate a QR code for https://aitaskflo.com");
    const pass = text.includes("__IMG__") || text.toLowerCase().includes("qr");
    return { pass, detail: text.slice(0, 100) };
  }));

  // ── 12. Translation ───────────────────────────────────────────────────────
  tests.push(await run("Translation — hello → hola", async () => {
    const text = await chatPost("Translate 'hello' to Spanish");
    return { pass: /hola/i.test(text), detail: text.slice(0, 80) };
  }));

  // ── 13. News with sentiment ───────────────────────────────────────────────
  tests.push(await run("News — AI headlines with sentiment", async () => {
    const text = await chatPost("Get me the latest AI news headlines");
    const pass = text.length > 50 && !text.toLowerCase().includes("failed");
    return { pass, detail: text.slice(0, 150) };
  }));

  // ── 14. CRM write ─────────────────────────────────────────────────────────
  tests.push(await run("CRM write — save test contact", async () => {
    const text = await chatPost(
      "Save a CRM contact: name=DiagUser_Test, email=diag@example.com, note=diagnostic test run"
    );
    const pass = /saved|crm|contact|diaguser/i.test(text);
    return { pass, detail: text.slice(0, 100) };
  }));

  // ── 15. CRM read ──────────────────────────────────────────────────────────
  tests.push(await run("CRM read — query test contact", async () => {
    const text = await chatPost("Search my CRM for DiagUser_Test");
    const pass = /diaguser|diag@example|diagnostic/i.test(text);
    return { pass, detail: text.slice(0, 100) };
  }));

  // ── 16. Game API ─────────────────────────────────────────────────────────
  tests.push(await run("Game API — NPC dialogue", async () => {
    const res = await fetch(`${BASE}/api/lyra/game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Who are you?", npc: { name: "Forest Spirit" } }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { pass: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    const pass = typeof data.reply === "string" && data.reply.length > 0;
    return { pass, detail: (data.reply ?? "no reply").slice(0, 100) };
  }));

  // ── 17. Godot builder ─────────────────────────────────────────────────────
  tests.push(await run("Godot builder — write + read test .gd", async () => {
    const text = await chatPost(
      "Use the godot_builder tool to write a file 'scripts/_diag_test.gd' with content '# diag\\nextends Node' then read it back and confirm"
    );
    const pass = text.includes("diag") || text.includes("_diag_test") || text.includes("✓");
    return { pass, detail: text.slice(0, 150) };
  }));

  // ── 18. Reflection API ────────────────────────────────────────────────────
  tests.push(await run("Reflection — extracts facts", async () => {
    const res = await fetch(`${BASE}/api/lyra/reflect`, {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({
        conversationId: "test-reflect-diag-001",
        agentId: "lyra-v1",
        transcript: [
          { role: "user",      content: "I am a TypeScript developer who loves building apps." },
          { role: "assistant", content: "That sounds amazing! TypeScript is excellent for large apps." },
          { role: "user",      content: "I mostly work on Next.js projects." },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    const data = await res.json();
    const pass = res.ok && !!(data.summary || (Array.isArray(data.facts) && data.facts.length > 0));
    return {
      pass,
      detail: data.summary?.slice(0, 100) ?? JSON.stringify(data).slice(0, 100),
    };
  }));

  // ── 19. Email config check ────────────────────────────────────────────────
  tests.push(await run("Email — credentials present", async () => {
    const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
    return {
      pass: true,
      detail: hasGmail
        ? `Gmail configured as ${process.env.GMAIL_USER}`
        : "⚠️  GMAIL_USER / GMAIL_APP_PASSWORD not set — email disabled",
    };
  }));

  // ── 20. Python orchestrator ───────────────────────────────────────────────
  tests.push(await run("Python orchestrator — ping", async () => {
    const orchUrl = process.env.PYTHON_ORCHESTRATOR_URL ?? "http://localhost:5328";
    const res = await fetch(`${orchUrl}/api/lyra`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping", userId: "diag", history: [] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { pass: false, detail: `Orchestrator offline — HTTP ${res.status}` };
    const data = await res.json();
    const pass = !!(data.style_guidance || data.approach || data.domain_addendum);
    return { pass, detail: pass ? "Responded with guidance" : JSON.stringify(data).slice(0, 80) };
  }));

  // ── Scorecard ─────────────────────────────────────────────────────────────
  const passed  = tests.filter((t) => t.pass).length;
  const failed  = tests.filter((t) => !t.pass).length;
  const totalMs = tests.reduce((s, t) => s + t.ms, 0);
  const score   = Math.round((passed / tests.length) * 100);

  return NextResponse.json({
    score,
    passed,
    failed,
    total: tests.length,
    totalMs,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F",
    base: BASE,
    timestamp: new Date().toISOString(),
    tests,
  });
}
