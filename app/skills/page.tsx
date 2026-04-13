"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/lyra/AppShell";

interface Skill {
  id: string;
  name: string;
  description: string;
  type: "skill" | "tool";
  status: "active" | "pending" | "disabled";
  content: string;
  uses: number;
  successes: number;
  created_at: string;
  last_used?: string;
}

interface SkillLog {
  skill_name: string;
  success: number;
  note?: string | null;
  used_at: string;
}

type Tab = "active" | "pending" | "tools" | "log";

export default function SkillsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [log, setLog] = useState<SkillLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Skill | null>(null);
  const [killSwitch, setKillSwitch] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  async function fetchSkills() {
    setLoading(true);
    try {
      const res = await fetch("/api/lyra/skills");
      if (res.ok) {
        const data = await res.json() as { skills: Skill[]; log: SkillLog[]; skillsEnabled: boolean };
        setSkills(data.skills ?? []);
        setLog(data.log ?? []);
        setKillSwitch(!data.skillsEnabled);
      }
    } finally {
      setLoading(false);
    }
  }

  async function approveSkill(name: string) {
    await fetch("/api/lyra/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", name }) });
    fetchSkills();
  }

  async function disableSkill(name: string) {
    await fetch("/api/lyra/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disable", name }) });
    fetchSkills();
  }

  async function deleteSkill(name: string) {
    if (!confirm(`Delete skill "${name}"? This cannot be undone.`)) return;
    await fetch("/api/lyra/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", name }) });
    fetchSkills();
  }

  const activeSkills = skills.filter(s => s.status === "active" && s.type === "skill");
  const pendingSkills = skills.filter(s => s.status === "pending");
  const toolSkills = skills.filter(s => s.type === "tool");

  return (
    <AppShell>
      <div className="min-h-screen bg-black text-white font-mono">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Lyra Skills</h1>
              <p className="text-white/40 text-sm mt-1">Knowledge she has learned and can use in every conversation</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${killSwitch ? "border-red-500/40 text-red-400 bg-red-500/10" : "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${killSwitch ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`} />
                {killSwitch ? "Skills OFF" : "Skills ON"}
              </div>
              <div className="text-white/20 text-xs">SKILLS_ENABLED=true in .env.local</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Active Skills", value: activeSkills.length, color: "#10b981" },
              { label: "Pending Review", value: pendingSkills.length, color: "#f59e0b" },
              { label: "Tool Definitions", value: toolSkills.length, color: "#8b5cf6" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-white/5">
            {(["active", "pending", "tools", "log"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${tab === t ? "text-white border-b-2 border-violet-500 -mb-px" : "text-white/30 hover:text-white/60"}`}
              >
                {t === "active" ? `Skills (${activeSkills.length})` : t === "pending" ? `Pending (${pendingSkills.length})` : t === "tools" ? `Tools (${toolSkills.length})` : "Audit Log"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-white/20 text-sm text-center py-16">Loading…</div>
          ) : (
            <>
              {/* Active Skills */}
              {tab === "active" && (
                <div className="space-y-3">
                  {activeSkills.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-white/20 text-sm">No skills yet</div>
                      <div className="text-white/10 text-xs mt-2">Ask Lyra to learn something and she&apos;ll save it here</div>
                    </div>
                  ) : activeSkills.map(skill => (
                    <SkillRow key={skill.id} skill={skill} color="#10b981"
                      onView={() => setSelected(selected?.id === skill.id ? null : skill)}
                      onDisable={() => disableSkill(skill.name)}
                      onDelete={() => deleteSkill(skill.name)}
                      expanded={selected?.id === skill.id}
                    />
                  ))}
                </div>
              )}

              {/* Pending */}
              {tab === "pending" && (
                <div className="space-y-3">
                  {pendingSkills.length === 0 ? (
                    <div className="text-center py-16 text-white/20 text-sm">No pending skills</div>
                  ) : pendingSkills.map(skill => (
                    <SkillRow key={skill.id} skill={skill} color="#f59e0b"
                      onView={() => setSelected(selected?.id === skill.id ? null : skill)}
                      onApprove={() => approveSkill(skill.name)}
                      onDelete={() => deleteSkill(skill.name)}
                      expanded={selected?.id === skill.id}
                    />
                  ))}
                </div>
              )}

              {/* Tools */}
              {tab === "tools" && (
                <div className="space-y-3">
                  {toolSkills.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-white/20 text-sm">No tool definitions yet</div>
                      <div className="text-white/10 text-xs mt-2">Ask Lyra to &quot;discover the Airtable tool&quot; or &quot;learn how to call the Spotify API&quot;</div>
                    </div>
                  ) : toolSkills.map(skill => (
                    <SkillRow key={skill.id} skill={skill} color="#8b5cf6"
                      onView={() => setSelected(selected?.id === skill.id ? null : skill)}
                      onDisable={() => disableSkill(skill.name)}
                      onDelete={() => deleteSkill(skill.name)}
                      expanded={selected?.id === skill.id}
                    />
                  ))}
                </div>
              )}

              {/* Log */}
              {tab === "log" && (
                <div className="space-y-2">
                  {log.length === 0 ? (
                    <div className="text-center py-16 text-white/20 text-sm">No usage recorded yet</div>
                  ) : log.map((entry, i) => (
                    <div key={`${entry.skill_name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/5 bg-white/[0.02] text-xs">
                      <span className={entry.success ? "text-emerald-400" : "text-red-400"}>{entry.success ? "✓" : "✗"}</span>
                      <span className="text-white/60 font-medium">{entry.skill_name}</span>
                      {entry.note && <span className="text-white/30 truncate flex-1">{entry.note}</span>}
                      <span className="text-white/20 shrink-0">{new Date(entry.used_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SkillRow({
  skill, color, expanded, onView, onApprove, onDisable, onDelete
}: {
  skill: Skill;
  color: string;
  expanded: boolean;
  onView: () => void;
  onApprove?: () => void;
  onDisable?: () => void;
  onDelete?: () => void;
}) {
  const successRate = skill.uses > 0 ? Math.round((skill.successes / skill.uses) * 100) : null;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: color + "20", background: color + "05" }}>
      <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={onView}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{skill.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full text-white/30 border border-white/10">{skill.type}</span>
          </div>
          <p className="text-xs text-white/40 truncate mt-0.5">{skill.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-white/30">
          {successRate !== null && <span>{successRate}% success</span>}
          <span>{skill.uses} uses</span>
          <span className="text-white/15">{new Date(skill.created_at).toLocaleDateString()}</span>
        </div>
        <span className="text-white/20 text-xs">{expanded ? "↑" : "↓"}</span>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: color + "15" }}>
          <pre className="text-xs text-white/50 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto font-mono bg-black/20 rounded p-3">
            {skill.content}
          </pre>
          <div className="flex gap-2">
            {onApprove && (
              <button onClick={onApprove} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors border border-emerald-500/30">
                Approve
              </button>
            )}
            {onDisable && (
              <button onClick={onDisable} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-colors border border-white/10">
                Disable
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400/70 hover:bg-red-500/20 transition-colors border border-red-500/20">
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
