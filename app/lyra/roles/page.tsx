"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TOOL_CATALOG } from "@/lib/lyra/role-builder";

interface ParsedRole {
  name: string;
  company: string;
  roleTitle: string;
  domain: string;
  tone: string;
  responsibilities: string[];
  requiredSkills: string[];
  suggestedTools: string[];
  systemPrompt: string;
  knowledgeAreas: string[];
}

interface RoleBot {
  id: string;
  name: string;
  company: string | null;
  role_title: string | null;
  domain: string;
  tone: string;
  status: string;
  created_at: string;
  tools: string;
}

type Step = "list" | "paste" | "review";

export default function RolesPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("list");
  const [bots, setBots] = useState<RoleBot[]>([]);
  const [jd, setJd] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Editable fields after parse
  const [editName, setEditName] = useState("");
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editTools, setEditTools] = useState<string[]>([]);
  const [editTone, setEditTone] = useState("professional");

  useEffect(() => { fetchBots(); }, []);

  async function fetchBots() {
    const res = await fetch("/api/lyra/roles");
    if (res.ok) {
      const data = await res.json();
      setBots(data.bots ?? []);
    }
  }

  async function handleParse() {
    if (!jd.trim()) return;
    setParsing(true);
    setError("");
    try {
      const res = await fetch("/api/lyra/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", jd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      setParsed(data.parsed);
      setEditName(data.parsed.name);
      setEditSystemPrompt(data.parsed.systemPrompt);
      setEditTools(data.parsed.suggestedTools);
      setEditTone(data.parsed.tone);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/lyra/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: editName,
          company: parsed.company,
          roleTitle: parsed.roleTitle,
          jdRaw: jd,
          systemPrompt: editSystemPrompt,
          tools: editTools,
          tone: editTone,
          domain: parsed.domain,
          responsibilities: parsed.responsibilities,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      // Navigate to the new bot's chat
      router.push(`/lyra/roles/${data.bot.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this role bot?")) return;
    await fetch("/api/lyra/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchBots();
  }

  function toggleTool(toolName: string) {
    setEditTools((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]
    );
  }

  const allToolNames = Object.keys(TOOL_CATALOG);

  // ── Step: List ─────────────────────────────────────────────────────────────
  if (step === "list") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <a href="/lyra" className="text-zinc-500 hover:text-zinc-300 text-sm">← Lyra</a>
                <span className="text-zinc-700">/</span>
                <span className="text-zinc-300 text-sm font-medium">Role Bots</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Role Bot Builder</h1>
              <p className="text-zinc-400 text-sm mt-1">Paste any job description → deploy a custom AI agent in seconds</p>
            </div>
            <button
              onClick={() => { setStep("paste"); setJd(""); setParsed(null); setError(""); }}
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + New Role Bot
            </button>
          </div>

          {/* Bot list */}
          {bots.length === 0 ? (
            <div className="border border-zinc-800 rounded-xl p-12 text-center">
              <div className="text-4xl mb-3">🤖</div>
              <p className="text-zinc-400 text-sm mb-4">No role bots yet. Paste a job description to create your first one.</p>
              <button
                onClick={() => setStep("paste")}
                className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Create Role Bot
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {bots.map((bot) => {
                let toolCount = 0;
                try { toolCount = JSON.parse(bot.tools || "[]").length; } catch { /* */ }
                return (
                  <div key={bot.id} className="border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-600 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-violet-900/40 border border-violet-700/50 flex items-center justify-center text-lg flex-shrink-0">
                      🤖
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{bot.name}</span>
                        {bot.company && <span className="text-zinc-500 text-xs">· {bot.company}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {bot.role_title && <span className="text-zinc-400 text-xs">{bot.role_title}</span>}
                        {bot.domain && <span className="text-zinc-600 text-xs">· {bot.domain}</span>}
                        <span className="text-zinc-600 text-xs">· {toolCount} tool{toolCount !== 1 ? "s" : ""}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          bot.tone === "friendly" ? "bg-green-900/30 text-green-400" :
                          bot.tone === "empathetic" ? "bg-blue-900/30 text-blue-400" :
                          bot.tone === "technical" ? "bg-orange-900/30 text-orange-400" :
                          bot.tone === "concise" ? "bg-yellow-900/30 text-yellow-400" :
                          "bg-zinc-800 text-zinc-400"
                        }`}>{bot.tone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => router.push(`/lyra/roles/${bot.id}`)}
                        className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        Chat
                      </button>
                      <button
                        onClick={() => handleDelete(bot.id)}
                        className="text-zinc-600 hover:text-red-400 text-xs px-2 py-1.5 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step: Paste JD ─────────────────────────────────────────────────────────
  if (step === "paste") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep("list")} className="text-zinc-500 hover:text-zinc-300 text-sm">← Back</button>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-300 text-sm">Paste Job Description</span>
          </div>

          <h2 className="text-xl font-bold mb-2">Paste a Job Description</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Claude will analyze it and generate a fully configured AI agent for that role — system prompt, tools, tone, and responsibilities.
          </p>

          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste any job description here — support agent, sales rep, medical assistant, software engineer, etc."
            className="w-full h-64 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500 transition-colors"
          />

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleParse}
              disabled={parsing || !jd.trim()}
              className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-medium transition-colors"
            >
              {parsing ? "Analyzing job description…" : "Generate Role Bot →"}
            </button>
            <button
              onClick={() => setStep("list")}
              className="px-4 py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Review & Edit ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("paste")} className="text-zinc-500 hover:text-zinc-300 text-sm">← Back</button>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-300 text-sm">Review & Deploy</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Review Role Bot</h2>
            <p className="text-zinc-400 text-sm mt-0.5">Edit anything before deploying</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !editName.trim() || !editSystemPrompt.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? "Deploying…" : "Deploy Bot →"}
          </button>
        </div>

        {error && <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-300 text-sm mb-4">{error}</div>}

        <div className="space-y-5">
          {/* Name + Meta */}
          <div className="border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wide">Identity</h3>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Bot Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {parsed?.company && (
                <div>
                  <span className="text-xs text-zinc-500">Company</span>
                  <p className="text-zinc-200 mt-0.5">{parsed.company}</p>
                </div>
              )}
              {parsed?.roleTitle && (
                <div>
                  <span className="text-xs text-zinc-500">Role</span>
                  <p className="text-zinc-200 mt-0.5">{parsed.roleTitle}</p>
                </div>
              )}
              {parsed?.domain && (
                <div>
                  <span className="text-xs text-zinc-500">Domain</span>
                  <p className="text-zinc-200 mt-0.5">{parsed.domain}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tone */}
          <div className="border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wide mb-3">Communication Tone</h3>
            <div className="flex flex-wrap gap-2">
              {["professional", "friendly", "technical", "empathetic", "concise"].map((t) => (
                <button
                  key={t}
                  onClick={() => setEditTone(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    editTone === t
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Responsibilities */}
          {parsed && parsed.responsibilities.length > 0 && (
            <div className="border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wide mb-3">Responsibilities</h3>
              <ul className="space-y-1">
                {parsed.responsibilities.map((r, i) => (
                  <li key={i} className="text-zinc-400 text-sm flex items-start gap-2">
                    <span className="text-violet-500 mt-0.5">·</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tools */}
          <div className="border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wide mb-1">Tools</h3>
            <p className="text-xs text-zinc-500 mb-3">{editTools.length} selected — toggle to customize</p>
            <div className="flex flex-wrap gap-2">
              {allToolNames.map((toolName) => {
                const tc = TOOL_CATALOG[toolName];
                const active = editTools.includes(toolName);
                return (
                  <button
                    key={toolName}
                    onClick={() => toggleTool(toolName)}
                    title={tc.description}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      active
                        ? "bg-violet-700/40 border border-violet-600/60 text-violet-300"
                        : "bg-zinc-900 border border-zinc-700 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* System Prompt */}
          <div className="border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wide mb-3">System Prompt</h3>
            <textarea
              value={editSystemPrompt}
              onChange={(e) => setEditSystemPrompt(e.target.value)}
              rows={14}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 font-mono resize-none focus:outline-none focus:border-violet-500 leading-relaxed"
            />
            <p className="text-xs text-zinc-600 mt-1">{editSystemPrompt.length} chars</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !editName.trim() || !editSystemPrompt.trim()}
            className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? "Deploying…" : "Deploy Role Bot →"}
          </button>
          <button
            onClick={() => setStep("list")}
            className="px-5 py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
