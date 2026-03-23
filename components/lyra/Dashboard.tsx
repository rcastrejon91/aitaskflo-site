"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, Loader2, Brain, Lightbulb, GitBranch,
  Zap, ArrowLeft, CheckCircle, AlertCircle, X, PanelLeftClose, PanelLeftOpen, LogOut, SlidersHorizontal,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { LineageGraph } from "./LineageGraph";
import { MemoryPanel } from "./MemoryPanel";
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

type RightPanel = "memory" | "reflection";

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
  const [rightPanel, setRightPanel] = useState<RightPanel>("memory");
  const [conversationId] = useState(() => generateId());
  const [evolving, setEvolving] = useState(false);
  const [evolutionReady, setEvolutionReady] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
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
      const [stateRes, agentsRes, memoriesRes] = await Promise.all([
        fetch("/api/lyra/state"),
        fetch("/api/lyra/agents"),
        fetch("/api/lyra/memories?limit=50"),
      ]);
      const [stateData, agentsData, memoriesData] = await Promise.all([
        stateRes.json(), agentsRes.json(), memoriesRes.json(),
      ]);
      setData((prev) => ({
        ...prev,
        state: stateData.state ?? prev.state,
        activeAgent: stateData.activeAgent ?? prev.activeAgent,
        stats: stateData.stats ?? prev.stats,
        agents: agentsData.agents ?? prev.agents,
        lineage: agentsData.lineage ?? prev.lineage,
        memories: memoriesData.memories ?? prev.memories,
      }));
    } catch { /* ignore */ }
  }, []);

  async function sendMessage() {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "48px";

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
    ta.style.height = "48px";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const QUICK_PROMPTS = [
    { icon: "⚡", text: "How can I automate my email workflow?" },
    { icon: "✍️", text: "Write a blog post about AI automation" },
    { icon: "🎙️", text: "Create a podcast script about productivity" },
  ];

  return (
    <div className="flex flex-col bg-slate-950 text-white" style={{ height: "100dvh" }}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 h-14 bg-black/40 border-b border-white/[0.06] flex-shrink-0">
        <Link href="/" className="text-white/30 hover:text-white/70 transition-colors mr-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Brand */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-semibold text-sm truncate">{activeAgent.name}</span>
          <span className="text-[11px] text-white/30 flex-shrink-0">Gen {activeAgent.generation}</span>
        </div>

        {/* Stats pills */}
        <div className="hidden sm:flex items-center gap-2 ml-2">
          <Pill color="violet">{data.stats.totalAgents} agents</Pill>
          <Pill color="fuchsia">{data.stats.totalMemories} memories</Pill>
          <Pill color="amber">{data.stats.totalReflections} reflections</Pill>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            online
          </span>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

          {messages.length >= 2 && (
            <button
              onClick={endConversationAndReflect}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 text-xs rounded-lg transition-all disabled:opacity-40"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reflect</span>
            </button>
          )}

          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
            title="Toggle lineage panel"
          >
            {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Evolution banner ────────────────────────────────────── */}
      <AnimatePresence>
        {evolutionReady && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-violet-900/70 to-fuchsia-900/70 border-b border-violet-500/20 text-sm">
              <Zap className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <span className="flex-1 text-white/70">
                <span className="text-violet-300 font-medium">Ready to evolve.</span>
                {" "}Create an improved Lyra successor?
              </span>
              <button
                onClick={triggerEvolution}
                disabled={evolving}
                className="flex items-center gap-1.5 px-3 py-1 bg-violet-500 hover:bg-violet-600 text-white text-xs rounded-lg transition-all disabled:opacity-40"
              >
                {evolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {evolving ? "Evolving…" : "Evolve"}
              </button>
              <button onClick={() => setEvolutionReady(false)} className="text-white/30 hover:text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3-column body ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left — Lineage */}
        <div
          className="border-r border-white/[0.06] bg-black/20 flex flex-col overflow-hidden transition-all duration-250 flex-shrink-0"
          style={{ width: leftOpen ? "260px" : "0px" }}
        >
          <div className="flex-1 overflow-y-auto p-4 min-w-[260px]">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
                Lineage Tree
              </span>
            </div>

            <div className="mb-4">
              <LineageGraph
                graph={data.lineage}
                activeAgentId={activeAgent.id}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
              />
            </div>

            {selectedAgentId && (() => {
              const agent = data.agents.find((a) => a.id === selectedAgentId);
              if (!agent) return null;
              return (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{agent.name}</span>
                    {agent.id !== activeAgent.id && (
                      <button
                        onClick={() => switchAgent(agent.id)}
                        className="text-[11px] text-violet-400 hover:text-violet-300 transition"
                      >
                        Switch →
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5 text-[11px] text-white/45">
                    <div>Gen {agent.generation} · {agent.reflectionCount} reflections</div>
                    <div>{agent.conversationCount} conversations</div>
                    {agent.averageScore > 0 && (
                      <div className="text-violet-400">Avg {agent.averageScore.toFixed(1)}/10</div>
                    )}
                    {agent.evolutionNotes && (
                      <div className="mt-1.5 italic leading-relaxed" style={{ color: "#a0a0a0", lineHeight: 1.6 }}>
                        &ldquo;{agent.evolutionNotes}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Center — Chat */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-5 shadow-2xl shadow-violet-500/25"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-xl font-bold mb-1">{activeAgent.name}</h2>
                <p className="text-white/40 text-sm mb-1">Generation {activeAgent.generation}</p>
                <p className="text-white/35 text-sm max-w-sm mb-8 leading-relaxed">
                  {activeAgent.generation === 0
                    ? "I'm the genesis of the Lyra lineage. Every conversation shapes my evolution."
                    : activeAgent.evolutionNotes}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-lg">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.text}
                      onClick={() => { setInput(p.text); textareaRef.current?.focus(); }}
                      className="p-3 border border-white/[0.10] hover:border-violet-500/40 rounded-xl text-left transition-all"
                      style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}
                    >
                      <div className="text-base mb-1">{p.icon}</div>
                      <p className="text-xs text-white/50 leading-snug">{p.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mr-2.5 flex-shrink-0 mt-1">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] sm:max-w-xl rounded-2xl px-4 py-3 leading-relaxed ${
                        msg.role === "user"
                          ? "text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/15"
                          : "text-[15px] bg-white/[0.05] border border-white/[0.08]"
                      }`}
                      style={msg.role === "assistant" ? { lineHeight: "1.65" } : {}}
                    >
                      {msg.content === "" && isLoading ? (
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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

          {/* Input */}
          <div className="px-4 pt-2 pb-3 border-t border-white/[0.06] flex-shrink-0" style={{ background: "#111113" }}>
            <div className="max-w-3xl mx-auto">
              {/* Prompt chips — always visible above input */}
              {messages.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.text}
                      onClick={() => { setInput(p.text); textareaRef.current?.focus(); }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] text-white/50 hover:text-white/80 border border-white/[0.08] hover:border-violet-500/40 transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(8px)" }}
                    >
                      <span>{p.icon}</span>{p.text}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div
                  className="flex-1 border rounded-xl overflow-hidden transition-all"
                  style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.10)" }}
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeAgent.name}…`}
                    disabled={isLoading}
                    className="w-full bg-transparent text-white placeholder-white/25 px-4 py-3 resize-none focus:outline-none text-sm"
                    style={{ minHeight: "48px", maxHeight: "160px" }}
                    onFocus={(e) => { e.currentTarget.parentElement!.style.borderColor = "rgba(139,92,246,0.6)"; e.currentTarget.parentElement!.style.boxShadow = "0 0 0 1px rgba(139,92,246,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.parentElement!.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.parentElement!.style.boxShadow = "none"; }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-30 text-white p-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 flex-shrink-0"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Right — Memory / Reflection */}
        <aside className="w-72 border-l border-white/[0.06] bg-black/20 flex flex-col flex-shrink-0 overflow-hidden hidden lg:flex">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] flex-shrink-0">
            {(["memory", "reflection"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightPanel(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                  rightPanel === tab
                    ? tab === "memory"
                      ? "text-violet-400 border-b-2 border-violet-500 bg-violet-500/5"
                      : "text-amber-400 border-b-2 border-amber-500 bg-amber-500/5"
                    : "text-white/35 hover:text-white/60"
                }`}
              >
                {tab === "memory" ? <Brain className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                {tab === "memory" ? "Memory" : "Reflections"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden p-3">
            {rightPanel === "memory"
              ? <MemoryPanel memories={data.memories} activeAgentId={activeAgent.id} onMemoryAdded={refreshAll} />
              : <ReflectionLog reflections={data.reflections} agentId={activeAgent.id} />}
          </div>
        </aside>
      </div>

      {/* ── Mobile right panel overlay ──────────────────────────── */}
      <AnimatePresence>
        {mobileRightOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setMobileRightOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-slate-950 border-l border-white/[0.08] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex gap-2">
                  {(["memory", "reflection"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRightPanel(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        rightPanel === tab
                          ? tab === "memory" ? "bg-violet-500/20 text-violet-300" : "bg-amber-500/20 text-amber-300"
                          : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      {tab === "memory" ? "Memory" : "Reflections"}
                    </button>
                  ))}
                </div>
                <button onClick={() => setMobileRightOpen(false)} className="text-white/40 hover:text-white/70">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden p-3">
                {rightPanel === "memory"
                  ? <MemoryPanel memories={data.memories} activeAgentId={activeAgent.id} onMemoryAdded={refreshAll} />
                  : <ReflectionLog reflections={data.reflections} agentId={activeAgent.id} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile FAB ──────────────────────────────────────────── */}
      <button
        onClick={() => setMobileRightOpen(true)}
        className="fixed bottom-20 right-4 z-30 lg:hidden w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/30 flex items-center justify-center transition-all"
      >
        <SlidersHorizontal className="w-4 h-4 text-white" />
      </button>

      {/* ── Toast notification ──────────────────────────────────── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm shadow-2xl ${
              notification.type === "success"
                ? "bg-emerald-950 border border-emerald-500/30 text-emerald-300"
                : "bg-red-950 border border-red-500/30 text-red-300"
            }`}
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

function Pill({ color, children }: { color: "violet" | "fuchsia" | "amber"; children: React.ReactNode }) {
  const colors = {
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    fuchsia: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
    amber:   "bg-amber-500/10  text-amber-400  border-amber-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${colors[color]}`}>
      {children}
    </span>
  );
}
