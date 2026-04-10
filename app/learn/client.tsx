"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, BookOpen, Brain, Zap, Eye, Wrench, Leaf, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MessageRenderer } from "@/components/lyra/MessageRenderer";
import { AppShell } from "@/components/lyra/AppShell";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface StyleInfo {
  label: string;
  emoji: string;
  desc: string;
}

interface ProfileData {
  style: StyleInfo;
  scores: { visual: number; chunked: number; gentle: number; handson: number };
  totalSessions: number;
  dominantStyle: string;
  subjects: Array<{ subject: string; level: string; lessonsCompleted: number; lastStudied: string }>;
}

const SUBJECTS = [
  { id: "math",       label: "Mathematics",    emoji: "∑" },
  { id: "physics",    label: "Physics",         emoji: "⚛️" },
  { id: "coding",     label: "Coding",          emoji: "💻" },
  { id: "history",    label: "History",         emoji: "📜" },
  { id: "science",    label: "Science",         emoji: "🔬" },
  { id: "language",   label: "Language",        emoji: "🗣️" },
  { id: "music",      label: "Music Theory",    emoji: "🎵" },
  { id: "finance",    label: "Finance",         emoji: "📈" },
  { id: "philosophy", label: "Philosophy",      emoji: "🧠" },
  { id: "ai",         label: "AI & ML",         emoji: "🤖" },
];

const STYLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  balanced: Brain,
  visual:   Eye,
  chunked:  Zap,
  gentle:   Leaf,
  handson:  Wrench,
};

const STYLE_COLORS: Record<string, string> = {
  balanced: "rgba(139,92,246,0.8)",
  visual:   "rgba(6,182,212,0.8)",
  chunked:  "rgba(234,179,8,0.8)",
  gentle:   "rgba(34,197,94,0.8)",
  handson:  "rgba(249,115,22,0.8)",
};

