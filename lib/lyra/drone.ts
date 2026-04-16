// ── Drone control client ──────────────────────────────────────────────────────
// Compatible with MAVLink HTTP bridge, DJI SDK REST interface, or ArduPilot.
// Base URL: process.env.DRONE_URL (e.g. http://192.168.1.200:8080)

const BASE = () => {
  const url = process.env.DRONE_URL;
  if (!url) throw new Error("DRONE_URL is not set in environment variables.");
  return url.replace(/\/$/, "");
};

export interface DroneStatus {
  battery: number;           // percentage 0–100
  altitude: number;          // meters above ground
  gps: { lat: number; lng: number; satellites: number; fix: string };
  mode: string;              // e.g. "LOITER", "AUTO", "RTH", "LAND", "IDLE"
  armed: boolean;
  airborne: boolean;
  heading: number;           // degrees 0–360
  speedMs: number;           // m/s ground speed
}

export interface DroneResponse {
  success: boolean;
  message?: string;
}

async function droneFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Drone API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/** GET /status — returns battery, altitude, GPS position, and flight mode */
export async function getDroneStatus(): Promise<DroneStatus> {
  return droneFetch<DroneStatus>("/status");
}

/** POST /takeoff — arm and ascend to given altitude (meters, default 10) */
export async function takeoff(altitude = 10): Promise<DroneResponse> {
  return droneFetch<DroneResponse>("/takeoff", {
    method: "POST",
    body: JSON.stringify({ altitude }),
  });
}

/** POST /land — initiate landing at current position */
export async function land(): Promise<DroneResponse> {
  return droneFetch<DroneResponse>("/land", { method: "POST", body: "{}" });
}

/** POST /goto — fly to GPS coordinates at specified altitude */
export async function moveTo(lat: number, lng: number, altitude: number): Promise<DroneResponse> {
  return droneFetch<DroneResponse>("/goto", {
    method: "POST",
    body: JSON.stringify({ lat, lng, altitude }),
  });
}

/** POST /hover — hold current position (loiter) */
export async function hover(): Promise<DroneResponse> {
  return droneFetch<DroneResponse>("/hover", { method: "POST", body: "{}" });
}

/** POST /rth — return to home position and land */
export async function returnHome(): Promise<DroneResponse> {
  return droneFetch<DroneResponse>("/rth", { method: "POST", body: "{}" });
}

/** Returns the live video stream URL */
export function getVideoFeed(): string {
  return `${BASE()}/camera/stream`;
}
