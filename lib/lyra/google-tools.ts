import { getValidAccessToken, getGoogleTokens } from "@/lib/lyra/google-oauth";

const NOT_CONNECTED = "Google not connected. Visit /api/auth/google to connect your account.";

// ── Helper ────────────────────────────────────────────────────────────────────

async function authedFetch(
  userId: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getValidAccessToken(userId);
  if (!token) throw new Error(NOT_CONNECTED);
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    signal: options.signal ?? AbortSignal.timeout(15_000),
  });
}

// ── Google Custom Search ──────────────────────────────────────────────────────

export async function toolGoogleSearch(query: string): Promise<string> {
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  if (!key || !cx) return "Google Search not configured — add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX to env.";

  try {
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=5`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return `Google Search failed: HTTP ${res.status}`;
    const data = await res.json();
    const items = (data.items ?? []) as Array<{ title: string; snippet: string; link: string }>;
    if (!items.length) return `No results found for "${query}".`;
    return items
      .map((r) => `**${r.title}**\n${r.snippet}\n${r.link}`)
      .join("\n\n");
  } catch (err) {
    return `Google Search error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Cloud Vision ──────────────────────────────────────────────────────────────

export async function toolAnalyzeImage(imageUrl: string, userId?: string): Promise<string> {
  const key = process.env.GOOGLE_VISION_API_KEY;
  if (!key) return "Google Vision not configured — add GOOGLE_VISION_API_KEY to env.";

  // userId is accepted for future use (e.g., auth-gated Vision)
  void userId;

  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [
                { type: "LABEL_DETECTION", maxResults: 10 },
                { type: "TEXT_DETECTION" },
                { type: "SAFE_SEARCH_DETECTION" },
                { type: "OBJECT_LOCALIZATION", maxResults: 10 },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!res.ok) return `Vision API error: HTTP ${res.status}`;
    const data = await res.json();
    const response = data.responses?.[0];
    if (!response) return "No analysis returned.";

    const parts: string[] = [];

    // Labels
    const labels = (response.labelAnnotations ?? []) as Array<{ description: string; score: number }>;
    if (labels.length) {
      parts.push(`**Labels:** ${labels.map((l) => `${l.description} (${Math.round(l.score * 100)}%)`).join(", ")}`);
    }

    // Objects
    const objects = (response.localizedObjectAnnotations ?? []) as Array<{ name: string; score: number }>;
    if (objects.length) {
      const unique = [...new Set(objects.map((o) => o.name))];
      parts.push(`**Objects detected:** ${unique.join(", ")}`);
    }

    // Text
    const textAnnotations = (response.textAnnotations ?? []) as Array<{ description: string }>;
    if (textAnnotations.length > 0) {
      const fullText = textAnnotations[0].description.trim().slice(0, 500);
      parts.push(`**Text in image:** ${fullText}`);
    }

    // Safe search
    const safe = response.safeSearchAnnotation as { adult?: string } | undefined;
    if (safe?.adult === "LIKELY" || safe?.adult === "VERY_LIKELY") {
      parts.push("**Note:** Image may contain adult content.");
    }

    return parts.length ? parts.join("\n\n") : "Image analyzed but no notable content detected.";
  } catch (err) {
    return `Vision analysis error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Maps helpers ──────────────────────────────────────────────────────────────

function mapsKey(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error("GOOGLE_MAPS_API_KEY not set");
  return k;
}

// ── Geocoding ─────────────────────────────────────────────────────────────────

export async function toolGeocode(address: string): Promise<string> {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsKey()}`);
    const data = await res.json() as { results?: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }> };
    const r = data.results?.[0];
    if (!r) return `No results for "${address}"`;
    return `**${r.formatted_address}**\nLat: ${r.geometry.location.lat}, Lng: ${r.geometry.location.lng}`;
  } catch (e) { return `Geocode error: ${e instanceof Error ? e.message : String(e)}`; }
}

// ── Distance Matrix ───────────────────────────────────────────────────────────

