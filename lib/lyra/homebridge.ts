// ── Homebridge REST API client ────────────────────────────────────────────────
// Talks to a local Homebridge instance (default: Pi 5 at 192.168.1.100:8581).
// Auth token is fetched on first use and cached for the process lifetime.

const HB_BASE_URL = process.env.HOMEBRIDGE_URL ?? "http://192.168.1.100:8581";

let _cachedToken: string | null = process.env.HOMEBRIDGE_TOKEN || null;

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function homebridgeAuth(): Promise<string> {
  if (_cachedToken) return _cachedToken;

  const username = process.env.HOMEBRIDGE_USERNAME ?? "admin";
  const password = process.env.HOMEBRIDGE_PASSWORD ?? "admin";

  const res = await fetch(`${HB_BASE_URL}/api/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error(`Homebridge auth failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token?: string; token?: string };
  const token = data.access_token ?? data.token;
  if (!token) throw new Error("Homebridge auth response missing token");

  _cachedToken = token;
  return token;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function hbGet<T>(path: string): Promise<T> {
  const token = await homebridgeAuth();
  const res = await fetch(`${HB_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Homebridge GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function hbPut<T>(path: string, body: unknown): Promise<T> {
  const token = await homebridgeAuth();
  const res = await fetch(`${HB_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Homebridge PUT ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HbCharacteristic {
  type: string;
  value: unknown;
  description?: string;
  format?: string;
  minValue?: number;
  maxValue?: number;
  canWrite?: boolean;
}

export interface HbAccessory {
  uniqueId: string;
  displayName: string;
  serviceName?: string;
  type?: string;
  values?: Record<string, unknown>;
  characteristics?: HbCharacteristic[];
}

// ── Core accessory functions ──────────────────────────────────────────────────

export async function getAccessories(): Promise<HbAccessory[]> {
  return hbGet<HbAccessory[]>("/api/accessories");
}

export async function getAccessory(uniqueId: string): Promise<HbAccessory> {
  return hbGet<HbAccessory>(`/api/accessories/${uniqueId}`);
}

export async function setCharacteristic(
  uniqueId: string,
  characteristicType: string,
  value: unknown
): Promise<HbAccessory> {
  return hbPut<HbAccessory>(`/api/accessories/${uniqueId}`, {
    characteristicType,
    value,
  });
}

// ── Convenience control functions ─────────────────────────────────────────────

export async function turnOn(uniqueId: string): Promise<string> {
  await setCharacteristic(uniqueId, "On", true);
  return `Turned on ${uniqueId}`;
}

export async function turnOff(uniqueId: string): Promise<string> {
  await setCharacteristic(uniqueId, "On", false);
  return `Turned off ${uniqueId}`;
}

export async function setBrightness(uniqueId: string, pct: number): Promise<string> {
  const clamped = Math.max(0, Math.min(100, pct));
  await setCharacteristic(uniqueId, "Brightness", clamped);
  return `Set brightness to ${clamped}% on ${uniqueId}`;
}

export async function setColor(
  uniqueId: string,
  hue: number,
  saturation: number
): Promise<string> {
  await setCharacteristic(uniqueId, "Hue", hue);
  await setCharacteristic(uniqueId, "Saturation", saturation);
  return `Set color (hue ${hue}, sat ${saturation}) on ${uniqueId}`;
}

// ── Light filtering ───────────────────────────────────────────────────────────

export async function getAllLights(): Promise<HbAccessory[]> {
  const accessories = await getAccessories();
  return accessories.filter(
    (a) =>
      a.serviceName?.toLowerCase().includes("lightbulb") ||
      a.type?.toLowerCase().includes("lightbulb") ||
      a.displayName?.toLowerCase().includes("light") ||
      a.displayName?.toLowerCase().includes("lamp") ||
      a.displayName?.toLowerCase().includes("bulb")
  );
}

// ── Scene presets ─────────────────────────────────────────────────────────────

type ScenePreset = "scary" | "romantic" | "bright" | "off";

interface SceneConfig {
  on: boolean;
  brightness?: number;
  hue?: number;
  saturation?: number;
}

const SCENE_PRESETS: Record<ScenePreset, SceneConfig> = {
  scary:    { on: true,  brightness: 15, hue: 0,   saturation: 100 }, // dim red
  romantic: { on: true,  brightness: 30, hue: 350, saturation: 60  }, // warm pink-red
  bright:   { on: true,  brightness: 100 },                            // full white
  off:      { on: false },
};

export async function setSceneAllLights(scene: ScenePreset): Promise<string> {
  const lights = await getAllLights();
  if (lights.length === 0) return "No lights found.";

  const cfg = SCENE_PRESETS[scene];
  const results: string[] = [];

  for (const light of lights) {
    try {
      if (!cfg.on) {
        await setCharacteristic(light.uniqueId, "On", false);
      } else {
        await setCharacteristic(light.uniqueId, "On", true);
        if (cfg.brightness !== undefined) {
          await setCharacteristic(light.uniqueId, "Brightness", cfg.brightness);
        }
        if (cfg.hue !== undefined) {
          await setCharacteristic(light.uniqueId, "Hue", cfg.hue);
        }
        if (cfg.saturation !== undefined) {
          await setCharacteristic(light.uniqueId, "Saturation", cfg.saturation);
        }
      }
      results.push(`${light.displayName}: OK`);
    } catch (e) {
      results.push(`${light.displayName}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return `Scene "${scene}" applied to ${lights.length} light(s):\n${results.join("\n")}`;
}

// ── Cinematic story reactions ─────────────────────────────────────────────────

type StoryEvent = "scary" | "dramatic" | "peaceful" | "celebration";

export async function storyLightReaction(event: StoryEvent): Promise<string> {
  const lights = await getAllLights();
  if (lights.length === 0) return "No lights found for story reaction.";

  // Each event gets a multi-step cinematic sequence executed in order
  const applyToAll = async (cfg: SceneConfig, delayMs = 0) => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    for (const light of lights) {
      try {
        if (!cfg.on) {
          await setCharacteristic(light.uniqueId, "On", false);
        } else {
          await setCharacteristic(light.uniqueId, "On", true);
          if (cfg.brightness !== undefined)
            await setCharacteristic(light.uniqueId, "Brightness", cfg.brightness);
          if (cfg.hue !== undefined)
            await setCharacteristic(light.uniqueId, "Hue", cfg.hue);
          if (cfg.saturation !== undefined)
            await setCharacteristic(light.uniqueId, "Saturation", cfg.saturation);
        }
      } catch { /* best-effort */ }
    }
  };

  switch (event) {
    case "scary":
      // Flash red briefly, then hold dim red
      await applyToAll({ on: true, brightness: 100, hue: 0, saturation: 100 });
      await applyToAll({ on: true, brightness: 5,   hue: 0, saturation: 100 }, 400);
      await applyToAll({ on: true, brightness: 100, hue: 0, saturation: 100 }, 400);
      await applyToAll({ on: true, brightness: 12,  hue: 0, saturation: 100 }, 400);
      return "Scary story reaction triggered — red flash + dim red hold.";

    case "dramatic":
      // Fade to deep purple
      await applyToAll({ on: true, brightness: 100, hue: 270, saturation: 80 });
      await applyToAll({ on: true, brightness: 40,  hue: 270, saturation: 100 }, 600);
      return "Dramatic story reaction triggered — deep purple.";

    case "peaceful":
      // Soft warm blue-white
      await applyToAll({ on: true, brightness: 40, hue: 200, saturation: 30 });
      return "Peaceful story reaction triggered — soft cool blue.";

    case "celebration":
      // Cycle through festive colors: orange → blue → green → settle bright
      await applyToAll({ on: true, brightness: 100, hue: 30,  saturation: 100 });
      await applyToAll({ on: true, brightness: 100, hue: 240, saturation: 100 }, 500);
      await applyToAll({ on: true, brightness: 100, hue: 120, saturation: 100 }, 500);
      await applyToAll({ on: true, brightness: 100 }, 500);
      return "Celebration reaction triggered — festive color cycle!";
  }
}
