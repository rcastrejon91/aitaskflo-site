/**
 * lib/lyra/skills.ts
 * Skill Library — three-level access system
 *
 * L1: name + description only (~100 tokens, always in context)
 * L2: full instructions (loaded on demand when Lyra decides to use it)
 * L3: reference documents/examples (loaded when L2 instructs it)
 */

import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDb(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const DATA_DIR = process.env.DATA_DIR ?? "/home/aitaskflo/data";
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = new Database(path.join(DATA_DIR, "lyra.db"));
    db.pragma("journal_mode = WAL");
    return db;
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  description: string;       // L1
  instructions: string;      // L2
  resources: string;         // L3 (markdown references, examples)
  created_at: string;
  updated_at: string;
  usage_count: number;
  success_rate: number;
  created_by: string;        // user_id or 'lyra'
  status: "active" | "draft" | "archived";
  test_score: string | null; // JSON: { passed: number, total: number }
}

export interface SkillL1 {
  id: string;
  name: string;
  description: string;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export function saveSkill(skill: Skill): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`
      INSERT INTO skills
        (id, name, description, instructions, resources, created_at, updated_at,
         usage_count, success_rate, created_by, status, test_score)
      VALUES
        (@id, @name, @description, @instructions, @resources, @created_at, @updated_at,
         @usage_count, @success_rate, @created_by, @status, @test_score)
      ON CONFLICT(name) DO UPDATE SET
        description  = excluded.description,
        instructions = excluded.instructions,
        resources    = excluded.resources,
        updated_at   = excluded.updated_at,
        status       = excluded.status,
        test_score   = excluded.test_score
    `).run(skill);
  } catch (err) {
    console.error("[Skills] saveSkill error:", err instanceof Error ? err.message : err);
  }
}

export function getSkillByName(name: string): Skill | null {
  const db = getDb();
  if (!db) return null;
  try {
    return db.prepare("SELECT * FROM skills WHERE name = ?").get(name) as Skill | null ?? null;
  } catch { return null; }
}

export function getSkillById(id: string): Skill | null {
  const db = getDb();
  if (!db) return null;
  try {
    return db.prepare("SELECT * FROM skills WHERE id = ?").get(id) as Skill | null ?? null;
  } catch { return null; }
}

export function listActiveSkills(): Skill[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM skills WHERE status = 'active' ORDER BY usage_count DESC").all() as Skill[];
  } catch { return []; }
}

/** L1 metadata only — for injecting into every chat context */
export function getAllSkillsL1(): SkillL1[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT id, name, description FROM skills WHERE status = 'active' ORDER BY usage_count DESC"
    ).all() as SkillL1[];
  } catch { return []; }
}

export function recordSkillUsage(id: string, success: boolean): void {
  const db = getDb();
  if (!db) return;
  try {
    const skill = db.prepare("SELECT usage_count, success_rate FROM skills WHERE id = ?").get(id) as
      | { usage_count: number; success_rate: number }
      | undefined;
    if (!skill) return;
    const total = skill.usage_count + 1;
    const rate = (skill.success_rate * skill.usage_count + (success ? 1 : 0)) / total;
    db.prepare(
      "UPDATE skills SET usage_count = ?, success_rate = ?, updated_at = ? WHERE id = ?"
    ).run(total, rate, new Date().toISOString(), id);
  } catch { /* ignore */ }
}

export function deleteSkill(id: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare("UPDATE skills SET status = 'archived', updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), id);
  } catch { /* ignore */ }
}

// ── Skill Router — builds L1 context block ────────────────────────────────────

/**
 * Returns a short string injected at the top of every chat context.
 * Maximum ~120 tokens — just names + one-line descriptions.
 */
export function buildSkillsL1Context(): string {
  const skills = getAllSkillsL1();
  if (!skills.length) return "";
  const lines = skills.slice(0, 20).map((s) => `• ${s.name}: ${s.description}`);
  return `\n\n── Available Skills (call loadSkill("name") to use) ──\n${lines.join("\n")}\n`;
}

