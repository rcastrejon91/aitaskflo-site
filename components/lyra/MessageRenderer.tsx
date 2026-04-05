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
  const { url, type, voice, prompt, preview } = obj;
  if (!url) return null;
  const label = type === "music" ? "Music Generated" : "Speech Generated";
  const detail = type === "speech" ? (voice ? `Voice: ${voice}` : "") : (prompt ?? "");
  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-sky-500/25 bg-gradient-to-br from-sky-950/60 to-blue-950/30">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-sky-500/20">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-300">
          <span className="text-sm">{type === "music" ? "🎵" : "🔊"}</span>
          {label}
        </span>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-white/35 hover:text-sky-300 transition-colors">
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
      <div className="px-4 py-3 space-y-2">
        {(detail || preview) && (
          <p className="text-[10px] text-white/35 italic truncate">{detail || preview}</p>
        )}
        <audio controls src={url} className="w-full" style={{ filter: "invert(0.8) hue-rotate(200deg)" }} />
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
            style={{ aspectRatio: "3/4", boxShadow: "0 6px 24px rgba(0,0,0,0.5)" }} />
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
          <img src={ch.imageUrl} alt={ch.title}
            className="w-full max-w-sm mx-auto rounded-xl object-cover mb-5"
            style={{ aspectRatio: "16/9", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }} />
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

// ── Generated Image ───────────────────────────────────────────────────────────

function GeneratedImage({ url, isGameContext }: { url: string; isGameContext?: boolean }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [retries, setRetries] = useState(0);
  const [gamePrompt, setGamePrompt] = useState<"idle" | "asked" | "added">("idle");
  const isFalUrl = url.includes("fal.media") || url.includes("fal.run") || url.includes("storage.googleapis") || url.startsWith("data:");
  const MAX_RETRIES = isFalUrl ? 1 : 5;

  // Pollinations can take 20-30s on cold start — retry up to 5 times
  const handleError = () => {
    if (retries < MAX_RETRIES) {
      setTimeout(() => {
        setStatus("loading");
        setRetries(r => r + 1);
      }, 6000);
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
