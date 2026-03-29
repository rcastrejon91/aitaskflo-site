"use client";

import { useState, useEffect, useRef } from "react";

interface OpenpilotTelemetry {
  online: boolean;
  device_type?: string;
  openpilot_version?: string;
  engaged?: boolean;
  speed_mph?: number;
  steering_angle_deg?: number;
  lead_distance_m?: number;
  lead_speed_mph?: number;
  alerts?: string[];
  driver_monitoring?: { distracted: boolean; asleep: boolean; face_detected: boolean };
  lane_departure_warning?: boolean;
  forward_collision_warning?: boolean;
  location?: { lat: number; lng: number };
  last_seen?: number;
  source?: string;
  error?: string;
}

function Gauge({ label, value, unit, warn }: { label: string; value: string | number | null; unit: string; warn?: boolean }) {
  return (
    <div className={`bg-gray-700 rounded-lg p-3 text-center ${warn ? "border border-red-500" : ""}`}>
      <div className={`text-xl font-bold font-mono ${warn ? "text-red-400" : "text-white"}`}>
        {value ?? "—"}{value != null ? <span className="text-xs text-gray-400 ml-1">{unit}</span> : null}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

export function OpenpilotPanel({ dongleId }: { dongleId?: string }) {
  const [telem, setTelem] = useState<OpenpilotTelemetry | null>(null);
  const [loading, setLoading] = useState(false);
  const [localIp, setLocalIp] = useState("");
  const [showLocalInput, setShowLocalInput] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTelemetry = async (dongle?: string, local?: string) => {
    try {
      const params = new URLSearchParams({ action: "status" });
      if (dongle) params.set("dongle", dongle);
      if (local) params.set("local", local);
      const res = await fetch(`/api/lyra/openpilot?${params}`);
      const data = await res.json();
      // Flatten mock or real response
      setTelem(data.mock ?? data);
    } catch {
      setTelem({ online: false, error: "Could not reach openpilot API" });
    }
  };

  const startPolling = (dongle?: string, local?: string) => {
    setLoading(true);
    fetchTelemetry(dongle, local).then(() => setLoading(false));
    pollRef.current = setInterval(() => fetchTelemetry(dongle, local), 5000);
  };

  useEffect(() => {
    if (dongleId) startPolling(dongleId);
    else fetchTelemetry(); // loads mock immediately
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dongleId]);

  const alerts = telem?.alerts ?? [];
  const fcw = telem?.forward_collision_warning;
  const ldw = telem?.lane_departure_warning;
  const dm = telem?.driver_monitoring;

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 my-2 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚗</span>
          <div>
            <div className="text-white font-bold text-sm">openpilot</div>
            <div className="text-xs text-gray-400">{telem?.device_type ?? "comma.ai"} · v{telem?.openpilot_version ?? "—"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {telem && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${telem.online ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
              {telem.online ? "● ONLINE" : "○ OFFLINE"}
            </span>
          )}
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${telem?.engaged ? "bg-blue-900 text-blue-300" : "bg-gray-700 text-gray-400"}`}>
            {telem?.engaged ? "ENGAGED" : "STANDBY"}
          </span>
        </div>
      </div>

      {/* Source note */}
      {telem?.source?.includes("mock") && (
        <div className="text-xs text-yellow-600 bg-yellow-900/20 rounded px-2 py-1 border border-yellow-800">
          ⚠️ Mock data — add COMMA_JWT env var or enter device IP for live telemetry
        </div>
      )}

      {/* Active alerts */}
      {(fcw || ldw || (alerts.length > 0)) && (
        <div className="space-y-1">
          {fcw && <div className="bg-red-900/60 border border-red-500 rounded px-3 py-2 text-red-300 text-xs font-bold">🚨 FORWARD COLLISION WARNING</div>}
          {ldw && <div className="bg-yellow-900/60 border border-yellow-500 rounded px-3 py-2 text-yellow-300 text-xs font-bold">⚠️ LANE DEPARTURE WARNING</div>}
          {alerts.map((a, i) => (
            <div key={i} className="bg-orange-900/40 border border-orange-600 rounded px-3 py-1.5 text-orange-300 text-xs">{a}</div>
          ))}
        </div>
      )}

      {/* Driver monitoring */}
      {dm && (dm.distracted || dm.asleep) && (
        <div className="bg-red-900/60 border border-red-500 rounded px-3 py-2 text-red-300 text-xs font-bold">
          😴 {dm.asleep ? "DRIVER ASLEEP — TAKE CONTROL" : "DRIVER DISTRACTED — Eyes on road"}
        </div>
      )}

      {/* Gauges */}
      <div className="grid grid-cols-2 gap-2">
        <Gauge label="Speed" value={telem?.speed_mph ?? null} unit="mph" />
        <Gauge label="Steering" value={telem?.steering_angle_deg?.toFixed(1) ?? null} unit="°" />
        <Gauge
          label="Lead distance"
          value={telem?.lead_distance_m ?? null}
          unit="m"
          warn={(telem?.lead_distance_m ?? 999) < 20}
        />
        <Gauge label="Lead speed" value={telem?.lead_speed_mph ?? null} unit="mph" />
      </div>

      {/* Driver monitoring status */}
      {dm && (
        <div className="flex items-center gap-3 text-xs">
          <span className={dm.face_detected ? "text-green-400" : "text-gray-500"}>
            {dm.face_detected ? "✓" : "✗"} Face detected
          </span>
          <span className={!dm.distracted ? "text-green-400" : "text-red-400"}>
            {dm.distracted ? "⚠️ Distracted" : "✓ Attentive"}
          </span>
        </div>
      )}

      {/* Local IP input */}
      <div className="pt-1">
        {!showLocalInput ? (
          <button
            onClick={() => setShowLocalInput(true)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Connect to local device (USB tethering)
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={localIp}
              onChange={e => setLocalIp(e.target.value)}
              placeholder="192.168.5.1"
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={() => { if (pollRef.current) clearInterval(pollRef.current); startPolling(dongleId, localIp); }}
              disabled={loading || !localIp}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs px-3 rounded transition-colors"
            >
              {loading ? "…" : "Connect"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