export async function toolDistanceMatrix(origins: string, destinations: string, mode = "driving"): Promise<string> {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=${mode}&key=${mapsKey()}`;
    const res = await fetch(url);
    const data = await res.json() as { rows?: Array<{ elements?: Array<{ duration: { text: string }; distance: { text: string }; status: string }> }>; origin_addresses?: string[]; destination_addresses?: string[] };
    const el = data.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") return "Could not calculate distance.";
    return `**${data.origin_addresses?.[0]} → ${data.destination_addresses?.[0]}**\nDistance: ${el.distance.text} · Duration: ${el.duration.text} (${mode})`;
  } catch (e) { return `Distance error: ${e instanceof Error ? e.message : String(e)}`; }
}

// ── Time Zone ─────────────────────────────────────────────────────────────────

export async function toolTimeZone(location: string): Promise<string> {
  try {
    // First geocode the location
    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${mapsKey()}`);
    const geoData = await geoRes.json() as { results?: Array<{ geometry: { location: { lat: number; lng: number } } }> };
    const loc = geoData.results?.[0]?.geometry.location;
    if (!loc) return `Location not found: ${location}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const tzRes = await fetch(`https://maps.googleapis.com/maps/api/timezone/json?location=${loc.lat},${loc.lng}&timestamp=${timestamp}&key=${mapsKey()}`);
    const tz = await tzRes.json() as { timeZoneName?: string; timeZoneId?: string; rawOffset?: number; dstOffset?: number };
    if (!tz.timeZoneName) return "Timezone not found.";
    const offsetHours = ((tz.rawOffset ?? 0) + (tz.dstOffset ?? 0)) / 3600;
    const sign = offsetHours >= 0 ? "+" : "";
    return `**${location}** is in **${tz.timeZoneName}** (${tz.timeZoneId})\nUTC${sign}${offsetHours}`;
  } catch (e) { return `Timezone error: ${e instanceof Error ? e.message : String(e)}`; }
}

// ── Elevation ─────────────────────────────────────────────────────────────────

export async function toolElevation(location: string): Promise<string> {
  try {
    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${mapsKey()}`);
    const geoData = await geoRes.json() as { results?: Array<{ geometry: { location: { lat: number; lng: number } } }> };
    const loc = geoData.results?.[0]?.geometry.location;
    if (!loc) return `Location not found: ${location}`;
    const res = await fetch(`https://maps.googleapis.com/maps/api/elevation/json?locations=${loc.lat},${loc.lng}&key=${mapsKey()}`);
    const data = await res.json() as { results?: Array<{ elevation: number; resolution: number }> };
    const el = data.results?.[0];
    if (!el) return "Elevation not found.";
    return `**${location}** elevation: **${Math.round(el.elevation)}m** (${Math.round(el.elevation * 3.281)}ft) above sea level`;
  } catch (e) { return `Elevation error: ${e instanceof Error ? e.message : String(e)}`; }
}

// ── Air Quality ───────────────────────────────────────────────────────────────

export async function toolAirQuality(location: string): Promise<string> {
  try {
    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${mapsKey()}`);
    const geoData = await geoRes.json() as { results?: Array<{ geometry: { location: { lat: number; lng: number } } }> };
    const loc = geoData.results?.[0]?.geometry.location;
    if (!loc) return `Location not found: ${location}`;
    const res = await fetch(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${mapsKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: { latitude: loc.lat, longitude: loc.lng } }),
    });
    const data = await res.json() as { indexes?: Array<{ aqiDisplay: string; category: string; dominantPollutant: string; displayName: string }> };
    const idx = data.indexes?.[0];
    if (!idx) return "Air quality data not available for this location.";
    return `**Air Quality — ${location}**\nAQI: ${idx.aqiDisplay} · ${idx.category}\nDominant pollutant: ${idx.dominantPollutant}`;
  } catch (e) { return `Air quality error: ${e instanceof Error ? e.message : String(e)}`; }
}

// ── Pollen ────────────────────────────────────────────────────────────────────

export async function toolPollen(location: string): Promise<string> {
  try {
    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${mapsKey()}`);
    const geoData = await geoRes.json() as { results?: Array<{ geometry: { location: { lat: number; lng: number } } }> };
    const loc = geoData.results?.[0]?.geometry.location;
    if (!loc) return `Location not found: ${location}`;
    const res = await fetch(`https://pollen.googleapis.com/v1/forecast:lookup?key=${mapsKey()}&location.longitude=${loc.lng}&location.latitude=${loc.lat}&days=1`);
    const data = await res.json() as { dailyInfo?: Array<{ pollenTypeInfo?: Array<{ displayName: string; indexInfo?: { category: string; value: number } }> }> };
    const day = data.dailyInfo?.[0];
    if (!day) return "Pollen data not available for this location.";
    const lines = (day.pollenTypeInfo ?? []).map(p => `${p.displayName}: ${p.indexInfo?.category ?? "N/A"} (${p.indexInfo?.value ?? 0})`);
    return `**Pollen — ${location}**\n${lines.join("\n")}`;
  } catch (e) { return `Pollen error: ${e instanceof Error ? e.message : String(e)}`; }
}

// ── Solar ─────────────────────────────────────────────────────────────────────