/**
 * Returns full L2 instructions for a skill by name.
 * Called when Lyra decides to use a skill.
 */
export function loadSkillL2(name: string): string {
  const skill = getSkillByName(name);
  if (!skill) return `Skill "${name}" not found.`;
  recordSkillUsage(skill.id, true); // optimistic — caller marks success/fail later
  return skill.instructions || `No detailed instructions for "${name}" yet.`;
}

/**
 * Returns L3 reference docs for a skill.
 */
export function loadSkillL3(name: string): string {
  const skill = getSkillByName(name);
  if (!skill) return "";
  return skill.resources || "";
}

// ── Seed built-in skills ──────────────────────────────────────────────────────

export function seedBuiltinSkills(): void {
  const db = getDb();
  if (!db) return;
  const count = (db.prepare("SELECT COUNT(*) as c FROM skills").get() as { c: number }).c;
  if (count > 0) return; // already seeded

  const now = new Date().toISOString();
  const builtins: Omit<Skill, "id">[] = [
    {
      name: "web-research",
      description: "Search the web and synthesize findings into a clear, cited summary",
      instructions: `1. Use search_web tool with 2-3 targeted queries\n2. Read top 3 URLs with read_url\n3. Cross-reference facts across sources\n4. Synthesize into a structured summary with key points\n5. Note confidence level and any conflicting information`,
      resources: "",
      created_at: now, updated_at: now,
      usage_count: 0, success_rate: 0,
      created_by: "lyra", status: "active", test_score: null,
    },
    {
      name: "email-workflow",
      description: "Read Gmail inbox, triage messages, draft or send replies",
      instructions: `1. Use gmail_read to fetch recent messages\n2. Identify which need responses (filter by urgency/sender)\n3. Draft replies using gmail_send with clear subject/body\n4. Confirm send with user for important messages\n5. Store contact info to CRM if new sender`,
      resources: "",
      created_at: now, updated_at: now,
      usage_count: 0, success_rate: 0,
      created_by: "lyra", status: "active", test_score: null,
    },
    {
      name: "calendar-management",
      description: "Check Google Calendar availability, create events, resolve conflicts",
      instructions: `1. Use calendar_get to fetch upcoming events\n2. Check for conflicts in requested time window\n3. Use calendar_create with title, start, end, description\n4. Confirm timezone with user if ambiguous\n5. Set reminders appropriately (30min default)`,
      resources: "",
      created_at: now, updated_at: now,
      usage_count: 0, success_rate: 0,
      created_by: "lyra", status: "active", test_score: null,
    },
    {
      name: "stock-research",
      description: "Research a stock ticker: fundamentals, news, technicals, trading recommendation",
      instructions: `1. Use trading_oracle to get market intelligence\n2. Use trading_analyze for technical analysis\n3. Use search_web for recent news on the company\n4. Summarize: price trend, catalyst, risk, recommendation\n5. Present as: Thesis / Risk / Suggested action`,
      resources: "",
      created_at: now, updated_at: now,
      usage_count: 0, success_rate: 0,
      created_by: "lyra", status: "active", test_score: null,
    },
    {
      name: "content-creation",
      description: "Write blog posts, social copy, emails or long-form content with consistent tone",
      instructions: `1. Clarify: target audience, tone, length, goal\n2. Use search_web if topic needs factual grounding\n3. Structure: hook → body → CTA\n4. Use image_gen to add visuals if appropriate\n5. Offer to refine tone/length after first draft`,
      resources: "",
      created_at: now, updated_at: now,
      usage_count: 0, success_rate: 0,
      created_by: "lyra", status: "active", test_score: null,
    },
  ];

  for (const s of builtins) {
    saveSkill({ id: randomUUID(), ...s });
  }
}
