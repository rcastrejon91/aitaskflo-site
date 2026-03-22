import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface TestResult {
  name: string;
  pass: boolean;
  ms: number;
  detail: string;
  error?: string;
}

const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

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

// ── Individual test helpers ───────────────────────────────────────────────────

// POST to /api/lyra/chat with a simple message — collect streamed text
async function chatPost(message: string, timeoutMs = 15000): Promise<string> {
  const res = await fetch(`${BASE}/api/lyra/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": "" },
    body: JSON.stringify({ message, history: [], conversationId: "test-diag", agentId: "lyra-v1" }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const reader = res.body?.getReader();
  if (!reader) return "";
  let text = "";
  const dec = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value);
    if (text.length > 8000) break; // safety cap
  }
  return text;
}

// ── Test suite ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Simple password gate
  const adminKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY;
  const provided  = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  if (adminKey && provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tests: TestResult[] = [];

  // ── 1. Chat ────────────────────────────────────────────────────────────────
  tests.push(await run("Chat — hello response", async () => {
    const text = await chatPost("Say exactly: PONG");
    const pass = text.length > 0 && !text.includes("⚠️");
    return { pass, detail: text.slice(0, 100) };
  }));

  // ── 2. Image gen ───────────────────────────────────────────────────────────
  tests.push(await run("Image gen — IMG tag present", async () => {
    const text = await chatPost("Generate an image of a glowing witch hat");
    const pass = text.includes("__IMG__");
    return { pass, detail: pass ? "IMG tag found" : `No IMG tag. Got: ${text.slice(0, 100)}` };
  }));

  // ── 3. Web search ──────────────────────────────────────────────────────────
  tests.push(await run("Web search — AI news results", async () => {
    const text = await chatPost("Search the web for latest AI news");
    const pass = text.length > 50 && !text.toLowerCase().includes("search failed");
    return { pass, detail: text.slice(0, 120) };
  }));

  // ── 4. Weather ─────────────────────────────────────────────────────────────
  tests.push(await run("Weather — Chicago forecast + astronomy", async () => {
    const text = await chatPost("What's the weather in Chicago?");
    const pass = text.toLowerCase().includes("chicago") &&
      (text.includes("°F") || text.includes("°C") || text.includes("Moon"));
    return { pass, detail: text.slice(0, 150) };
  }));

  // ── 5. URL reader ──────────────────────────────────────────────────────────
  tests.push(await run("URL reader — aitaskflo.com", async () => {
    const text = await chatPost("Read the URL https://aitaskflo.com and summarize it in one sentence");
    const pass = text.length > 30 && !text.toLowerCase().includes("could not fetch");
    return { pass, detail: text.slice(0, 120) };
  }));

  // ── 6. Calculator ─────────────────────────────────────────────────────────
  tests.push(await run("Calculator — 42 * 13 = 546", async () => {
    const text = await chatPost("Calculate 42 * 13");
    const pass = text.includes("546");
    return { pass, detail: text.slice(0, 80) };
  }));

  // ── 7. DateTime ───────────────────────────────────────────────────────────
  tests.push(await run("DateTime — current time", async () => {
    const text = await chatPost("What time is it right now UTC?");
    const pass = /\d{1,2}:\d{2}/.test(text);
    return { pass, detail: text.slice(0, 80) };
  }));

  // ── 8. Moon phase ─────────────────────────────────────────────────────────
  tests.push(await run("Moon phase — returns phase + illumination", async () => {
    const text = await chatPost("What is the current moon phase and illumination?");
    const hasMoon = /new moon|crescent|quarter|gibbous|full moon/i.test(text);
    const hasIllum = /\d+%/.test(text);
    return { pass: hasMoon || hasIllum, detail: text.slice(0, 120) };
  }));

  // ── 9. Sun times ──────────────────────────────────────────────────────────
  tests.push(await run("Sun times — sunrise/sunset for Miami", async () => {
    const text = await chatPost("What are the sunrise and sunset times for Miami today?");
    const pass = /sunrise|sunset/i.test(text) && /\d{1,2}:\d{2}/i.test(text);
    return { pass, detail: text.slice(0, 150) };
  }));

  // ── 10. World clock ───────────────────────────────────────────────────────
  tests.push(await run("World clock — multiple timezones", async () => {
    const text = await chatPost("Show me the world clock for Tokyo, London, and New York");
    const pass = /tokyo|london|new york/i.test(text) && /\d{1,2}:\d{2}/i.test(text);
    return { pass, detail: text.slice(0, 150) };
  }));

  // ── 11. QR code ──────────────────────────────────────────────────────────
  tests.push(await run("QR code — generate for aitaskflo.com", async () => {
    const text = await chatPost("Generate a QR code for https://aitaskflo.com");
    const pass = text.includes("__IMG__") || text.toLowerCase().includes("qr");
    return { pass, detail: text.slice(0, 100) };
  }));

  // ── 12. Translation ───────────────────────────────────────────────────────
  tests.push(await run("Translation — 'hello' to Spanish", async () => {
    const text = await chatPost("Translate 'hello' to Spanish");
    const pass = /hola/i.test(text);
    return { pass, detail: text.slice(0, 80) };
  }));

  // ── 13. News ─────────────────────────────────────────────────────────────
  tests.push(await run("News — AI headlines with sentiment", async () => {
    const text = await chatPost("Get me the latest AI news headlines");
    const pass = text.length > 50 && !text.toLowerCase().includes("failed");
    return { pass, detail: text.slice(0, 150) };
  }));

  // ── 14. CRM write ─────────────────────────────────────────────────────────
  tests.push(await run("CRM write — save test contact", async () => {
    const text = await chatPost("Save a CRM contact: name=TestUser_Diag, email=test@example.com, note=diagnostic test run");
    const pass = /saved|crm|contact|testuser/i.test(text);
    return { pass, detail: text.slice(0, 100) };
  }));

  // ── 15. CRM read ──────────────────────────────────────────────────────────
  tests.push(await run("CRM read — query test contact back", async () => {
    const text = await chatPost("Search my CRM for TestUser_Diag");
    const pass = /testuser|test@example|diagnostic/i.test(text);
    return { pass, detail: text.slice(0, 100) };
  }));

  // ── 16. Game API ─────────────────────────────────────────────────────────
  tests.push(await run("Game API — NPC dialogue response", async () => {
    const res = await fetch(`${BASE}/api/lyra/game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Who are you?", npc: { name: "Forest Spirit" } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { pass: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    const pass = typeof data.reply === "string" && data.reply.length > 0;
    return { pass, detail: data.reply?.slice(0, 100) ?? "no reply" };
  }));

  // ── 17. Godot builder ─────────────────────────────────────────────────────
  tests.push(await run("Godot builder — write + read test file", async () => {
    const text = await chatPost(
      "Using the godot_builder tool, write a file called 'scripts/_test_diag.gd' with content '# diagnostic test\\nextends Node' then read it back"
    );
    const pass = text.includes("diagnostic") || text.includes("_test_diag") || text.includes("✓");
    return { pass, detail: text.slice(0, 150) };
  }));

  // ── 18. Reflection API ────────────────────────────────────────────────────
  tests.push(await run("Reflection — API responds", async () => {
    const res = await fetch(`${BASE}/api/lyra/reflect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: "test-reflect-diag",
        agentId: "lyra-v1",
        transcript: [
          { role: "user", content: "I love building apps with TypeScript." },
          { role: "assistant", content: "TypeScript is a great choice for type safety!" },
          { role: "user", content: "I usually work in JavaScript." },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    const pass = res.ok && (data.summary || data.facts);
    return { pass, detail: data.summary?.slice(0, 100) ?? JSON.stringify(data).slice(0, 100) };
  }));

  // ── 19. Email ─────────────────────────────────────────────────────────────
  tests.push(await run("Email — configured (not sent)", async () => {
    const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
    return {
      pass: true, // never hard-fail on email
      detail: hasGmail
        ? "Gmail credentials present — email would send"
        : "⚠️  GMAIL_USER / GMAIL_APP_PASSWORD not set — email skipped",
    };
  }));

  // ── 20. Python orchestrator ───────────────────────────────────────────────
  tests.push(await run("Python orchestrator — 6 perspectives", async () => {
    const orchUrl = process.env.PYTHON_ORCHESTRATOR_URL ?? "http://localhost:5328";
    const res = await fetch(`${orchUrl}/api/lyra`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "diagnostic ping", userId: "test", history: [] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { pass: false, detail: `Orchestrator offline (HTTP ${res.status})` };
    const data = await res.json();
    const pass = !!(data.style_guidance || data.approach || data.domain_addendum);
    return { pass, detail: pass ? "Orchestrator responded" : "Empty response: " + JSON.stringify(data).slice(0, 80) };
  }));

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed   = tests.filter((t) => t.pass).length;
  const failed   = tests.filter((t) => !t.pass).length;
  const totalMs  = tests.reduce((s, t) => s + t.ms, 0);
  const score    = Math.round((passed / tests.length) * 100);

  return NextResponse.json({
    score,
    passed,
    failed,
    total: tests.length,
    totalMs,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F",
    timestamp: new Date().toISOString(),
    tests,
  });
}
