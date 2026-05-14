"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/lyra/AppShell";
import { Zap, RefreshCw, ExternalLink, Clock, CheckCircle2, XCircle, Play } from "lucide-react";

type GigType = "product" | "art_drop" | "content_clip" | "social_post" | "prompt_pack";
type GigStatus = "queued" | "running" | "done" | "failed";

interface Gig {
  id: number;
  type: GigType;
  title: string;
  status: GigStatus;
  output?: string;
  revenue?: number;
  created_at: string;
  completed_at?: string;
}

interface Stats {
  total: number;
  done: number;
  totalRevenue: string;
}

const TYPE_CONFIG: Record<GigType, { label: string; icon: string; color: string }> = {
  product:      { label: "Product",     icon: "📄", color: "#10b981" },
  art_drop:     { label: "Art Drop",    icon: "🎨", color: "#6366f1" },
  content_clip: { label: "Clip",        icon: "🎬", color: "#f59e0b" },
  social_post:  { label: "Social Post", icon: "📱", color: "#3b82f6" },
  prompt_pack:  { label: "Prompt Pack", icon: "✨", color: "#8b5cf6" },
};

const STATUS_CONFIG: Record<GigStatus, { label: string; color: string; icon: React.ReactNode }> = {
  queued:  { label: "Queued",  color: "#6366f1", icon: <Clock className="w-3 h-3" /> },
  running: { label: "Running", color: "#f59e0b", icon: <Play className="w-3 h-3" /> },
  done:    { label: "Done",    color: "#10b981", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:  { label: "Failed",  color: "#ef4444", icon: <XCircle className="w-3 h-3" /> },
};

const GIG_IDEAS = [
  { type: "product" as GigType,      label: "📄 Dark Fantasy Grimoire",     prompt: 'execute_gig type="product" title="Shadow Witch Grimoire" topic="shadow magic, dark witchcraft rituals" style="dark fantasy" price="19"' },
  { type: "art_drop" as GigType,     label: "🎨 Fantasy Character Pack",    prompt: 'execute_gig type="art_drop" title="Dragon Empress Series" topic="dragon empress characters" style="dark fantasy" price="17" image_count="5"' },
  { type: "content_clip" as GigType, label: "🎬 Lore Reel Script",          prompt: 'execute_gig type="content_clip" title="Ice Magic Origins" topic="ice magic lore" platform="TikTok"' },
  { type: "social_post" as GigType,  label: "📱 Twitter Thread",            prompt: 'post_social platform="Twitter" topic="why dark fantasy is the most powerful aesthetic of 2025" style="viral"' },
  { type: "prompt_pack" as GigType,  label: "✨ AI Prompt Pack",             prompt: 'execute_gig type="prompt_pack" title="Dark Fantasy AI Prompts" topic="dark fantasy character art" price="9"' },
];

function GigRow({ gig }: { gig: Gig }) {
  const typeCfg = TYPE_CONFIG[gig.type] ?? TYPE_CONFIG.product;
  const statusCfg = STATUS_CONFIG[gig.status] ?? STATUS_CONFIG.done;
  const date = new Date(gig.created_at);
  const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const isOutput = gig.output && (gig.output.startsWith("http") || gig.output.startsWith("/"));

  return (
    <div className="rounded-xl flex items-center gap-3 px-4 py-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

      <span className="text-xl flex-shrink-0">{typeCfg.icon}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/85 truncate">{gig.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: typeCfg.color + "15", color: typeCfg.color }}>
            {typeCfg.label}
          </span>
          <span className="text-xs text-white/30">{dateStr} {timeStr}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {gig.revenue != null && gig.revenue > 0 && (
          <span className="text-sm font-bold text-green-400">${(gig.revenue / 100).toFixed(2)}</span>
        )}
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{ background: statusCfg.color + "15", color: statusCfg.color }}>
          {statusCfg.icon}
          {statusCfg.label}
        </span>
        {isOutput && (
          <a href={gig.output!} target="_blank" rel="noopener noreferrer"
            className="p-1.5 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function GigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, done: 0, totalRevenue: "$0.00" });
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/lyra/gigs");
      const d = await r.json();
      setGigs(d.gigs ?? []);
      setStats(d.stats ?? { total: 0, done: 0, totalRevenue: "$0.00" });
      setTodayCount(d.todayCount ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const todayGigs = gigs.filter(g => {
    const d = new Date(g.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const pastGigs = gigs.filter(g => {
    const d = new Date(g.created_at);
    const now = new Date();
    return d.toDateString() !== now.toDateString();
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Income Engine</h1>
              <p className="text-xs text-white/40">Lyra creates products, posts content, and makes money autonomously</p>
            </div>
          </div>
          <button onClick={load} className="p-2 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Revenue", value: stats.totalRevenue, color: "#10b981" },
            { label: "Completed Gigs", value: String(stats.done), color: "#6366f1" },
            { label: "Today", value: String(todayCount), color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick launch */}
        <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-xs text-white/40 mb-3 font-medium uppercase tracking-wider">Quick Launch — tell Lyra in chat:</p>
          <div className="flex flex-wrap gap-2">
            {GIG_IDEAS.map((idea) => (
              <div key={idea.label}
                className="text-xs px-3 py-1.5 rounded-full cursor-pointer transition-colors select-all"
                style={{ background: (TYPE_CONFIG[idea.type]?.color ?? "#6366f1") + "15", color: TYPE_CONFIG[idea.type]?.color ?? "#6366f1" }}
                title={`Tell Lyra: ${idea.prompt}`}>
                {idea.label}
              </div>
            ))}
          </div>
          <p className="text-xs text-white/20 mt-3">Or just say <em className="text-white/40">"plan today"</em> and Lyra will pick the best 3 gigs for right now.</p>
        </div>

        {/* Today's gigs */}
        {todayGigs.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">Today</p>
            <div className="flex flex-col gap-2">
              {todayGigs.map(g => <GigRow key={g.id} gig={g} />)}
            </div>
          </div>
        )}

        {/* Past gigs */}
        {pastGigs.length > 0 && (
          <div>
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">History</p>
            <div className="flex flex-col gap-2">
              {pastGigs.map(g => <GigRow key={g.id} gig={g} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {gigs.length === 0 && !loading && (
          <div className="text-center py-20">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-10" />
            <p className="text-white/40 text-sm">No gigs yet.</p>
            <p className="text-white/20 text-xs mt-2 max-w-xs mx-auto">
              Tell Lyra <em>"plan today"</em> and she&apos;ll propose 3 things she can do right now to make you money.
            </p>
            <Link href="/lyra?q=plan+today"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-xs font-medium transition-all"
              style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "rgba(167,139,250,0.9)" }}>
              <Zap className="w-3 h-3" /> Open Lyra → plan today
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
