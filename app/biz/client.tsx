"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-teal-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <AppShell>
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Page title bar */}
      <div className="border-b border-white/8 px-6 py-3 flex items-center gap-3">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center font-black text-black text-xs">A</div>
        <span className="font-bold text-white text-sm">Business Portal</span>
      </div>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/8 p-4 flex flex-col">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Your Businesses</p>

          {configs.length === 0 ? (
            <p className="text-white/20 text-xs">No businesses yet. Create one below.</p>
          ) : (
            <div className="space-y-1 mb-4">
              {configs.map(c => (
                <button
                  key={c.slug}
                  onClick={() => setSelectedSlug(c.slug)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
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

          {/* Create new */}
          <div className="mt-auto border-t border-white/8 pt-4">
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

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-white/20 text-sm">
              Select or create a business to get started
            </div>
          ) : (
            <div className="p-6">
              {/* Business header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black text-white">{selected.agencyName}</h1>
                  <p className="text-white/40 text-sm mt-1">Agent: <span className="text-teal-400">{selected.agentName}</span> · URL: <span className="text-white/60">aitaskflo.com/wl/{selected.slug}/chat</span></p>
                </div>
                <a
                  href={`/api/wl/${selected.slug}/chat`}
                  target="_blank"
                  className="px-4 py-2 border border-teal-500/40 text-teal-400 text-sm rounded-lg hover:bg-teal-500/10 transition-all"
                >
                  Test Chat →
                </a>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-white/8">
                {TABS.map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
                      activeTab === t
                        ? "border-teal-400 text-teal-400"
                        : "border-transparent text-white/40 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Overview tab */}
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
                    <p className="text-white/40 text-xs mb-3">Embed on your website</p>
                    <code className="text-teal-300 text-xs bg-black/30 rounded-lg p-3 block whitespace-pre overflow-x-auto">{`<script src="https://www.aitaskflo.com/embed.js" data-slug="${selected.slug}" data-name="${selected.agentName}" async></script>`}</code>
                  </div>
                </div>
              )}

              {/* Knowledge Base tab */}
              {activeTab === "Knowledge Base" && (
                <div>
                  {/* Upload area */}
                  <div
                    className="border-2 border-dashed border-white/15 rounded-2xl p-10 text-center mb-6 hover:border-teal-500/40 transition-all cursor-pointer"
                    onClick={() => fileRef.current?.click()}
                  >
                    <div className="text-4xl mb-3">📄</div>
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

                  {/* Doc list */}
                  {docs.length === 0 ? (
                    <p className="text-white/20 text-sm text-center py-8">No documents uploaded yet. Upload your first document above.</p>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-white/40 text-xs uppercase tracking-widest">{docs.length} documents</p>
                        <button onClick={handleClearAll} className="text-red-400/60 text-xs hover:text-red-400 transition-colors">Clear all</button>
                      </div>
                      <div className="space-y-2">
                        {docs.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                            <div>
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

              {/* Settings tab */}
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
                      <p className="text-teal-400 text-sm">aitaskflo.com/wl/{selected.slug}/chat</p>
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
