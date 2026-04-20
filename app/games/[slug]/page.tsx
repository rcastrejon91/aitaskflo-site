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
  kaboom: "Kaboom.js",
  p5: "p5.js",
  experimental: "Experimental",
  godot2d: "Godot 2D",
  godot3d: "Godot 3D",
};

const BROWSER_ENGINES = new Set(["phaser", "threejs", "babylon", "kaboom", "p5", "experimental"]);

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
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-500">{selected ? "Your rating" : "Rate this game"}</p>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => void submit(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            disabled={submitting}
            aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
            className={`text-3xl leading-none transition-transform disabled:cursor-wait ${
              hovered >= star ? "scale-110" : "scale-100"
            } ${(hovered || selected) >= star ? "text-yellow-300" : "text-white/12"}`}
          >
            ★
          </button>
        ))}
        {avg > 0 && (
          <span className="ml-2 text-sm text-slate-400">
            {avg.toFixed(1)} <span className="text-slate-600">({count})</span>
          </span>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080810] text-slate-500">
      <div className="w-full max-w-xl px-4">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-white/10" />
        <div className="aspect-video animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080810] px-4 text-center">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.035] p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-sm font-black text-violet-200">GM</div>
        <h1 className="text-xl font-black text-white">Game unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <Link href="/games" className="mt-6 inline-flex rounded-lg border border-violet-400/35 px-4 py-2 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/10">
          Back to Games
        </Link>
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
        if (!gameRes.ok) {
          setError("Game not found");
          setLoading(false);
          return;
        }
        const { game } = await gameRes.json() as { game: Game };
        const { stars } = await ratingRes.json() as { stars: number | null };
        setGame(game);
        setUserRating(stars);
      } catch {
        setError("Failed to load game");
      } finally {
        setLoading(false);
      }
    };
    void fetchGame();
  }, [slug]);

  const trackPlay = () => {
    if (playTracked.current) return;
    playTracked.current = true;
    void fetch(`/api/games/${slug}/play`, { method: "POST" });
  };

  if (loading) return <LoadingState />;
  if (error || !game) return <ErrorState message={error || "Game not found"} />;

  const isBrowser = BROWSER_ENGINES.has(game.engine);
  const gameUrl = `/api/games/${slug}/files/index.html`;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const fullGameUrl = `${baseUrl}${gameUrl}`;

  return (
    <div className="min-h-screen bg-[#080810] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-70">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:76px_76px]" />
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-violet-500/12 via-sky-400/5 to-transparent" />
      </div>

      <header className="relative sticky top-0 z-20 border-b border-white/8 bg-[#080810]/88 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/games" className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-400 transition-colors hover:border-white/20 hover:text-white">
              Games
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black text-white sm:text-lg">{game.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-violet-200">{game.genre}</span>
                <span>{ENGINE_LABELS[game.engine] ?? game.engine}</span>
                <span>{game.play_count.toLocaleString()} plays</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={fullGameUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-white/20 hover:text-white"
            >
              Standalone
            </a>
            {isBrowser && (
              <button
                onClick={() => setFullscreen((value) => !value)}
                className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-black transition-colors hover:bg-violet-100"
              >
                {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        <section
          className={`bg-black ${
            fullscreen
              ? "fixed inset-0 z-50"
              : "mx-auto h-[calc(100vh-280px)] min-h-[460px] max-w-7xl border-x border-white/8"
          }`}
        >
          {fullscreen && (
            <button
              onClick={() => setFullscreen(false)}
              className="absolute right-4 top-4 z-[51] rounded-lg border border-white/20 bg-black/70 px-4 py-2 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-black"
            >
              Exit
            </button>
          )}
          <iframe
            ref={iframeRef}
            src={gameUrl}
            className="h-full w-full border-0"
            title={game.title}
            allow="autoplay; fullscreen"
            sandbox={isBrowser ? undefined : "allow-scripts allow-same-origin allow-pointer-lock"}
            onLoad={trackPlay}
          />
        </section>

        {!fullscreen && (
          <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-1 text-xs font-semibold text-violet-200">{game.genre}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-slate-400">{ENGINE_LABELS[game.engine] ?? game.engine}</span>
              </div>
              <h2 className="text-2xl font-black text-white">{game.title}</h2>
              {game.concept && (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{game.concept}</p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5 lg:min-w-80">
              <StarRating
                slug={slug}
                initialRating={userRating}
                initialAvg={game.avg_rating}
                initialCount={game.rating_count}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
