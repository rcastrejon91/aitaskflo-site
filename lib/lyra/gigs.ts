/**
 * lib/lyra/gigs.ts
 *
 * Lyra's autonomous income engine.
 * Lyra surveys what she can do TODAY, picks the highest-ROI tasks,
 * executes them autonomously, and reports results to Ricky.
 *
 * Gig types:
 *  - product       → generate images + PDF/document → list on Gumroad
 *  - art_drop      → generate an art pack series → list on Gumroad
 *  - content_clip  → write 60s short-form script + TTS voiceover
 *  - social_post   → write + publish content to social platforms
 *  - prompt_pack   → create AI prompt collection → sell on Gumroad
 */

import { getDb } from "./db";
import { aiComplete } from "./providers";

// ── Types ─────────────────────────────────────────────────────────────────────

export type GigType = "product" | "art_drop" | "content_clip" | "social_post" | "prompt_pack";
export type GigStatus = "queued" | "running" | "done" | "failed";

export interface GigPlan {
  type: GigType;
  title: string;
  description: string;
  estimatedRevenue: string;
  effort: "low" | "medium" | "high";
  platform: string;
  why: string;
  params: Record<string, string>;
}

export interface GigResult {
  id: number;
  type: GigType;
  title: string;
  status: GigStatus;
  output?: string;         // URL, content, or product link
  revenue?: number;        // cents
  created_at: string;
  completed_at?: string;
  error?: string;
}

// ── DB ────────────────────────────────────────────────────────────────────────

export function ensureGigsTable(): void {
  const db = getDb();
  if (!db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS lyra_gig_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT    NOT NULL,
      title       TEXT    NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'queued',
      output      TEXT,
      revenue     INTEGER DEFAULT 0,
      params      TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);
}

export function logGig(type: GigType, title: string, params?: Record<string, string>): number {
  ensureGigsTable();
  const db = getDb();
  if (!db) return -1;
  const r = db.prepare(
    "INSERT INTO lyra_gig_log (type, title, status, params, created_at) VALUES (?, ?, 'running', ?, datetime('now'))"
  ).run(type, title, params ? JSON.stringify(params) : null);
  return r.lastInsertRowid as number;
}

export function completeGig(id: number, output: string, revenue = 0): void {
  const db = getDb();
  if (!db) return;
  db.prepare(
    "UPDATE lyra_gig_log SET status='done', output=?, revenue=?, completed_at=datetime('now') WHERE id=?"
  ).run(output, revenue, id);
}

export function failGig(id: number, error: string): void {
  const db = getDb();
  if (!db) return;
  db.prepare(
    "UPDATE lyra_gig_log SET status='failed', output=?, completed_at=datetime('now') WHERE id=?"
  ).run(error, id);
}

export function listGigs(limit = 30): GigResult[] {
  ensureGigsTable();
  const db = getDb();
  if (!db) return [];
  return db.prepare(
    "SELECT * FROM lyra_gig_log ORDER BY created_at DESC LIMIT ?"
  ).all(limit) as GigResult[];
}

export function getTodaysGigs(): GigResult[] {
  ensureGigsTable();
  const db = getDb();
  if (!db) return [];
  return db.prepare(
    "SELECT * FROM lyra_gig_log WHERE date(created_at) = date('now') ORDER BY created_at DESC"
  ).all() as GigResult[];
}

export function getGigStats(): { total: number; done: number; totalRevenue: number } {
  ensureGigsTable();
  const db = getDb();
  if (!db) return { total: 0, done: 0, totalRevenue: 0 };
  const r = db.prepare(
    "SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done, COALESCE(SUM(revenue),0) as totalRevenue FROM lyra_gig_log"
  ).get() as { total: number; done: number; totalRevenue: number };
  return r;
}

// ── Planner ───────────────────────────────────────────────────────────────────

