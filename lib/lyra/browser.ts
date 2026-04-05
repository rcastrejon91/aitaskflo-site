/**
 * lib/lyra/browser.ts
 *
 * Server-side Playwright browser agent.
 * Lyra can browse websites, fill forms, click around, and play web games
 * entirely on the server — no local agent needed.
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Lazy-loaded so the import doesn't break if playwright isn't installed yet
async function getPlaywright() {
  const pw = await import("playwright");
  return pw;
}

// ── Session store ─────────────────────────────────────────────────────────────

interface BrowserSession {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any;
  task: string;
  createdAt: number;
}

const sessions = new Map<string, BrowserSession>();

// Clean up sessions older than 15 minutes
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [id, s] of sessions.entries()) {
    if (s.createdAt < cutoff) {
      s.browser.close().catch(() => {});
      sessions.delete(id);
    }
  }
}, 60_000).unref?.();

// ── Core browser helpers ──────────────────────────────────────────────────────

export async function openBrowser(sessionId: string, url: string, task = ""): Promise<string> {
  const { chromium } = await getPlaywright();
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  sessions.set(sessionId, { browser, page, task, createdAt: Date.now() });
  const screenshot = await page.screenshot({ type: "png" });
  return (screenshot as Buffer).toString("base64");
}

export async function screenshotSession(sessionId: string): Promise<string> {
  const s = sessions.get(sessionId);
  if (!s) throw new Error("Browser session not found: " + sessionId);
  const buf = await s.page.screenshot({ type: "png" });
  return (buf as Buffer).toString("base64");
}

export async function closeSession(sessionId: string): Promise<void> {
  const s = sessions.get(sessionId);
  if (s) {
    await s.browser.close().catch(() => {});
    sessions.delete(sessionId);
  }
}

// ── Action executor ───────────────────────────────────────────────────────────

export type BrowserAction =
  | { type: "click"; x: number; y: number }
  | { type: "right_click"; x: number; y: number }
  | { type: "double_click"; x: number; y: number }
  | { type: "type"; text: string }
  | { type: "key"; key: string }
  | { type: "navigate"; url: string }
  | { type: "scroll"; x: number; y: number; delta: number }
  | { type: "wait"; ms: number }
  | { type: "done"; result: string };

export async function executeAction(sessionId: string, action: BrowserAction): Promise<void> {
  const s = sessions.get(sessionId);
  if (!s) throw new Error("Session not found");
  const { page } = s;

  switch (action.type) {
    case "click":        await page.mouse.click(action.x, action.y); break;
    case "right_click":  await page.mouse.click(action.x, action.y, { button: "right" }); break;
    case "double_click": await page.mouse.dblclick(action.x, action.y); break;
    case "type":         await page.keyboard.type(action.text, { delay: 40 }); break;
    case "key":          await page.keyboard.press(action.key); break;
    case "navigate":     await page.goto(action.url, { waitUntil: "domcontentloaded", timeout: 15_000 }); break;
    case "scroll":       await page.mouse.move(action.x, action.y); await page.mouse.wheel(0, action.delta); break;
    case "wait":         await page.waitForTimeout(Math.min(action.ms, 10_000)); break;
    case "done":         break;
  }
}

// ── Autonomous web task ───────────────────────────────────────────────────────

const BROWSER_SYSTEM = `You are an autonomous web browser agent. You control a real Chromium browser.
After each screenshot, respond with ONLY a JSON action object (no markdown, no explanation):

{"type":"click","x":500,"y":300}           — left click at coordinates (1280×800 viewport)
{"type":"right_click","x":500,"y":300}     — right click
{"type":"double_click","x":500,"y":300}    — double click
{"type":"type","text":"hello"}             — type text (focus first with click)
{"type":"key","key":"Enter"}               — press key (Enter, Tab, Escape, ArrowDown, etc.)
{"type":"navigate","url":"https://..."}    — go to a URL
{"type":"scroll","x":640,"y":400,"delta":300} — scroll (positive=down, negative=up)
{"type":"wait","ms":2000}                  — wait for page/animation
{"type":"done","result":"summary"}         — task complete, return summary

Be decisive. Always progress toward the goal. Prefer clicking visible elements.`;

export async function runWebTask(
  url: string,
  task: string,
  onStep?: (step: number, action: string, screenshot: string) => void,
  maxSteps = 20,
): Promise<string> {
  const sessionId = `web-${Date.now()}`;
  let screenshot = await openBrowser(sessionId, url, task);

  const messages: Anthropic.MessageParam[] = [];
  let result = "Task completed.";

  try {
    for (let step = 1; step <= maxSteps; step++) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: step === 1
              ? `Task: "${task}"\n\nBrowser is now at: ${url}\nDecide the first action.`
              : "Current browser state — decide next action:",
          },
          { type: "image", source: { type: "base64", media_type: "image/png", data: screenshot } },
        ],
      });

      const res = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 512,
        system: BROWSER_SYSTEM,
        messages,
      });

      const textBlock = res.content.find(c => c.type === "text");
      const raw = textBlock && "text" in textBlock ? textBlock.text.trim() : "{}";
      messages.push({ role: "assistant", content: raw });

      let action: BrowserAction;
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        action = JSON.parse(match?.[0] ?? "{}") as BrowserAction;
      } catch {
        break;
      }

      onStep?.(step, action.type, screenshot);

      if (action.type === "done") {
        result = action.result;
        break;
      }

      await executeAction(sessionId, action);
      // Small settle delay
      await sessions.get(sessionId)?.page.waitForTimeout(600);
      screenshot = await screenshotSession(sessionId);
    }
  } finally {
    await closeSession(sessionId);
  }

  return result;
}

// ── Game walkthrough ──────────────────────────────────────────────────────────

const GAME_SYSTEM = `You are Lyra, an AI playing a web game to create a walkthrough guide for players.
You can see the game screen. After each screenshot, do TWO things:
1. Narrate what you see and what you're doing (for the walkthrough)
2. Decide the next action as JSON

Respond in this exact format:
NARRATE: [Your walkthrough commentary — describe what you see, what's happening, tips for players]
ACTION: {"type":"...","x":...,"y":...}

For Godot web games on a 1280×800 screen, the canvas is usually centered.
Common actions: click to select/confirm, WASD or arrow keys to move, Space/Enter to interact.
Be a helpful guide — explain what players should do and why.`;

export interface WalkthroughStep {
  step: number;
  narration: string;
  action: string;
  screenshot: string;
}

export async function runGameWalkthrough(
  gameUrl: string,
  gameName: string,
  onStep?: (step: WalkthroughStep) => void,
  maxSteps = 25,
): Promise<WalkthroughStep[]> {
  const sessionId = `game-${Date.now()}`;

  // Launch with extra flags for Godot WebGL support
  const { chromium } = await getPlaywright();
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--ignore-gpu-blacklist",
      "--use-gl=swiftshader",
      "--disable-web-security",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Grant permissions Godot games might need
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  sessions.set(sessionId, { browser, page, task: `Walkthrough: ${gameName}`, createdAt: Date.now() });

  const steps: WalkthroughStep[] = [];
  const messages: Anthropic.MessageParam[] = [];

  try {
    await page.goto(gameUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // Wait for Godot to load (loading screen, etc.)
    await page.waitForTimeout(4000);
    let screenshot = (await page.screenshot({ type: "png" }) as Buffer).toString("base64");

    for (let i = 1; i <= maxSteps; i++) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: i === 1
              ? `You are creating a walkthrough for the game "${gameName}".\nThe game just loaded. Narrate what you see and start playing.`
              : `Step ${i} — game state:`,
          },
          { type: "image", source: { type: "base64", media_type: "image/png", data: screenshot } },
        ],
      });

      const res = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 600,
        system: GAME_SYSTEM,
        messages,
      });

      const textBlock = res.content.find(c => c.type === "text");
      const raw = textBlock && "text" in textBlock ? textBlock.text.trim() : "";
      messages.push({ role: "assistant", content: raw });

      // Parse narration + action
      const narrateMatch = raw.match(/NARRATE:\s*([\s\S]*?)(?=ACTION:|$)/i);
      const actionMatch = raw.match(/ACTION:\s*(\{[\s\S]*?\})/i);

      const narration = narrateMatch?.[1]?.trim() ?? raw;
      let action: BrowserAction = { type: "wait", ms: 1000 };
      try {
        if (actionMatch?.[1]) action = JSON.parse(actionMatch[1]) as BrowserAction;
      } catch { /* keep wait */ }

      const step: WalkthroughStep = {
        step: i,
        narration,
        action: action.type,
        screenshot,
      };
      steps.push(step);
      onStep?.(step);

      if (action.type === "done") break;

      await executeAction(sessionId, action);
      await page.waitForTimeout(800);
      screenshot = (await page.screenshot({ type: "png" }) as Buffer).toString("base64");
    }
  } finally {
    await closeSession(sessionId);
  }

  return steps;
}
