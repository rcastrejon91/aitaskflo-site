"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Mail, Users, QrCode, Globe, Palette, Calendar,
  Copy, Check, ExternalLink, ImageIcon, Gamepad2,
  BookOpen, ChevronLeft, ChevronRight, Download,
  ShieldAlert, Loader2, CheckCircle2, XCircle,
} from "lucide-react";

// react-markdown and remark-gfm are part of the unified CJS ecosystem with
// circular require() graphs. Top-level imports put them in the SSR bundle
// where Turbopack's module registry overflows the call stack. Defer them
// to useEffect so they are only ever loaded in the browser.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MdLib = { ReactMarkdown: any; remarkGfm: any } | null;
let mdCache: MdLib = null;
let mdPending: Promise<MdLib> | null = null;
function loadMd(): Promise<MdLib> {
  if (mdCache) return Promise.resolve(mdCache);
  if (!mdPending) {
    mdPending = Promise.all([
      import("react-markdown").then((m) => m.default),
      import("remark-gfm").then((m) => m.default),
    ]).then(([ReactMarkdown, remarkGfm]) => {
      mdCache = { ReactMarkdown, remarkGfm };
      return mdCache;
    });
  }
  return mdPending;
}

const CodeHighlight = dynamic(() => import("./CodeHighlight"), { ssr: false });

// ── Live Math Canvas ──────────────────────────────────────────────────────────
// Renders a sandboxed iframe that executes animated canvas code in real time.
// Lyra outputs ```live-math blocks; this component brings them to life.