export async function toolSolar(address: string): Promise<string> {
  try {
    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsKey()}`);
    const geoData = await geoRes.json() as { results?: Array<{ geometry: { location: { lat: number; lng: number } } }> };
    const loc = geoData.results?.[0]?.geometry.location;
    if (!loc) return `Address not found: ${address}`;
    const res = await fetch(`https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${loc.lat}&location.longitude=${loc.lng}&requiredQuality=LOW&key=${mapsKey()}`);
    const data = await res.json() as { solarPotential?: { maxArrayPanelsCount: number; maxArrayAreaMeters2: number; maxSunshineHoursPerYear: number; carbonOffsetFactorKgPerMwh: number; wholeRoofStats?: { areaMeters2: number } } };
    const s = data.solarPotential;
    if (!s) return "Solar data not available for this address.";
    return `**Solar Potential — ${address}**\nMax panels: ${s.maxArrayPanelsCount}\nMax area: ${Math.round(s.maxArrayAreaMeters2)}m²\nSunshine hours/year: ${Math.round(s.maxSunshineHoursPerYear)}h\nRoof area: ${Math.round(s.wholeRoofStats?.areaMeters2 ?? 0)}m²`;
  } catch (e) { return `Solar error: ${e instanceof Error ? e.message : String(e)}`; }
}

// ── Street View ───────────────────────────────────────────────────────────────

export function toolStreetView(location: string, size = "600x400"): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) return "GOOGLE_MAPS_API_KEY not set";
  const url = `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${encodeURIComponent(location)}&key=${k}`;
  return `**Street View — ${location}**\n![Street View](${url})`;
}

// ── Gmail ─────────────────────────────────────────────────────────────────────

export async function toolGmailSend(
  userId: string,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const tokens = getGoogleTokens(userId);
  if (!tokens) return NOT_CONNECTED;

  try {
    // Build RFC 2822 message
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n");

    // Base64url encode
    const encoded = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await authedFetch(userId, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      body: JSON.stringify({ raw: encoded }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return `Gmail send failed: HTTP ${res.status} — ${errText.slice(0, 200)}`;
    }

    return `Email sent to ${to} successfully.`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === NOT_CONNECTED) return NOT_CONNECTED;
    return `Gmail send error: ${msg}`;
  }
}

export async function toolGmailRead(
  userId: string,
  query?: string,
  maxResults = 5
): Promise<string> {
  const tokens = getGoogleTokens(userId);
  if (!tokens) return NOT_CONNECTED;

  try {
    const params = new URLSearchParams({ maxResults: String(maxResults) });
    if (query) params.set("q", query);

    const listRes = await authedFetch(
      userId,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`
    );
    if (!listRes.ok) return `Gmail list failed: HTTP ${listRes.status}`;
    const listData = await listRes.json();
    const messages = (listData.messages ?? []) as Array<{ id: string }>;
    if (!messages.length) return query ? `No emails found matching "${query}".` : "No emails found.";

    const results: string[] = [];
    for (const msg of messages.slice(0, maxResults)) {
      try {
        const msgRes = await authedFetch(
          userId,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
        );
        if (!msgRes.ok) continue;
        const msgData = await msgRes.json();
        const headers = (msgData.payload?.headers ?? []) as Array<{ name: string; value: string }>;
        const get = (name: string) => headers.find((h) => h.name === name)?.value ?? "";
        const snippet = (msgData.snippet as string) ?? "";
        results.push(
          `**From:** ${get("From")}\n**Subject:** ${get("Subject")}\n**Date:** ${get("Date")}\n${snippet}`
        );
      } catch {
        // skip failed message
      }
    }

    return results.length ? results.join("\n\n---\n\n") : "Could not retrieve email details.";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === NOT_CONNECTED) return NOT_CONNECTED;
    return `Gmail read error: ${msg}`;
  }
}

// ── Google Calendar ───────────────────────────────────────────────────────────

export async function toolCalendarGetEvents(userId: string, days = 7): Promise<string> {
  const tokens = getGoogleTokens(userId);
  if (!tokens) return NOT_CONNECTED;

  try {
    const now = new Date();
    const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: "10",
      orderBy: "startTime",
      singleEvents: "true",
    });

    const res = await authedFetch(
      userId,
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`
    );
    if (!res.ok) return `Calendar fetch failed: HTTP ${res.status}`;
    const data = await res.json();
    const events = (data.items ?? []) as Array<{
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      description?: string;
      location?: string;
    }>;

    if (!events.length) return `No events in the next ${days} days.`;

    return events
      .map((e) => {
        const start = e.start?.dateTime ?? e.start?.date ?? "Unknown time";
        const startStr = start
          ? new Date(start).toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : start;
        return [
          `**${e.summary ?? "Untitled event"}**`,
          `  When: ${startStr}`,
          e.location ? `  Where: ${e.location}` : "",
          e.description ? `  Notes: ${e.description.slice(0, 100)}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === NOT_CONNECTED) return NOT_CONNECTED;
    return `Calendar error: ${msg}`;
  }
}

