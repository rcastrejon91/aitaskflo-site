"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/lyra/AppShell";

interface WlConfig {
  slug: string;
  agencyName: string;
  agentName: string;
  primaryColor: string;
  allowedTools: string[];
  createdAt: string;
  systemPromptAddendum?: string;
}

interface KbDoc {
  id: string;
  filename: string;
  fileType: string;
  uploadedAt: string;
  chunkCount: number;
  charCount: number;
}

interface KbStats {
  documents: number;
  chunks: number;
  totalChars: number;
}

const TABS = ["Overview", "Knowledge Base", "Settings"] as const;
type Tab = typeof TABS[number];

export default function BizClient() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [configs, setConfigs] = useState<WlConfig[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [stats, setStats] = useState<KbStats | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [newBiz, setNewBiz] = useState({ agencyName: "", agentName: "", slug: "", primaryColor: "#14b8a6" });
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") window.location.href = "/login";
  }, [status]);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (selectedSlug) fetchKb(selectedSlug);
  }, [selectedSlug]);

  async function fetchConfigs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/whitelabel");
      const data = await res.json() as { configs?: WlConfig[] };
      const list = data.configs ?? [];
      setConfigs(list);
      if (list.length > 0 && !selectedSlug) setSelectedSlug(list[0].slug);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function fetchKb(slug: string) {
    try {
      const res = await fetch(`/api/kb?slug=${slug}`);
      const data = await res.json() as { docs: KbDoc[]; stats: KbStats };
      setDocs(data.docs ?? []);
      setStats(data.stats ?? null);
    } catch { /* ignore */ }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedSlug) return;
    setUploading(true);
    setUploadMsg("");

    const form = new FormData();
    form.append("slug", selectedSlug);
    form.append("file", file);

    try {
      const res = await fetch("/api/kb", { method: "POST", body: form });
      const data = await res.json() as { success?: boolean; doc?: KbDoc; error?: string };
      if (data.success) {
        setUploadMsg(`✅ "${file.name}" uploaded — ${data.doc?.chunkCount} chunks indexed`);
        await fetchKb(selectedSlug);
      } else {
        setUploadMsg(`❌ ${data.error ?? "Upload failed"}`);
      }
    } catch {
      setUploadMsg("❌ Upload failed");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleDeleteDoc(docId: string) {
    if (!selectedSlug) return;
    await fetch("/api/kb", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: selectedSlug, docId }),
    });
    await fetchKb(selectedSlug);
  }

  async function handleClearAll() {
    if (!selectedSlug || !confirm("Clear all documents from the knowledge base?")) return;
    await fetch("/api/kb", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: selectedSlug, clearAll: true }),
    });
    await fetchKb(selectedSlug);
  }

  async function handleCreateBiz() {
    if (!newBiz.slug || !newBiz.agencyName || !newBiz.agentName) return;
    setCreating(true);
    try {
      await fetch("/api/admin/whitelabel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newBiz.slug.toLowerCase().replace(/\s+/g, "-"),
          agencyName: newBiz.agencyName,
          agentName: newBiz.agentName,
          primaryColor: newBiz.primaryColor,
          allowedTools: ["get_weather", "search_web", "calculate", "get_datetime"],
        }),
      });
      await fetchConfigs();
      setSelectedSlug(newBiz.slug);
      setNewBiz({ agencyName: "", agentName: "", slug: "", primaryColor: "#14b8a6" });
    } catch { /* ignore */ }
    setCreating(false);
  }

  const selected = configs.find(c => c.slug === selectedSlug);

  if (status === "loading" || loading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[#0a0a0f] text-white">
          <div className="border-b border-white/8 px-4 py-3 sm:px-6">
            <div className="h-6 w-44 animate-pulse rounded bg-white/10" />
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-[18rem_1fr] lg:p-6">
            <div className="h-72 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
                <div className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
                <div className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="border-b border-white/8 px-4 py-3 sm:px-6 flex items-center gap-3">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center font-black text-black text-xs">A</div>
        <div className="min-w-0">
          <span className="block font-bold text-white text-sm">Business Portal</span>
          <span className="hidden text-xs text-white/35 sm:block">White-label agents and knowledge bases</span>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-65px)] flex-col lg:flex-row">
        <div className="w-full border-b border-white/8 p-4 lg:w-72 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/30">Your Businesses</p>

          {configs.length === 0 ? (
            <p className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs leading-5 text-white/35">No businesses yet. Create the first client workspace below.</p>
          ) : (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
              {configs.map(c => (
                <button
                  key={c.slug}
                  onClick={() => setSelectedSlug(c.slug)}
                  className={`min-w-52 text-left px-3 py-2 rounded-lg text-sm transition-all lg:w-full lg:min-w-0 ${
                    selectedSlug === c.slug
                      ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="font-medium">{c.agencyName}</div>
                  <div className="text-xs opacity-50">/{c.slug}</div>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-white/8 pt-4 lg:mt-6">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-2">New Business</p>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 mb-2 focus:outline-none focus:border-teal-500/50"
              placeholder="Company name"
              value={newBiz.agencyName}
              onChange={e => setNewBiz(p => ({ ...p, agencyName: e.target.value }))}
            />
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 mb-2 focus:outline-none focus:border-teal-500/50"
              placeholder="AI agent name (e.g. Nova)"
              value={newBiz.agentName}
              onChange={e => setNewBiz(p => ({ ...p, agentName: e.target.value }))}
            />
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 mb-2 focus:outline-none focus:border-teal-500/50"
              placeholder="URL slug (e.g. acme-corp)"
              value={newBiz.slug}
              onChange={e => setNewBiz(p => ({ ...p, slug: e.target.value }))}
            />
            <button
              onClick={handleCreateBiz}
              disabled={creating || !newBiz.slug || !newBiz.agencyName || !newBiz.agentName}
              className="w-full py-2 bg-teal-500 text-black font-bold rounded-lg text-sm hover:bg-teal-400 transition-all disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex min-h-[55vh] items-center justify-center p-4">
              <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/15 text-sm font-black text-teal-300">AI</div>
                <h1 className="text-xl font-black text-white">Create a client workspace</h1>
                <p className="mt-2 text-sm leading-6 text-white/45">Each workspace gets its own branded agent URL, knowledge base, and embed script for a business website.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="mb-6 rounded-3xl border border-teal-500/20 bg-[radial-gradient(circle_at_10%_0%,rgba(20,184,166,0.20),transparent_34%),rgba(255,255,255,0.035)] p-5 sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-300/80">Client agent</p>
                  <h1 className="text-2xl font-black text-white">{selected.agencyName}</h1>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Agent: <span className="text-teal-300">{selected.agentName}</span>
                    <span className="mx-2 hidden text-white/20 sm:inline">/</span>
                    <span className="block break-all text-white/65 sm:inline">aitaskflo.com/wl/{selected.slug}/chat</span>
                  </p>
                </div>
                <a
                  href={`/api/wl/${selected.slug}/chat`}
                  target="_blank"
                  className="w-full rounded-xl border border-teal-500/40 px-4 py-2 text-center text-sm font-semibold text-teal-300 transition-all hover:bg-teal-500/10 sm:w-auto"
                >
                  Test Chat
                </a>
                </div>
              </div>

              <div className="mb-6 flex gap-1 overflow-x-auto border-b border-white/8">
                {TABS.map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-all ${
                      activeTab === t
                        ? "border-teal-400 text-teal-400"
                        : "border-transparent text-white/40 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {activeTab === "Overview" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                    <p className="text-white/40 text-xs mb-1">Documents</p>
                    <p className="text-3xl font-black text-teal-400">{stats?.documents ?? 0}</p>
                  </div>
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                    <p className="text-white/40 text-xs mb-1">Knowledge Chunks</p>
                    <p className="text-3xl font-black text-teal-400">{stats?.chunks ?? 0}</p>
                  </div>
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                    <p className="text-white/40 text-xs mb-1">Total Characters</p>
                    <p className="text-3xl font-black text-teal-400">{((stats?.totalChars ?? 0) / 1000).toFixed(1)}k</p>
                  </div>

                  <div className="sm:col-span-3 bg-white/3 border border-white/8 rounded-2xl p-5">
                    <p className="text-white font-bold text-sm">Embed on your website</p>
                    <p className="mb-3 mt-1 text-xs leading-5 text-white/35">Add this script before the closing body tag on the client site.</p>
                    <code className="text-teal-300 text-xs bg-black/30 rounded-lg p-3 block whitespace-pre overflow-x-auto">{`<script src="https://www.aitaskflo.com/embed.js" data-slug="${selected.slug}" data-name="${selected.agentName}" async></script>`}</code>
                  </div>
                </div>
              )}

              {activeTab === "Knowledge Base" && (
                <div>
                  <div
                    className="mb-6 cursor-pointer rounded-3xl border-2 border-dashed border-white/15 p-6 text-center transition-all hover:border-teal-500/40 sm:p-10"
                    onClick={() => fileRef.current?.click()}
                  >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-500/25 bg-teal-500/10 text-sm font-black text-teal-300">KB</div>
                    <p className="text-white font-bold mb-1">Drop files here or click to upload</p>
                    <p className="text-white/30 text-sm">TXT, CSV, MD, HTML, JSON — max 5MB</p>
                    {uploadMsg && <p className="text-teal-400 text-sm mt-3">{uploadMsg}</p>}
                    {uploading && <p className="text-white/40 text-sm mt-2">Uploading & indexing…</p>}
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      accept=".txt,.csv,.md,.html,.json"
                      onChange={handleUpload}
                    />
                  </div>

                  {docs.length === 0 ? (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] py-10 text-center">
                      <p className="text-white/45 text-sm">No documents uploaded yet.</p>
                      <p className="mt-1 text-xs text-white/25">Upload business FAQs, service docs, policies, or product info to ground the agent.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-white/40 text-xs uppercase tracking-widest">{docs.length} documents</p>
                        <button onClick={handleClearAll} className="text-red-400/60 text-xs hover:text-red-400 transition-colors">Clear all</button>
                      </div>
                      <div className="space-y-2">
                        {docs.map(doc => (
                          <div key={doc.id} className="flex flex-col gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium">{doc.filename}</p>
                              <p className="text-white/30 text-xs">{doc.chunkCount} chunks · {(doc.charCount / 1000).toFixed(1)}k chars · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="text-red-400/40 hover:text-red-400 text-xs transition-colors ml-4"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Settings" && (
                <div className="space-y-4 max-w-lg">
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
                    <p className="text-white font-bold mb-2">Business Info</p>
                    <div>
                      <p className="text-white/40 text-xs mb-1">Company name</p>
                      <p className="text-white text-sm">{selected.agencyName}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs mb-1">Agent name</p>
                      <p className="text-white text-sm">{selected.agentName}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs mb-1">Chat URL</p>
                      <p className="break-all text-teal-400 text-sm">aitaskflo.com/wl/{selected.slug}/chat</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs mb-1">Created</p>
                      <p className="text-white/60 text-sm">{new Date(selected.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs mb-1">Enabled tools</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selected.allowedTools.map(t => (
                          <span key={t} className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded px-2 py-0.5">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </AppShell>
  );
}
