/**
 * lib/lyra/skillFactory.ts
 * Skill Factory — when Lyra detects no existing skill covers a request,
 * she generates one, self-tests it, and saves it.
 */

import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { saveSkill, getSkillByName, type Skill } from "./skills";

const SKILLS_GENERATED_DIR = path.join(
  process.env.DATA_DIR ?? "/home/aitaskflo/data",
  "skills",
  "generated"
);

function ensureSkillsDir() {
  if (!fs.existsSync(SKILLS_GENERATED_DIR)) {
    fs.mkdirSync(SKILLS_GENERATED_DIR, { recursive: true });
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SkillDraft {
  name: string;
  description: string;
  instructions: string;
  resources?: string;
  testCases: Array<{ input: string; expectedPattern: string }>;
}

export interface SkillTestResult {
  passed: number;
  total: number;
  details: Array<{ input: string; passed: boolean; output: string }>;
}

// ── Skill gap detection ───────────────────────────────────────────────────────

/**
 * Returns true if none of the active skills match the user request well enough.
 */
export function detectSkillGap(userMessage: string, activeSkillNames: string[]): boolean {
  // Heuristic: if message contains action verbs not covered by any skill name
  const keywords = userMessage.toLowerCase().split(/\s+/);
  const covered = activeSkillNames.some((name) =>
    keywords.some((kw) => name.includes(kw) || kw.includes(name.replace(/-/g, "")))
  );
  return !covered;
}

// ── Generate a skill draft via LLM ───────────────────────────────────────────

async function generateSkillDraft(request: string): Promise<SkillDraft | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  const prompt = `You are Lyra's skill architect. Create a reusable skill for this request:

"${request}"

Available tools Lyra can call: search_web, read_url, get_news, send_email, gmail_send, gmail_read,
calendar_get, calendar_create, drive_list, drive_read, drive_write, image_gen, fal_image, fal_video,
fal_tts, calculate, translate, stock_price, trading_oracle, trading_buy, trading_sell, crm,
generate_qr, find_jobs, generate_password, get_weather, get_datetime, moon_phase, world_clock.

Reply ONLY with JSON:
{
  "name": "kebab-case-skill-name",
  "description": "One sentence: what this skill does (max 15 words)",
  "instructions": "Step-by-step numbered list of how to execute this skill using available tools",
  "resources": "Optional: example inputs, edge cases, or reference patterns (can be empty string)",
  "testCases": [
    { "input": "example user request 1", "expectedPattern": "keyword that should appear in output" },
    { "input": "example user request 2", "expectedPattern": "keyword that should appear in output" },
    { "input": "example user request 3", "expectedPattern": "keyword that should appear in output" }
  ]
}

Rules:
- name must be unique, lowercase, kebab-case, max 40 chars
- instructions must be actionable steps referencing specific tools
- testCases must be realistic variations of the request`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as SkillDraft;
    if (!parsed.name || !parsed.instructions || !Array.isArray(parsed.testCases)) return null;
    return parsed;
  } catch (err) {
    console.error("[SkillFactory] generateSkillDraft error:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Self-test a skill draft ───────────────────────────────────────────────────

async function testSkillDraft(draft: SkillDraft): Promise<SkillTestResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const results: SkillTestResult["details"] = [];

  if (!groqKey) {
    // Can't test without API — pass all optimistically
    for (const tc of draft.testCases) {
      results.push({ input: tc.input, passed: true, output: "(untested — no API key)" });
    }
    return { passed: draft.testCases.length, total: draft.testCases.length, details: results };
  }

  for (const tc of draft.testCases) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 300,
          temperature: 0,
          messages: [{
            role: "user",
            content: `Given this skill:\n\n${draft.instructions}\n\nExecute it for this input: "${tc.input}"\n\nBriefly describe what you would do (2-3 sentences).`,
          }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) { results.push({ input: tc.input, passed: false, output: "API error" }); continue; }
      const data = await res.json();
      const output: string = data.choices?.[0]?.message?.content ?? "";
      const passed = output.toLowerCase().includes(tc.expectedPattern.toLowerCase());
      results.push({ input: tc.input, passed, output: output.slice(0, 200) });
    } catch {
      results.push({ input: tc.input, passed: false, output: "timeout" });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  return { passed, total: results.length, details: results };
}

// ── Write SKILL.md to disk ────────────────────────────────────────────────────

function writeSkillFile(draft: SkillDraft, testResult: SkillTestResult): string {
  ensureSkillsDir();
  const filename = `${draft.name}.md`;
  const content = `# Skill: ${draft.name}

## Description
${draft.description}

## Instructions
${draft.instructions}

## Resources
${draft.resources ?? "(none)"}

## Test Results
- Passed: ${testResult.passed}/${testResult.total}
${testResult.details.map((d) => `- [${d.passed ? "✅" : "❌"}] "${d.input}"`).join("\n")}

## Metadata
- Created: ${new Date().toISOString()}
- Created by: lyra (auto-generated)
`;
  fs.writeFileSync(path.join(SKILLS_GENERATED_DIR, filename), content, "utf-8");
  return filename;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export interface SkillFactoryResult {
  skill: Skill | null;
  status: "created" | "draft" | "failed";
  testResult: SkillTestResult | null;
  message: string;
}

export async function createSkillFromRequest(
  userRequest: string,
  createdBy = "lyra"
): Promise<SkillFactoryResult> {
  // Don't duplicate an existing skill
  const slug = userRequest
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join("-");

  if (getSkillByName(slug)) {
    return { skill: null, status: "failed", testResult: null, message: `Skill "${slug}" already exists.` };
  }

  // Generate draft
  const draft = await generateSkillDraft(userRequest);
  if (!draft) {
    return { skill: null, status: "failed", testResult: null, message: "Could not generate skill draft." };
  }

  // Self-test
  const testResult = await testSkillDraft(draft);
  const testScore = JSON.stringify({ passed: testResult.passed, total: testResult.total });

  // Write SKILL.md
  writeSkillFile(draft, testResult);

  const now = new Date().toISOString();
  const status: "active" | "draft" = testResult.passed >= 2 ? "active" : "draft";

  const skill: Skill = {
    id: randomUUID(),
    name: draft.name,
    description: draft.description,
    instructions: draft.instructions,
    resources: draft.resources ?? "",
    created_at: now,
    updated_at: now,
    usage_count: 0,
    success_rate: testResult.total > 0 ? testResult.passed / testResult.total : 0,
    created_by: createdBy,
    status,
    test_score: testScore,
  };

  saveSkill(skill);

  const statusMsg = status === "active"
    ? `Skill "${draft.name}" created and active (${testResult.passed}/${testResult.total} tests passed).`
    : `Skill "${draft.name}" saved as draft — needs review (${testResult.passed}/${testResult.total} tests passed).`;

  return { skill, status, testResult, message: statusMsg };
}

// ── Extend composer: persist composite tool as a skill ────────────────────────

export function compositeToolToSkill(
  compositeToolName: string,
  description: string,
  steps: Array<{ tool: string; description: string }>,
  createdBy: string
): void {
  const instructions = steps
    .map((s, i) => `${i + 1}. Use ${s.tool}: ${s.description}`)
    .join("\n");

  const skill: Skill = {
    id: randomUUID(),
    name: compositeToolName,
    description,
    instructions,
    resources: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 0,
    success_rate: 0,
    created_by: createdBy,
    status: "active",
    test_score: null,
  };

  saveSkill(skill);
}