export async function toolCalendarCreateEvent(
  userId: string,
  summary: string,
  start: string,
  end: string,
  description?: string
): Promise<string> {
  const tokens = getGoogleTokens(userId);
  if (!tokens) return NOT_CONNECTED;

  try {
    const body = {
      summary,
      description: description ?? "",
      start: { dateTime: start, timeZone: "UTC" },
      end: { dateTime: end, timeZone: "UTC" },
    };

    const res = await authedFetch(
      userId,
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return `Calendar create failed: HTTP ${res.status} — ${errText.slice(0, 200)}`;
    }

    const data = await res.json();
    return `Event "${summary}" created successfully. ID: ${data.id}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === NOT_CONNECTED) return NOT_CONNECTED;
    return `Calendar create error: ${msg}`;
  }
}

// ── Google Drive ──────────────────────────────────────────────────────────────

export async function toolDriveList(userId: string, query?: string): Promise<string> {
  const tokens = getGoogleTokens(userId);
  if (!tokens) return NOT_CONNECTED;

  try {
    const params = new URLSearchParams({
      fields: "files(id,name,mimeType,modifiedTime)",
      pageSize: "10",
    });
    if (query) params.set("q", query);

    const res = await authedFetch(
      userId,
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`
    );
    if (!res.ok) return `Drive list failed: HTTP ${res.status}`;
    const data = await res.json();
    const files = (data.files ?? []) as Array<{
      id: string;
      name: string;
      mimeType: string;
      modifiedTime: string;
    }>;

    if (!files.length) return query ? `No files found matching "${query}".` : "No files found in Drive.";

    return files
      .map((f) => {
        const modified = f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString("en-US") : "";
        const typeShort = f.mimeType.split(".").pop() ?? f.mimeType;
        return `• **${f.name}** (${typeShort}) — ID: \`${f.id}\`${modified ? ` — Modified: ${modified}` : ""}`;
      })
      .join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === NOT_CONNECTED) return NOT_CONNECTED;
    return `Drive list error: ${msg}`;
  }
}

export async function toolDriveRead(userId: string, fileId: string): Promise<string> {
  const tokens = getGoogleTokens(userId);
  if (!tokens) return NOT_CONNECTED;

  try {
    // Get file metadata to check mimeType
    const metaRes = await authedFetch(
      userId,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=name,mimeType`
    );
    if (!metaRes.ok) return `Drive read failed: HTTP ${metaRes.status}`;
    const meta = await metaRes.json();
    const mimeType: string = meta.mimeType ?? "";

    let content: string;

    if (mimeType.includes("google-apps")) {
      // Google Docs/Sheets/Slides — export as plain text
      const exportRes = await authedFetch(
        userId,
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/plain`
      );
      if (!exportRes.ok) return `Drive export failed: HTTP ${exportRes.status}`;
      content = await exportRes.text();
    } else {
      // Binary or plain file — download media
      const downloadRes = await authedFetch(
        userId,
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`
      );
      if (!downloadRes.ok) return `Drive download failed: HTTP ${downloadRes.status}`;
      content = await downloadRes.text();
    }

    const truncated = content.slice(0, 4000);
    return `**${meta.name}**\n\n${truncated}${content.length > 4000 ? "\n\n...(truncated)" : ""}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === NOT_CONNECTED) return NOT_CONNECTED;
    return `Drive read error: ${msg}`;
  }
}

export async function toolDriveWrite(
  userId: string,
  name: string,
  content: string,
  mimeType = "text/plain"
): Promise<string> {
  const tokens = getGoogleTokens(userId);
  if (!tokens) return NOT_CONNECTED;

  try {
    const token = await getValidAccessToken(userId);
    if (!token) return NOT_CONNECTED;

    const metadata = JSON.stringify({ name, mimeType });
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      metadata +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      content +
      closeDelimiter;

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body: multipartBody,
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return `Drive write failed: HTTP ${res.status} — ${errText.slice(0, 200)}`;
    }

    const data = await res.json();
    return `File "${name}" created in Google Drive. ID: ${data.id}`;
  } catch (err) {
    return `Drive write error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
