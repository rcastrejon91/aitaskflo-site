"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/lyra/AppShell";

interface Game {
  id: number;
  slug: string;
  title: string;
  genre: string;
  engine: string;
  concept: string | null;
  thumbnail_url: string | null;
  play_count: number;
  avg_rating: number;
  rating_count: number;
  hidden: number;
  created_at: string;
}

const ENGINE_LABELS: Record<string, string> = {
  phaser: "Phaser 3",
  threejs: "Three.js",
  babylon: "Babylon.js",
  godot2d: "Godot 2D",
  godot3d: "Godot 3D",
};

const GENRE_COLORS: Record<string, string> = {
  platformer: "#4ade80",
  rpg: "#a78bfa",
  shooter: "#f87171",
  horror: "#fb923c",
  puzzle: "#60a5fa",
  roguelike: "#f472b6",
  simulation: "#34d399",
  racing: "#facc15",
  tactics: "#818cf8",
  deck_building: "#e879f9",
  default: "#94a3b8",
};

function StarDisplay({ avg, count }: { avg: number; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#94a3b8" }}>
      <span style={{ color: "#facc15", letterSpacing: -1 }}>
        {"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))}
      </span>
      <span>{avg > 0 ? avg.toFixed(1) : "—"}</span>
      {count > 0 && <span style={{ color: "#64748b" }}>({count})</span>}
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const genreColor = GENRE_COLORS[game.genre.toLowerCase()] ?? GENRE_COLORS.default;
  const thumbnailFallback = `https://image.pollinations.ai/prompt/${encodeURIComponent(game.title + " game art, pixel art, vibrant")}?width=400&height=225&nologo=true&model=flux&seed=${game.id}`;

  return (
    <Link href={`/games/${game.slug}`} style={{ textDecoration: "none" }}>
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        flexDirection: "column",
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.5)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(139,92,246,0.15)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        {/* Thumbnail */}
        <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#0f0f1a" }}>
          <img
            src={game.thumbnail_url ?? thumbnailFallback}
            alt={game.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { (e.currentTarget as HTMLImageElement).src = thumbnailFallback; }}
          />
          {/* Engine badge */}
          <span style={{
            position: "absolute", top: 8, right: 8,
            background: "rgba(0,0,0,0.7)", color: "#94a3b8",
            fontSize: 10, padding: "2px 6px", borderRadius: 4,
            backdropFilter: "blur(4px)",
          }}>
            {ENGINE_LABELS[game.engine] ?? game.engine}
          </span>
          {/* Play button overlay */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0)", transition: "background 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.3)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0)"}
          >
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(139,92,246,0.9)", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 18, opacity: 0, transition: "opacity 0.2s",
            }}
              className="play-btn"
            >▶</div>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.3 }}>
              {game.title}
            </h3>
            <span style={{
              flexShrink: 0, fontSize: 10, padding: "2px 7px", borderRadius: 20,
              background: `${genreColor}22`, color: genreColor,
              border: `1px solid ${genreColor}44`, whiteSpace: "nowrap",
            }}>
              {game.genre}
            </span>
          </div>

          {game.concept && (
            <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.4,
              overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
              {game.concept}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 4 }}>
            <StarDisplay avg={game.avg_rating} count={game.rating_count} />
            <span style={{ fontSize: 12, color: "#64748b" }}>
              👁 {game.play_count.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [featured, setFeatured] = useState<Game | null>(null);
  const [sort, setSort] = useState<"trending" | "newest" | "top_rated">("trending");
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const [gamesRes, featuredRes] = await Promise.all([
        fetch(`/api/games?sort=${sort}`),
        fetch("/api/games/featured"),
      ]);
      const { games } = await gamesRes.json() as { games: Game[] };
      const { game } = await featuredRes.json() as { game: Game | null };
      setGames(games ?? []);
      setFeatured(game);
    } catch { /* ignore */ }
    setLoading(false);
  }, [sort]);

  useEffect(() => { void fetchGames(); }, [fetchGames]);

  const sortBtns: { key: typeof sort; label: string }[] = [
    { key: "trending", label: "🔥 Trending" },
    { key: "newest", label: "✨ Newest" },
    { key: "top_rated", label: "⭐ Top Rated" },
  ];

  return (
    <AppShell>
    <div style={{ minHeight: "100vh", background: "#080810", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                🎮 Game Marketplace
              </h1>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
                {games.length > 0 ? `${games.length} games built by Lyra` : "Games built by Lyra AI"}
              </p>
            </div>
            {/* Sort tabs */}
            <div style={{ display: "flex", gap: 8 }}>
              {sortBtns.map(btn => (
                <button key={btn.key} onClick={() => setSort(btn.key)} style={{
                  padding: "6px 16px", borderRadius: 20, border: "1px solid",
                  borderColor: sort === btn.key ? "#8b5cf6" : "rgba(255,255,255,0.1)",
                  background: sort === btn.key ? "rgba(139,92,246,0.15)" : "transparent",
                  color: sort === btn.key ? "#a78bfa" : "#64748b",
                  cursor: "pointer", fontSize: 13, transition: "all 0.15s",
                }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Game of the Week */}
      {featured && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" }}>
          <Link href={`/games/${featured.slug}`} style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              position: "relative", borderRadius: 16, overflow: "hidden",
              border: "1px solid rgba(250,204,21,0.3)",
              background: "rgba(250,204,21,0.04)",
              cursor: "pointer", transition: "all 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(250,204,21,0.6)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(250,204,21,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(250,204,21,0.3)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              {/* Background thumbnail */}
              {featured.thumbnail_url && (
                <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                  <img src={featured.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15 }} />
                </div>
              )}
              <div style={{ position: "relative", zIndex: 1, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                {featured.thumbnail_url && (
                  <img src={featured.thumbnail_url} alt={featured.title} style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#facc15", textTransform: "uppercase", letterSpacing: 1 }}>
                      ⭐ Game of the Week
                    </span>
                    <span style={{
                      fontSize: 10, padding: "1px 7px", borderRadius: 20,
                      background: `${GENRE_COLORS[featured.genre.toLowerCase()] ?? GENRE_COLORS.default}22`,
                      color: GENRE_COLORS[featured.genre.toLowerCase()] ?? GENRE_COLORS.default,
                      border: `1px solid ${GENRE_COLORS[featured.genre.toLowerCase()] ?? GENRE_COLORS.default}44`,
                    }}>
                      {featured.genre}
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>{featured.title}</h2>
                  {featured.concept && (
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {featured.concept}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <StarDisplay avg={featured.avg_rating} count={featured.rating_count} />
                  <span style={{ fontSize: 13, color: "#64748b" }}>👁 {featured.play_count.toLocaleString()} plays</span>
                  <span style={{
                    fontSize: 13, padding: "6px 16px", borderRadius: 8,
                    background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.4)",
                    color: "#facc15", fontWeight: 600,
                  }}>
                    Play Now →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Grid */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80, color: "#64748b" }}>Loading games…</div>
        ) : games.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎮</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 600, color: "#f1f5f9" }}>No games yet</h2>
            <p style={{ color: "#64748b", fontSize: 15, marginBottom: 32 }}>
              Tell Lyra what to build — it generates playable games in seconds.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, maxWidth: 800, margin: "0 auto 32px" }}>
              {[
                { emoji: "🚀", label: "Space shooter", prompt: "Build me a space shooter game with enemies and a boss fight" },
                { emoji: "🏃", label: "Endless runner", prompt: "Build an endless runner game with obstacles and a high score" },
                { emoji: "🧩", label: "Puzzle game", prompt: "Build a block puzzle game like Tetris" },
                { emoji: "⚔️", label: "RPG combat", prompt: "Build a top-down RPG with combat and items" },
                { emoji: "🐍", label: "Snake game", prompt: "Build a classic snake game with levels" },
                { emoji: "🏰", label: "Tower defense", prompt: "Build a tower defense game with waves of enemies" },
              ].map(g => (
                <Link key={g.label} href={`/lyra?q=${encodeURIComponent(g.prompt)}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    padding: "16px", borderRadius: 12, cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.03)",
                    transition: "all 0.15s", textAlign: "left",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.4)"; (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{g.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Click to build →</div>
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/lyra" style={{
              display: "inline-block", padding: "11px 28px",
              background: "linear-gradient(135deg,rgb(109,40,217),rgb(134,25,143))",
              borderRadius: 9, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 500,
              boxShadow: "0 0 24px rgba(109,40,217,0.4)",
            }}>
              Build any game with Lyra →
            </Link>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}>
            {games.map(game => <GameCard key={game.slug} game={game} />)}
          </div>
        )}
      </div>

      <style>{`
        a:hover .play-btn { opacity: 1 !important; }
      `}</style>
    </div>
    </AppShell>
  );
}
