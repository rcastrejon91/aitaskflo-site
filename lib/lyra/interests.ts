/**
 * User Interests System
 *
 * Implicit (always-on): after each reflection, topicTags are extracted and
 * interest_weights are incremented. A real interest profile emerges after 5-10
 * conversations with no action required from the user.
 *
 * Optional manual interests UI comes later (Module 7). This file is purely
 * the data layer — schema helpers + extraction logic.
 */

import { getDb } from "./db";
import { getAllReflections } from "./reflections";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserInterests {
  userId: string;
  interests: string[];                    // Ordered by weight desc
  weights: Record<string, number>;        // tag → cumulative weight
  updatedAt: string;
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getUserInterests(userId: string): UserInterests | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db.prepare("SELECT interests, interest_weights, last_seen FROM users WHERE id = ?").get(userId) as {
      interests: string | null;
      interest_weights: string | null;
      last_seen: string;
    } | undefined;
    if (!row) return null;

    const weights: Record<string, number> = row.interest_weights ? JSON.parse(row.interest_weights) : {};
    const interests = Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    return { userId, interests, weights, updatedAt: row.last_seen };
  } catch {
    return null;
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Increment interest weights for a set of topic tags.
 * Each tag gets +1 weight per call. Tags seen more often rank higher.
 */
export function incrementInterests(userId: string, tags: string[]): void {
  if (!tags.length) return;
  const db = getDb();
  if (!db) return;
  try {
    const row = db.prepare("SELECT interest_weights FROM users WHERE id = ?").get(userId) as {
      interest_weights: string | null;
    } | undefined;
    if (!row) return;

    const weights: Record<string, number> = row.interest_weights ? JSON.parse(row.interest_weights) : {};

    for (const raw of tags) {
      const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
      if (!tag) continue;
      weights[tag] = (weights[tag] ?? 0) + 1;
    }

    // Keep top 100 to prevent unbounded growth
    const trimmed = Object.fromEntries(
      Object.entries(weights).sort((a, b) => b[1] - a[1]).slice(0, 100)
    );

    const interestList = Object.keys(trimmed);

    db.prepare("UPDATE users SET interests = ?, interest_weights = ? WHERE id = ?").run(
      JSON.stringify(interestList),
      JSON.stringify(trimmed),
      userId
    );
  } catch (err) {
    console.error("[Interests] incrementInterests error:", err instanceof Error ? err.message : String(err));
  }
}

// ── Backfill ──────────────────────────────────────────────────────────────────

/**
 * One-time backfill: seeds a user's interest profile from their existing
 * reflection history. Safe to call multiple times — idempotent if weights
 * already exist (skips users who already have interest_weights set).
 */
export function backfillUserInterests(userId: string): { tagged: number; skipped: boolean } {
  const db = getDb();
  if (!db) return { tagged: 0, skipped: false };

  try {
    const row = db.prepare("SELECT interest_weights FROM users WHERE id = ?").get(userId) as {
      interest_weights: string | null;
    } | undefined;
    if (!row) return { tagged: 0, skipped: false };

    // Skip if already has weights (don't double-count)
    if (row.interest_weights) {
      return { tagged: 0, skipped: true };
    }

    // Pull all reflections and collect topic tags
    const reflections = getAllReflections();
    const allTags: string[] = [];

    for (const r of reflections) {
      const tags = r.topicTags ?? [];
      allTags.push(...tags);
    }

    if (allTags.length === 0) return { tagged: 0, skipped: false };

    incrementInterests(userId, allTags);
    return { tagged: allTags.length, skipped: false };
  } catch (err) {
    console.error("[Interests] backfillUserInterests error:", err instanceof Error ? err.message : String(err));
    return { tagged: 0, skipped: false };
  }
}

/**
 * Backfill all users who have no interest_weights yet.
 * Called once at startup from the reflect route or a one-off admin endpoint.
 */
export function backfillAllUsers(): { processed: number; skipped: number } {
  const db = getDb();
  if (!db) return { processed: 0, skipped: 0 };

  try {
    const users = db.prepare("SELECT id FROM users").all() as { id: string }[];
    let processed = 0, skipped = 0;

    for (const u of users) {
      const result = backfillUserInterests(u.id);
      if (result.skipped) skipped++;
      else if (result.tagged > 0) processed++;
    }

    return { processed, skipped };
  } catch {
    return { processed: 0, skipped: 0 };
  }
}

// ── Build context snippet ─────────────────────────────────────────────────────

/**
 * Returns a short string for use in system prompts / drop generation.
 * Returns empty string if no interests yet.
 */
export function buildInterestSummary(userId: string, limit = 8): string {
  const profile = getUserInterests(userId);
  if (!profile || profile.interests.length === 0) return "";
  return profile.interests.slice(0, limit).join(", ");
}
