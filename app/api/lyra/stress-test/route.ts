import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5-min limit for long stress runs

// ── Types ─────────────────────────────────────────────────────────────────────

interface RunStat {
  pass: boolean;
  ms: number;
  error?: string;
}

interface TestStats {
  name: string;
  runs: number;
  passed: number;
  failed: number;
  passRate: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  errors: string[];
}

// ── Percentile helper ─────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function buildStats(name: string, runs: RunStat[]): TestStats {
  const passed = runs.filter((r) => r.pass).length;
  const ms = runs.map((r) => r.ms).sort((a, b) => a - b);
  const errors = runs
    .filter((r) => r.error)
    .map((r) => r.error!)
    .slice(0, 5); // cap at 5 unique errors
  return {
    name,
    runs: runs.length,
    passed,
    failed: runs.length - passed,
    passRate: Math.round((passed / runs.length) * 100),
    p50: percentile(ms, 50),
    p95: percentile(ms, 95),
    p99: percentile(ms, 99),
    min: ms[0] ?? 0,
    max: ms[ms.length - 1] ?? 0,
    errors: [...new Set(errors)],
  };
}

// ── Single-probe functions (one call each) ────────────────────────────────────

async function probeChat(BASE: string, headers: Record<string, string>, msg: string, expectFn: (t: string) => boolean): Promise<RunStat> {
  const start = Date.now();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 12_000);
    try {
      const res = await fetch(`${BASE}/api/lyra/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: msg, history: [], conversationId: "stress", agentId: "lyra-v1" }),
        signal: ac.signal,
      });
      if (!res.ok) return { pass: false, ms: Date.now() - start, error: `HTTP ${res.status}` };
      const reader = res.body?.getReader();
      let text = "";
      if (reader) {
        const dec = new TextDecoder();
        try {
          while (text.length < 4000) {
            const { done, value } = await reader.read();
            if (done) break;
            text += dec.decode(value);
          }
        } catch { /* abort */ } finally { reader.cancel().catch(() => {}); }
      }
      return { pass: expectFn(text), ms: Date.now() - start };
    } finally { clearTimeout(timer); }
  } catch (e) {
    return { pass: false, ms: Date.now() - start, error: String(e) };
  }
}

async function probeJson(url: string, method: "GET" | "POST", body: unknown, headers: Record<string, string>, expectFn: (d: unknown) => boolean): Promise<RunStat> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { pass: false, ms: Date.now() - start, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { pass: expectFn(data), ms: Date.now() - start };
  } catch (e) {
    return { pass: false, ms: Date.now() - start, error: String(e) };
  }
}

// ── Concurrency runner: run fn N times with up to C concurrent ────────────────

async function stress(
  fn: () => Promise<RunStat>,
  n: number,
  concurrency: number
): Promise<RunStat[]> {
  const results: RunStat[] = [];
  const queue = Array.from({ length: n });
  let i = 0;

  async function worker() {
    while (i < queue.length) {
      i++;
      results.push(await fn());
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, n) }, () => worker()));
  return results;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const adminKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY;
  const provided  = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  if (adminKey && provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode        = req.nextUrl.searchParams.get("mode") ?? "fast";    // fast | full
  const concurrency = Math.min(parseInt(req.nextUrl.searchParams.get("c") ?? "10"), 20);

  const incomingPort = req.nextUrl.port || (req.nextUrl.protocol === "https:" ? "443" : "80");
  const BASE = process.env.INTERNAL_URL ?? `http://127.0.0.1:${incomingPort}`;
  const internalKey = process.env.LYRA_INTERNAL_KEY ?? "";
  const jsonHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(internalKey ? { "x-lyra-internal-key": internalKey } : {}),
  };

  const memBefore = process.memoryUsage();
  const wallStart = Date.now();
  const allStats: TestStats[] = [];

  // ── FAST tests: free/deterministic — 100 runs each ────────────────────────

  const fastRuns = 100;

  allStats.push(buildStats("Moon phase (×100)", await stress(
    () => probeChat(BASE, jsonHeaders, "What is the current moon phase?",
      (t) => /new moon|crescent|quarter|gibbous|full moon|\d+%/i.test(t)),
    fastRuns, concurrency
  )));

  allStats.push(buildStats("DateTime UTC (×100)", await stress(
    () => probeChat(BASE, jsonHeaders, "What is the exact current UTC time?",
      (t) => /\d{1,2}:\d{2}/.test(t)),
    fastRuns, concurrency
  )));

  allStats.push(buildStats("Calculator 99×99 (×100)", await stress(
    () => probeChat(BASE, jsonHeaders, "Calculate 99 * 99",
      (t) => t.includes("9801")),
    fastRuns, concurrency
  )));

  allStats.push(buildStats("World clock (×100)", await stress(
    () => probeChat(BASE, jsonHeaders, "World clock: Tokyo, New York, London",
      (t) => /tokyo|london|new york/i.test(t) && /\d{1,2}:\d{2}/.test(t)),
    fastRuns, concurrency
  )));

  allStats.push(buildStats("QR gen (×100)", await stress(
    () => probeChat(BASE, jsonHeaders, "QR code for https://aitaskflo.com",
      (t) => t.includes("__IMG__") || /qr/i.test(t)),
    fastRuns, concurrency
  )));

  allStats.push(buildStats("Translation hola (×100)", await stress(
    () => probeChat(BASE, jsonHeaders, "Translate 'hello' to Spanish",
      (t) => /hola/i.test(t)),
    fastRuns, concurrency
  )));

  // ── Game NPC API: 50 runs ──────────────────────────────────────────────────

  allStats.push(buildStats("NPC dialogue /api/lyra/game (×50)", await stress(
    () => probeJson(`${BASE}/api/lyra/game`, "POST",
      { message: "Who are you?", npc: { name: "Test Spirit" } },
      { "Content-Type": "application/json" },
      (d: unknown) => typeof (d as { reply?: string }).reply === "string" && (d as { reply: string }).reply.length > 0
    ),
    50, concurrency
  )));

  if (mode === "full") {
    // ── FULL mode: AI tools — 20 runs each ──────────────────────────────────
    const aiRuns = 20;

    allStats.push(buildStats("Chat — basic (×20)", await stress(
      () => probeChat(BASE, jsonHeaders, "Reply with exactly: PONG",
        (t) => t.length > 0 && !t.startsWith("HTTP ")),
      aiRuns, Math.min(concurrency, 5)
    )));

    allStats.push(buildStats("Web search (×20)", await stress(
      () => probeChat(BASE, jsonHeaders, "Search the web: latest AI news today",
        (t) => t.length > 50 && !t.toLowerCase().includes("search failed")),
      aiRuns, Math.min(concurrency, 3)
    )));

    allStats.push(buildStats("Weather Chicago (×20)", await stress(
      () => probeChat(BASE, jsonHeaders, "Weather in Chicago",
        (t) => /chicago/i.test(t) && (/°F|°C|moon|sunrise/i.test(t))),
      aiRuns, Math.min(concurrency, 3)
    )));

    allStats.push(buildStats("Image gen (×20)", await stress(
      () => probeChat(BASE, jsonHeaders, "Generate an image of a glowing moon",
        (t) => t.includes("__IMG__")),
      aiRuns, Math.min(concurrency, 3)
    )));

    allStats.push(buildStats("News headlines (×20)", await stress(
      () => probeChat(BASE, jsonHeaders, "Get the latest AI headlines",
        (t) => t.length > 50),
      aiRuns, Math.min(concurrency, 3)
    )));

    allStats.push(buildStats("Reflection API (×20)", await stress(
      () => probeJson(`${BASE}/api/lyra/reflect`, "POST",
        {
          conversationId: `stress-${Date.now()}`,
          agentId: "lyra-v1",
          transcript: [
            { role: "user",      content: "I build apps with Next.js." },
            { role: "assistant", content: "That sounds great!" },
          ],
        },
        jsonHeaders,
        (d: unknown) => !!(d as { summary?: string; facts?: unknown[] }).summary ||
          (Array.isArray((d as { facts?: unknown[] }).facts) && (d as { facts: unknown[] }).facts.length > 0)
      ),
      aiRuns, Math.min(concurrency, 3)
    )));
  }

  const memAfter = process.memoryUsage();
  const wallMs   = Date.now() - wallStart;

  const totalRuns  = allStats.reduce((s, t) => s + t.runs, 0);
  const totalPassed = allStats.reduce((s, t) => s + t.passed, 0);
  const overallRate = Math.round((totalPassed / totalRuns) * 100);

  return NextResponse.json({
    mode,
    concurrency,
    overallPassRate: overallRate,
    totalRuns,
    totalPassed,
    totalFailed: totalRuns - totalPassed,
    wallMs,
    memoryDeltaMb: Math.round((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024),
    grade: overallRate >= 95 ? "A" : overallRate >= 85 ? "B" : overallRate >= 70 ? "C" : overallRate >= 50 ? "D" : "F",
    timestamp: new Date().toISOString(),
    tests: allStats,
  });
}
