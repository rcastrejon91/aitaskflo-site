/**
 * /api/lyra/openpilot
 * Proxy for comma.ai Connect API + local device telemetry
 * GET  ?action=devices           — list paired devices
 * GET  ?action=status&dongle=X   — latest telemetry snapshot
 * GET  ?action=alerts&dongle=X   — recent driver alerts
 * GET  ?action=trips&dongle=X    — recent trips
 */
import { NextRequest, NextResponse } from "next/server";

const COMMA_API = "https://api.comma.ai/v1";
const COMMA_API_V2 = "https://api.comma.ai/v2";

function commaHeaders(token: string) {
  return { "Authorization": `JWT ${token}`, "Content-Type": "application/json" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action") ?? "status";
  const dongle = searchParams.get("dongle") ?? "";

  // Support local device (same network) — comma device exposes ws on :8022 / http :8080
  const localUrl = searchParams.get("local"); // e.g. "192.168.5.1"
  if (localUrl) {
    try {
      const res = await fetch(`http://${localUrl}:8080/api/`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ source: "local", data });
      }
    } catch {
      // Fall through to cloud API
    }
  }

  // Cloud API via comma.ai
  const token = process.env.COMMA_JWT;
  if (!token) {
    return NextResponse.json({
      error: "comma.ai not configured",
      hint: "Add COMMA_JWT to .env.local — get it from comma.ai → Settings → API",
      mock: getMockTelemetry(),
    }, { status: 200 }); // Return mock so UI still works
  }

  try {
    if (action === "devices") {
      const res = await fetch(`${COMMA_API}/devices/`, {
        headers: commaHeaders(token),
        signal: AbortSignal.timeout(8_000),
      });
      const data = await res.json();
      return NextResponse.json({ source: "comma", devices: data });
    }

    if (action === "status" && dongle) {
      const [deviceRes, locationRes] = await Promise.allSettled([
        fetch(`${COMMA_API}/devices/${dongle}/`, {
          headers: commaHeaders(token), signal: AbortSignal.timeout(8_000),
        }).then(r => r.json()),
        fetch(`${COMMA_API}/devices/${dongle}/location/`, {
          headers: commaHeaders(token), signal: AbortSignal.timeout(8_000),
        }).then(r => r.json()),
      ]);

      const device = deviceRes.status === "fulfilled" ? deviceRes.value : {};
      const location = locationRes.status === "fulfilled" ? locationRes.value : {};

      return NextResponse.json({
        source: "comma",
        online: device.is_paired && device.last_athena_ping > Date.now() / 1000 - 300,
        device_type: device.device_type,
        serial: device.serial,
        openpilot_version: device.openpilot_version,
        last_seen: device.last_athena_ping,
        location: {
          lat: location.lat,
          lng: location.lng,
          speed_mph: location.speed ? Math.round(location.speed * 2.237) : null,
          bearing: location.bearing,
          accuracy_m: location.accuracy,
          timestamp: location.time,
        },
      });
    }

    if (action === "alerts" && dongle) {
      // Get recent route segments with alerts
      const since = Math.floor(Date.now() / 1000) - 3600; // last hour
      const res = await fetch(
        `${COMMA_API_V2}/devices/${dongle}/routes_segments/?start=${since}&end=${Math.floor(Date.now() / 1000)}`,
        { headers: commaHeaders(token), signal: AbortSignal.timeout(10_000) }
      );
      const data = await res.json();
      return NextResponse.json({ source: "comma", segments: Array.isArray(data) ? data.slice(0, 10) : [] });
    }

    if (action === "trips" && dongle) {
      const res = await fetch(
        `${COMMA_API_V2}/devices/${dongle}/routes_segments/?limit=10`,
        { headers: commaHeaders(token), signal: AbortSignal.timeout(10_000) }
      );
      const data = await res.json();
      return NextResponse.json({ source: "comma", trips: Array.isArray(data) ? data : [] });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({
      error: (err as Error).message,
      mock: getMockTelemetry(),
    });
  }
}

function getMockTelemetry() {
  return {
    online: true,
    device_type: "comma 3X (mock)",
    openpilot_version: "0.9.7",
    engaged: true,
    speed_mph: 62,
    steering_angle_deg: -2.4,
    steering_torque: 0.3,
    accel_ms2: 0.1,
    lead_distance_m: 48,
    lead_speed_mph: 61,
    alerts: [],
    driver_monitoring: { distracted: false, asleep: false, face_detected: true },
    lane_departure_warning: false,
    forward_collision_warning: false,
    location: { lat: 29.7604, lng: -95.3698 }, // Houston
    last_seen: Date.now() / 1000,
    source: "mock — add COMMA_JWT to enable live data",
  };
}
