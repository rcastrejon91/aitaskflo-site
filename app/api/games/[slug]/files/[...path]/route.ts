import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fsp from "fs/promises";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js:   "application/javascript; charset=utf-8",
  css:  "text/css; charset=utf-8",
  json: "application/json",
  png:  "image/png",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  gif:  "image/gif",
  svg:  "image/svg+xml",
  wasm: "application/wasm",
  pck:  "application/octet-stream",
  ico:  "image/x-icon",
};

const CORS_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cache-Control": "public, max-age=3600",
};

/**
 * Serves game files. Priority order:
 *  1. Runtime game dir (GAME_DIR env or data/games/{slug})
 *  2. public/games/{slug}/ (static fallback)
 *  3. SQLite DB (game_content column — browser games stored inline)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const { slug, path: fileParts } = await params;

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return new NextResponse("Invalid slug", { status: 400 });
  }

  const relPath = (fileParts ?? ["index.html"]).join("/");
  const ext = relPath.split(".").pop()?.toLowerCase() ?? "html";
  const contentType = MIME[ext] ?? "application/octet-stream";

  // ── Filesystem candidates ──────────────────────────────────────────────────
  // Use data/games as the default (writable on any OS, matches the DB dir)
  const cwd = process.cwd(/*turbopackIgnore: true*/);
  const dataGamesDir = path.join(
    process.env.APP_DIR ?? cwd,
    "data", "games"
  );
  const legacyDir = process.env.GAME_DIR
    ? path.dirname(process.env.GAME_DIR)
    : "/home/aitaskflo/game";

  const candidates = [
    path.join(dataGamesDir, slug),               // new default: data/games/{slug}
    path.join(legacyDir, slug),                   // legacy production path
    path.join(cwd, "public", "games", slug),      // static fallback
  ];

  for (const base of candidates) {
    const fullPath = path.resolve(path.join(base, relPath));
    if (!fullPath.startsWith(path.resolve(base))) continue; // path traversal guard
    try {
      const buf = await fsp.readFile(fullPath);
      return new NextResponse(buf, {
        status: 200,
        headers: { "Content-Type": contentType, ...CORS_HEADERS },
      });
    } catch { continue; }
  }

  // ── DB fallback for index.html (browser games stored inline) ──────────────
  if (relPath === "index.html" || relPath === "") {
    // Check new games table (html_code) first
    try {
      const { getGame } = await import("@/lib/lyra/games");
      const game = getGame(slug);
      if (game?.html_code) {
        return new NextResponse(game.html_code, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "SAMEORIGIN",
            "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval' blob: data:",
            ...CORS_HEADERS,
          },
        });
      }
    } catch { /* fall through */ }

    // Fall back to legacy marketplace_games game_content
    try {
      const { getGameContent } = await import("@/lib/lyra/db");
      const html = getGameContent(slug);
      if (html) {
        return new NextResponse(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
        });
      }
    } catch { /* DB unavailable */ }
  }

  return new NextResponse("File not found", { status: 404 });
}
