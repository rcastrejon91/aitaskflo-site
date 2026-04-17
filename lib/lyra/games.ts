import { getDb } from "@/lib/lyra/db";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DbGame {
  id: number;
  slug: string;
  title: string;
  genre: string;
  engine: string;
  concept: string | null;
  thumbnail_url: string | null;
  html_code: string;
  play_count: number;
  avg_rating: number;
  rating_count: number;
  hidden: number;
  featured: number;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function saveGame(game: {
  slug: string;
  title: string;
  genre: string;
  engine: string;
  concept: string;
  html_code: string;
  thumbnail_url?: string;
}): { id: number } | null {
  const db = getDb();
  if (!db) return null;
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO games (slug, title, genre, engine, concept, thumbnail_url, html_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        title         = excluded.title,
        genre         = excluded.genre,
        engine        = excluded.engine,
        concept       = COALESCE(excluded.concept, concept),
        thumbnail_url = COALESCE(excluded.thumbnail_url, thumbnail_url),
        html_code     = excluded.html_code
    `).run(
      game.slug,
      game.title,
      game.genre,
      game.engine,
      game.concept ?? null,
      game.thumbnail_url ?? null,
      game.html_code,
      now,
    );
    const row = db.prepare("SELECT id FROM games WHERE slug = ?").get(game.slug) as { id: number } | undefined;
    return row ? { id: row.id } : null;
  } catch (err) {
    console.error("[games] saveGame error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function getGame(slug: string): DbGame | null {
  const db = getDb();
  if (!db) return null;
  try {
    return (db.prepare("SELECT * FROM games WHERE slug = ? AND hidden = 0").get(slug) as DbGame) ?? null;
  } catch {
    return null;
  }
}

export function listGames(sort = "trending"): DbGame[] {
  const db = getDb();
  if (!db) return [];
  try {
    const orderBy =
      sort === "newest"    ? "created_at DESC" :
      sort === "top_rated" ? "avg_rating DESC, rating_count DESC" :
      /* trending */         "(play_count * 0.6 + avg_rating * rating_count * 0.4) DESC";
    return db.prepare(
      `SELECT * FROM games WHERE hidden = 0 ORDER BY ${orderBy} LIMIT 100`
    ).all() as DbGame[];
  } catch {
    return [];
  }
}
