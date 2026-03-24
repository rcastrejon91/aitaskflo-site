"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, Loader2, Lightbulb, GitBranch,
  Zap, ArrowLeft, CheckCircle, AlertCircle, X, LogOut, SlidersHorizontal,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { LineageGraph } from "./LineageGraph";
import { ReflectionLog } from "./ReflectionLog";
import { MessageRenderer } from "./MessageRenderer";
import type {
  Agent, Memory, Reflection, LineageGraph as LineageGraphType, LyraState,
} from "@/lib/types/lyra";

interface Message {
  role: "user" | "assistant";
  content: string;
  kind?: "reflection" | "evolution";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: any;
}

interface DashboardData {
  state: LyraState;
  activeAgent: Agent;
  agents: Agent[];
  lineage: LineageGraphType;
  memories: Memory[];
  reflections: Reflection[];
  stats: { totalAgents: number; totalMemories: number; totalReflections: number; generations: number };
}

type RightPanel = "reflection" | "lineage";

// ── Crystal Ball Loading Animation ───────────────────────────────────────────

function CrystalBallLoader() {
  return (
    <span className="flex items-center gap-3 py-1">
      <span className="relative flex-shrink-0" style={{ width: 36, height: 36 }}>
        {/* Glow behind ball */}
        <span className="absolute inset-0 rounded-full animate-pulse" style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
          transform: "scale(1.4)",
        }} />
        {/* Crystal ball body */}
        <span className="absolute inset-0 rounded-full" style={{
          background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18) 0%, rgba(139,92,246,0.35) 40%, rgba(76,29,149,0.7) 100%)",
          boxShadow: "0 0 16px rgba(139,92,246,0.5), inset 0 1px 2px rgba(255,255,255,0.15)",
          border: "1px solid rgba(139,92,246,0.4)",
        }} />
        {/* Inner swirl */}
        <span className="absolute rounded-full" style={{
          width: 10, height: 10, top: 8, left: 8,
          background: "radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(196,181,253,0.2) 100%)",
          animation: "ping 1.8s cubic-bezier(0,0,0.2,1) infinite",
        }} />
        {/* Base */}
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{
          width: 20, height: 4,
          background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)",
          borderRadius: "50%",
        }} />

        {/* Floating stars */}
        {[
          { size: 3, top: -4,  left: 20, delay: "0s",    dur: "2s"   },
          { size: 2, top: 2,   left: 34, delay: "0.4s",  dur: "2.3s" },
          { size: 3, top: -6,  left: 8,  delay: "0.8s",  dur: "1.9s" },
          { size: 2, top: 14,  left: 38, delay: "1.1s",  dur: "2.5s" },
          { size: 2, top: -2,  left: -2, delay: "0.6s",  dur: "2.1s" },
        ].map((s, i) => (
          <span key={i} className="absolute rounded-full" style={{
            width: s.size, height: s.size,
            top: s.top, left: s.left,
            background: "rgba(196,181,253,0.9)",
            boxShadow: "0 0 4px rgba(196,181,253,0.8)",
            animation: `bounce ${s.dur} ${s.delay} ease-in-out infinite`,
            opacity: 0.8,
          }} />
        ))}
      </span>

      <span className="flex flex-col gap-0.5">
        <span className="text-xs text-violet-300/70 animate-pulse" style={{ letterSpacing: "0.05em" }}>
          Lyra is thinking…
        </span>
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="rounded-full" style={{
              width: 4, height: 4,
              background: "rgba(139,92,246,0.6)",
              animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
            }} />
          ))}
        </span>
      </span>
    </span>
  );
}

