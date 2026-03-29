"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface OBDData {
  rpm: number | null;
  speed_mph: number | null;
  coolant_temp_f: number | null;
  fuel_pct: number | null;
  fault_codes: string[];
  connected: boolean;
  error: string | null;
}

// ELM327 PID requests
const PIDS = {
  RPM:    "010C",
  SPEED:  "010D",
  TEMP:   "0105",
  FUEL:   "012F",
  FAULTS: "03",
};

function parseRpm(hex: string): number | null {
  const bytes = hex.trim().split(" ").filter(b => /^[0-9A-Fa-f]{2}$/.test(b));
  if (bytes.length < 4) return null;
  return ((parseInt(bytes[2], 16) * 256 + parseInt(bytes[3], 16)) / 4);
}

function parseSpeed(hex: string): number | null {
  const bytes = hex.trim().split(" ").filter(b => /^[0-9A-Fa-f]{2}$/.test(b));
  if (bytes.length < 3) return null;
  const kph = parseInt(bytes[2], 16);
  return Math.round(kph * 0.621371);
}

function parseTemp(hex: string): number | null {
  const bytes = hex.trim().split(" ").filter(b => /^[0-9A-Fa-f]{2}$/.test(b));
  if (bytes.length < 3) return null;
  const c = parseInt(bytes[2], 16) - 40;
  return Math.round(c * 9 / 5 + 32);
}

function parseFuel(hex: string): number | null {
  const bytes = hex.trim().split(" ").filter(b => /^[0-9A-Fa-f]{2}$/.test(b));
  if (bytes.length < 3) return null;
  return Math.round(parseInt(bytes[2], 16) / 255 * 100);
}

export function OBDPanel() {
  const [data, setData] = useState<OBDData>({
    rpm: null, speed_mph: null, coolant_temp_f: null,
    fuel_pct: null, fault_codes: [], connected: false, error: null,
  });
  const [connecting, setConnecting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const charRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendCommand = useCallback(async (cmd: string): Promise<string> => {
    const char = charRef.current;
    if (!char) return "";
    const encoder = new TextEncoder();
    await char.writeValue(encoder.encode(cmd + "\r"));
    await new Promise(r => setTimeout(r, 300));
    const val = await char.readValue();
    return new TextDecoder().decode(val);
  }, []);

  const pollOBD = useCallback(async () => {
    try {
      const [rpmRaw, speedRaw, tempRaw, fuelRaw] = await Promise.all([
        sendCommand(PIDS.RPM),
        sendCommand(PIDS.SPEED),
        sendCommand(PIDS.TEMP),
        sendCommand(PIDS.FUEL),
      ]);
      setData(prev => ({
        ...prev,
        rpm: parseRpm(rpmRaw) ?? prev.rpm,
        speed_mph: parseSpeed(speedRaw) ?? prev.speed_mph,
        coolant_temp_f: parseTemp(tempRaw) ?? prev.coolant_temp_f,
        fuel_pct: parseFuel(fuelRaw) ?? prev.fuel_pct,
      }));
    } catch (e) {
      setData(prev => ({ ...prev, connected: false, error: (e as Error).message }));
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [sendCommand]);

  const connect = useCallback(async () => {
    if (!("bluetooth" in navigator)) {
      setData(prev => ({ ...prev, error: "Web Bluetooth not supported. Use Chrome on Android." }));
      return;
    }
    setConnecting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { name: "OBDII" }, { name: "ELM327" }, { name: "OBD2" },
          { namePrefix: "V-LINK" }, { namePrefix: "SCAN" },
        ],
        optionalServices: ["00001101-0000-1000-8000-00805f9b34fb", "fff0"],
      });

      const server = await device.gatt!.connect();
      // Try common ELM327 service UUIDs
      let service;
      try {
        service = await server.getPrimaryService("00001101-0000-1000-8000-00805f9b34fb");
      } catch {
        service = await server.getPrimaryService("fff0");
      }
      const chars = await service.getCharacteristics();
      charRef.current = chars[0];

      // Init ELM327
      await sendCommand("ATZ");   // Reset
      await sendCommand("ATE0");  // Echo off
      await sendCommand("ATL0");  // Linefeed off
      await sendCommand("ATS0");  // Spaces off
      await sendCommand("ATSP0"); // Auto protocol

      setData(prev => ({ ...prev, connected: true, error: null }));
      pollRef.current = setInterval(pollOBD, 2000);
      await pollOBD();

      device.addEventListener("gattserverdisconnected", () => {
        setData(prev => ({ ...prev, connected: false }));
        if (pollRef.current) clearInterval(pollRef.current);
      });
    } catch (e) {
      setData(prev => ({ ...prev, error: (e as Error).message }));
    }
    setConnecting(false);
  }, [sendCommand, pollOBD]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const readFaults = useCallback(async () => {
    const raw = await sendCommand(PIDS.FAULTS);
    // Parse DTC codes from Mode 03 response
    const bytes = raw.trim().split(" ").filter(b => /^[0-9A-Fa-f]{2}$/.test(b));
    const codes: string[] = [];
    for (let i = 1; i < bytes.length - 1; i += 2) {
      const b1 = parseInt(bytes[i], 16);
      const b2 = parseInt(bytes[i + 1], 16);
      if (b1 === 0 && b2 === 0) continue;
      const prefix = ["P", "C", "B", "U"][(b1 >> 6) & 0x03];
      const code = `${prefix}${((b1 & 0x3F) << 8 | b2).toString(16).toUpperCase().padStart(4, "0")}`;
      codes.push(code);
    }
    setData(prev => ({ ...prev, fault_codes: codes }));
  }, [sendCommand]);

  if (!data.connected) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 my-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-bold">🔌 OBD-II Engine Data</span>
          <span className="text-xs text-gray-400">ELM327 Bluetooth</span>
        </div>
        {data.error && (
          <div className="text-red-400 text-xs mb-3 bg-red-900/30 rounded p-2">{data.error}</div>
        )}
        <button
          onClick={connect}
          disabled={connecting}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {connecting ? "Connecting…" : "Connect OBD-II Dongle"}
        </button>
        <p className="text-gray-500 text-xs mt-2 text-center">Requires ELM327 Bluetooth dongle + Chrome/Android</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-green-700 rounded-xl p-4 my-2 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white font-bold">🔌 Engine Live Data</span>
        <span className="text-green-400 text-xs font-bold">● CONNECTED</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{data.rpm?.toFixed(0) ?? "—"}</div>
          <div className="text-xs text-gray-400">RPM</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{data.speed_mph ?? "—"}</div>
          <div className="text-xs text-gray-400">MPH</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${(data.coolant_temp_f ?? 0) > 230 ? "text-red-400" : "text-yellow-400"}`}>
            {data.coolant_temp_f ?? "—"}°F
          </div>
          <div className="text-xs text-gray-400">Coolant Temp</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${(data.fuel_pct ?? 100) < 15 ? "text-red-400" : "text-orange-400"}`}>
            {data.fuel_pct ?? "—"}%
          </div>
          <div className="text-xs text-gray-400">Fuel</div>
        </div>
      </div>
      {data.fault_codes.length > 0 && (
        <div className="bg-red-900/40 border border-red-600 rounded-lg p-2">
          <div className="text-red-300 text-xs font-bold">⚠️ Fault Codes: {data.fault_codes.join(", ")}</div>
        </div>
      )}
      <button
        onClick={readFaults}
        className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 rounded-lg transition-colors"
      >
        Read Fault Codes
      </button>
    </div>
  );
}
