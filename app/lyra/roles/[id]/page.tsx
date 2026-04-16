"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { TOOL_CATALOG } from "@/lib/lyra/role-builder";

interface RoleBot {
  id: string;
  name: string;
  company: string | null;
  role_title: string | null;
  domain: string;
  tone: string;
  tools: string;
  system_prompt: string;
  responsibilities: string;
  created_at: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function RoleBotChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bot, setBot] = useState<RoleBot | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { fetchBot(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function fetchBot() {
    const res = await fetch(`/api/lyra/roles?id=${id}`);
    if (!res.ok) { router.push("/lyra/roles"); return; }
    const data = await res.json();
    setBot(data.bot);
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || streaming || !bot) return;
    const userMsg = input.trim();
    setInput("");

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);

    // Add empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/lyra/roles/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: bot.id, message: userMsg, history }),
      });

      if (!res.ok) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: "⚠️ Error contacting bot. Please try again." };
          return next;
        });
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let accum = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accum += decoder.decode(value, { stream: true });
        const display = accum.trim();
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: display };
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "⚠️ Connection error. Please try again." };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!bot) return null;

  let botTools: string[] = [];
  try { botTools = JSON.parse(bot.tools || "[]"); } catch { /* */ }

  const toneColors: Record<string, string> = {
    professional: "text-zinc-400",
    friendly: "text-green-400",
    empathetic: "text-blue-400",
    technical: "text-orange-400",
    concise: "text-yellow-400",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Top bar */}
      <div className="border-b border-zinc-800 px-5 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push("/lyra/roles")}
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          ← Roles
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{bot.name}</span>
            {bot.company && <span className="text-zinc-500 text-xs">· {bot.company}</span>}
            {bot.role_title && <span className="text-zinc-600 text-xs">· {bot.role_title}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className={`text-xs ${toneColors[bot.tone] ?? "text-zinc-500"}`}>{bot.tone}</span>
            {bot.domain && <span className="text-zinc-600 text-xs">· {bot.domain}</span>}
            <span className="text-zinc-700 text-xs">· {botTools.length} tool{botTools.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="text-zinc-600 hover:text-zinc-300 text-xs px-2 py-1 border border-zinc-800 hover:border-zinc-600 rounded transition-colors"
        >
          {showPrompt ? "Hide" : "System Prompt"}
        </button>
      </div>

      {/* System prompt drawer */}
      {showPrompt && (
        <div className="border-b border-zinc-800 bg-zinc-950 px-5 py-4 max-h-48 overflow-y-auto">
          <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">{bot.system_prompt}</pre>
        </div>
      )}

      {/* Tool chips */}
      {botTools.length > 0 && (
        <div className="border-b border-zinc-900 px-5 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-zinc-700 text-xs flex-shrink-0">Tools:</span>
          {botTools.map((t) => {
            const tc = TOOL_CATALOG[t];
            return (
              <span key={t} className="flex-shrink-0 text-xs px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500" title={tc?.description}>
                {tc?.label ?? t}
              </span>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">🤖</div>
            <p className="text-zinc-400 text-sm font-medium">{bot.name} is ready</p>
            <p className="text-zinc-600 text-xs mt-1">
              {bot.role_title ? `Configured as ${bot.role_title}` : "Start a conversation below"}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-violet-900/40 border border-violet-700/50 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                🤖
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-violet-700/30 border border-violet-600/30 text-violet-100"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-200"
              }`}
            >
              {msg.content || (
                <span className="text-zinc-600 animate-pulse">●●●</span>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-5 py-4">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            placeholder={`Message ${bot.name}…`}
            rows={1}
            className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none transition-colors disabled:opacity-50"
            style={{ minHeight: "44px", maxHeight: "120px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            {streaming ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L14 8M9 3L14 8L9 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <p className="text-zinc-700 text-xs mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
