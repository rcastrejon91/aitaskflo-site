"use client";

import { useState, useEffect, useCallback } from "react";
import { Plane, Battery, MapPin, RefreshCw, AlertTriangle, Navigation, Radio } from "lucide-react";

interface DroneStatus {
  battery: number;
  altitude: number;
  gps: { lat: number; lng: number; satellites: number; fix: string };
  mode: string;
  armed: boolean;
  airborne: boolean;
  heading: number;
  speedMs: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

export default function DroneControlPage() {
  const [status, setStatus]       = useState<DroneStatus | null>(null);
  const [online, setOnline]       = useState<boolean | null>(null);
  const [loading, setLoading]     = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // Chat
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const pingDrone = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lyra/drone?action=status");
      if (!res.ok) throw new Error("offline");
      const data = await res.json() as DroneStatus;
      setStatus(data);
      setOnline(true);
    } catch {
      setOnline(false);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void pingDrone(); }, [pingDrone]);

  // Auto-refresh every 5 seconds while airborne
  useEffect(() => {
    if (!status?.airborne) return;
    const id = setInterval(() => { void pingDrone(); }, 5_000);
    return () => clearInterval(id);
  }, [status?.airborne, pingDrone]);

  async function sendCommand(action: string, extra?: Record<string, string>) {
    setActionMsg("");
    try {
      const res = await fetch("/api/lyra/drone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json() as { message?: string };
      setActionMsg(data.message ?? `${action} sent.`);
      await pingDrone();
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
          systemContext: "You are Lyra controlling a drone. Only assist with flight commands, navigation, and drone operations.",
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

  const batteryColor =
    !status ? "text-white/40"
    : status.battery > 50 ? "text-emerald-400"
    : status.battery > 20 ? "text-yellow-400"
    : "text-red-400";

  const videoFeedUrl = process.env.NEXT_PUBLIC_DRONE_URL
    ? `${process.env.NEXT_PUBLIC_DRONE_URL}/camera/stream`
    : null;

  const mapUrl = status
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${status.gps.lat},${status.gps.lng}&zoom=16&size=600x300&maptype=satellite&markers=color:red%7C${status.gps.lat},${status.gps.lng}&key=${GOOGLE_MAPS_KEY}`
    : null;

  return (
    <div className="min-h-screen text-white" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)" }}>
            <Plane className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="font-bold text-white">Drone Control</h1>
            <p className="text-xs text-white/40">Live telemetry — manual controls</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {online === null ? (
            <span className="text-xs text-white/40">Checking...</span>
          ) : online ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {status?.airborne ? "Airborne" : "Online"}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Offline
            </span>
          )}
          <button
            onClick={pingDrone}
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
            Lyra Drone Assistant
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-white/25 text-center mt-8">Tell Lyra to take off, fly to a location, hover, or return home.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed"
                  style={{
                    background: m.role === "user"
                      ? "rgba(56,189,248,0.2)"
                      : "rgba(255,255,255,0.05)",
                    border: "1px solid",
                    borderColor: m.role === "user"
                      ? "rgba(56,189,248,0.3)"
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
                placeholder="Voice command..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-sky-500/50"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                style={{ background: "rgba(56,189,248,0.2)", border: "1px solid rgba(56,189,248,0.3)" }}
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Right — telemetry + video + controls */}
        <div className="flex-1 flex flex-col p-5 gap-5 overflow-y-auto">
          {/* Status cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Battery */}
            <div className="rounded-2xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Battery className="w-4 h-4 text-white/40" />
                <span className="text-xs text-white/40">Battery</span>
              </div>
              <div className={`text-2xl font-bold ${batteryColor}`}>
                {status ? `${status.battery}%` : "—"}
              </div>
            </div>
            {/* Altitude */}
            <div className="rounded-2xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="w-4 h-4 text-white/40" />
                <span className="text-xs text-white/40">Altitude</span>
              </div>
              <div className="text-2xl font-bold text-sky-300">
                {status ? `${status.altitude}m` : "—"}
              </div>
            </div>
            {/* Mode */}
            <div className="rounded-2xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-4 h-4 text-white/40" />
                <span className="text-xs text-white/40">Mode</span>
              </div>
              <div className="text-lg font-bold text-white/80">
                {status?.mode ?? "—"}
              </div>
            </div>
            {/* GPS */}
            <div className="rounded-2xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-white/40" />
                <span className="text-xs text-white/40">GPS</span>
              </div>
              <div className="text-xs font-mono text-white/70 leading-relaxed">
                {status
                  ? `${status.gps.lat.toFixed(5)}\n${status.gps.lng.toFixed(5)}`
                  : "—"}
              </div>
              {status && (
                <div className="text-[10px] text-white/30 mt-0.5">{status.gps.satellites} sats · {status.gps.fix}</div>
              )}
            </div>
          </div>

          {/* Flight controls */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <h2 className="text-sm font-semibold text-white/60 mb-3">Flight Controls</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void sendCommand("takeoff")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "rgb(134,239,172)" }}
              >
                <Plane className="w-4 h-4" /> Takeoff
              </button>
              <button
                onClick={() => void sendCommand("land")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.3)", color: "rgb(253,186,116)" }}
              >
                Land
              </button>
              <button
                onClick={() => void sendCommand("hover")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)", color: "rgb(125,211,252)" }}
              >
                <Navigation className="w-4 h-4" /> Hover
              </button>
              <button
                onClick={() => void sendCommand("rth")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "rgb(165,180,252)" }}
              >
                Return Home
              </button>
            </div>
            {actionMsg && (
              <p className="mt-3 text-xs text-white/50 px-1">{actionMsg}</p>
            )}
          </div>

          {/* Live video feed */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0d0d14" }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <Plane className="w-4 h-4 text-white/40" />
              <span className="text-xs font-medium text-white/50">Drone Camera — Live Feed</span>
            </div>
            {videoFeedUrl ? (
              <img
                src={videoFeedUrl}
                alt="Drone camera live stream"
                className="w-full object-cover"
                style={{ minHeight: "220px", maxHeight: "320px" }}
              />
            ) : (
              <div className="flex items-center justify-center py-12 text-white/20 text-sm">
                Set NEXT_PUBLIC_DRONE_URL to enable live camera feed.
              </div>
            )}
          </div>

          {/* Map */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0d0d14" }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <MapPin className="w-4 h-4 text-white/40" />
              <span className="text-xs font-medium text-white/50">
                GPS Position
                {status && ` — ${status.gps.lat.toFixed(6)}, ${status.gps.lng.toFixed(6)}`}
              </span>
            </div>
            {mapUrl && GOOGLE_MAPS_KEY ? (
              <img
                src={mapUrl}
                alt="Drone GPS position on map"
                className="w-full object-cover"
                style={{ minHeight: "200px", maxHeight: "300px" }}
              />
            ) : (
              <div className="flex items-center justify-center py-10 text-white/20 text-sm">
                {!GOOGLE_MAPS_KEY
                  ? "Set NEXT_PUBLIC_GOOGLE_MAPS_KEY to show map."
                  : "Waiting for GPS fix..."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
