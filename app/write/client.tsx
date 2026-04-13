"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/lyra/AppShell";
import type { GWDoc, GWFormat } from "@/lib/lyra/ghostwriter";

const FORMATS: { value: GWFormat; label: string; icon: string; desc: string }[] = [
  { value: "blog_post",       label: "Blog Post",        icon: "✍️",  desc: "SEO-optimized, 600–1200 words" },
  { value: "linkedin",        label: "LinkedIn Article", icon: "💼",  desc: "Thought leadership piece" },
  { value: "twitter_thread",  label: "Twitter Thread",   icon: "🐦",  desc: "Hook + 6–10 punchy tweets" },
  { value: "email",           label: "Email",            icon: "📧",  desc: "Subject line + persuasive copy" },
  { value: "youtube_script",  label: "YouTube Script",   icon: "🎬",  desc: "Full video script with cues" },
  { value: "newsletter",      label: "Newsletter",       icon: "📰",  desc: "Engaging issue with sections" },
  { value: "ad_copy",         label: "Ad Copy",          icon: "🎯",  desc: "Headlines, bullets & CTA" },
  { value: "bio",             label: "Professional Bio", icon: "🧑",  desc: "1st & 3rd person versions" },
];

const TONES = ["Professional", "Casual", "Bold & Direct", "Storytelling", "Humorous", "Inspirational", "Technical", "Conversational"];

export default function WriteClient({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<GWDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<GWDoc | null>(null);
  const [format, setFormat] = useState<GWFormat>("blog_post");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    try {
      const res = await fetch("/api/lyra/ghostwriter");
      const data = await res.json() as { docs: GWDoc[] };
      setDocs(data.docs ?? []);
    } catch { /* ignore */ }
  }

  async function generate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/lyra/ghostwriter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, topic, tone, context }),
      });
      const data = await res.json() as { doc?: GWDoc; error?: string };
      if (data.doc) {
        setSelectedDoc(data.doc);
        await loadDocs();
        setTopic("");
        setContext("");
      } else {
        setError(data.error ?? "Generation failed");
      }
    } catch {
      setError("Something went wrong");
    }
    setGenerating(false);
  }

  async function handleDelete(docId: string) {
    await fetch("/api/lyra/ghostwriter", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    if (selectedDoc?.id === docId) setSelectedDoc(null);
    await loadDocs();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const selectedFormat = FORMATS.find(f => f.value === format)!;

  return (
    <AppShell>
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
        {/* Header */}
        <div className="border-b border-white/8 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center font-black text-white text-xs">G</div>
          <span className="font-bold text-white text-sm">Ghost Writer</span>
          <span className="text-white/30 text-xs ml-1">by Lyra</span>
          {docs.length > 0 && (
            <span className="ml-auto text-white/20 text-xs">{docs.length} docs saved</span>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — compose */}
          <div className="w-80 border-r border-white/8 flex flex-col overflow-y-auto">
            <div className="p-4 space-y-4">

              {/* Format picker */}
              <div>
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Format</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {FORMATS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFormat(f.value)}
                      className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                        format === f.value
                          ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                          : "border-white/8 text-white/50 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="text-base mb-0.5">{f.icon}</div>
                      <div className="font-medium leading-tight">{f.label}</div>
                      <div className="text-white/30 text-[10px] leading-tight mt-0.5">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div>
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Topic / Title</p>
                <textarea
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder={`e.g. "Why AI will change content marketing forever"`}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {/* Tone */}
              <div>
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Tone</p>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                        tone === t
                          ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                          : "border-white/10 text-white/40 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional context */}
              <div>
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Context <span className="normal-case text-white/20">(optional)</span></p>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="Target audience, key points to include, brand voice notes…"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={generate}
                disabled={generating || !topic.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Writing…
                  </span>
                ) : (
                  `✍️ Generate ${selectedFormat.label}`
                )}
              </button>
            </div>

            {/* Saved docs list */}
            {docs.length > 0 && (
              <div className="border-t border-white/8 p-4">
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Recent Docs</p>
                <div className="space-y-1">
                  {docs.slice(0, 20).map(doc => (
                    <div key={doc.id} className="group flex items-center gap-1">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className={`flex-1 text-left px-2 py-1.5 rounded-lg text-xs transition-all truncate ${
                          selectedDoc?.id === doc.id
                            ? "bg-violet-500/15 text-violet-300"
                            : "text-white/40 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {FORMATS.find(f => f.value === doc.format)?.icon} {doc.title.replace(/^[^:]+:\s*/, "")}
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 text-xs px-1 transition-all"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel — output */}
          <div className="flex-1 overflow-y-auto">
            {!selectedDoc ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
                <div className="text-5xl mb-4">✍️</div>
                <h2 className="text-white font-bold text-xl mb-2">Ghost Writer by Lyra</h2>
                <p className="text-white/30 text-sm max-w-sm">
                  Choose a format, enter your topic, pick a tone — Lyra writes it for you in seconds.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3 max-w-sm">
                  {["Blog Post about AI trends", "LinkedIn article on productivity", "Twitter thread on building habits", "Email pitch for new service"].map(ex => (
                    <button
                      key={ex}
                      onClick={() => setTopic(ex)}
                      className="text-left px-3 py-2 rounded-xl border border-white/8 text-white/40 text-xs hover:text-white hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 max-w-3xl mx-auto">
                {/* Doc header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {FORMATS.find(f => f.value === selectedDoc.format)?.icon} {FORMATS.find(f => f.value === selectedDoc.format)?.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/10">
                        {selectedDoc.tone}
                      </span>
                      <span className="text-white/20 text-xs">{selectedDoc.wordCount} words</span>
                    </div>
                    <h1 className="text-white font-bold text-lg mt-1">{selectedDoc.topic}</h1>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => copy(selectedDoc.content)}
                      className="px-3 py-1.5 text-xs border border-violet-500/30 text-violet-400 rounded-lg hover:bg-violet-500/10 transition-all"
                    >
                      {copied ? "Copied!" : "Copy All"}
                    </button>
                    <button
                      onClick={() => handleDelete(selectedDoc.id)}
                      className="px-3 py-1.5 text-xs border border-red-500/20 text-red-400/50 rounded-lg hover:text-red-400 hover:bg-red-500/5 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                  <pre className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap font-sans">{selectedDoc.content}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
