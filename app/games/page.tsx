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
  const filled = Math.round(avg);

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className="tracking-[-0.12em] text-yellow-300">
        {"★".repeat(filled)}{"☆".repeat(5 - filled)}
      </span>
      <span>{avg > 0 ? avg.toFixed(1) : "No rating"}</span>
      {count > 0 && <span className="text-slate-600">({count})</span>}
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const genreColor = GENRE_COLORS[game.genre.toLowerCase()] ?? GENRE_COLORS.default;
  const thumbnailFallback = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${game.title} game art, pixel art, vibrant`)}?width=400&height=225&nologo=true&model=flux&seed=${game.id}`;

  return (
    <Link href={`/games/${game.slug}`} className="group block overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] text-white no-underline shadow-[0_18px_60px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-1 hover:border-violet-400/45 hover:bg-white/[0.055]">
      <div className="relative aspect-video bg-black">
        <img
          src={game.thumbnail_url ?? thumbnailFallback}
          alt={game.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = thumbnailFallback;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute right-3 top-3 rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[10px] font-medium text-slate-300 backdrop-blur">
          {ENGINE_LABELS[game.engine] ?? game.engine}
        </span>
        <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-violet-500 text-sm font-black text-white opacity-95 shadow-xl">
          ▶
        </div>
      </div>

      <div className="flex min-h-44 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-bold leading-snug text-white">{game.title}</h3>
          <span
            className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: `${genreColor}22`, color: genreColor, borderColor: `${genreColor}44` }}
          >
            {game.genre}
          </span>
        </div>

        {game.concept && (
          <p className="line-clamp-2 text-sm leading-6 text-slate-400">{game.concept}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/8 pt-3">
          <StarDisplay avg={game.avg_rating} count={game.rating_count} />
          <span className="text-xs text-slate-500">{game.play_count.toLocaleString()} plays</span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
      <div className="aspect-video animate-pulse bg-white/8" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-full animate-pulse rounded bg-white/8" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/8" />
      </div>
    </div>
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
    } catch {
      setGames([]);
      setFeatured(null);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => { void fetchGames(); }, [fetchGames]);

  const sortBtns: { key: typeof sort; label: string }[] = [
    { key: "trending", label: "Trending" },
    { key: "newest", label: "Newest" },
    { key: "top_rated", label: "Top Rated" },
  ];

  return (
    <AppShell>
      <div className="min-h-screen bg-[#080810] text-slate-100">
        <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-70">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:76px_76px]" />
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-violet-500/12 via-sky-400/5 to-transparent" />
        </div>

        <header className="relative border-b border-white/8">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-violet-300/80">Playable AI builds</p>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Game Marketplace</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Browse playable games generated by Lyra, then launch a build prompt when you want a new prototype.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/lyra" className="rounded-lg bg-white px-5 py-3 text-center text-sm font-bold text-black transition-colors hover:bg-violet-100">
                  Build a Game
                </Link>
                <div className="flex rounded-lg border border-white/10 bg-black/25 p-1">
                  {sortBtns.map((btn) => (
                    <button
                      key={btn.key}
                      onClick={() => setSort(btn.key)}
                      className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:px-4 ${
                        sort === btn.key
                          ? "bg-violet-500/20 text-violet-200"
                          : "text-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {featured && (
            <Link href={`/games/${featured.slug}`} className="group mb-8 block overflow-hidden rounded-xl border border-yellow-300/25 bg-yellow-300/[0.045] text-white no-underline transition-all hover:border-yellow-300/50">
              <div className="relative">
                {featured.thumbnail_url && (
                  <img src={featured.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
                )}
                <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                  {featured.thumbnail_url && (
                    <img src={featured.thumbnail_url} alt={featured.title} className="aspect-video w-full rounded-lg object-cover sm:w-44" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">Game of the Week</span>
                      <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-slate-300">{featured.genre}</span>
                    </div>
                    <h2 className="text-2xl font-black text-white">{featured.title}</h2>
                    {featured.concept && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{featured.concept}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <StarDisplay avg={featured.avg_rating} count={featured.rating_count} />
                    <span className="text-xs text-slate-400">{featured.play_count.toLocaleString()} plays</span>
                    <span className="rounded-lg border border-yellow-300/35 bg-yellow-300/10 px-4 py-2 text-sm font-bold text-yellow-200 transition-colors group-hover:bg-yellow-300/15">
                      Play Now
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => <SkeletonCard key={index} />)}
            </div>
          ) : games.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-14 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-sm font-black text-violet-200">GM</div>
              <h2 className="text-2xl font-black text-white">No games yet</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Tell Lyra what to build and it can generate a playable game prototype in seconds.
              </p>
              <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Space shooter", prompt: "Build me a space shooter game with enemies and a boss fight" },
                  { label: "Endless runner", prompt: "Build an endless runner game with obstacles and a high score" },
                  { label: "Puzzle game", prompt: "Build a block puzzle game like Tetris" },
                  { label: "RPG combat", prompt: "Build a top-down RPG with combat and items" },
                  { label: "Snake game", prompt: "Build a classic snake game with levels" },
                  { label: "Tower defense", prompt: "Build a tower defense game with waves of enemies" },
                ].map((item) => (
                  <Link key={item.label} href={`/lyra?q=${encodeURIComponent(item.prompt)}`} className="rounded-lg border border-white/8 bg-white/[0.03] p-4 text-left no-underline transition-colors hover:border-violet-400/40 hover:bg-violet-500/10">
                    <span className="text-sm font-bold text-slate-100">{item.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">Click to build</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {games.map((game) => <GameCard key={game.slug} game={game} />)}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
