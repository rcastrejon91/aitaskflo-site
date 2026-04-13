"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/lyra/AppShell";
import {
  Briefcase, Clock, CheckCircle2, XCircle, Star,
  RefreshCw, ExternalLink, ChevronDown, AlertCircle,
} from "lucide-react";

type JobStatus = "applied" | "interviewing" | "offered" | "rejected" | "manual_needed";

interface Job {
  id: number;
  title: string;
  company: string;
  url?: string;
  status: JobStatus;
  score?: number;
  cover_letter?: string;
  applied_at: string;
  follow_up_sent_at?: string;
  notes?: string;
  source?: string;
}

interface Stats {
  total: number;
  applied: number;
  interviewing: number;
  offered: number;
  rejected: number;
  follow_up_due: number;
}

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  applied:       { label: "Applied",       color: "#3b82f6", bg: "#3b82f615", icon: <Clock className="w-3 h-3" /> },
  interviewing:  { label: "Interviewing",  color: "#f59e0b", bg: "#f59e0b15", icon: <Star className="w-3 h-3" /> },
  offered:       { label: "Offered",       color: "#10b981", bg: "#10b98115", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:      { label: "Rejected",      color: "#ef4444", bg: "#ef444415", icon: <XCircle className="w-3 h-3" /> },
  manual_needed: { label: "Manual Apply",  color: "#8b5cf6", bg: "#8b5cf615", icon: <AlertCircle className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: JobStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.applied;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function JobRow({ job, onStatusChange, onFollowUp }: {
  job: Job;
  onStatusChange: (id: number, status: JobStatus) => void;
  onFollowUp: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const appliedDate = new Date(job.applied_at);
  const daysSince = Math.floor((Date.now() - appliedDate.getTime()) / 86400000);
  const followUpDue = daysSince >= 7 && !job.follow_up_sent_at && job.status === "applied";

  return (
    <div className="rounded-xl border overflow-hidden" style={{
      borderColor: followUpDue ? "#f59e0b40" : "rgba(255,255,255,0.07)",
      background: followUpDue ? "#f59e0b06" : "rgba(255,255,255,0.025)",
    }}>
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Score ring */}
        {job.score !== undefined && (
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{
              background: job.score >= 80 ? "#10b98120" : job.score >= 60 ? "#f59e0b20" : "#ef444420",
              color: job.score >= 80 ? "#10b981" : job.score >= 60 ? "#f59e0b" : "#ef4444",
              border: `2px solid ${job.score >= 80 ? "#10b98140" : job.score >= 60 ? "#f59e0b40" : "#ef444440"}`,
            }}>
            {job.score}
          </div>
        )}

        {/* Job info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white/90 truncate">{job.title}</span>
            <span className="text-xs text-white/40">at</span>
            <span className="text-sm text-white/70">{job.company}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <StatusBadge status={job.status} />
            <span className="text-xs text-white/30">{daysSince === 0 ? "today" : `${daysSince}d ago`}</span>
            {job.source && <span className="text-xs text-white/20">{job.source}</span>}
            {followUpDue && (
              <span className="text-xs text-amber-400 font-medium">Follow-up due</span>
            )}
            {job.follow_up_sent_at && (
              <span className="text-xs text-white/30">Followed up</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {followUpDue && (
            <button onClick={() => onFollowUp(job.id)}
              className="text-xs px-2 py-1 rounded-lg transition-colors font-medium"
              style={{ background: "#f59e0b15", color: "#f59e0b" }}>
              Follow Up
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {/* Status changer */}
          <div className="mt-3 mb-3">
            <p className="text-xs text-white/40 mb-2">Update status</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STATUS_CONFIG) as JobStatus[]).map(s => (
                <button key={s} onClick={() => onStatusChange(job.id, s)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
                  style={{
                    background: job.status === s ? STATUS_CONFIG[s].bg : "rgba(255,255,255,0.04)",
                    color: job.status === s ? STATUS_CONFIG[s].color : "rgba(255,255,255,0.4)",
                    border: `1px solid ${job.status === s ? STATUS_CONFIG[s].color + "40" : "transparent"}`,
                  }}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {job.cover_letter && (
            <div>
              <p className="text-xs text-white/40 mb-1.5">Cover Letter</p>
              <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                {job.cover_letter}
              </p>
            </div>
          )}

          {job.notes && (
            <div className="mt-3">
              <p className="text-xs text-white/40 mb-1">Notes</p>
              <p className="text-xs text-white/50 leading-relaxed">{job.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<JobStatus | "all">("all");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/lyra/jobs");
      const d = await r.json();
      setJobs(d.applications ?? []);
      setStats(d.stats ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleStatusChange(id: number, status: JobStatus) {
    await fetch("/api/lyra/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", id, status }),
    });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
  }

  async function handleFollowUp(id: number) {
    await fetch("/api/lyra/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_followed_up", id }),
    });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, follow_up_sent_at: new Date().toISOString() } : j));
  }

  const visible = filter === "all" ? jobs : jobs.filter(j => j.status === filter);

  const statCards = [
    { label: "Total",        value: stats?.total ?? 0,        color: "#6366f1" },
    { label: "Applied",      value: stats?.applied ?? 0,      color: "#3b82f6" },
    { label: "Interviewing", value: stats?.interviewing ?? 0, color: "#f59e0b" },
    { label: "Offered",      value: stats?.offered ?? 0,      color: "#10b981" },
    { label: "Rejected",     value: stats?.rejected ?? 0,     color: "#ef4444" },
    { label: "Follow-up Due",value: stats?.follow_up_due ?? 0, color: "#f97316" },
  ];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Job Tracker</h1>
              <p className="text-xs text-white/40">Lyra hunts, applies, and follows up automatically</p>
            </div>
          </div>
          <button onClick={load} className="p-2 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
          {statCards.map(({ label, value, color }) => (
            <button key={label}
              onClick={() => setFilter(label.toLowerCase().replace(/ /g, "_").replace("-", "_") as JobStatus | "all")}
              className="rounded-xl p-3 text-center transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
            </button>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {(["all", "applied", "interviewing", "offered", "rejected", "manual_needed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="text-xs px-3 py-1.5 rounded-full transition-colors font-medium"
              style={{
                background: filter === f ? "#6366f120" : "rgba(255,255,255,0.04)",
                color: filter === f ? "#6366f1" : "rgba(255,255,255,0.4)",
                border: `1px solid ${filter === f ? "#6366f140" : "transparent"}`,
              }}>
              {f === "all" ? "All" : STATUS_CONFIG[f as JobStatus].label}
            </button>
          ))}
        </div>

        {/* Job list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/30 text-sm">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-10" />
            <p className="text-white/40 text-sm">
              {filter === "all"
                ? "No applications yet. Tell Lyra to set your job profile and start hunting."
                : `No ${filter} applications.`}
            </p>
            {filter === "all" && (
              <p className="text-white/20 text-xs mt-2 max-w-xs mx-auto">
                Try: <em>"Set my job profile — I'm a React developer looking for remote work, $90k+"</em>
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map(job => (
              <JobRow
                key={job.id}
                job={job}
                onStatusChange={handleStatusChange}
                onFollowUp={handleFollowUp}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
