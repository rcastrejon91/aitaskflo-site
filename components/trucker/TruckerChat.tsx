"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { HOSDisplay } from "./HOSDisplay";
import { OBDPanel } from "./OBDPanel";
import { VoiceButton } from "./VoiceButton";

interface Message {
  role: "user" | "assistant";
  content: string;
  hosData?: Record<string, string>;
  loadBoard?: Record<string, string>;
}

function parseToolCards(text: string): { clean: string; hosData?: Record<string, string>; loadBoard?: Record<string, string> } {
  let hosData: Record<string, string> | undefined;
  let loadBoard: Record<string, string> | undefined;
  let clean = text;

  // Extract JSON tool cards
  const cardRegex = /\{[^{}]*"tool"\s*:[^{}]+\}/g;
  const matches = [...text.matchAll(cardRegex)];

  for (const m of matches) {
    try {
      const obj = JSON.parse(m[0]) as Record<string, string>;
      if (obj.tool === "hos_status") hosData = obj;
      if (obj.tool === "load_board") loadBoard = obj;
      clean = clean.replace(m[0], "");
    } catch { /* skip */ }
  }

  clean = clean.replace(/\n{3,}/g, "\n\n").trim();
  return { clean, hosData, loadBoard };
}

// Simple markdown: bold, newlines
function renderText(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**")
            ? <strong key={j} className="text-white font-bold">{p.slice(2, -2)}</strong>
            : <span key={j}>{p}</span>
        )}
        <br />
      </span>
    );
  });
}

const QUICK_ACTIONS = [
  { label: "I'm driving", msg: "Log that I'm driving now" },
  { label: "Off duty", msg: "Log that I'm off duty" },
  { label: "Taking break", msg: "Log that I'm taking a 30-minute break" },
  { label: "HOS status", msg: "What's my HOS status? How many hours do I have left?" },
  { label: "Find loads", msg: "Find me available loads" },
  { label: "Check engine", msg: "Show OBD engine data" },
];

export default function TruckerChat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Ready. Say something or tap a quick action.\n\nI can track your HOS, find loads, and read your engine data.",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOBD, setShowOBD] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput("");

    const history = messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/lyra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history, model: "claude" }),
        signal: abort.signal,
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        const { clean, hosData, loadBoard } = parseToolCards(full);
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: clean,
            hosData,
            loadBoard,
          };
          return next;
        });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
      }
    }

    setLoading(false);
    abortRef.current = null;
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚛</span>
          <div>
            <div className="font-bold text-white text-sm">Lyra Trucker</div>
            <div className="text-xs text-gray-400">HOS • Loads • Engine</div>
          </div>
        </div>
        <button
          onClick={() => setShowOBD(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showOBD ? "bg-green-800 border-green-600 text-green-300" : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"}`}
        >
          🔌 OBD
        </button>
      </div>

      {/* OBD Panel */}
      {showOBD && (
        <div className="px-3 pt-3">
          <OBDPanel />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-orange-600 text-white rounded-br-sm"
                  : "bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700"
              }`}>
                {msg.role === "user" ? msg.content : renderText(msg.content)}
              </div>
              {msg.hosData && <HOSDisplay data={msg.hosData as unknown as Parameters<typeof HOSDisplay>[0]["data"]} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-400">
              <span className="animate-pulse">●●●</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {QUICK_ACTIONS.map(({ label, msg }) => (
          <button
            key={label}
            onClick={() => send(msg)}
            disabled={loading}
            className="flex-shrink-0 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 pb-4 pt-1 bg-gray-900 border-t border-gray-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder="Ask anything…"
          disabled={loading}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
        />
        <VoiceButton onTranscript={send} disabled={loading} />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-colors"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