// ── In-chat animated event cards ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReflectionChatCard({ reflection }: { reflection: any }) {
  const score: number = reflection?.score ?? 0;
  const color = score >= 8 ? "#22c55e" : score >= 5 ? "#a855f7" : "#f97316";
  const stars = "✦".repeat(Math.round(score / 2));
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 260 }}
      className="my-3 rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(139,92,246,0.25)", background: "linear-gradient(135deg, rgba(88,28,235,0.12) 0%, rgba(109,40,217,0.06) 100%)" }}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
        <span className="text-base">🔮</span>
        <span className="text-xs font-semibold text-violet-300 tracking-wide">Reflection</span>
        <span className="ml-auto text-xs font-bold tabular-nums" style={{ color }}>{score}/10</span>
        <span className="text-xs" style={{ color, letterSpacing: "-1px" }}>{stars}</span>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {reflection?.conversationSummary && (
          <p className="text-xs text-white/55 leading-relaxed italic">{reflection.conversationSummary}</p>
        )}
        {reflection?.whatWentWell?.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">Went well</span>
            <ul className="mt-1 space-y-0.5">
              {reflection.whatWentWell.map((item: string, i: number) => (
                <li key={i} className="text-xs text-white/60 pl-3">• {item}</li>
              ))}
            </ul>
          </div>
        )}
        {reflection?.whatToImprove?.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-widest">To improve</span>
            <ul className="mt-1 space-y-0.5">
              {reflection.whatToImprove.map((item: string, i: number) => (
                <li key={i} className="text-xs text-white/60 pl-3">• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EvolutionChatCard({ agent }: { agent: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 15, stiffness: 200 }}
      className="my-3 rounded-2xl overflow-hidden text-center py-5 px-4"
      style={{ border: "1px solid rgba(217,70,239,0.3)", background: "linear-gradient(135deg, rgba(134,25,143,0.15) 0%, rgba(88,28,235,0.1) 100%)" }}
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="text-4xl mb-2"
      >✨</motion.div>
      <p className="text-xs font-semibold text-fuchsia-300 tracking-widest uppercase mb-1">Evolution</p>
      <p className="text-sm font-bold text-white">{agent?.name ?? "New generation"}</p>
      {agent?.evolutionNotes && (
        <p className="text-xs text-white/45 mt-1.5 leading-relaxed">{agent.evolutionNotes}</p>
      )}
      <p className="text-[10px] text-white/25 mt-2">Gen {agent?.generation ?? "?"}</p>
    </motion.div>
  );
}

function generateId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function Dashboard({ initial, userId }: { initial: DashboardData; userId: string }) {
  const [data, setData] = useState<DashboardData>(initial);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>("reflection");
  const [conversationId] = useState(() => generateId());
  const [evolving, setEvolving] = useState(false);
  const [evolutionReady, setEvolutionReady] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(initial.activeAgent.id);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function showNotification(type: "success" | "error", msg: string) {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  }

  const refreshAll = useCallback(async () => {
    try {
      const [stateRes, agentsRes] = await Promise.all([
        fetch("/api/lyra/state"),
        fetch("/api/lyra/agents"),
      ]);
      const [stateData, agentsData] = await Promise.all([
        stateRes.json(), agentsRes.json(),
      ]);
      setData((prev) => ({
        ...prev,
        state: stateData.state ?? prev.state,
        activeAgent: stateData.activeAgent ?? prev.activeAgent,
        stats: stateData.stats ?? prev.stats,
        agents: agentsData.agents ?? prev.agents,
        lineage: agentsData.lineage ?? prev.lineage,
      }));
    } catch { /* ignore */ }
  }, []);

  async function sendMessage() {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "52px";

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/lyra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, conversationId, agentId: data.activeAgent.id, userId }),
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
          updated[updated.length - 1] = { role: "assistant", content: updated[updated.length - 1].content + chunk };
          return updated;
        });
      }
      // Background reflect after 2+ exchanges — keeps memory fresh automatically
      if (history.length >= 2) {
        fetch("/api/lyra/reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            agentId: data.activeAgent.id,
            transcript: [...history, { role: "user" as const, content: text }],
            userId,
          }),
        })
          .then(() => refreshAll())
          .catch(() => {});
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function endConversationAndReflect() {
    if (messages.length < 2) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/lyra/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, agentId: data.activeAgent.id, transcript: messages.map((m) => ({ role: m.role, content: m.content })), userId }),
      });
      const result = await res.json();
      if (result.reflection) {
        setData((prev) => ({ ...prev, reflections: [result.reflection, ...prev.reflections] }));
        // Push reflection as animated chat card
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "",
          kind: "reflection",
          meta: result.reflection,
        }]);
        showNotification("success", `Reflection complete — score: ${result.reflection.score}/10`);
        if (result.evolutionReady) setEvolutionReady(true);
      }
      await refreshAll();
    } catch {
      showNotification("error", "Failed to generate reflection");
    } finally {
      setIsLoading(false);
    }
  }

  async function triggerEvolution() {
    setEvolving(true);
    setEvolutionReady(false);
    try {
      const res = await fetch("/api/lyra/evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentAgentId: data.activeAgent.id }),
      });
      const result = await res.json();
      if (result.newAgent) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "",
          kind: "evolution",
          meta: result.newAgent,
        }]);
        showNotification("success", `Lyra evolved to ${result.newAgent.name}!`);
        await refreshAll();
      } else {
        showNotification("error", result.error ?? "Evolution failed");
      }
    } catch {
      showNotification("error", "Evolution failed");
    } finally {
      setEvolving(false);
    }
  }

  async function switchAgent(agentId: string) {
    setSelectedAgentId(agentId);
    await fetch("/api/lyra/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeAgentId: agentId }),
    });
    await refreshAll();
    showNotification("success", `Switched to ${data.agents.find((a) => a.id === agentId)?.name}`);
  }

  const activeAgent = data.activeAgent;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "52px";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const QUICK_PROMPTS = [
    { icon: "⚡", text: "How can I automate my email workflow?" },
    { icon: "✍️", text: "Write a blog post about AI automation" },
    { icon: "🎙️", text: "Create a podcast script about productivity" },
  ];

  return (
    <div className="flex flex-col text-white" style={{ height: "100dvh", background: "#09090f" }}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 h-12 flex-shrink-0" style={{ background: "rgba(0,0,0,0.5)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/" className="transition-colors" style={{ color: "rgba(255,255,255,0.2)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Agent name — shown once, cleanly */}
        <span className="text-sm font-medium text-white/70 truncate">{activeAgent.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.05)" }}>
          gen {activeAgent.generation}
        </span>

        {/* Evolution ready — small inline chip instead of a banner */}
        <AnimatePresence>
          {evolutionReady && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1.5"
            >
              <button
                onClick={triggerEvolution}
                disabled={evolving}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all disabled:opacity-40"
                style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(196,181,253)" }}
              >
                {evolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {evolving ? "Evolving…" : "Evolve"}
              </button>
              <button onClick={() => setEvolutionReady(false)} style={{ color: "rgba(255,255,255,0.25)" }}>
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ml-auto flex items-center gap-2">
          {activeAgent.averageScore > 0 && (
            <span className="text-[11px] hidden md:block" style={{ color: "rgba(255,255,255,0.2)" }}>
              ★ {activeAgent.averageScore.toFixed(1)}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.2)" }}
            title="Sign out"
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Center — Chat */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 space-y-5">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-8">
                {/* Hero icon + greeting */}
                <div>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 8px 32px rgba(109,40,217,0.35)" }}>
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-1">{activeAgent.name}</h2>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Generation {activeAgent.generation} · Ask me anything
                  </p>
                </div>

                {/* Quick prompt cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.text}
                      onClick={() => { setInput(p.text); textareaRef.current?.focus(); }}
                      className="p-4 rounded-xl text-left transition-all"
                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(109,40,217,0.4)";
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(109,40,217,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.025)";
                      }}
                    >
                      <div className="text-xl mb-2.5">{p.icon}</div>
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{p.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => {
                  // Reflection event card
                  if (msg.kind === "reflection") {
                    return <ReflectionChatCard key={i} reflection={msg.meta} />;
                  }
                  // Evolution event card
                  if (msg.kind === "evolution") {
                    return <EvolutionChatCard key={i} agent={msg.meta} />;
                  }
                  return (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center mr-2.5 flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 2px 10px rgba(109,40,217,0.3)" }}>
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] sm:max-w-xl rounded-2xl px-4 py-3 ${msg.role === "user" ? "text-sm text-white" : "text-[15px] text-white/90"}`}
                        style={msg.role === "user" ? {
                          background: "linear-gradient(135deg, rgba(109,40,217,0.9), rgba(134,25,143,0.85))",
                          border: "1px solid rgba(109,40,217,0.3)",
                          boxShadow: "0 4px 20px rgba(109,40,217,0.2)",
                        } : {
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderLeft: "2px solid rgba(109,40,217,0.45)",
                          lineHeight: "1.65",
                        }}
                      >
                        {msg.content === "" && isLoading ? (
                          <CrystalBallLoader />
                        ) : (
                          <MessageRenderer content={msg.content} />
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="px-4 pt-3 pb-4 flex-shrink-0" style={{ background: "#09090f", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="max-w-3xl mx-auto">
              {/* Prompt chips */}
              {messages.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.text}
                      onClick={() => { setInput(p.text); textareaRef.current?.focus(); }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] transition-all"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.38)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(109,40,217,0.4)";
                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.38)";
                      }}
                    >
                      <span>{p.icon}</span>{p.text}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div
                  className="flex-1 rounded-2xl overflow-hidden transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeAgent.name}…`}
                    disabled={isLoading}
                    className="w-full bg-transparent text-white px-4 py-3.5 resize-none focus:outline-none text-sm"
                    style={{ minHeight: "52px", maxHeight: "160px", caretColor: "rgb(167,139,250)", color: "rgba(255,255,255,0.9)" }}
                    onFocus={(e) => {
                      e.currentTarget.parentElement!.style.borderColor = "rgba(109,40,217,0.5)";
                      e.currentTarget.parentElement!.style.boxShadow = "0 0 0 3px rgba(109,40,217,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.parentElement!.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.parentElement!.style.boxShadow = "none";
                    }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="text-white p-3.5 rounded-2xl transition-all flex-shrink-0 disabled:opacity-25"
                  style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 4px 16px rgba(109,40,217,0.3)" }}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-center text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.14)" }}>
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </main>

        {/* Right — Reflection / Lineage */}
        <aside className="w-72 flex-col flex-shrink-0 overflow-hidden hidden lg:flex" style={{ background: "rgba(0,0,0,0.35)", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {(["reflection", "lineage"] as const).map((tab) => {
              const active = rightPanel === tab;
              const accentColor = tab === "reflection" ? "rgb(252,211,77)" : "rgb(217,70,239)";
              return (
                <button
                  key={tab}
                  onClick={() => setRightPanel(tab)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-all"
                  style={active
                    ? { color: accentColor, borderBottom: `2px solid ${accentColor}` }
                    : { color: "rgba(255,255,255,0.28)" }
                  }
                >
                  {tab === "reflection" ? <Lightbulb className="w-3.5 h-3.5" /> : <GitBranch className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-hidden p-3 flex flex-col gap-2">
            {rightPanel === "reflection" && (
              <>
                {messages.length >= 2 && (
                  <button
                    onClick={endConversationAndReflect}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40 flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
                    Reflect on this conversation
                  </button>
                )}
                <div className="flex-1 overflow-hidden">
                  <ReflectionLog reflections={data.reflections} agentId={activeAgent.id} />
                </div>
              </>
            )}
            {rightPanel === "lineage" && (
              <div className="overflow-y-auto h-full space-y-3">
                <LineageGraph graph={data.lineage} activeAgentId={activeAgent.id} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} />
                {selectedAgentId && (() => {
                  const agent = data.agents.find((a) => a.id === selectedAgentId);
                  if (!agent) return null;
                  return (
                    <div className="rounded-xl p-3" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{agent.name}</span>
                          <span className="text-[10px] ml-2" style={{ color: "rgba(255,255,255,0.28)" }}>Gen {agent.generation}</span>
                        </div>
                        {agent.id !== activeAgent.id && (
                          <button onClick={() => switchAgent(agent.id)} className="text-[10px] transition-colors" style={{ color: "rgb(167,139,250)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "rgb(196,181,253)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgb(167,139,250)")}
                          >
                            Switch →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Mobile right panel overlay ────────────────────────── */}
      <AnimatePresence>
        {mobileRightOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setMobileRightOpen(false)}
          >
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.75)" }} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-80 flex flex-col"
              style={{ background: "#0d0d14", borderLeft: "1px solid rgba(255,255,255,0.07)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex gap-2">
                  {(["reflection", "lineage"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRightPanel(tab)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={rightPanel === tab
                        ? { background: tab === "reflection" ? "rgba(161,98,7,0.15)" : "rgba(134,25,143,0.15)", color: tab === "reflection" ? "rgb(252,211,77)" : "rgb(240,171,252)" }
                        : { color: "rgba(255,255,255,0.38)" }
                      }
                    >
                      {tab === "reflection" ? <Lightbulb className="w-3.5 h-3.5" /> : <GitBranch className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
                <button onClick={() => setMobileRightOpen(false)} style={{ color: "rgba(255,255,255,0.38)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden p-3 flex flex-col gap-2">
                {rightPanel === "reflection" && (
                  <>
                    {messages.length >= 2 && (
                      <button
                        onClick={() => { setMobileRightOpen(false); endConversationAndReflect(); }}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40 flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                      >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
                        Reflect on this conversation
                      </button>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <ReflectionLog reflections={data.reflections} agentId={activeAgent.id} />
                    </div>
                  </>
                )}
                {rightPanel === "lineage" && <LineageGraph graph={data.lineage} activeAgentId={activeAgent.id} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile FAB ────────────────────────────────────────── */}
      <button
        onClick={() => setMobileRightOpen(true)}
        className="fixed bottom-20 right-4 z-30 lg:hidden w-11 h-11 rounded-full flex items-center justify-center transition-all"
        style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 4px 20px rgba(109,40,217,0.4)" }}
      >
        <SlidersHorizontal className="w-4 h-4 text-white" />
      </button>

      {/* ── Toast notification ───────────────────────────────── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm shadow-2xl"
            style={notification.type === "success" ? {
              background: "rgba(6,78,59,0.97)",
              border: "1px solid rgba(16,185,129,0.3)",
              color: "rgb(110,231,183)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            } : {
              background: "rgba(69,10,10,0.97)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "rgb(252,165,165)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {notification.type === "success"
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
