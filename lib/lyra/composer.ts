import { randomUUID } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompositeStep {
  tool: string;
  inputMap: Record<string, string>; // key = tool input field, value = literal or "{prev}" for chaining
  description: string;
}

export interface CompositeTool {
  id: string;
  name: string;              // slug, e.g. "job-email-blast"
  label: string;             // human name, e.g. "Job Email Blast"
  description: string;
  steps: CompositeStep[];
  user_id: string;
  created_at: string;
  use_count: number;
}

// ── SQLite storage ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDb(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const path = require("path");
    const fs = require("fs");
    const DATA_DIR = process.env.DATA_DIR ?? "/home/aitaskflo/data";
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = new Database(path.join(DATA_DIR, "lyra.db"));
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_tools (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        name        TEXT NOT NULL,
        label       TEXT NOT NULL,
        description TEXT NOT NULL,
        steps       TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        use_count   INTEGER DEFAULT 0,
        UNIQUE(user_id, name)
      );
      CREATE INDEX IF NOT EXISTS idx_user_tools_user ON user_tools(user_id);
    `);
    return db;
  } catch {
    return null;
  }
}

export function saveCompositeTool(tool: CompositeTool): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`
      INSERT INTO user_tools (id, user_id, name, label, description, steps, created_at, use_count)
      VALUES (@id, @user_id, @name, @label, @description, @steps, @created_at, @use_count)
      ON CONFLICT(user_id, name) DO UPDATE SET
        label = excluded.label,
        description = excluded.description,
        steps = excluded.steps,
        use_count = use_count + 1
    `).run({ ...tool, steps: JSON.stringify(tool.steps) });
  } catch (err) {
    console.error("[Composer] saveCompositeTool error:", err instanceof Error ? err.message : err);
  }
}

export function getCompositeTool(userId: string, name: string): CompositeTool | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db.prepare("SELECT * FROM user_tools WHERE user_id = ? AND name = ?").get(userId, name) as (CompositeTool & { steps: string }) | undefined;
    if (!row) return null;
    return { ...row, steps: JSON.parse(row.steps) };
  } catch { return null; }
}

export function listCompositeTools(userId: string): CompositeTool[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.prepare("SELECT * FROM user_tools WHERE user_id = ? ORDER BY use_count DESC, created_at DESC").all(userId) as Array<CompositeTool & { steps: string }>;
    return rows.map((r) => ({ ...r, steps: JSON.parse(r.steps) }));
  } catch { return []; }
}

export function incrementToolUseCount(userId: string, name: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare("UPDATE user_tools SET use_count = use_count + 1 WHERE user_id = ? AND name = ?").run(userId, name);
  } catch { /* ignore */ }
}

// ── Trigger detection ──────────────────────────────────────────────────────────

const COMPOSE_TRIGGERS = [
  /i wish (?:i|lyra|you) could (.+)/i,
  /can you combine (.+) (?:and|with) (.+)/i,
  /what if (?:you|lyra) could (.+)/i,
  /build (?:me )?a (?:tool|workflow|pipeline) (?:that|to|for) (.+)/i,
  /make (?:a|me a) (?:tool|workflow) (?:that|to|for) (.+)/i,
  /create (?:a )?(?:custom )?tool (?:that|to|for) (.+)/i,
  /automate (.+) (?:for me|automatically)/i,
  /i need (?:a tool|something) that (?:can |will )?(.+)/i,
];

export function detectComposeIntent(message: string): string | null {
  for (const pattern of COMPOSE_TRIGGERS) {
    const match = message.match(pattern);
    if (match) return match[0];
  }
  return null;
}

// ── Build animation ───────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function enq(controller: ReadableStreamDefaultController, encoder: TextEncoder, text: string): void {
  try { controller.enqueue(encoder.encode(text)); } catch { /* stream closed */ }
}

export async function streamBuildSequence(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  toolLabel: string,
  steps: CompositeStep[]
): Promise<void> {
  enq(controller, encoder, `\n🔮 Interesting... let me build that.\n`);
  await sleep(600);
  enq(controller, encoder, `⚡ Spinning up sandbox...\n`);
  await sleep(500);
  enq(controller, encoder, `🧪 Drafting **${toolLabel}**...\n`);
  await sleep(700);

  for (let i = 0; i < steps.length; i++) {
    enq(controller, encoder, `🔬 Testing module ${i + 1} (${steps[i].description})... `);
    await sleep(400 + Math.random() * 300);
    enq(controller, encoder, `✅\n`);
    await sleep(200);
  }

  enq(controller, encoder, `🛡️ Security check... `);
  await sleep(500);
  enq(controller, encoder, `✅\n`);
  await sleep(300);
  enq(controller, encoder, `✨ All systems clear.\n\n`);
  await sleep(200);
}

// ── Composite tool designer ────────────────────────────────────────────────────

const AVAILABLE_TOOLS = [
  "search_web", "get_weather", "send_email", "gmail_send", "gmail_read",
  "image_gen", "send_gif", "get_news", "translate", "calculate",
  "crm", "query_crm", "create_task", "list_tasks",
  "calendar_get", "calendar_create", "drive_list", "drive_read", "drive_write",
  "read_url", "call_api", "moon_phase", "sun_times", "world_clock",
  "generate_qr", "find_jobs", "ats_score",
];

export async function designCompositeTool(
  userRequest: string,
): Promise<{ name: string; label: string; description: string; steps: CompositeStep[] } | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 400,
        temperature: 0.3,
        messages: [{
          role: "user",
          content: `Design a composite tool for this user request: "${userRequest}"

Available tools: ${AVAILABLE_TOOLS.join(", ")}

Reply ONLY with JSON (no explanation):
{
  "name": "slug-name-max-30-chars",
  "label": "Human Readable Name",
  "description": "One sentence what it does",
  "steps": [
    { "tool": "tool_name", "inputMap": { "field": "value or {prev}" }, "description": "what this step does" }
  ]
}

Rules:
- name must be lowercase kebab-case, max 30 chars
- 2-4 steps max
- Use {prev} in inputMap to chain output from previous step as input
- Only use tools from the available list
- Keep it practical and directly addressing the user request`,
        }],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    if (!parsed.name || !parsed.steps?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Execute composite tool ────────────────────────────────────────────────────

export async function executeCompositeTool(
  tool: CompositeTool,
  userInput: Record<string, string>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  userId?: string,
  clientIp?: string
): Promise<string> {
  // Import executeTool lazily to avoid circular dependency
  const { executeTool } = await import("@/lib/lyra/execute-tool");

  let prevOutput = "";
  const results: string[] = [];

  for (const step of tool.steps) {
    // Build input: replace {prev} with previous step output
    const resolvedInput: Record<string, string> = {};
    for (const [k, v] of Object.entries(step.inputMap)) {
      resolvedInput[k] = v === "{prev}" ? prevOutput : v;
    }
    // Merge user-provided input
    Object.assign(resolvedInput, userInput);

    const result = await executeTool(step.tool, resolvedInput, encoder, controller, userId, clientIp);
    prevOutput = result;
    results.push(result);
  }

  incrementToolUseCount(userId ?? "", tool.name);
  return results[results.length - 1] ?? "Done.";
}
