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
        setRightPanel("reflection");
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
      <header className="flex items-center gap-3 px-4 h-14 flex-shrink-0 backdrop-blur-xl" style={{ background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/" className="transition-colors mr-1" style={{ color: "rgba(255,255,255,0.2)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Brand */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 2px 12px rgba(109,40,217,0.35)" }}>
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>

        {/* Agent name + gen badge */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-white truncate">{activeAgent.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0" style={{ background: "rgba(109,40,217,0.15)", color: "rgb(196,181,253)", border: "1px solid rgba(109,40,217,0.25)" }}>
            Gen {activeAgent.generation}
          </span>
        </div>

        {/* Stats (desktop) */}
        <div className="hidden md:flex items-center gap-4 ml-3">
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
            {data.stats.totalReflections} reflections
          </span>
          {activeAgent.averageScore > 0 && (
            <span className="text-[11px] font-medium" style={{ color: activeAgent.averageScore >= 8 ? "rgb(110,231,183)" : activeAgent.averageScore >= 5 ? "rgb(196,181,253)" : "rgb(252,165,165)" }}>
              ★ {activeAgent.averageScore.toFixed(1)}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {messages.length >= 2 && (
            <button
              onClick={endConversationAndReflect}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-40"
              style={{ background: "rgba(161,98,7,0.1)", border: "1px solid rgba(161,98,7,0.25)", color: "rgb(252,211,77)" }}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reflect</span>
            </button>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.22)" }}
            title="Sign out"
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Evolution banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {evolutionReady && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 text-sm" style={{ background: "linear-gradient(to right, rgba(109,40,217,0.35), rgba(134,25,143,0.35))", borderBottom: "1px solid rgba(109,40,217,0.2)" }}>
              <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "rgb(196,181,253)" }} />
              <span className="flex-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                <span className="font-medium" style={{ color: "rgb(196,181,253)" }}>Ready to evolve.</span>
                {" "}Create an improved Lyra successor?
              </span>
              <button
                onClick={triggerEvolution}
                disabled={evolving}
                className="flex items-center gap-1.5 px-3 py-1 text-white text-xs rounded-lg transition-all disabled:opacity-40"
                style={{ background: "rgba(109,40,217,0.85)" }}
              >
                {evolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {evolving ? "Evolving…" : "Evolve"}
              </button>
              <button onClick={() => setEvolutionReady(false)} style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {messages.map((msg, i) => (
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
                        <span className="flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(255,255,255,0.5)", animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(255,255,255,0.5)", animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(255,255,255,0.5)", animationDelay: "300ms" }} />
                        </span>
                      ) : (
                        <MessageRenderer content={msg.content} />
                      )}
                    </div>
                  </div>
                ))}
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
                  {tab === "reflection" ? <Lightbulb className="w-3 h-3" /> : <GitBranch className="w-3 h-3" />}
                  {tab === "reflection" ? "Reflections" : "Lineage"}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-hidden p-3">
            {rightPanel === "reflection" && <ReflectionLog reflections={data.reflections} agentId={activeAgent.id} />}
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
                      {tab === "reflection" ? "Reflections" : "Lineage"}
                    </button>
                  ))}
                </div>
                <button onClick={() => setMobileRightOpen(false)} style={{ color: "rgba(255,255,255,0.38)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden p-3">
                {rightPanel === "reflection" && <ReflectionLog reflections={data.reflections} agentId={activeAgent.id} />}
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
