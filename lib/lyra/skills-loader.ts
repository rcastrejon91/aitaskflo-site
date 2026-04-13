/**
 * lib/lyra/skills-loader.ts
 *
 * Reads skills from DB + skills/ directory and injects relevant ones
 * into Lyra's system prompt. Skills describe behavior — they never execute code.
 */

import fsp from "fs/promises";
import nodePath from "path";
import { listSkills } from "./db";

const SKILLS_DIR = nodePath.join(process.cwd(), "skills");
const SKILLS_ENABLED = process.env.SKILLS_ENABLED !== "false";
const MAX_INJECTED = 3; // keep context lean

interface Skill {
  name: string;
  description: string;
  content: string;
  type: string;
  source: "db" | "file";
}

// ── Load all active skills ─────────────────────────────────────────────────────

async function loadFileSkills(dir: string, type = "skill"): Promise<Skill[]> {
  const skills: Skill[] = [];
  try {
    const files = await fsp.readdir(dir);
    for (const f of files) {
      if (!f.endsWith(".md") || f === "README.md") continue;
      const content = await fsp.readFile(nodePath.join(dir, f), "utf8").catch(() => "");
      if (!content) continue;
      // Parse frontmatter
      const nameMatch = content.match(/^---\s*\nname:\s*(.+)/m);
      const descMatch = content.match(/^description:\s*(.+)/m);
      const name = nameMatch?.[1]?.trim() ?? f.replace(".md", "").replace(".tool", "");
      const description = descMatch?.[1]?.trim() ?? name;
      skills.push({ name, description, content, type, source: "file" });
    }
  } catch { /* dir may not exist */ }
  return skills;
}

async function getAllActiveSkills(): Promise<Skill[]> {
  if (!SKILLS_ENABLED) return [];

  const [fileSkills, fileTools, dbSkills] = await Promise.all([
    loadFileSkills(SKILLS_DIR, "skill"),
    loadFileSkills(nodePath.join(SKILLS_DIR, "tools"), "tool"),
    Promise.resolve(listSkills("active")),
  ]);

  const dbMapped: Skill[] = dbSkills.map(s => ({
    name: s.name, description: s.description,
    content: s.content, type: s.type, source: "db" as const,
  }));

  // DB skills override file skills with same name
  const names = new Set(dbMapped.map(s => s.name));
  const merged = [
    ...dbMapped,
    ...fileSkills.filter(s => !names.has(s.name)),
    ...fileTools.filter(s => !names.has(s.name)),
  ];

  return merged;
}

// ── Score skill relevance to a message ────────────────────────────────────────

function scoreRelevance(skill: Skill, message: string): number {
  const msg = message.toLowerCase();
  const desc = skill.description.toLowerCase();
  const name = skill.name.toLowerCase().replace(/[-_]/g, " ");

  let score = 0;

  // Name words in message
  for (const word of name.split(" ")) {
    if (word.length > 3 && msg.includes(word)) score += 3;
  }

  // Description keywords in message
  const descWords = desc.split(/\s+/).filter(w => w.length > 4);
  for (const word of descWords) {
    if (msg.includes(word)) score += 1;
  }

  // Content keywords (first 200 chars)
  const contentSnippet = skill.content.slice(0, 200).toLowerCase();
  const contentWords = contentSnippet.split(/\s+/).filter(w => w.length > 5);
  for (const word of contentWords) {
    if (msg.includes(word)) score += 0.5;
  }

  return score;
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function buildSkillsContext(message: string): Promise<string> {
  if (!SKILLS_ENABLED || !message) return "";

  try {
    const skills = await getAllActiveSkills();
    if (!skills.length) return "";

    // Score and pick top matches
    const scored = skills
      .map(s => ({ skill: s, score: scoreRelevance(s, message) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_INJECTED);

    if (!scored.length) return "";

    const blocks = scored.map(({ skill }) =>
      `### Skill: ${skill.name}\n${skill.content.trim()}`
    ).join("\n\n---\n\n");

    return `\n\n## SKILLS YOU HAVE LEARNED\nThese are skills you've acquired. Use them — they encode what you already know works.\n\n${blocks}`;
  } catch {
    return "";
  }
}

// ── Skill count for display ────────────────────────────────────────────────────

export async function getSkillCount(): Promise<{ active: number; pending: number; tools: number }> {
  try {
    const all = listSkills();
    const fileTools = await loadFileSkills(nodePath.join(SKILLS_DIR, "tools"), "tool");
    return {
      active: all.filter(s => s.status === "active").length,
      pending: all.filter(s => s.status === "pending").length,
      tools: all.filter(s => s.type === "tool").length + fileTools.length,
    };
  } catch { return { active: 0, pending: 0, tools: 0 }; }
}
