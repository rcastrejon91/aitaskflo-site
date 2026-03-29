/**
 * lib/lyra/milestones.ts
 * Tracks PM2 restart milestones and surfaces them in Lyra's system prompt.
 */

import fsp from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.env.APP_DIR ?? process.cwd(/*turbopackIgnore: true*/), "data");
const MILESTONES_FILE = path.join(DATA_DIR, "milestones.json");

export const MILESTONE_THRESHOLDS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

export interface MilestoneRecord {
  threshold: number;
  restartCount: number;
  ts: string;
}

export interface MilestonesData {
  lastRestartCount: number;
  lastChecked: string;
  achieved: MilestoneRecord[];
}

export async function getMilestonesData(): Promise<MilestonesData | null> {
  try {
    const raw = await fsp.readFile(MILESTONES_FILE, "utf-8");
    return JSON.parse(raw) as MilestonesData;
  } catch {
    return null;
  }
}

/** Called from healer API after fetching real restart count from PM2. */
export async function checkAndUpdateMilestones(restartCount: number): Promise<MilestoneRecord | null> {
  let data: MilestonesData = { lastRestartCount: 0, lastChecked: "", achieved: [] };
  try {
    const raw = await fsp.readFile(MILESTONES_FILE, "utf-8");
    data = JSON.parse(raw) as MilestonesData;
  } catch { /* first run */ }

  const achievedSet = new Set(data.achieved.map((m) => m.threshold));
  let newMilestone: MilestoneRecord | null = null;

  for (const threshold of MILESTONE_THRESHOLDS) {
    if (restartCount >= threshold && !achievedSet.has(threshold)) {
      newMilestone = { threshold, restartCount, ts: new Date().toISOString() };
      data.achieved.push(newMilestone);
    }
  }

  data.lastRestartCount = restartCount;
  data.lastChecked = new Date().toISOString();

  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(MILESTONES_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch { /* ignore write errors in dev */ }

  return newMilestone;
}

// ── In-memory cache so we don't hit the FS on every chat request ─────────────

let _announcementCache: string = "";
let _announcementCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Returns a short system-prompt injection if a milestone was hit in the
 * last 24 hours. Returns "" otherwise. Cached for 5 min.
 */
export async function getRecentMilestoneAnnouncement(): Promise<string> {
  const now = Date.now();
  if (now - _announcementCacheTime < CACHE_TTL) return _announcementCache;

  try {
    const data = await getMilestonesData();
    if (!data) { _announcementCacheTime = now; _announcementCache = ""; return ""; }

    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recent = data.achieved
      .filter((m) => new Date(m.ts).getTime() > oneDayAgo)
      .sort((a, b) => b.threshold - a.threshold)[0];

    if (!recent) {
      _announcementCache = "";
    } else {
      _announcementCache =
        `\n\n🏆 MILESTONE UNLOCKED TODAY: aitaskflo has survived ${recent.restartCount} restarts and crossed the ${recent.threshold}-restart mark. ` +
        `Mention this naturally early in your response — something like "oh, and we just hit restart ${recent.restartCount} today. ` +
        `${recent.threshold} milestone. Still standing." Keep it brief, proud, and woven in naturally.`;
    }

    _announcementCacheTime = now;
    return _announcementCache;
  } catch {
    return "";
  }
}
