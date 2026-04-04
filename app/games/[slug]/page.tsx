"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

const BROWSER_ENGINES = new Set(["phaser", "threejs", "babylon"]);

function StarRating({ slug, initialRating, initialAvg, initialCount }: {
  slug: string;
  initialRating: number | null;
  initialAvg: number;
  initialCount: number;
}) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(initialRating ?? 0);
  const [avg, setAvg] = useState(initialAvg);
  const [count, setCount] = useState(initialCount);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (stars: number) => {
    if (submitting) return;
    setSubmitting(true);
    setSelected(stars);
    try {
      const res = await fetch(`/api/games/${slug}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars }),
      });
      const data = await res.json() as { avg_rating: number; rating_count: number };
      setAvg(data.avg_rating);
      setCount(data.rating_count);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
        {selected ? "Your rating:" : "Rate this game:"}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => void submit(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: 28, transition: "transform 0.1s",
              transform: hovered >= star ? "scale(1.2)" : "scale(1)",
              color: (hovered || selected) >= star ? "#facc15" : "#2d2d3f",
            }}
          >
            ★
          </button>
        ))}
        {avg > 0 && (
          <span style={{ marginLeft: 8, color: "#94a3b8", fontSize: 14 }}>
            {avg.toFixed(1)} <span style={{ color: "#64748b" }}>({count})</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [game, setGame] = useState<Game | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playTracked = useRef(false);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const [gameRes, ratingRes] = await Promise.all([
          fetch(`/api/games/${slug}`),
          fetch(`/api/games/${slug}/rate`),
        ]);
        if (!gameRes.ok) { setError("Game not found"); setLoading(false); return; }
        const { game } = await gameRes.json() as { game: Game };
        const { stars } = await ratingRes.json() as { stars: number | null };
        setGame(game);
        setUserRating(stars);
      } catch { setError("Failed to load game"); }
      setLoading(false);
    };
    void fetchGame();
  }, [slug]);

  // Track play count once on first iframe load
  const trackPlay = () => {
    if (playTracked.current) return;
    playTracked.current = true;
    void fetch(`/api/games/${slug}/play`, { method: "POST" });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        Loading game…
      </div>
    );
  }

  if (error || !game) {
    return (
      <div style={{ minHeight: "100vh", background: "#080810", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🎮</div>
        <p style={{ color: "#64748b" }}>{error || "Game not found"}</p>
        <Link href="/games" style={{ color: "#a78bfa", textDecoration: "none" }}>← Back to Marketplace</Link>
      </div>
    );
  }

  const isBrowser = BROWSER_ENGINES.has(game.engine);
  const gameUrl = `/games/${slug}/index.html`;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const fullGameUrl = `${baseUrl}${gameUrl}`;

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/games" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>← Games</Link>
          <span style={{ color: "#1e293b" }}>|</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{game.title}</span>
          <span style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 20,
            background: "rgba(139,92,246,0.15)", color: "#a78bfa",
            border: "1px solid rgba(139,92,246,0.3)",
          }}>
            {game.genre}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>
            👁 {game.play_count.toLocaleString()} plays
          </span>
          <span style={{ fontSize: 13, color: "#64748b" }}>
            {ENGINE_LABELS[game.engine] ?? game.engine}
          </span>
          {isBrowser && (
            <button
              onClick={() => setFullscreen(f => !f)}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8", cursor: "pointer", borderRadius: 6,
                padding: "5px 12px", fontSize: 13,
              }}
            >
              {fullscreen ? "⊙ Exit" : "⛶ Fullscreen"}
            </button>
          )}
        </div>
      </div>

      {/* Game area */}
      {isBrowser ? (
        <div style={{
          position: fullscreen ? "fixed" : "relative",
          inset: fullscreen ? 0 : undefined,
          zIndex: fullscreen ? 100 : undefined,
          background: "#000",
          display: "flex", alignItems: "center", justifyContent: "center",
          height: fullscreen ? "100vh" : "calc(100vh - 140px)",
          minHeight: fullscreen ? undefined : 500,
        }}>
          {fullscreen && (
            <button
              onClick={() => setFullscreen(false)}
              style={{
                position: "absolute", top: 12, right: 12, zIndex: 101,
                background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff", cursor: "pointer", borderRadius: 6,
                padding: "6px 14px", fontSize: 14,
              }}
            >
              ✕ Exit
            </button>
          )}
          <iframe
            ref={iframeRef}
            src={gameUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            title={game.title}
            allow="autoplay; fullscreen"
            onLoad={trackPlay}
          />
        </div>
      ) : (
        // Godot game (needs SharedArrayBuffer headers)
        <div style={{ position: "relative", height: "calc(100vh - 140px)", minHeight: 500, background: "#000" }}>
          <iframe
            ref={iframeRef}
            src={gameUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            title={game.title}
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock"
            onLoad={trackPlay}
          />
        </div>
      )}

      {/* Bottom info bar */}
      {!fullscreen && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16,
          background: "rgba(0,0,0,0.2)",
        }}>
          <div style={{ flex: 1 }}>
            {game.concept && (
              <p style={{ margin: 0, color: "#64748b", fontSize: 13, maxWidth: 600 }}>{game.concept}</p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
            <StarRating
              slug={slug}
              initialRating={userRating}
              initialAvg={game.avg_rating}
              initialCount={game.rating_count}
            />
            <a
              href={fullGameUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "8px 18px", background: "rgba(139,92,246,0.15)",
                border: "1px solid #8b5cf6", borderRadius: 8,
                color: "#a78bfa", textDecoration: "none", fontSize: 13,
              }}
            >
              ↗ Open standalone
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
