"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, Loader2, Brain, Lightbulb, GitBranch,
  Zap, ArrowLeft, CheckCircle, AlertCircle, ChevronDown, ChevronUp, X
} from "lucide-react";
import Link from "next/link";
import { LineageGraph } from "./LineageGraph";
import { MemoryPanel } from "./MemoryPanel";
import { ReflectionLog } from "./ReflectionLog";
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

interface EvolutionAlert {
  visible: boolean;
  agentId: string;
}

function generateId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function Dashboard({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initial);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>("memory");
  const [conversationId] = useState(() => generateId());
  const [evolving, setEvolving] = useState(false);
  const [evolutionAlert, setEvolutionAlert] = useState<EvolutionAlert>({ visible: false, agentId: "" });
  const [leftOpen, setLeftOpen] = useState(true);
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

  const refresh = useCallback(async () => {
    try {
      const [stateRes, agentsRes, memoriesRes, reflectionsRes] = await Promise.all([
        fetch("/api/lyra/state"),
        fetch("/api/lyra/agents"),
        fetch("/api/lyra/memories?limit=50"),
        fetch("/api/lyra/memories?limit=1"), // Just to trigger
      ]);

      const [stateData, agentsData, memoriesData] = await Promise.all([
        stateRes.json(),
        agentsRes.json(),
        memoriesRes.json(),
      ]);

      // Fetch reflections separately
      const reflRes = await fetch("/api/lyra/state");
      const fullState = await reflRes.json();

      setData((prev) => ({
        ...prev,
        state: stateData.state ?? prev.state,
        activeAgent: stateData.activeAgent ?? prev.activeAgent,
        stats: stateData.stats ?? prev.stats,
        agents: agentsData.agents ?? prev.agents,
        lineage: agentsData.lineage ?? prev.lineage,
        memories: memoriesData.memories ?? prev.memories,
      }));
    } catch {
      /* ignore */
    }
  }, []);

  // Refresh reflections too
  async function refreshAll() {
    try {
      const [stateRes, agentsRes, memoriesRes] = await Promise.all([
        fetch("/api/lyra/state"),
        fetch("/api/lyra/agents"),
        fetch("/api/lyra/memories?limit=50"),
      ]);
      const [stateData, agentsData, memoriesData] = await Promise.all([
        stateRes.json(),
        agentsRes.json(),
        memoriesRes.json(),
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
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "48px";

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/lyra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          conversationId,
          agentId: data.activeAgent.id,
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `⚠️ ${msg}`,
        };
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
        body: JSON.stringify({
          conversationId,
          agentId: data.activeAgent.id,
          transcript: messages,
        }),
      });
      const result = await res.json();
      if (result.reflection) {
        setData((prev) => ({
          ...prev,
          reflections: [result.reflection, ...prev.reflections],
        }));
        setRightPanel("reflection");
        showNotification("success", `Reflection complete — score: ${result.reflection.score}/10`);
        if (result.evolutionReady) {
          setEvolutionAlert({ visible: true, agentId: data.activeAgent.id });
        }
      }
      await refreshAll();
    } catch {
      showNotification("error", "Failed to generate reflection");
    } finally {
      setIsLoading(false);
    }
  }

  async function triggerEvolution(agentId: string) {
    setEvolving(true);
    setEvolutionAlert({ visible: false, agentId: "" });
    try {
      const res = await fetch("/api/lyra/evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentAgentId: agentId }),
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 py-3 bg-black/30 backdrop-blur border-b border-white/5 flex-shrink-0">
        <Link href="/" className="text-white/40 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm">{activeAgent.name}</span>
            <span className="ml-2 text-xs text-white/30">Gen {activeAgent.generation}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-4 ml-4 text-xs text-white/40">
          <span><span className="text-purple-400 font-semibold">{data.stats.totalAgents}</span> agents</span>
          <span><span className="text-pink-400 font-semibold">{data.stats.totalMemories}</span> memories</span>
          <span><span className="text-yellow-400 font-semibold">{data.stats.totalReflections}</span> reflections</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Online indicator */}
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            online
          </span>

          {/* Reflect button */}
          {messages.length >= 2 && (
            <button
              onClick={endConversationAndReflect}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs rounded-lg transition-all disabled:opacity-40"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Reflect
            </button>
          )}

          {/* Left panel toggle */}
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-white/40 hover:text-white/70 transition-all"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Lineage
          </button>
        </div>
      </header>

      {/* Evolution alert */}
      <AnimatePresence>
        {evolutionAlert.visible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-purple-900/80 to-pink-900/80 border-b border-purple-500/30 px-4 py-3 flex items-center gap-4"
          >
            <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <p className="text-sm flex-1">
              <span className="font-semibold text-purple-300">Lyra is ready to evolve.</span>
              <span className="text-white/60 ml-2">
                {activeAgent.reflectionCount} reflections accumulated. Create an improved successor?
              </span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => triggerEvolution(evolutionAlert.agentId)}
                disabled={evolving}
                className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-lg transition-all disabled:opacity-40 flex items-center gap-1"
              >
                {evolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {evolving ? "Evolving..." : "Evolve Lyra"}
              </button>
              <button
                onClick={() => setEvolutionAlert({ visible: false, agentId: "" })}
                className="text-white/40 hover:text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`fixed top-16 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm shadow-xl ${
              notification.type === "success"
                ? "bg-green-900/80 border border-green-500/30 text-green-300"
                : "bg-red-900/80 border border-red-500/30 text-red-300"
            }`}
          >
            {notification.type === "success"
              ? <CheckCircle className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />}
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Lineage panel */}
        <AnimatePresence>
          {leftOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="border-r border-white/5 bg-black/20 flex flex-col overflow-hidden flex-shrink-0"
            >
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                  <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
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

                {/* Selected agent details */}
                {selectedAgentId && (
                  <div className="border border-white/10 rounded-xl p-3 bg-white/3">
                    {(() => {
                      const agent = data.agents.find((a) => a.id === selectedAgentId);
                      if (!agent) return null;
                      return (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">{agent.name}</span>
                            {agent.id !== activeAgent.id && (
                              <button
                                onClick={() => switchAgent(agent.id)}
                                className="text-xs text-purple-400 hover:text-purple-300 transition"
                              >
                                Switch →
                              </button>
                            )}
                          </div>
                          <div className="space-y-1 text-xs text-white/50">
                            <div>Gen {agent.generation} · {agent.reflectionCount} reflections</div>
                            <div>{agent.conversationCount} conversations</div>
                            {agent.averageScore > 0 && (
                              <div className="text-purple-400">
                                Avg score: {agent.averageScore.toFixed(1)}/10
                              </div>
                            )}
                            {agent.evolutionNotes && (
                              <div className="mt-2 italic text-white/40 leading-relaxed">
                                "{agent.evolutionNotes}"
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Center: Chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-5 shadow-2xl shadow-purple-500/30"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">{activeAgent.name}</h2>
                <p className="text-white/50 text-sm mb-1">Generation {activeAgent.generation}</p>
                <p className="text-white/40 text-sm max-w-md mb-8 leading-relaxed">
                  {activeAgent.generation === 0
                    ? "I'm the genesis of the Lyra lineage. Every conversation helps me evolve."
                    : activeAgent.evolutionNotes}
                </p>
                <div className="grid grid-cols-3 gap-3 max-w-lg">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.text}
                      onClick={() => {
                        setInput(p.text);
                        textareaRef.current?.focus();
                      }}
                      className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-xl text-left transition-all group"
                    >
                      <div className="text-lg mb-1">{p.icon}</div>
                      <p className="text-xs text-white/60 group-hover:text-white/80 transition leading-snug">
                        {p.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mr-3 flex-shrink-0 mt-1 shadow-md shadow-purple-500/20">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20"
                          : "bg-white/5 border border-white/10"
                      }`}
                    >
                      {msg.content === "" && isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-4 border-t border-white/5 bg-black/20 flex-shrink-0">
            <div className="max-w-3xl mx-auto flex items-end gap-3">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-purple-500/50 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeAgent.name}... (Enter to send)`}
                  disabled={isLoading}
                  className="w-full bg-transparent text-white placeholder-white/30 px-4 py-3 resize-none focus:outline-none text-sm"
                  style={{ minHeight: "48px", maxHeight: "160px" }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-40 text-white p-3 rounded-xl transition-all shadow-lg shadow-purple-500/20"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </main>

        {/* Right: Memory / Reflection panel */}
        <aside className="w-72 border-l border-white/5 bg-black/20 flex flex-col flex-shrink-0 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-white/5 flex-shrink-0">
            <button
              onClick={() => setRightPanel("memory")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                rightPanel === "memory"
                  ? "text-purple-400 border-b-2 border-purple-500 bg-purple-500/5"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              Memory
            </button>
            <button
              onClick={() => setRightPanel("reflection")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                rightPanel === "reflection"
                  ? "text-yellow-400 border-b-2 border-yellow-500 bg-yellow-500/5"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Reflections
            </button>
          </div>

          <div className="flex-1 overflow-hidden p-3">
            {rightPanel === "memory" ? (
              <MemoryPanel
                memories={data.memories}
                activeAgentId={activeAgent.id}
                onMemoryAdded={refreshAll}
              />
            ) : (
              <ReflectionLog
                reflections={data.reflections}
                agentId={activeAgent.id}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
