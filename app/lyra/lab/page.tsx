"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Camera, StopCircle, Home, Hand, Power, RefreshCw, AlertTriangle } from "lucide-react";

interface ArmStatus {
  joints: number[];
  mode: string;
  safetyState: string;
  tcpPosition: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
  powered: boolean;
  programRunning: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function LabPage() {
  const [status, setStatus]       = useState<ArmStatus | null>(null);
  const [online, setOnline]       = useState<boolean | null>(null);
  const [loading, setLoading]     = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // Chat
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const pingArm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lyra/lab/arm?action=status");
      if (!res.ok) throw new Error("offline");
      const data = await res.json() as ArmStatus;
      setStatus(data);
      setOnline(true);
    } catch {
      setOnline(false);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void pingArm(); }, [pingArm]);

  async function sendCommand(action: string, extra?: Record<string, string>) {
    setActionMsg("");
    try {
      const res = await fetch("/api/lyra/lab/arm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json() as { message?: string };
      setActionMsg(data.message ?? action + " sent.");
      await pingArm();
    } catch (e) {
      setActionMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/lyra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          systemContext: "You are Lyra controlling a robot arm in a lab. Assist with arm movements, programs, and lab tasks only.",
        }),
      });
      const data = await res.json() as { reply?: string };
      setMessages([...next, { role: "assistant", content: data.reply ?? "..." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Error reaching Lyra." }]);
    } finally {
      setChatLoading(false);
    }
  }

  const videoFeedUrl = process.env.NEXT_PUBLIC_ROBOT_ARM_URL
    ? `${process.env.NEXT_PUBLIC_ROBOT_ARM_URL}/camera/stream`
    : null;

  return (
    <div className="min-h-screen text-white" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="font-bold text-white">Remote Lab Control</h1>
            <p className="text-xs text-white/40">Robot Arm — Live Camera</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {online === null ? (
            <span className="text-xs text-white/40">Checking...</span>
          ) : online ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Offline
            </span>
          )}
          <button
            onClick={pingArm}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 text-white/40 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Left — Lyra chat */}
        <div className="w-80 flex flex-col border-r" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="px-4 py-3 border-b text-xs font-semibold text-white/40 uppercase tracking-wider" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            Lyra Lab Assistant
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-white/25 text-center mt-8">Ask Lyra to move the arm, run a program, or get lab help.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed"
                  style={{
                    background: m.role === "user"
                      ? "rgba(168,85,247,0.2)"
                      : "rgba(255,255,255,0.05)",
                    border: "1px solid",
                    borderColor: m.role === "user"
                      ? "rgba(168,85,247,0.3)"
                      : "rgba(255,255,255,0.08)",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl text-sm text-white/40" style={{ background: "rgba(255,255,255,0.04)" }}>
                  Thinking...
                </div>
              </div>
            )}
          </div>
          <form onSubmit={sendChat} className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Lyra..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-purple-500/50"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.35)" }}
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Right — camera + controls */}
        <div className="flex-1 flex flex-col p-5 gap-5 overflow-y-auto">
          {/* Video feed */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0d0d14" }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <Camera className="w-4 h-4 text-white/40" />
              <span className="text-xs font-medium text-white/50">Lab Camera — Live Feed</span>
            </div>
            {videoFeedUrl ? (
              <img
                src={videoFeedUrl}
                alt="Lab camera MJPEG stream"
                className="w-full object-cover"
                style={{ minHeight: "240px", maxHeight: "360px" }}
              />
            ) : (
              <div className="flex items-center justify-center py-16 text-white/20 text-sm">
                Set NEXT_PUBLIC_ROBOT_ARM_URL to enable camera feed.
              </div>
            )}
          </div>

          {/* Arm status */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <h2 className="text-sm font-semibold text-white/60 mb-3">Arm Joint Status</h2>
            {status ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 mb-3">
                  {status.joints.map((angle, i) => (
                    <div key={i} className="text-center px-3 py-2 rounded-lg" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                      <div className="text-[10px] text-white/40 mb-0.5">J{i + 1}</div>
                      <div className="text-sm font-mono text-purple-300">{angle.toFixed(1)}&deg;</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span className="text-white/30">Mode</span>
                    <div className="text-white/80 font-medium mt-0.5">{status.mode}</div>
                  </div>
                  <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span className="text-white/30">Safety</span>
                    <div className={`font-medium mt-0.5 ${status.safetyState === "NORMAL" ? "text-emerald-400" : "text-red-400"}`}>
                      {status.safetyState}
                    </div>
                  </div>
                  <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span className="text-white/30">TCP x/y/z</span>
                    <div className="text-white/70 font-mono mt-0.5 text-[11px]">
                      {status.tcpPosition.x}/{status.tcpPosition.y}/{status.tcpPosition.z}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/25">{online === false ? "Arm offline — check ROBOT_ARM_URL." : "Loading..."}</p>
            )}
          </div>

          {/* Manual override controls */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <h2 className="text-sm font-semibold text-white/60 mb-3">Manual Override</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void sendCommand("gripper", { gripper: "open" })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "rgb(134,239,172)" }}
              >
                <Hand className="w-4 h-4" /> Open Gripper
              </button>
              <button
                onClick={() => void sendCommand("gripper", { gripper: "close" })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.3)", color: "rgb(253,186,116)" }}
              >
                <Hand className="w-4 h-4" /> Close Gripper
              </button>
              <button
                onClick={() => void sendCommand("stop")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "rgb(252,165,165)" }}
              >
                <StopCircle className="w-4 h-4" /> Emergency Stop
              </button>
              <button
                onClick={() => void sendCommand("run_program", { program_name: "home" })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "rgb(165,180,252)" }}
              >
                <Home className="w-4 h-4" /> Return to Home
              </button>
              <button
                onClick={() => void sendCommand("run_program", { program_name: "power_on" })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)", color: "rgb(253,224,71)" }}
              >
                <Power className="w-4 h-4" /> Power On
              </button>
            </div>
            {actionMsg && (
              <p className="mt-3 text-xs text-white/50 px-1">{actionMsg}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
