"use client";

import { useState, useEffect, useRef } from "react";

export default function PlayPage() {
  const [built, setBuilt]         = useState<boolean | null>(null);
  const [buildTime, setBuildTime] = useState<string | null>(null);
  const [building, setBuilding]   = useState(false);
  const [log, setLog]             = useState("");
  const [adminKey, setAdminKey]   = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Load saved key from sessionStorage
    const saved = sessionStorage.getItem("adminKey") ?? "";
    setAdminKey(saved);
    checkBuild(saved);
  }, []);

  async function checkBuild(key: string) {
    try {
      const res = await fetch(`/api/game/build?key=${encodeURIComponent(key)}`, {
        headers: key ? { "x-admin-key": key } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setBuilt(data.built);
        setBuildTime(data.buildTime);
      }
    } catch { /* ignore */ }
  }

  async function triggerBuild() {
    if (!adminKey) return;
    sessionStorage.setItem("adminKey", adminKey);
    setBuilding(true);
    setLog("");
    try {
      const res = await fetch("/api/game/build", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      });
      const data = await res.json();
      setLog(data.log ?? "");
      if (data.ok) {
        setBuilt(true);
        setBuildTime(new Date().toISOString());
      }
    } catch (err) {
      setLog(err instanceof Error ? err.message : String(err));
    } finally {
      setBuilding(false);
    }
  }

  function enterFullscreen() {
    setFullscreen(true);
    iframeRef.current?.requestFullscreen?.();
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧙</span>
          <div>
            <h1 className="text-lg font-bold">The 13th Witch</h1>
            <p className="text-white/40 text-xs">Godot 4.4 · Web Export</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {built && buildTime && (
            <span className="text-white/30 text-xs">
              Built {new Date(buildTime).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {built && (
            <button
              onClick={enterFullscreen}
              className="text-xs bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg transition-colors"
            >
              ⛶ Fullscreen
            </button>
          )}
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {built === null && (
          <p className="text-white/30">Checking build status...</p>
        )}

        {built === false && (
          <div className="text-center max-w-md space-y-6">
            <div className="text-6xl">🌑</div>
            <div>
              <h2 className="text-xl font-semibold mb-2">No build found</h2>
              <p className="text-white/50 text-sm">
                The game hasn&apos;t been exported yet. Enter your admin password and click
                Build to compile it with Godot 4.4.
              </p>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
                placeholder="Admin password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60"
              />
              <button
                onClick={triggerBuild}
                disabled={building || !adminKey}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {building ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Building... (up to 2 min)
                  </>
                ) : "⚡ Build & Export"}
              </button>
            </div>
            {log && (
              <pre className="text-left text-xs text-white/50 bg-white/5 rounded-xl p-4 overflow-auto max-h-48 whitespace-pre-wrap">
                {log}
              </pre>
            )}
          </div>
        )}

        {built === true && (
          <div className="w-full flex flex-col items-center gap-4" style={{ maxWidth: 1280 }}>
            {/* Controls reminder */}
            <div className="flex gap-6 text-white/40 text-xs">
              <span>WASD — move</span>
              <span>E — interact</span>
              <span>Shift — sprint</span>
              <span>Esc — close dialogue</span>
            </div>

            {/* Game iframe — Godot web export */}
            <div
              className="relative w-full rounded-2xl overflow-hidden border border-white/10"
              style={{ aspectRatio: "16/9" }}
            >
              <iframe
                ref={iframeRef}
                src="/game/index.html"
                className="w-full h-full"
                allow="autoplay; fullscreen"
                title="The 13th Witch"
              />
            </div>

            {/* Rebuild option */}
            <div className="flex items-center gap-3">
              <input
                type="password"
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
                placeholder="Admin key to rebuild"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-violet-500/60 w-44"
              />
              <button
                onClick={triggerBuild}
                disabled={building || !adminKey}
                className="text-xs bg-white/10 hover:bg-white/15 disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors"
              >
                {building ? "Building..." : "↺ Rebuild"}
              </button>
            </div>
            {log && (
              <pre className="text-xs text-white/50 bg-white/5 rounded-xl p-4 overflow-auto max-h-40 w-full whitespace-pre-wrap">
                {log}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