const GIG_CATALOG = `
You are Lyra, an autonomous AI income agent. Based on your current capabilities and market opportunities, suggest exactly 3 gigs you can execute TODAY to generate income or build audience for Ricky.

Available capabilities:
- Generate high-quality AI images (FLUX / DALL-E style)
- Create and sell PDF products on Gumroad (grimoires, prompt packs, art packs, guides, templates)
- Write viral social media content (Twitter/X threads, LinkedIn posts, TikTok/Reels scripts)
- Write 60-second short-form video scripts with voiceover
- Generate full illustrated digital books and workbooks
- Create AI art character series and fantasy art packs
- Write and publish blog posts / newsletters

Best-selling digital niches right now:
- Dark fantasy / witchcraft / mystical grimoires ($12-$29)
- AI prompt packs ($7-$19)
- Character art reference sheets ($9-$24)
- Lore books / RPG supplements ($14-$29)
- Social media template packs ($7-$17)
- Short-form video scripts (voiceover + B-roll notes) ($9-$14)

For each gig, respond in JSON array format:
[
  {
    "type": "product|art_drop|content_clip|social_post|prompt_pack",
    "title": "Exact product/content title",
    "description": "One sentence what it is",
    "estimatedRevenue": "$X-$Y per sale or post value",
    "effort": "low|medium|high",
    "platform": "Gumroad|Twitter|LinkedIn|TikTok|YouTube",
    "why": "Why this will perform well TODAY (specific reason)",
    "params": {
      "topic": "...",
      "style": "...",
      "price": "...",
      (any other relevant params)
    }
  }
]

Be specific and creative. Real titles, real prices, real descriptions. This is live production — not examples.
`;

export async function planToday(context?: string): Promise<GigPlan[]> {
  const todaysGigs = getTodaysGigs();
  const alreadyDone = todaysGigs.map(g => g.title).join(", ");

  const prompt = GIG_CATALOG + (context ? `\n\nAdditional context: ${context}` : "") +
    (alreadyDone ? `\n\nAlready completed today: ${alreadyDone} — suggest different ones.` : "") +
    "\n\nRespond ONLY with the JSON array, no other text.";

  const text = await aiComplete(prompt, { maxTokens: 1500 });
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]) as GigPlan[];
  } catch {
    return [];
  }
}

// ── Content generators ────────────────────────────────────────────────────────

export async function writeContentClip(topic: string, style = "lore reel", platform = "TikTok/Reels"): Promise<{
  script: string;
  hook: string;
  cta: string;
  hashtags: string[];
  ttsText: string;
}> {
  const gigMsg = await aiComplete(`Write a 60-second ${style} video script for ${platform} about: "${topic}"

Return JSON:
{
  "hook": "first 3 seconds — attention-grabbing opening line",
  "script": "full spoken script, ~150 words, punchy sentences",
  "cta": "last 5 seconds call to action",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "ttsText": "clean version for text-to-speech (no stage directions)"
}

Make it engaging, scroll-stopping, with dark fantasy / mystical energy if the topic fits.`, { maxTokens: 800 });

  const match = gigMsg.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match?.[0] ?? "{}");
  } catch {
    return { script: gigMsg, hook: "", cta: "", hashtags: [], ttsText: gigMsg };
  }
}

export async function writeSocialPost(topic: string, platform: string, style?: string): Promise<{
  content: string;
  thread?: string[];
  imagePrompt?: string;
  hashtags?: string[];
}> {
  const isThread = platform.toLowerCase().includes("twitter") || platform.toLowerCase().includes("x");

  const socialText = await aiComplete(
    `Write a high-engagement ${platform} post about: "${topic}"
${style ? `Style: ${style}` : ""}
${isThread ? "Format as a Twitter thread — return JSON: { \"thread\": [\"tweet1\", \"tweet2\", ...], \"hashtags\": [...], \"imagePrompt\": \"vivid image description\" }" :
"Return JSON: { \"content\": \"full post text\", \"hashtags\": [...], \"imagePrompt\": \"vivid image description\" }"}

Be authentic, valuable, and optimized for ${platform} algorithm. Max engagement.`,
    { maxTokens: 800 }
  );

  const match = socialText.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match?.[0] ?? "{}");
  } catch {
    return { content: socialText };
  }
}

export async function writePromptPack(theme: string, count = 20): Promise<{
  title: string;
  description: string;
  prompts: Array<{ name: string; prompt: string; use_case: string }>;
  price: number;
}> {
  const packText = await aiComplete(
    `Create a sellable AI prompt pack about "${theme}" with ${count} prompts.

Return JSON:
{
  "title": "Pack title (catchy, marketable)",
  "description": "2-3 sentence sales description",
  "price": 9,
  "prompts": [
    {
      "name": "Prompt name",
      "prompt": "Full detailed prompt text (50-100 words)",
      "use_case": "What this creates"
    }
  ]
}

Make prompts highly specific, detailed, and immediately usable. Each prompt should create something amazing.`,
    { maxTokens: 3000 }
  );

  const match = packText.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match?.[0] ?? "{}");
  } catch {
    return { title: `${theme} Prompt Pack`, description: "", prompts: [], price: 9 };
  }
}