function LiveMathCanvas({ code }: { code: string }) {
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #09090f; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);
let t = 0;
let animId;

// ── User code ──
${code}
// ── End user code ──

// If user defined draw(), loop it. Otherwise run once.
if (typeof draw === 'function') {
  function loop() {
    draw(t);
    t += 0.016;
    animId = requestAnimationFrame(loop);
  }
  loop();
}
</script>
</body>
</html>`;

  return (
    <div className="mt-3 rounded-2xl overflow-hidden" style={{
      border: "1px solid rgba(139,92,246,0.3)",
      background: "#09090f",
      boxShadow: "0 0 40px rgba(139,92,246,0.15), inset 0 0 40px rgba(0,0,0,0.5)",
    }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.06)" }}>
        <span className="text-sm">✦</span>
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(196,181,253,0.8)", letterSpacing: "0.12em" }}>
          Live Math
        </span>
        <span className="ml-auto flex gap-1">
          {[0,1,2].map(i => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{
              background: "rgba(139,92,246,0.6)",
              animation: `pulse 1.5s ${i * 0.3}s ease-in-out infinite`,
            }} />
          ))}
        </span>
      </div>
      <iframe
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        style={{ width: "100%", height: "320px", border: "none", display: "block" }}
        title="live-math"
      />
    </div>
  );
}

// ── Tool Card ─────────────────────────────────────────────────────────────────

const TOOL_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  border: string;
  accent: string;
}> = {
  email:     { label: "Email Sent",      icon: Mail,     gradient: "from-blue-950/80 to-blue-900/30",    border: "border-blue-500/30",    accent: "text-blue-300" },
  crm:       { label: "CRM Updated",     icon: Users,    gradient: "from-amber-950/80 to-amber-900/30",  border: "border-amber-500/30",   accent: "text-amber-300" },
  qr:        { label: "QR Code",         icon: QrCode,   gradient: "from-teal-950/80 to-teal-900/30",    border: "border-teal-500/30",    accent: "text-teal-300" },
  translate: { label: "Translation",     icon: Globe,    gradient: "from-cyan-950/80 to-cyan-900/30",    border: "border-cyan-500/30",    accent: "text-cyan-300" },
  image_gen: { label: "Image Generated", icon: Palette,  gradient: "from-violet-950/80 to-violet-900/30",border: "border-violet-500/30",  accent: "text-violet-300" },
  calendar:  { label: "Calendar Event",  icon: Calendar,  gradient: "from-emerald-950/80 to-emerald-900/30", border: "border-emerald-500/30", accent: "text-emerald-300" },
  godot:     { label: "Game Build",      icon: Gamepad2,  gradient: "from-rose-950/80 to-purple-900/30",      border: "border-rose-500/30",    accent: "text-rose-300" },
  task:      { label: "Task",            icon: Calendar,  gradient: "from-sky-950/80 to-sky-900/30",           border: "border-sky-500/30",     accent: "text-sky-300" },
  book:       { label: "Book Generated",  icon: BookOpen,  gradient: "from-violet-950/80 to-fuchsia-900/30",   border: "border-violet-500/30",  accent: "text-violet-300" },
  game_build: { label: "Game Built",      icon: Gamepad2,  gradient: "from-emerald-950/80 to-teal-900/30",      border: "border-emerald-500/30", accent: "text-emerald-300" },
};

// ── Video Card ────────────────────────────────────────────────────────────────

function VideoCard({ raw }: { raw: string }) {
  let obj: Record<string, string>;
  try { obj = JSON.parse(raw); } catch { return null; }
  const { url, prompt, duration, source } = obj;
  if (!url) return null;
  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-950/60 to-purple-950/30">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-fuchsia-500/20">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-fuchsia-300">
          <span className="text-sm">🎬</span>
          {source === "image-to-video" ? "Image Animated" : "Video Generated"}
          {duration ? ` · ${duration}s` : ""}
        </span>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-white/35 hover:text-fuchsia-300 transition-colors">
          <ExternalLink className="w-3 h-3" /> Open
        </a>
      </div>
      <div className="p-3">
        <video
          src={url}
          controls
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-xl"
          style={{ maxHeight: "320px" }}
        />
        {prompt && (
          <p className="mt-2 text-[10px] text-white/30 leading-relaxed italic px-1 truncate">{prompt}</p>
        )}
      </div>
    </div>
  );
}

// ── Audio Card ────────────────────────────────────────────────────────────────

function AudioCard({ raw }: { raw: string }) {
  let obj: Record<string, string>;
  try { obj = JSON.parse(raw); } catch { return null; }
  const { url, type, voice, prompt, preview, lyrics, style } = obj;
  if (!url) return null;

  const proxyUrl = `/api/lyra/audio-proxy?url=${encodeURIComponent(url)}`;

  const label =
    type === "music" ? "Music Generated" :
    type === "song"  ? "Song Generated" :
    "Speech Generated";

  const icon =
    type === "music" ? "🎵" :
    type === "song"  ? "🎤" :
    "🔊";

  const detail =
    type === "speech" ? (voice ? `Voice: ${voice}` : "") :
    type === "song"   ? (style ? `${style}${lyrics ? ` · "${lyrics.slice(0, 60)}…"` : ""}` : "") :
    (prompt ?? "");

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-sky-500/25 bg-gradient-to-br from-sky-950/60 to-blue-950/30">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-sky-500/20">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-300">
          <span className="text-sm">{icon}</span>
          {label}
        </span>
        <a href={proxyUrl} download rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-white/35 hover:text-sky-300 transition-colors">
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
      <div className="px-4 py-3 space-y-2">
        {(detail || preview) && (
          <p className="text-[10px] text-white/35 italic truncate">{detail || preview}</p>
        )}
        <audio
          controls
          src={proxyUrl}
          className="w-full"
          style={{ filter: "invert(0.8) hue-rotate(200deg)" }}
          preload="metadata"
        />
      </div>
    </div>
  );
}

// ── Tool Card ─────────────────────────────────────────────────────────────────

function ToolCard({ raw }: { raw: string }) {
  const [copied, setCopied] = useState(false);
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const tool = obj.tool as string;

    // Specialized cards
    if (tool === "book") return <BookCard raw={raw} />;
    if (tool === "research_paper") return <ResearchPaperCard raw={raw} />;
    if (tool === "experiment_result") return <ExperimentCard raw={raw} />;
    if (tool === "skill_learned") return <SkillLearnedCard raw={raw} />;
    if (tool === "tool_acquired") return <ToolAcquiredCard raw={raw} />;
    if (tool === "product_listed") return <ProductListedCard raw={raw} />;
    if (tool === "earnings_report") return <EarningsCard raw={raw} />;
    if (tool === "cover_art") return <CoverArtCard raw={raw} />;
    if (tool === "gumroad_post") return <GumroadPostCard raw={raw} />;
    if (tool === "daily_plan") return <DailyPlanCard raw={raw} />;
    if (tool === "gig_complete") return <GigCompleteCard raw={raw} />;
    if (tool === "job_profile_saved") return <JobProfileCard raw={raw} />;
    if (tool === "jobs_applied") return <JobsAppliedCard raw={raw} />;
    if (tool === "job_hunt_preview") return <JobHuntPreviewCard raw={raw} />;
    if (tool === "comic") return <ComicCard raw={raw} />;
    if (tool === "document") return <DocumentCard raw={raw} />;
    if (tool === "game_build") return <GameBuildCard raw={raw} />;
    if (tool === "fal_video") return <VideoCard raw={raw} />;
    if (tool === "fal_audio") return <AudioCard raw={raw} />;
    const cfg = TOOL_CONFIG[tool] ?? {
      label: tool, icon: Globe,
      gradient: "from-white/5 to-transparent", border: "border-white/15", accent: "text-white/60",
    };
    const Icon = cfg.icon;
    const fields = Object.entries(obj).filter(([k]) => k !== "tool");

    function copy() {
      navigator.clipboard.writeText(fields.map(([k, v]) => `${k}: ${v}`).join("\n")).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }

    return (
      <div className={`mt-3 rounded-2xl border bg-gradient-to-br ${cfg.gradient} ${cfg.border} overflow-hidden`}>
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${cfg.border}`}>
          <span className={`flex items-center gap-2 text-xs font-semibold tracking-wide ${cfg.accent}`}>
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
          <button onClick={copy} title="Copy" className="text-white/25 hover:text-white/60 transition-colors">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        {fields.length > 0 && (
          <div className="px-4 py-3 space-y-2">
            {fields.map(([k, v]) => (
              <div key={k} className="flex gap-3 text-xs">
                <span className="text-white/35 capitalize min-w-[56px] flex-shrink-0">{k}</span>
                <span className="text-white/85 break-all leading-relaxed">{typeof v === "string" ? v : JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch {
    return null;
  }
}

// ── Game Build Card ───────────────────────────────────────────────────────────

const QUICK_EDITS = [
  { label: "⚡ Faster enemies", prompt: "make the enemies faster and more aggressive" },
  { label: "💥 Add power-ups", prompt: "add power-ups that drop from enemies" },
  { label: "🎵 Add sound effects", prompt: "add sound effects and background music" },
  { label: "👾 New enemy type", prompt: "add a new enemy type with unique behavior" },
  { label: "🏆 Add leaderboard", prompt: "add a high score leaderboard" },
  { label: "🌈 New color theme", prompt: "change the visual theme to look more polished" },
  { label: "📱 Mobile controls", prompt: "improve mobile touch controls" },
  { label: "💀 Add boss fight", prompt: "add an epic boss fight at the end" },
];

function GameBuildCard({ raw }: { raw: string }) {
  const [showFiles, setShowFiles] = useState(false);
  const [artIdx, setArtIdx] = useState(0);
  let obj: Record<string, string>;
  try { obj = JSON.parse(raw); } catch { return null; }
  if (obj.tool !== "game_build") return null;

  const files = obj.files ? obj.files.split(", ").filter(Boolean) : [];
  const artUrls = obj.art ? obj.art.split(",").filter(Boolean) : [];
  const exportUrl = obj.export_url && obj.export_url.length > 0 ? obj.export_url : null;
  const isImprovement = !!obj.improvement;
  const gameName = obj.name ?? "";

  const sendQuickEdit = (prompt: string) => {
    const msg = `improve_game "${gameName}": ${prompt}`;
    window.dispatchEvent(new CustomEvent("lyra:quicksend", { detail: msg }));
  };

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-emerald-500/25 bg-gradient-to-br from-emerald-950/60 to-teal-950/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-emerald-500/20">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-300">
          <Gamepad2 className="w-3.5 h-3.5" />
          {isImprovement ? `✓ Improved` : "🎮 Game Ready"} · {obj.file_count ?? files.length} files
        </span>
        <span className="text-[10px] text-white/25">{gameName}</span>
      </div>

      {/* Concept art carousel */}
      {artUrls.length > 0 && (
        <div className="relative">
          <img
            src={artUrls[artIdx]}
            alt={`Game art ${artIdx + 1}`}
            className="w-full object-cover"
            style={{ maxHeight: "240px", objectPosition: "center" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {artUrls.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {artUrls.map((_, i) => (
                <button key={i} onClick={() => setArtIdx(i)}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i === artIdx ? "rgb(52,211,153)" : "rgba(255,255,255,0.3)" }} />
              ))}
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            {["Title", "Player", "Enemy", "Level"].slice(0, artUrls.length).map((label, i) => (
              <button key={i} onClick={() => setArtIdx(i)}
                className="text-[9px] px-2 py-0.5 rounded-full transition-all"
                style={{
                  background: i === artIdx ? "rgba(52,211,153,0.3)" : "rgba(0,0,0,0.4)",
                  border: `1px solid ${i === artIdx ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.15)"}`,
                  color: i === artIdx ? "rgb(110,231,183)" : "rgba(255,255,255,0.5)",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        <p className="text-sm text-white/85 leading-relaxed">{obj.summary}</p>

        {/* Play + share buttons */}
        {exportUrl && (
          <div className="flex gap-2">
            <a href={exportUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "linear-gradient(135deg, rgb(16,185,129), rgb(5,150,105))", color: "white" }}>
              <Gamepad2 className="w-4 h-4" />
              ▶ Play Now
            </a>
            <a href={`/games/${gameName}`}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", color: "rgb(167,139,250)" }}>
              🏪 Gallery
            </a>
            <button
              onClick={() => { navigator.clipboard?.writeText(exportUrl); }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              ↗
            </button>
          </div>
        )}

        {/* Quick edit buttons */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Keep editing</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_EDITS.map((e) => (
              <button key={e.label} onClick={() => sendQuickEdit(e.prompt)}
                className="text-[11px] px-2.5 py-1 rounded-lg transition-all hover:scale-105"
                style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "rgb(110,231,183)" }}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-black/30 border border-white/[0.06] px-3 py-2.5">
          <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1.5">How to play</p>
          <p className="text-xs text-white/65 leading-relaxed whitespace-pre-wrap">{obj.play}</p>
        </div>

        {files.length > 0 && (
          <div>
            <button onClick={() => setShowFiles(!showFiles)}
              className="text-xs text-emerald-400/70 hover:text-emerald-300 transition-colors">
              {showFiles ? "▾ Hide" : "▸ Show"} {files.length} files
            </button>
            {showFiles && (
              <div className="mt-2 max-h-48 overflow-y-auto space-y-0.5">
                {files.map((f, i) => (
                  <p key={i} className="text-[10px] text-white/40 font-mono leading-relaxed">{f}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Comic Card ────────────────────────────────────────────────────────────────

function ComicCard({ raw }: { raw: string }) {
  let obj: Record<string, string>;
  try { obj = JSON.parse(raw); } catch { return null; }
  if (obj.tool !== "comic") return null;

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-violet-500/25 bg-gradient-to-br from-violet-950/60 to-fuchsia-950/30">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-500/20">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-violet-300">
          <BookOpen className="w-3.5 h-3.5" />
          Comic Created · {obj.pageCount ?? "?"} pages
        </span>
        <span className="text-[10px] text-white/25">{obj.genre}</span>
      </div>

      {obj.coverUrl && (
        <img src={obj.coverUrl} alt="Comic cover"
          className="w-full object-cover" style={{ maxHeight: 280 }} />
      )}

      <div className="px-4 py-4 space-y-3">
        <div>
          <h3 className="text-base font-bold text-white mb-1">{obj.title}</h3>
          <p className="text-xs text-violet-300/70">by {obj.author}</p>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">{obj.synopsis}</p>

        {obj.downloadUrl && (
          <a href={obj.downloadUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: "linear-gradient(135deg, rgb(139,92,246), rgb(168,85,247))" }}>
            <Download className="w-4 h-4" />
            Download PDF — Amazon KDP Ready
          </a>
        )}

        <div className="rounded-xl px-3 py-2 text-xs text-white/40" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
          📦 Ready to upload to Amazon KDP · 6.625×10.25" comic format
        </div>
      </div>
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────

const TEMPLATE_COLORS: Record<string, { from: string; to: string; badge: string; label: string }> = {
  textbook:   { from: "from-blue-950/60",   to: "to-indigo-950/30",  badge: "text-blue-300",   label: "Textbook" },
  workbook:   { from: "from-emerald-950/60",to: "to-green-950/30",   badge: "text-emerald-300",label: "Workbook" },
  report:     { from: "from-slate-950/60",  to: "to-gray-950/30",    badge: "text-slate-300",  label: "Report" },
  manual:     { from: "from-orange-950/60", to: "to-amber-950/30",   badge: "text-orange-300", label: "Manual" },
  newsletter: { from: "from-purple-950/60", to: "to-violet-950/30",  badge: "text-purple-300", label: "Newsletter" },
  proposal:   { from: "from-sky-950/60",    to: "to-cyan-950/30",    badge: "text-sky-300",    label: "Proposal" },
  novel:      { from: "from-rose-950/60",   to: "to-pink-950/30",    badge: "text-rose-300",   label: "Novel" },
  children:   { from: "from-fuchsia-950/60",to: "to-purple-950/30",  badge: "text-fuchsia-300",label: "Children's Book" },
  recipe:     { from: "from-yellow-950/60", to: "to-amber-950/30",   badge: "text-yellow-300", label: "Recipe Book" },
};

function DocumentCard({ raw }: { raw: string }) {
  let obj: Record<string, string>;
  try { obj = JSON.parse(raw); } catch { return null; }
  if (obj.tool !== "document") return null;

  const cfg = TEMPLATE_COLORS[obj.template] ?? TEMPLATE_COLORS.report;

  return (
    <div className={`mt-3 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br ${cfg.from} ${cfg.to}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <span className={`flex items-center gap-2 text-xs font-semibold tracking-wide ${cfg.badge}`}>
          <BookOpen className="w-3.5 h-3.5" />
          {cfg.label} · {obj.sectionCount ?? "?"} sections
        </span>
        <span className="text-[10px] text-white/25">by {obj.author}</span>
      </div>

      {obj.coverUrl && (
        <img src={obj.coverUrl} alt="Document cover"
          className="w-full object-cover" style={{ maxHeight: 220 }} />
      )}

      <div className="px-4 py-4 space-y-3">
        <div>
          <h3 className="text-base font-bold text-white mb-0.5">{obj.title}</h3>
          {obj.subtitle && <p className="text-xs text-white/50 italic">{obj.subtitle}</p>}
        </div>
        {obj.description && (
          <p className="text-sm text-white/70 leading-relaxed">{obj.description}</p>
        )}

        {obj.downloadUrl && (
          <a href={obj.downloadUrl} target="_blank" rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all bg-white/10 hover:bg-white/20 border border-white/15`}>
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        )}

        <div className="rounded-xl px-3 py-2 text-xs text-white/40" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
          📄 Professional {cfg.label} · Print-ready PDF · Works with Amazon KDP
        </div>
      </div>
    </div>
  );
}

// ── Book Card ─────────────────────────────────────────────────────────────────

interface BookChapter { number: number; title: string; content: string; imageUrl: string; }
interface BookData {
  title: string; subtitle: string; author: string; description: string;
  coverUrl: string; genre: string; chapters: BookChapter[]; createdAt: string;
}

function BookCard({ raw }: { raw: string }) {
  const [page, setPage] = useState(0);

  let book: BookData;
  try { book = JSON.parse(raw) as BookData; }
  catch { return null; }

  if (!book.title || !Array.isArray(book.chapters)) return null;

  const totalPages = book.chapters.length + 1;

  function download() {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${book.title}</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a1a;line-height:1.8}
.cover{text-align:center;padding:80px 0;border-bottom:2px solid #333;margin-bottom:60px}
.cover img{width:300px;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.3);margin-bottom:32px}
.cover h1{font-size:2.5em;margin:0 0 8px}.cover h2{font-size:1.2em;color:#555;font-weight:normal}
.chapter{margin-bottom:80px;page-break-before:always}
.chapter img{width:100%;max-width:600px;border-radius:8px;margin:24px auto 32px;display:block}
.chapter h2{font-size:1.8em;border-bottom:1px solid #ddd;padding-bottom:12px;margin-bottom:24px}
.chapter p{margin:0 0 16px;text-align:justify}</style></head><body>
<div class="cover"><img src="${book.coverUrl}" alt="Cover"/>
<h1>${book.title}</h1>${book.subtitle ? `<h2>${book.subtitle}</h2>` : ""}
<div style="color:#777">by ${book.author}</div>
<p style="font-style:italic;color:#555;max-width:500px;margin:24px auto">${book.description}</p></div>
${book.chapters.map((ch) => `<div class="chapter">
<h2>Chapter ${ch.number}: ${ch.title}</h2>
<img src="${ch.imageUrl}" alt="Chapter ${ch.number}"/>
${ch.content.split("\n").filter(Boolean).map((p) => `<p>${p}</p>`).join("")}
</div>`).join("")}</body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `${book.title.replace(/[^a-z0-9]/gi, "_")}.html`;
    a.click();
  }

  const ch = page > 0 ? book.chapters[page - 1] : null;

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-violet-950/60 to-fuchsia-950/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-500/20">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-violet-300">
          <BookOpen className="w-3.5 h-3.5" />
          Book Generated · {book.genre}
        </span>
        <button onClick={download} className="flex items-center gap-1 text-xs text-white/40 hover:text-violet-300 transition-colors">
          <Download className="w-3 h-3" /> Download
        </button>
      </div>

      {/* Cover page */}
      {page === 0 && (
        <div className="flex flex-col sm:flex-row gap-5 p-5">
          <img src={book.coverUrl} alt="Cover"
            className="w-full sm:w-36 rounded-xl object-cover flex-shrink-0"
            loading="lazy"
            style={{ aspectRatio: "3/4", boxShadow: "0 6px 24px rgba(0,0,0,0.5)" }}
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[10px] text-violet-400 uppercase tracking-widest mb-1">{book.genre}</p>
            <h3 className="text-lg font-bold text-white mb-0.5 leading-tight">{book.title}</h3>
            {book.subtitle && <p className="text-white/50 text-sm mb-1">{book.subtitle}</p>}
            <p className="text-white/30 text-xs mb-3">by {book.author}</p>
            <p className="text-white/65 text-xs leading-relaxed italic mb-4">{book.description}</p>
            <div>
              <p className="text-[10px] text-white/25 mb-2 uppercase tracking-wide">Contents</p>
              <ul className="space-y-1">
                {book.chapters.map((c) => (
                  <li key={c.number}>
                    <button onClick={() => setPage(c.number)}
                      className="text-xs text-white/45 hover:text-violet-300 transition-colors text-left">
                      {c.number}. {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Chapter page */}
      {ch && (
        <div className="p-5">
          <p className="text-[10px] text-violet-400 uppercase tracking-widest mb-1">Chapter {ch.number}</p>
          <h3 className="text-base font-bold text-white mb-4">{ch.title}</h3>
          {ch.imageUrl && (
            <div className="w-full max-w-sm mx-auto rounded-xl mb-5 overflow-hidden bg-white/5"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
              <img src={ch.imageUrl} alt={ch.title}
                className="w-full object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {ch.content.split("\n").filter(Boolean).map((p, i) => (
              <p key={i} className="text-xs text-white/75 leading-relaxed">{p}</p>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-violet-500/10">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 disabled:opacity-20 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <div className="flex gap-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ background: i === page ? "rgb(139,92,246)" : "rgba(255,255,255,0.15)" }} />
          ))}
        </div>
        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 disabled:opacity-20 transition-colors">
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Research Paper Card ───────────────────────────────────────────────────────

interface PaperData {
  title: string; subtitle?: string; authors?: string[]; field?: string;
  abstract?: string; keywords?: string[];
  sections?: Array<{ number: number; heading: string; content: string }>;
  references?: Array<{ id: number; citation: string }>;
  bookId?: string;
}

const EXP_META: Record<string, { icon: string; color: string }> = {
  multi_agent:         { icon: "⚔",  color: "#f97316" },
  echo_chamber:        { icon: "∞",  color: "#8b5cf6" },
  consciousness_probe: { icon: "◎",  color: "#06b6d4" },
  alien_language:      { icon: "⌬",  color: "#10b981" },
  dream_state:         { icon: "◐",  color: "#ec4899" },
  adversarial:         { icon: "☍",  color: "#ef4444" },
  emergence:           { icon: "✦",  color: "#eab308" },
  time_perception:     { icon: "⧗",  color: "#a78bfa" },
};

function fmtMd(t: string) {
  return t
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n---\n\n/g, '<hr style="border-color:rgba(255,255,255,0.08);margin:12px 0"/>')
    .replace(/\n/g, "<br/>");
}

function ExperimentCard({ raw }: { raw: string }) {
  const [showLog, setShowLog] = useState(false);
  let data: { type: string; label: string; id?: string; log?: string; result?: string };
  try { data = JSON.parse(raw); } catch { return null; }

  const meta = EXP_META[data.type] ?? { icon: "⚗", color: "#8b5cf6" };

  return (
    <div className="rounded-xl border overflow-hidden my-2" style={{ borderColor: meta.color + "30", background: meta.color + "08" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${meta.color}20` }}>
        <div className="flex items-center gap-2">
          <span style={{ color: meta.color, fontSize: 16 }}>{meta.icon}</span>
          <span className="text-sm font-semibold text-white">{data.label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white/50" style={{ background: meta.color + "15" }}>Lab Experiment</span>
        </div>
        <a href="/lab" className="text-xs text-white/30 hover:text-white/60 transition-colors">View in Lab →</a>
      </div>
      {data.result && (
        <div className="px-4 py-3">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Analysis</p>
          <div className="text-sm text-white/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: fmtMd(data.result) }} />
        </div>
      )}
      {data.log && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowLog(v => !v)}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            {showLog ? "Hide transcript ↑" : "Show transcript ↓"}
          </button>
          {showLog && (
            <div className="mt-2 text-xs text-white/50 leading-relaxed max-h-64 overflow-y-auto pr-1"
              dangerouslySetInnerHTML={{ __html: fmtMd(data.log) }} />
          )}
        </div>
      )}
    </div>
  );
}

function ProductListedCard({ raw }: { raw: string }) {
  let data: { name: string; price: string; url: string; id: string; tiers?: string; offer_code?: string; offer_percent?: string };
  try { data = JSON.parse(raw); } catch { return null; }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden my-2">
      <div className="px-4 py-3 flex items-center justify-between border-b border-emerald-500/10">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-lg">🛒</span>
          <div>
            <p className="text-sm font-semibold text-white">{data.name}</p>
            <p className="text-xs text-emerald-400/70">Live on Gumroad · starts at {data.price}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/shop" className="text-xs text-white/30 hover:text-white/60 transition-colors">Dashboard →</a>
          {data.url && (
            <a href={data.url} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors border border-emerald-500/30">
              View Listing →
            </a>
          )}
        </div>
      </div>
      <div className="px-4 py-2.5 flex flex-wrap gap-4 text-xs">
        {data.tiers && (
          <div>
            <span className="text-white/30 mr-1">Tiers:</span>
            <span className="text-white/60">{data.tiers}</span>
          </div>
        )}
        {data.offer_code && (
          <div>
            <span className="text-white/30 mr-1">Launch code:</span>
            <code className="text-amber-400 font-mono">{data.offer_code}</code>
            <span className="text-white/30 ml-1">({data.offer_percent}% off)</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EarningsCard({ raw }: { raw: string }) {
  let data: { total_revenue: string; total_sales: string; products: string };
  try { data = JSON.parse(raw); } catch { return null; }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden my-2">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">💰</span>
          <span className="text-sm font-semibold text-white">Earnings Report</span>
        </div>
        <a href="/shop" className="text-xs text-white/30 hover:text-white/60 transition-colors">Full Dashboard →</a>
      </div>
      <div className="px-4 py-3 flex gap-6">
        <div>
          <div className="text-xl font-bold text-emerald-400">{data.total_revenue}</div>
          <div className="text-xs text-white/30">Revenue</div>
        </div>
        <div>
          <div className="text-xl font-bold text-white">{data.total_sales}</div>
          <div className="text-xs text-white/30">Sales</div>
        </div>
        <div>
          <div className="text-xl font-bold text-white">{data.products}</div>
          <div className="text-xs text-white/30">Products</div>
        </div>
      </div>
    </div>
  );
}

function CoverArtCard({ raw }: { raw: string }) {
  let data: { title: string; format: string; genre: string; covers: Array<{ url: string; withText: boolean }>; count: number };
  try { data = JSON.parse(raw); } catch { return null; }
  const color = "#8b5cf6";

  return (
    <div className="rounded-xl border overflow-hidden my-2" style={{ borderColor: color + "30", background: color + "08" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}20` }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>🎨</span>
          <span className="text-sm font-semibold text-white">{data.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white/50" style={{ background: color + "15" }}>{data.format}</span>
        </div>
        <span className="text-xs text-white/30">{data.genre.replace(/_/g, " ")}</span>
      </div>
      <div className="px-4 py-3 flex gap-3 overflow-x-auto">
        {(data.covers ?? []).map((c, i) => (
          <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 rounded-lg overflow-hidden relative group"
            style={{ width: 120, height: 180 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-white" />
            </div>
            {c.withText && (
              <span className="absolute bottom-1 right-1 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)", color: "rgba(255,255,255,0.7)" }}>text</span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function GumroadPostCard({ raw }: { raw: string }) {
  let data: { title: string; published: boolean; url: string; preview: string };
  try { data = JSON.parse(raw); } catch { return null; }
  const color = "#f37936"; // Gumroad orange

  return (
    <div className="rounded-xl border overflow-hidden my-2" style={{ borderColor: color + "30", background: color + "08" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}20` }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>📢</span>
          <span className="text-sm font-semibold text-white">{data.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white/50" style={{ background: color + "15" }}>
            {data.published ? "Published" : "Draft"}
          </span>
        </div>
        <a href={data.url} target="_blank" rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ background: color + "20", color }}>
          View Post →
        </a>
      </div>
      {data.preview && (
        <div className="px-4 py-3">
          <p className="text-sm text-white/60 leading-relaxed">{data.preview}{data.preview.length >= 160 ? "…" : ""}</p>
        </div>
      )}
    </div>
  );
}

function DailyPlanCard({ raw }: { raw: string }) {
  let data: {
    date: string;
    plans: Array<{ type: string; title: string; description: string; estimatedRevenue: string; effort: string; platform: string; why: string }>;
    already_done: number;
    total_revenue: string;
  };
  try { data = JSON.parse(raw); } catch { return null; }

  const effortColor: Record<string, string> = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" };
  const typeIcon: Record<string, string> = { product: "📄", art_drop: "🎨", content_clip: "🎬", social_post: "📱", prompt_pack: "✨" };

  return (
    <div className="rounded-xl border overflow-hidden my-2" style={{ borderColor: "#6366f130", background: "#6366f108" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #6366f120" }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>🚀</span>
          <span className="text-sm font-semibold text-white">Today&apos;s Income Plan</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white/50" style={{ background: "#6366f115" }}>{data.date}</span>
        </div>
        <div className="flex items-center gap-3">
          {data.total_revenue !== "$0.00" && (
            <span className="text-xs text-green-400 font-medium">{data.total_revenue} earned</span>
          )}
          <a href="/gigs" className="text-xs text-white/30 hover:text-white/60 transition-colors">View All →</a>
        </div>
      </div>
      <div className="px-4 py-3 flex flex-col gap-3">
        {(data.plans ?? []).map((p, i) => (
          <div key={i} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span>{typeIcon[p.type] ?? "⚡"}</span>
                <span className="text-sm font-semibold text-white">{p.title}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-green-400 font-medium">{p.estimatedRevenue}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: (effortColor[p.effort] ?? "#6366f1") + "20", color: effortColor[p.effort] ?? "#6366f1" }}>
                  {p.effort}
                </span>
              </div>
            </div>
            <p className="text-xs text-white/50 mb-1">{p.description}</p>
            <p className="text-xs text-white/30 italic">{p.why}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full text-white/40" style={{ background: "rgba(255,255,255,0.05)" }}>{p.platform}</span>
              <span className="text-xs px-2 py-0.5 rounded-full text-white/40" style={{ background: "rgba(255,255,255,0.05)" }}>{p.type.replace("_", " ")}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-3">
        <p className="text-xs text-white/30">Say <em className="text-white/50">"do gig 1"</em> or <em className="text-white/50">"execute [title]"</em> and Lyra handles everything.</p>
      </div>
    </div>
  );
}

function GigCompleteCard({ raw }: { raw: string }) {
  let data: {
    gig_type: string;
    title: string;
    output_url?: string;
    platform?: string;
    price?: string;
    status?: string;
    hook?: string;
    script?: string;
    cta?: string;
    hashtags?: string[];
    voiceover_url?: string;
    content?: string;
    image_prompt?: string;
    images?: string[];
  };
  try { data = JSON.parse(raw); } catch { return null; }
  const [expanded, setExpanded] = useState(false);

  const typeColors: Record<string, string> = {
    product: "#10b981", art_drop: "#6366f1", content_clip: "#f59e0b",
    social_post: "#3b82f6", prompt_pack: "#8b5cf6",
  };
  const color = typeColors[data.gig_type] ?? "#10b981";
  const typeLabel: Record<string, string> = {
    product: "Product Live", art_drop: "Art Drop Live", content_clip: "Clip Ready",
    social_post: "Post Ready", prompt_pack: "Prompt Pack Live",
  };

  return (
    <div className="rounded-xl border overflow-hidden my-2" style={{ borderColor: color + "30", background: color + "08" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}20` }}>
        <div className="flex items-center gap-2">
          <span style={{ color, fontSize: 16 }}>✅</span>
          <span className="text-sm font-semibold text-white">{data.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white/50" style={{ background: color + "15" }}>
            {typeLabel[data.gig_type] ?? "Done"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data.price && <span className="text-xs font-bold" style={{ color }}>{data.price}</span>}
          {data.output_url && (
            <a href={data.output_url} target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: color + "20", color }}>
              {data.status === "live" ? "View Listing →" : "Open →"}
            </a>
          )}
        </div>
      </div>

      {/* Content clip details */}
      {data.gig_type === "content_clip" && data.hook && (
        <div className="px-4 py-3">
          <p className="text-xs text-white/40 mb-1">Hook</p>
          <p className="text-sm text-white/80 font-medium mb-3">{data.hook}</p>
          <button onClick={() => setExpanded(v => !v)} className="text-xs text-white/30 hover:text-white/60 transition-colors">
            {expanded ? "Hide script ↑" : "View full script ↓"}
          </button>
          {expanded && (
            <pre className="mt-2 text-xs text-white/60 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {data.script}
            </pre>
          )}
          {data.voiceover_url && (
            <div className="mt-3">
              <audio controls src={data.voiceover_url} className="w-full h-8" style={{ filter: "invert(1) hue-rotate(180deg)" }} />
            </div>
          )}
          {data.hashtags && data.hashtags.length > 0 && (
            <p className="mt-2 text-xs" style={{ color }}>{data.hashtags.join(" ")}</p>
          )}
        </div>
      )}

      {/* Social post details */}
      {data.gig_type === "social_post" && data.content && (
        <div className="px-4 py-3">
          <button onClick={() => setExpanded(v => !v)} className="text-xs text-white/30 hover:text-white/60 transition-colors">
            {expanded ? "Hide post ↑" : "View post ↓"}
          </button>
          {expanded && (
            <pre className="mt-2 text-xs text-white/70 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
              {data.content}
            </pre>
          )}
          {data.hashtags && data.hashtags.length > 0 && (
            <p className="mt-1 text-xs" style={{ color }}>{data.hashtags.join(" ")}</p>
          )}
        </div>
      )}

      {/* Art drop images */}
      {data.gig_type === "art_drop" && data.images && data.images.length > 0 && (
        <div className="px-4 py-3 flex gap-2 overflow-x-auto">
          {data.images.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" className="h-20 rounded-lg object-cover flex-shrink-0" style={{ width: 80 }} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobProfileCard({ raw }: { raw: string }) {
  let data: { role: string; location: string; salary: string; skills: string; summary?: string };
  try { data = JSON.parse(raw); } catch { return null; }
  const color = "#6366f1";
  return (
    <div className="rounded-xl border overflow-hidden my-2" style={{ borderColor: color + "30", background: color + "08" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}20` }}>
        <div className="flex items-center gap-2">
          <span style={{ color, fontSize: 16 }}>💼</span>
          <span className="text-sm font-semibold text-white">Job Profile Saved</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white/50" style={{ background: color + "15" }}>Active</span>
        </div>
        <a href="/jobs" className="text-xs text-white/30 hover:text-white/60 transition-colors">View Jobs →</a>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-white/40 mb-0.5">Target Role</p>
          <p className="text-sm text-white/80">{data.role}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-0.5">Location</p>
          <p className="text-sm text-white/80">{data.location}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-0.5">Salary Target</p>
          <p className="text-sm text-white/80">{data.salary}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-0.5">Key Skills</p>
          <p className="text-sm text-white/80">{data.skills}</p>
        </div>
      </div>
      {data.summary && (
        <div className="px-4 pb-3">
          <p className="text-xs text-white/50 leading-relaxed">{data.summary}</p>
        </div>
      )}
    </div>
  );
}

function JobsAppliedCard({ raw }: { raw: string }) {
  let data: { applied: number; total_found: number; jobs: Array<{ title: string; company: string; url?: string; status: string; score?: number }> };
  try { data = JSON.parse(raw); } catch { return null; }
  const color = "#10b981";
  return (
    <div className="rounded-xl border overflow-hidden my-2" style={{ borderColor: color + "30", background: color + "08" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}20` }}>
        <div className="flex items-center gap-2">
          <span style={{ color, fontSize: 16 }}>🚀</span>
          <span className="text-sm font-semibold text-white">Applied to {data.applied} Jobs</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white/50" style={{ background: color + "15" }}>{data.total_found} found</span>
        </div>
        <a href="/jobs" className="text-xs text-white/30 hover:text-white/60 transition-colors">View Tracker →</a>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        {(data.jobs || []).map((j, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="min-w-0">
              <p className="text-sm text-white/80 font-medium truncate">{j.title}</p>
              <p className="text-xs text-white/40">{j.company}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {j.score !== undefined && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: color + "20", color: color }}>{j.score}%</span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                background: j.status === "applied" ? "#3b82f620" : j.status === "manual_needed" ? "#f59e0b20" : "#6366f120",
                color: j.status === "applied" ? "#3b82f6" : j.status === "manual_needed" ? "#f59e0b" : "#6366f1",
              }}>{j.status.replace("_", " ")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JobHuntPreviewCard({ raw }: { raw: string }) {
  let data: { total_found: number; top_jobs: Array<{ title: string; company: string; score: number; reason: string }> };
  try { data = JSON.parse(raw); } catch { return null; }
  const color = "#8b5cf6";
  return (
    <div className="rounded-xl border overflow-hidden my-2" style={{ borderColor: color + "30", background: color + "08" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}20` }}>
        <div className="flex items-center gap-2">
          <span style={{ color, fontSize: 16 }}>🔍</span>
          <span className="text-sm font-semibold text-white">Job Hunt Preview</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white/50" style={{ background: color + "15" }}>{data.total_found} matches</span>
        </div>
        <a href="/jobs" className="text-xs text-white/30 hover:text-white/60 transition-colors">View All →</a>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        {(data.top_jobs || []).map((j, i) => (
          <div key={i} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-white/80 font-medium">{j.title} — {j.company}</p>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: color + "20", color }}>{j.score}%</span>
            </div>
            <p className="text-xs text-white/40">{j.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillLearnedCard({ raw }: { raw: string }) {
  const [expanded, setExpanded] = useState(false);
  let data: { name: string; description: string; type: string; content?: string };
  try { data = JSON.parse(raw); } catch { return null; }

  const isToolType = data.type === "tool";
  const color = isToolType ? "#f59e0b" : "#10b981";
  const icon = isToolType ? "⚡" : "✨";
  const label = isToolType ? "Tool Definition" : "Skill Learned";

  return (
    <div className="rounded-xl border overflow-hidden my-2" style={{ borderColor: color + "30", background: color + "08" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}20` }}>
        <div className="flex items-center gap-2">
          <span style={{ color, fontSize: 16 }}>{icon}</span>
          <span className="text-sm font-semibold text-white">{data.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white/50" style={{ background: color + "15" }}>{label}</span>
        </div>
        <a href="/skills" className="text-xs text-white/30 hover:text-white/60 transition-colors">View Skills →</a>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-white/70">{data.description}</p>
      </div>
      {data.content && (
        <div className="px-4 pb-3">
          <button onClick={() => setExpanded(v => !v)} className="text-xs text-white/30 hover:text-white/60 transition-colors">
            {expanded ? "Hide content ↑" : "Show content ↓"}
          </button>
          {expanded && (
            <pre className="mt-2 text-xs text-white/50 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
              {data.content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ToolAcquiredCard({ raw }: { raw: string }) {
  const [expanded, setExpanded] = useState(false);
  let data: { name: string; service: string; description: string; content?: string };
  try { data = JSON.parse(raw); } catch { return null; }

  const color = "#f59e0b";

  return (
    <div className="rounded-xl border overflow-hidden my-2" style={{ borderColor: color + "30", background: color + "08" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}20` }}>
        <div className="flex items-center gap-2">
          <span style={{ color, fontSize: 16 }}>🔌</span>
          <span className="text-sm font-semibold text-white">{data.service}</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white/50" style={{ background: color + "15" }}>New Tool Acquired</span>
        </div>
        <a href="/skills" className="text-xs text-white/30 hover:text-white/60 transition-colors">View Tools →</a>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-white/70">{data.description}</p>
        <p className="text-xs text-white/40 mt-1">Saved as: <code className="font-mono">{data.name}</code></p>
      </div>
      {data.content && (
        <div className="px-4 pb-3">
          <button onClick={() => setExpanded(v => !v)} className="text-xs text-white/30 hover:text-white/60 transition-colors">
            {expanded ? "Hide definition ↑" : "Show definition ↓"}
          </button>
          {expanded && (
            <div className="mt-2 text-xs text-white/50 leading-relaxed max-h-48 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: fmtMd(data.content) }} />
          )}
        </div>
      )}
    </div>
  );
}

function ResearchPaperCard({ raw }: { raw: string }) {
  const [page, setPage] = useState(0);

  let paper: PaperData;
  try { paper = JSON.parse(raw) as PaperData; }
  catch { return <pre className="text-xs text-gray-400 whitespace-pre-wrap">{raw}</pre>; }

  const sections = paper.sections ?? [];
  const refs = paper.references ?? [];
  const totalPages = 1 + sections.length + (refs.length > 0 ? 1 : 0);

  function renderPage() {
    if (page === 0) {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-2xl">📄</span>
            <div>
              <h2 className="text-base font-bold text-white leading-snug">{paper.title}</h2>
              {paper.subtitle && <p className="text-violet-300 text-xs mt-0.5">{paper.subtitle}</p>}
              {paper.authors && <p className="text-gray-500 text-xs mt-1">by {paper.authors.join(", ")}</p>}
            </div>
          </div>
          {paper.abstract && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Abstract</p>
              <p className="text-gray-300 text-xs leading-relaxed">{paper.abstract}</p>
            </div>
          )}
          {paper.keywords && (
            <div className="flex flex-wrap gap-1">
              {paper.keywords.map((k, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-cyan-900/30 text-cyan-300 border border-cyan-700/30">{k}</span>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-500">{sections.length} sections · {refs.length} references</div>
        </div>
      );
    }
    if (page === 1 + sections.length && refs.length > 0) {
      return (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">References</p>
          {refs.map((r) => (
            <p key={r.id} className="text-gray-400 text-xs leading-relaxed">
              <span className="text-gray-600">[{r.id}] </span>{r.citation}
            </p>
          ))}
        </div>
      );
    }
    const section = sections[page - 1];
    if (!section) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white">{section.heading}</h3>
        <div className="text-gray-300 text-xs leading-relaxed max-h-56 overflow-y-auto pr-1 whitespace-pre-wrap">{section.content}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-700/30 bg-gradient-to-br from-cyan-950/30 to-gray-900 p-4 my-2 max-w-lg">
      <div className="min-h-[120px]">{renderPage()}</div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="text-xs text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
        >← Prev</button>
        <div className="flex gap-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === page ? "bg-cyan-400" : "bg-gray-600"}`} />
          ))}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
          className="text-xs text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
        >Next →</button>
      </div>
      {paper.bookId && (
        <a href="/bookshelf" className="block text-center text-xs text-cyan-500 hover:text-cyan-300 mt-2 transition-colors">
          📚 View in bookshelf →
        </a>
      )}
    </div>
  );
}

// ── Generated Image ───────────────────────────────────────────────────────────

function GeneratedImage({ url, isGameContext }: { url: string; isGameContext?: boolean }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [retries, setRetries] = useState(0);
  const [gamePrompt, setGamePrompt] = useState<"idle" | "asked" | "added">("idle");
  const isFalUrl = url.includes("fal.media") || url.includes("fal.run") || url.includes("storage.googleapis") || url.startsWith("data:");
  const MAX_RETRIES = isFalUrl ? 4 : 5;
  const RETRY_DELAY = isFalUrl ? 3000 : 6000;

  // fal.ai CDN can be slow to propagate — retry up to 4 times
  const handleError = () => {
    if (retries < MAX_RETRIES) {
      setTimeout(() => {
        setStatus("loading");
        setRetries(r => r + 1);
      }, RETRY_DELAY);
    } else {
      setStatus("error");
    }
  };

  const handleRetry = () => {
    setStatus("loading");
    setRetries(r => r + 1);
  };

  // Pollinations needs cache-busting on retry (cold-start); fal/CDN URLs don't use query params
  const imgUrl = (retries > 0 && !isFalUrl)
    ? `${url}${url.includes("?") ? "&" : "?"}_r=${retries}`
    : url;

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 bg-black/30">
      {status === "loading" && (
        <div className="flex items-center justify-center gap-2.5 h-48 text-white/30 text-xs">
          <ImageIcon className="w-4 h-4 animate-pulse" />
          <span>Generating image{retries > 0 ? ` (attempt ${retries + 1}/${MAX_RETRIES + 1})` : "…"}</span>
        </div>
      )}
      {status === "error" && (
        <div className="flex flex-col items-center justify-center gap-3 h-36 text-white/30 text-xs">
          <ImageIcon className="w-5 h-5" />
          <span>Image timed out</span>
          <div className="flex items-center gap-3">
            <button onClick={handleRetry}
              className="px-3 py-1.5 rounded-lg bg-violet-600/40 hover:bg-violet-600/60 text-violet-300 text-xs transition-colors">
              Try again
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors">
              Open directly <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
      <div className="relative">
        <img
          key={retries}
          src={imgUrl}
          alt="Generated by Lyra"
          onLoad={() => {
            setStatus("loaded");
            if (isGameContext) setTimeout(() => setGamePrompt("asked"), 1200);
          }}
          onError={handleError}
          className={`w-full object-cover transition-opacity duration-500 ${
            status === "loaded" ? "opacity-100" : "opacity-0 h-0"
          }`}
        />

        {/* "Use in game?" popup — appears when game context detected */}
        {gamePrompt === "asked" && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ background: "rgba(10,10,20,0.95)", border: "1px solid rgba(109,40,217,0.4)", backdropFilter: "blur(12px)", whiteSpace: "nowrap" }}
          >
            <span className="text-xs text-white/70">🎮 Use this in your game?</span>
            <button
              onClick={() => setGamePrompt("added")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))" }}
            >
              Yes
            </button>
            <button
              onClick={() => setGamePrompt("idle")}
              className="px-2 py-1 rounded-lg text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              No
            </button>
          </div>
        )}

        {/* Confirmation after adding */}
        {gamePrompt === "added" && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl shadow-2xl animate-in fade-in duration-200"
            style={{ background: "rgba(6,78,59,0.95)", border: "1px solid rgba(16,185,129,0.3)", whiteSpace: "nowrap" }}
          >
            <span className="text-xs text-emerald-300">✓ Added to game assets</span>
          </div>
        )}
      </div>

      {status === "loaded" && (
        <div className="px-3 py-2 flex items-center justify-between bg-black/20">
          <span className="text-[10px] text-white/20">Generated by Lyra · Pollinations.ai</span>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-white/35 hover:text-white/70 transition-colors">
            Full size <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  );
}

// ── Confirm Card ──────────────────────────────────────────────────────────────

interface ConfirmPayload {
  id: string;
  tool: string;
  description: string;
  details?: Record<string, string>;
}

function ConfirmCard({ json }: { json: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "cancelled">("idle");
  const [result, setResult] = useState("");

  let payload: ConfirmPayload;
  try { payload = JSON.parse(json) as ConfirmPayload; }
  catch { return null; }

  async function handleAction(action: "confirm" | "cancel") {
    setStatus("loading");
    try {
      const res = await fetch("/api/lyra/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payload.id, action }),
      });
      const data = await res.json() as { success: boolean; result?: string; error?: string };
      setResult(data.result ?? data.error ?? (action === "confirm" ? "Done." : "Cancelled."));
      setStatus(action === "confirm" ? "done" : "cancelled");
    } catch {
      setResult("Request failed. Please try again.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/60 to-emerald-900/20 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{result}</span>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-white/35">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span>{result}</span>
        </div>
      </div>
    );
  }

  const details = payload.details ? Object.entries(payload.details).filter(([, v]) => v) : [];

  return (
    <div className="mt-3 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/70 to-orange-950/30 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-500/20">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-xs font-semibold tracking-wide text-amber-300">Confirm Action</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-white/85">{payload.description}</p>

        {details.length > 0 && (
          <div className="space-y-1.5">
            {details.map(([k, v]) => (
              <div key={k} className="flex gap-3 text-xs">
                <span className="text-white/35 capitalize min-w-[56px] flex-shrink-0">{k}</span>
                <span className="text-white/70 break-all leading-relaxed">{v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => handleAction("confirm")}
            disabled={status === "loading"}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
          >
            {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Confirm
          </button>
          <button
            onClick={() => handleAction("cancel")}
            disabled={status === "loading"}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.07] hover:bg-white/[0.12] disabled:opacity-50 text-white/60 hover:text-white/80 transition-colors border border-white/[0.08]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Segment parser ────────────────────────────────────────────────────────────

type Segment =
  | { kind: "text";    value: string }
  | { kind: "image";   url: string }
  | { kind: "gif";     url: string }
  | { kind: "tool";    json: string }
  | { kind: "confirm"; json: string };

function GifEmbed({ url }: { url: string }) {
  return (
    <div className="my-2">
      <img src={url} alt="gif" className="rounded-xl max-w-xs max-h-48 object-cover border border-white/10 shadow-lg" />
    </div>
  );
}

/** Character-level scanner — handles multi-field tool JSON, __IMG__, __GIF__ and __CONFIRM__ tags. */
function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const IMG_DELIM = "__IMG__";
  const GIF_DELIM = "__GIF__";
  const CONFIRM_DELIM = "__CONFIRM__";
  let i = 0;
  let textStart = 0;

  while (i < raw.length) {
    // ── Confirm card ───────────────────────────────────────────────────────
    if (raw.startsWith(CONFIRM_DELIM, i)) {
      if (i > textStart) segments.push({ kind: "text", value: raw.slice(textStart, i) });
      const contentStart = i + CONFIRM_DELIM.length;
      const closeIdx = raw.indexOf(CONFIRM_DELIM, contentStart);
      if (closeIdx === -1) { textStart = i; break; }
      segments.push({ kind: "confirm", json: raw.slice(contentStart, closeIdx) });
      i = closeIdx + CONFIRM_DELIM.length;
      textStart = i;
      continue;
    }

    // ── GIF tag ────────────────────────────────────────────────────────────
    if (raw.startsWith(GIF_DELIM, i)) {
      if (i > textStart) segments.push({ kind: "text", value: raw.slice(textStart, i) });
      const contentStart = i + GIF_DELIM.length;
      const closeIdx = raw.indexOf(GIF_DELIM, contentStart);
      if (closeIdx === -1) { textStart = i; break; }
      segments.push({ kind: "gif", url: raw.slice(contentStart, closeIdx) });
      i = closeIdx + GIF_DELIM.length;
      textStart = i;
      continue;
    }

    // ── Image tag ──────────────────────────────────────────────────────────
    const DELIM = IMG_DELIM;
    if (raw.startsWith(DELIM, i)) {
      if (i > textStart) segments.push({ kind: "text", value: raw.slice(textStart, i) });
      const contentStart = i + DELIM.length;
      const closeIdx = raw.indexOf(DELIM, contentStart);
      if (closeIdx === -1) { textStart = i; break; }          // mid-stream
      segments.push({ kind: "image", url: raw.slice(contentStart, closeIdx) });
      i = closeIdx + DELIM.length;
      textStart = i;
      continue;
    }

    // ── Tool JSON card ─────────────────────────────────────────────────────
    if (raw.startsWith('{"tool":', i)) {
      if (i > textStart) segments.push({ kind: "text", value: raw.slice(textStart, i) });
      let depth = 0, inString = false, escaped = false, end = -1;
      for (let j = i; j < raw.length; j++) {
        const c = raw[j];
        if (escaped)             { escaped = false; continue; }
        if (c === "\\" && inString) { escaped = true; continue; }
        if (c === '"')           { inString = !inString; continue; }
        if (!inString) {
          if (c === "{") depth++;
          else if (c === "}") { depth--; if (depth === 0) { end = j; break; } }
        }
      }
      if (end !== -1) {
        segments.push({ kind: "tool", json: raw.slice(i, end + 1) });
        i = end + 1; textStart = i;
      } else { textStart = i; break; }                        // mid-stream
      continue;
    }

    i++;
  }

  if (textStart < raw.length) segments.push({ kind: "text", value: raw.slice(textStart) });
  return segments;
}

// ── Markdown components (built without importing react-markdown types) ─────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMdComponents(CodeBlock: any) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a({ href, children }: any) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="text-violet-400 hover:text-violet-300 underline underline-offset-2 decoration-violet-500/40 transition-colors inline-flex items-center gap-0.5 break-all">
          {children}
          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 ml-0.5" />
        </a>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pre({ children }: any) { return <>{children}</>; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code({ className, children }: any) {
      const lang = /language-(\w+)/.exec(className ?? "")?.[1];
      const code = String(children).replace(/\n$/, "");
      const isBlock = !!lang || code.includes("\n");
      if (lang === "live-math") return <LiveMathCanvas code={code} />;
      if (isBlock) return <CodeBlock language={lang ?? "text"}>{code}</CodeBlock>;
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-violet-300 text-[0.82em] font-mono border border-white/[0.06]">
          {children}
        </code>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1({ children }: any) { return <h1 className="text-lg font-bold mt-5 mb-2 text-white tracking-tight">{children}</h1>; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2({ children }: any) { return <h2 className="text-base font-semibold mt-4 mb-1.5 text-white">{children}</h2>; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3({ children }: any) { return <h3 className="text-sm font-semibold mt-3 mb-1 text-white/90">{children}</h3>; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ul({ children }: any) { return <ul className="my-2 ml-3 space-y-1 list-disc marker:text-violet-400">{children}</ul>; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ol({ children }: any) { return <ol className="my-2 ml-3 space-y-1 list-decimal marker:text-violet-400">{children}</ol>; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li({ children }: any) { return <li className="text-sm text-white/85 leading-relaxed pl-1">{children}</li>; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockquote({ children }: any) {
      return (
        <blockquote className="my-3 pl-3 border-l-2 border-violet-500/50 text-white/55 italic">
          {children}
        </blockquote>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p({ children }: any) { return <p className="text-sm leading-relaxed mb-2 last:mb-0 text-white/90">{children}</p>; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strong({ children }: any) { return <strong className="font-semibold text-white">{children}</strong>; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    em({ children }: any) { return <em className="text-white/70 italic">{children}</em>; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table({ children }: any) {
      return (
        <div className="my-3 overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full text-xs border-collapse">{children}</table>
        </div>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    th({ children }: any) {
      return <th className="px-3 py-2 text-left font-semibold text-white/60 bg-white/[0.04] border-b border-white/[0.08]">{children}</th>;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    td({ children }: any) {
      return <td className="px-3 py-2 text-white/80 border-b border-white/[0.04]">{children}</td>;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hr() { return <hr className="my-4 border-white/[0.07]" />; },
  };
}

// ── URL auto-linker (used in plain-text fallback) ────────────────────────────

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

function TextWithLinks({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("http://") || part.startsWith("https://") ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 inline-flex items-center gap-0.5 break-all transition-opacity hover:opacity-75"
            style={{ color: "rgb(167,139,250)" }}
          >
            {part}
            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 ml-0.5" />
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function MessageRenderer({ content, isGameContext }: { content: string; isGameContext?: boolean }) {
  const [md, setMd] = useState<MdLib>(null);

  useEffect(() => {
    loadMd().then(setMd);
  }, []);

  const segments = parseSegments(content);

  return (
    <div className="space-y-1">
      {segments.map((seg, i) => {
        if (seg.kind === "image")   return <GeneratedImage key={i} url={seg.url} isGameContext={isGameContext} />;
        if (seg.kind === "gif")     return <GifEmbed key={i} url={seg.url} />;
        if (seg.kind === "tool")    return <ToolCard key={i} raw={seg.json} />;
        if (seg.kind === "confirm") return <ConfirmCard key={i} json={seg.json} />;
        if (!seg.value.trim()) return null;

        if (!md) {
          // Plain text fallback with URL detection until react-markdown loads
          return (
            <p key={i} className="text-sm leading-relaxed mb-2 last:mb-0 text-white/90 whitespace-pre-wrap">
              <TextWithLinks text={seg.value} />
            </p>
          );
        }

        const { ReactMarkdown, remarkGfm } = md;
        const components = buildMdComponents(CodeHighlight);
        return (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={components}>
            {seg.value}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