// ── Score bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, value)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function LearnClient({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [showSubjects, setShowSubjects] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/lyra/learner")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(override?: string) {
    const text = (override ?? input).trim();
    if (!text || isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "48px";
    setShowSubjects(false);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setIsLoading(true);

    // Update learning profile with this message
    fetch("/api/lyra/learner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, subject: activeSubject }),
    })
      .then((r) => r.json())
      .then((d) => setProfile(d.profile))
      .catch(() => {});

    try {
      const subjectContext = activeSubject
        ? `[LEARNING MODE] Subject: ${activeSubject}. Teach this topic adaptively based on my learning profile.`
        : "[LEARNING MODE] Adapt your teaching style to how I learn best.";

      const response = await fetch("/api/lyra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${subjectContext}\n\n${text}`,
          history,
          conversationId: `learn-${userId}`,
          userId,
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }

  const StyleIcon = profile ? (STYLE_ICONS[profile.dominantStyle] ?? Brain) : Brain;
  const styleColor = profile ? (STYLE_COLORS[profile.dominantStyle] ?? STYLE_COLORS.balanced) : STYLE_COLORS.balanced;

  return (
    <AppShell>
    <div className="flex text-white" style={{ minHeight: "calc(100dvh - 88px)", background: "#09090f" }}>

      {/* ── Left sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 overflow-y-auto" style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}>

        {/* Back + title */}
        <div className="flex items-center gap-2 px-4 h-12 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/lyra" style={{ color: "rgba(255,255,255,0.2)" }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <BookOpen className="w-4 h-4" style={{ color: styleColor }} />
          <span className="text-sm font-semibold text-white/80">Learn</span>
        </div>

        {/* Learning profile */}
        {profile && (
          <div className="p-4 space-y-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${styleColor}20`, border: `1px solid ${styleColor}40` }}>
                <StyleIcon className="w-3.5 h-3.5" style={{ color: styleColor }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80">{profile.style.emoji} {profile.style.label}</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{profile.totalSessions} sessions</p>
              </div>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{profile.style.desc}</p>
            <div className="space-y-2">
              <ScoreBar label="Visual"    value={profile.scores.visual}   color="rgba(6,182,212,0.7)" />
              <ScoreBar label="Chunked"   value={profile.scores.chunked}  color="rgba(234,179,8,0.7)" />
              <ScoreBar label="Gentle"    value={profile.scores.gentle}   color="rgba(34,197,94,0.7)" />
              <ScoreBar label="Hands-on"  value={profile.scores.handson}  color="rgba(249,115,22,0.7)" />
            </div>
          </div>
        )}

        {/* Subjects */}
        <div className="p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>Subjects</p>
          <div className="space-y-0.5">
            {SUBJECTS.map((s) => {
              const progress = profile?.subjects.find((sub) => sub.subject === s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveSubject(s.id); setShowSubjects(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all"
                  style={{
                    background: activeSubject === s.id ? `${styleColor}15` : "transparent",
                    border: `1px solid ${activeSubject === s.id ? styleColor + "40" : "transparent"}`,
                  }}
                >
                  <span className="text-sm">{s.emoji}</span>
                  <span className="text-xs flex-1" style={{ color: activeSubject === s.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)" }}>
                    {s.label}
                  </span>
                  {progress && (
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {progress.lessonsCompleted}✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="flex items-center gap-3 px-4 h-12 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.4)" }}>
          <Link href="/lyra" className="md:hidden" style={{ color: "rgba(255,255,255,0.2)" }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${styleColor}20` }}>
            <StyleIcon className="w-3 h-3" style={{ color: styleColor }} />
          </div>
          <span className="text-sm font-medium text-white/70">
            {activeSubject ? SUBJECTS.find((s) => s.id === activeSubject)?.label : "Learning with Lyra"}
          </span>
          {profile && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${styleColor}15`, color: styleColor, border: `1px solid ${styleColor}30` }}>
              {profile.style.emoji} {profile.style.label}
            </span>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
              <div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `linear-gradient(135deg, ${styleColor}, rgba(109,40,217,0.8))`, boxShadow: `0 8px 32px ${styleColor}40` }}>
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-1">What do you want to learn?</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Lyra adapts to how your brain works — no one-size-fits-all lessons.
                </p>
              </div>

              {/* Subject grid */}
              <AnimatePresence>
                {showSubjects && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 sm:grid-cols-5 gap-2 w-full max-w-lg"
                  >
                    {SUBJECTS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setActiveSubject(s.id); sendMessage(`Teach me ${s.label} — start from where I am`); }}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = `${styleColor}10`;
                          (e.currentTarget as HTMLButtonElement).style.borderColor = `${styleColor}40`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                        }}
                      >
                        <span className="text-xl">{s.emoji}</span>
                        <span className="text-[10px] text-white/50">{s.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center mr-2.5 flex-shrink-0 mt-0.5" style={{ background: `linear-gradient(135deg, ${styleColor}, rgba(109,40,217,0.8))`, boxShadow: `0 2px 10px ${styleColor}40` }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className="max-w-[80%] sm:max-w-xl rounded-2xl px-4 py-3"
                style={msg.role === "user" ? {
                  background: "linear-gradient(135deg, rgba(109,40,217,0.9), rgba(134,25,143,0.85))",
                  border: "1px solid rgba(139,92,246,0.3)",
                  fontSize: "14px",
                  color: "#fff",
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderLeft: `2px solid ${styleColor}80`,
                }}
              >
                {msg.content === "" && isLoading ? (
                  <span className="flex items-center gap-2 py-1">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: styleColor }} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Lyra is thinking…</span>
                  </span>
                ) : (
                  <MessageRenderer content={msg.content} />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 pt-3 pb-4 flex-shrink-0" style={{ background: "#09090f", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const ta = e.target;
                ta.style.height = "48px";
                ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={activeSubject ? `Ask about ${SUBJECTS.find((s) => s.id === activeSubject)?.label}…` : "What do you want to understand today?"}
              className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all"
              style={{
                height: "48px",
                background: "rgba(255,255,255,0.05)",
                border: `1px solid rgba(255,255,255,0.09)`,
                lineHeight: "1.5",
              }}
              onFocus={(e) => (e.target.style.borderColor = `${styleColor}50`)}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.09)")}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
              style={{ background: `linear-gradient(135deg, ${styleColor}, rgba(109,40,217,0.8))` }}
            >
              {isLoading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      </main>
    </div>
    </AppShell>
  );
}
