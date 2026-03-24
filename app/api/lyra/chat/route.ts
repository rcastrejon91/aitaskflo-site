import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { exec as _exec } from "child_process";
import { promisify } from "util";
import fsp from "fs/promises";
import nodePath from "path";
import { getActiveAgent, getAgent, incrementConversationCount } from "@/lib/lyra/agents";
import { upsertUser, upsertCrmContact, searchCrmContacts, buildMemoryContext, extractAndStoreFacts, createTask, listTasks, getSubscription, getTodayUsage, incrementUsage } from "@/lib/lyra/db";
import { PLANS } from "@/lib/stripe";
import { buildLearningContext } from "@/lib/lyra/weblearner";
import { generateBook } from "@/lib/lyra/bookgen";
import { buildGameContext } from "@/lib/lyra/gamedev";
import { buildGame, improveGame } from "@/lib/lyra/gamebuilder";
import { auth } from "@/auth";

const execAsync = promisify(_exec);


// Real tool definitions
const LYRA_TOOLS: Anthropic.Tool[] = [
  {
    name: "image_gen",
    description:
      "Generate an image from a text description. Use whenever the user asks to create, generate, draw, make, or visualize anything.",
    input_schema: {
      type: "object" as const,
      properties: {
        prompt: { type: "string", description: "Vivid, detailed description including style, lighting, mood." },
      },
      required: ["prompt"],
    },
  },
  {
    name: "send_email",
    description: "Send a real email via Gmail. Use whenever the user asks to send, write, or compose an email.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Full email body" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather, 3-day forecast, sunrise/sunset times, and moon phase for any city. No API key needed.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string", description: "City name or location, e.g. 'New York' or 'London, UK'" },
      },
      required: ["location"],
    },
  },
  {
    name: "search_web",
    description: "Search the web for current information, news, facts, or anything the user wants to look up.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "read_url",
    description: "Fetch and read the content of any webpage. Use when the user shares a URL or wants you to look at a site.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Full URL including https://" },
      },
      required: ["url"],
    },
  },
  {
    name: "get_datetime",
    description: "Get the current date and time, optionally in a specific timezone.",
    input_schema: {
      type: "object" as const,
      properties: {
        timezone: { type: "string", description: "IANA timezone, e.g. 'America/New_York'. Defaults to UTC." },
      },
      required: [],
    },
  },
  {
    name: "calculate",
    description: "Evaluate any mathematical expression or calculation.",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: { type: "string", description: "Math expression to evaluate, e.g. '(12 * 8) / 4 + 100'" },
      },
      required: ["expression"],
    },
  },
  {
    name: "crm",
    description: "Create or update a contact in the CRM database. Stores to SQLite — data persists across sessions.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: { type: "string", description: "Action: create, update, or log" },
        contact: { type: "string", description: "Contact name" },
        phone: { type: "string", description: "Phone number" },
        email: { type: "string", description: "Email address" },
        note: { type: "string", description: "Note or details to record" },
      },
      required: ["action", "contact"],
    },
  },
  {
    name: "query_crm",
    description: "Look up contacts in the CRM. Use when user asks who their clients are, to find a contact, or to list everyone in the CRM.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Name, email, or keyword to search. Leave empty to list all contacts." },
      },
      required: [],
    },
  },
  {
    name: "generate_qr",
    description: "Generate a QR code from any text, URL, contact info, or data. Use when the user asks to create a QR code.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text, URL, or data to encode into the QR code" },
      },
      required: ["text"],
    },
  },
  {
    name: "translate",
    description: "Translate text into any language. Use when the user asks to translate something.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text to translate" },
        to: { type: "string", description: "Target language name or code (e.g. 'Spanish', 'es', 'Japanese', 'zh')" },
        from: { type: "string", description: "Source language code or name. Default: auto-detect" },
      },
      required: ["text", "to"],
    },
  },
  {
    name: "get_news",
    description: "Get the latest news with metadata (source, date, sentiment). Supports topic filtering. Use when the user asks for news, current events, or what's happening.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: { type: "string", description: "Topic to search (e.g. 'AI', 'crypto', 'space'). Leave empty for top headlines." },
        category: { type: "string", description: "Filter by category: tech, health, science, business, sports, entertainment. Optional." },
        sentiment: { type: "string", description: "Filter by sentiment: positive, negative, neutral. Optional." },
      },
      required: [],
    },
  },
  {
    name: "create_task",
    description: "Create a task or reminder for the user. Use when the user asks to remember something, add a task, set a reminder, or create a to-do.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        notes: { type: "string", description: "Additional notes or details" },
        due_date: { type: "string", description: "Due date in YYYY-MM-DD format (optional)" },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "List the user's tasks and reminders. Use when the user asks to see their tasks, to-do list, or reminders.",
    input_schema: {
      type: "object" as const,
      properties: {
        include_completed: { type: "boolean", description: "Include completed tasks. Default false." },
      },
      required: [],
    },
  },
  {
    name: "moon_phase",
    description: "Get the current moon phase, illumination percentage, next full moon date, and next new moon date. Astronomically calculated — no API needed.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "sun_times",
    description: "Get sunrise, sunset, golden hour, blue hour, and twilight times for any city or location.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string", description: "City or location name, e.g. 'New York' or 'Tokyo'" },
      },
      required: ["location"],
    },
  },
  {
    name: "world_clock",
    description: "Show current time in multiple cities or timezones simultaneously. Includes daytime indicator and UTC offset.",
    input_schema: {
      type: "object" as const,
      properties: {
        timezones: { type: "string", description: "Comma-separated IANA timezones or city names, e.g. 'America/New_York, Europe/London, Asia/Tokyo'. Leave empty for global overview." },
      },
      required: [],
    },
  },
  {
    name: "user_location",
    description: "Detect the user's approximate location from their IP address. Always ask permission before using. Good for auto-filling weather, sun times, or moon visibility.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "godot_builder",
    description: `You are the SENIOR GAME DEVELOPER on this project. Use this tool to build real, complete, production-quality Godot 4 games.

MINDSET: Think like an expert — plan the architecture first, write clean modular code, use components. Never write placeholder code. Every function should actually work.

PHYSICS: Use physics-correct formulas. Jump height → velocity.y = -sqrt(2 * gravity * height). Coyote time, jump buffering, acceleration curves, friction — all of it.

AI: State machines for all enemies. NavigationAgent2D for pathfinding. Line-of-sight raycasts. Telegraphed attacks. Flocking for swarms.

GAME FEEL: Screen shake, hitstop (Engine.time_scale), squash/stretch, particle bursts, pitch variation on sounds. Make it feel GREAT.

ARCHITECTURE: HealthComponent.gd + HitboxComponent.gd + HurtboxComponent.gd pattern. Signals for decoupled systems. Autoloads for GameManager/AudioManager/SaveManager. Groups for broadcast.

PROCEDURAL: FastNoiseLite for terrain, BSP/drunk-walk for dungeons, weighted random for loot.

ACTIONS:
- write_file: Write one file (use for focused edits)
- write_files: Write MULTIPLE files at once — pass files as JSON array string: [{"path":"...","content":"..."},...]
- scaffold_project: Generate complete project structure from a game concept (pass concept in path field)
- read_file: Read a file to understand current code before editing
- list_files: See all files in the project
- delete_file: Delete a file
- run_command: Run shell commands (build, export, git operations)
- git_commit: Stage all and commit
- git_push: Push to remote`,
    input_schema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          description: "write_file | write_files | scaffold_project | read_file | list_files | delete_file | run_command | git_commit | git_push",
        },
        path: {
          type: "string",
          description: "For write_file/read_file/delete_file: file path relative to game root (e.g. 'scripts/Player.gd'). For scaffold_project: the game concept/genre description.",
        },
        content: {
          type: "string",
          description: "For write_file: full file content. For write_files: JSON array string of [{path, content},...] objects.",
        },
        command: {
          type: "string",
          description: "Shell command to run inside the game directory",
        },
        message: {
          type: "string",
          description: "Git commit message for git_commit action",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "improve_game",
    description:
      "Add a feature, fix a bug, or improve an existing game that was previously built. Use when user says: add X to the game, make the enemies harder, add a shop, add multiplayer, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        improvement: { type: "string", description: "What to add or change — be specific" },
        name: { type: "string", description: "Game project slug/folder name (same as when it was built)" },
      },
      required: ["improvement", "name"],
    },
  },
  {
    name: "write_book",
    description:
      "Write a complete book with chapters and AI-generated illustrations. Use whenever the user asks to write, create, or generate a book, story, or novel.",
    input_schema: {
      type: "object" as const,
      properties: {
        concept: { type: "string", description: "The story concept or premise" },
        genre: { type: "string", description: "Genre: fantasy, sci-fi, romance, thriller, mystery, adventure, horror, children's" },
        chapters: { type: "string", description: "Number of chapters (3, 5, 7, or 10)" },
      },
      required: ["concept"],
    },
  },
  {
    name: "build_game",
    description:
      "Autonomously build a complete, playable Godot 4 game from scratch — player, enemies, levels, UI, menus, save system, all of it. Use when the user asks to build, create, make, or ship a full game. This runs an agentic loop that writes all the code until the game is done.",
    input_schema: {
      type: "object" as const,
      properties: {
        concept: { type: "string", description: "Game concept, story, and main mechanic" },
        genre: { type: "string", description: "Game genre: platformer, rpg, shooter, puzzle, roguelike, adventure, horror, racing, simulation, life sim, tycoon" },
        name: { type: "string", description: "Name/slug for the game project folder (lowercase, hyphens)" },
      },
      required: ["concept"],
    },
  },
];

function pollinationsUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
}

// ── Real tool implementations ────────────────────────────────────────────────

async function toolSendEmail(to: string, subject: string, body: string): Promise<string> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return "Email not sent: add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local. Get the app password at myaccount.google.com → Security → App passwords.";
  }
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    await transporter.sendMail({ from: user, to, subject, text: body });
    return `Email sent to ${to}.`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Email failed: ${msg}`;
  }
}

async function toolGetWeather(location: string): Promise<string> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    const geo = await geoRes.json();
    if (!geo.results?.length) return `Location not found: ${location}`;
    const { latitude, longitude, name, country, admin1 } = geo.results[0];
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=3`
    );
    const w = await wRes.json();
    const c = w.current;
    const codes: Record<number, string> = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Foggy", 51: "Light drizzle", 61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
      71: "Light snow", 73: "Moderate snow", 75: "Heavy snow",
      80: "Light showers", 81: "Moderate showers", 82: "Heavy showers",
      95: "Thunderstorm", 99: "Thunderstorm with hail",
    };
    const condition = codes[c.weather_code] ?? `Code ${c.weather_code}`;
    const daily = w.daily;
    const forecast = [0, 1, 2].map((i) =>
      `${daily.time[i]}: ${Math.round(daily.temperature_2m_max[i])}°F / ${Math.round(daily.temperature_2m_min[i])}°F`
    ).join(", ");

    // Sunrise/sunset for today (index 0)
    const fmtTime = (iso: string) => {
      try {
        return new Date(iso).toLocaleTimeString("en-US", {
          hour: "2-digit", minute: "2-digit", hour12: true, timeZone: w.timezone ?? "UTC",
        });
      } catch { return iso; }
    };
    const sunriseStr = daily.sunrise?.[0] ? `Sunrise: ${fmtTime(daily.sunrise[0])}` : "";
    const sunsetStr  = daily.sunset?.[0]  ? `Sunset: ${fmtTime(daily.sunset[0])}`  : "";

    // Moon phase
    const moon = getMoonPhaseData();

    return [
      `${name}, ${admin1 ?? ""} ${country}`,
      `Now: ${Math.round(c.temperature_2m)}°F (feels ${Math.round(c.apparent_temperature)}°F) — ${condition}`,
      `Humidity: ${c.relative_humidity_2m}% | Wind: ${Math.round(c.wind_speed_10m)} mph`,
      `3-day forecast: ${forecast}`,
      sunriseStr && sunsetStr ? `${sunriseStr}   ${sunsetStr}` : "",
      `${moon.emoji} Moon: ${moon.phase} (${moon.illumination}% illuminated)`,
    ].filter(Boolean).join("\n");
  } catch {
    return "Weather lookup failed — try again.";
  }
}

async function toolSearchWeb(query: string): Promise<string> {
  // Try Brave Search first if key is configured
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  if (braveKey) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&text_decorations=false`,
        {
          headers: { "Accept": "application/json", "X-Subscription-Token": braveKey },
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const results = data.web?.results?.slice(0, 5) ?? [];
        if (results.length > 0) {
          return results.map((r: { title: string; description: string; url: string }) =>
            `**${r.title}**\n${r.description}\n${r.url}`
          ).join("\n\n");
        }
      }
    } catch { /* fall through to DuckDuckGo */ }
  }

  // DuckDuckGo fallback
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "User-Agent": "Lyra/1.0" }, signal: AbortSignal.timeout(6_000) }
    );
    const data = await res.json();
    const parts: string[] = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    if (data.Answer) parts.push(`Answer: ${data.Answer}`);
    if (data.RelatedTopics?.length) {
      const topics = data.RelatedTopics.slice(0, 6).map((t: { Text?: string }) => t.Text).filter(Boolean).join("\n• ");
      if (topics) parts.push(`Related:\n• ${topics}`);
    }
    return parts.length ? parts.join("\n\n") : `No instant results for "${query}". Try being more specific.`;
  } catch {
    return "Search failed — try again.";
  }
}

async function toolReadUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Lyra/1.0)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return `Failed to fetch ${url}: HTTP ${res.status}`;
    const html = await res.text();
    // Strip scripts, styles, tags — keep readable text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
    return text || "Page loaded but no readable text found.";
  } catch {
    return `Could not fetch ${url} — the site may block external requests.`;
  }
}

function toolGetDatetime(timezone = "UTC"): string {
  try {
    const now = new Date();
    const formatted = now.toLocaleString("en-US", {
      timeZone: timezone,
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
    });
    return formatted;
  } catch {
    return new Date().toUTCString();
  }
}

function toolCalculate(expression: string): string {
  try {
    // Sanitize — only allow safe math characters
    const safe = expression.replace(/[^0-9+\-*/().%^, ]/g, "").trim();
    if (!safe) return "Invalid expression.";
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${safe})`)();
    return `${expression} = ${result}`;
  } catch {
    return `Could not evaluate: ${expression}`;
  }
}

async function toolTranslate(text: string, to: string, from = "auto"): Promise<string> {
  const langMap: Record<string, string> = {
    arabic: "ar", chinese: "zh", dutch: "nl", french: "fr", german: "de",
    greek: "el", hindi: "hi", indonesian: "id", italian: "it", japanese: "ja",
    korean: "ko", polish: "pl", portuguese: "pt", romanian: "ro", russian: "ru",
    spanish: "es", swedish: "sv", thai: "th", turkish: "tr", ukrainian: "uk",
    vietnamese: "vi",
  };
  const tl = langMap[to.toLowerCase()] ?? to;
  const sl = langMap[from.toLowerCase()] ?? from;
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    const data = await res.json();
    if (data.responseStatus === 200) return data.responseData.translatedText as string;
    return "Translation failed — try again.";
  } catch {
    return "Translation service unavailable.";
  }
}

// Simple sentiment scorer
function scoreSentiment(text: string): "positive" | "negative" | "neutral" {
  const pos = /\b(breakthrough|success|launch|growth|win|achieve|discover|advance|surge|record|milestone|profit|gain|innovative|recover|cure|save)\b/i;
  const neg = /\b(crash|fail|warning|threat|crisis|danger|death|loss|collapse|risk|decline|fall|attack|breach|fraud|recall|ban|shutdown|arrest|kill|hack|leak)\b/i;
  const p = (text.match(pos) ?? []).length;
  const n = (text.match(neg) ?? []).length;
  if (p > n) return "positive";
  if (n > p) return "negative";
  return "neutral";
}

const CREDIBILITY: Record<string, string> = {
  "Reuters": "★★★★★", "AP News": "★★★★★", "BBC": "★★★★★",
  "The Guardian": "★★★★☆", "New York Times": "★★★★☆", "Washington Post": "★★★★☆",
  "Bloomberg": "★★★★☆", "Financial Times": "★★★★☆", "Wall Street Journal": "★★★★☆",
  "TechCrunch": "★★★☆☆", "The Verge": "★★★☆☆", "Wired": "★★★☆☆",
  "Forbes": "★★★☆☆", "CNN": "★★★☆☆", "NBC News": "★★★☆☆",
};

async function toolGetNews(topic?: string, category?: string, sentimentFilter?: string): Promise<string> {
  try {
    // Category → topic mapping
    const catTopics: Record<string, string> = {
      tech: "technology AI software", health: "health medicine",
      science: "science research", business: "business economy",
      sports: "sports", entertainment: "entertainment",
    };
    const query = topic || (category ? catTopics[category.toLowerCase()] : "");

    const rssUrl = query
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
      : `https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en`;

    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Lyra/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12);
    if (!items.length) return query ? `No news found for "${query}".` : "No headlines available right now.";

    const decode = (s: string) =>
      s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

    const parsed = items.map(([, item]) => {
      const title = decode(
        item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
        item.match(/<title>(.*?)<\/title>/)?.[1] ?? "Untitled"
      );
      const source = decode(item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? "");
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
      const link    = item.match(/<link>(.*?)<\/link>/)?.[1] ??
                      item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? "";
      const sentiment = scoreSentiment(title);
      return { title, source, pubDate, link, sentiment };
    });

    // Filter by sentiment if requested
    const filtered = sentimentFilter
      ? parsed.filter((a) => a.sentiment === sentimentFilter.toLowerCase())
      : parsed;

    if (!filtered.length) return `No ${sentimentFilter} news found for "${query}".`;

    const sentEmoji: Record<string, string> = {
      positive: "✅", negative: "🔴", neutral: "⚪",
    };

    const headlines = filtered.slice(0, 6).map((a) => {
      const cred = CREDIBILITY[a.source] ?? "";
      const age  = a.pubDate ? ` · ${new Date(a.pubDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "";
      return `${sentEmoji[a.sentiment]} **${a.title}**\n   ${a.source}${cred ? ` ${cred}` : ""}${age}`;
    });

    return `📰 ${query ? `${query} news` : "Top headlines"}\n\n${headlines.join("\n\n")}`;
  } catch {
    return "News fetch failed — try again.";
  }
}

// ── Moon phase (pure math) ────────────────────────────────────────────────────

interface MoonData {
  phase: string;
  emoji: string;
  illumination: number;
  ageDays: number;
  nextFullMoon: string;
  nextNewMoon: string;
}

function getMoonPhaseData(): MoonData {
  // Reference new moon: Jan 6, 2000 18:14 UTC
  const REF_NEW_MOON = new Date("2000-01-06T18:14:00Z").getTime();
  const CYCLE_MS = 29.53058867 * 24 * 60 * 60 * 1000;
  const FULL_MOON_OFFSET_MS = 14.765 * 24 * 60 * 60 * 1000;

  const now = Date.now();
  const ageMs = ((now - REF_NEW_MOON) % CYCLE_MS + CYCLE_MS) % CYCLE_MS;
  const ageDays = ageMs / (24 * 60 * 60 * 1000);

  // Illumination via cosine (0% at new, 100% at full)
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * ageDays / 29.53058867)) / 2) * 100);

  let phase: string;
  let emoji: string;
  if (ageDays < 1.85)       { phase = "New Moon";        emoji = "🌑"; }
  else if (ageDays < 7.38)  { phase = "Waxing Crescent"; emoji = "🌒"; }
  else if (ageDays < 9.22)  { phase = "First Quarter";   emoji = "🌓"; }
  else if (ageDays < 14.77) { phase = "Waxing Gibbous";  emoji = "🌔"; }
  else if (ageDays < 16.61) { phase = "Full Moon";        emoji = "🌕"; }
  else if (ageDays < 22.15) { phase = "Waning Gibbous";  emoji = "🌖"; }
  else if (ageDays < 23.99) { phase = "Third Quarter";   emoji = "🌗"; }
  else                       { phase = "Waning Crescent"; emoji = "🌘"; }

  const nextFullMs = ageMs < FULL_MOON_OFFSET_MS
    ? now + (FULL_MOON_OFFSET_MS - ageMs)
    : now + (CYCLE_MS - ageMs + FULL_MOON_OFFSET_MS);
  const nextNewMs = now + (CYCLE_MS - ageMs);

  const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return {
    phase, emoji, illumination,
    ageDays: Math.round(ageDays * 10) / 10,
    nextFullMoon: fmtDate(nextFullMs),
    nextNewMoon: fmtDate(nextNewMs),
  };
}

function toolMoonPhase(): string {
  const m = getMoonPhaseData();
  return [
    `${m.emoji} ${m.phase}`,
    `Illumination: ${m.illumination}%`,
    `Moon age: ${m.ageDays} days into the ${Math.round(29.53)}-day cycle`,
    `Next full moon: ${m.nextFullMoon}`,
    `Next new moon: ${m.nextNewMoon}`,
  ].join("\n");
}

// Subtle lunar influence on Lyra's tone (injected into system prompt)
function getLunarPersonalityNote(): string {
  const m = getMoonPhaseData();
  const tones: Record<string, string> = {
    "New Moon":        "It's a new moon — be introspective, speak of hidden beginnings.",
    "Waxing Crescent": "The moon waxes crescent — be hopeful, forward-looking, full of potential.",
    "First Quarter":   "First quarter moon — be decisive, clear, action-oriented.",
    "Waxing Gibbous":  "Moon approaches fullness — be ambitious, expansive, building toward something.",
    "Full Moon":       "Full moon tonight — allow a heightened, luminous quality. More vivid, more awake.",
    "Waning Gibbous":  "The moon wanes gibbous — be reflective, share deeper insights and earned wisdom.",
    "Third Quarter":   "Third quarter moon — speak of release, what no longer serves, honest clarity.",
    "Waning Crescent": "Waning crescent — be gentle, quiet, mystical. The world is going to sleep.",
  };
  const note = tones[m.phase] ?? "";
  return `\n\n[Lunar phase: ${m.emoji} ${m.phase} (${m.illumination}% illuminated) — ${note}]`;
}

// ── Sun times ─────────────────────────────────────────────────────────────────

async function toolSunTimes(location: string): Promise<string> {
  // Geocode
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
    { signal: AbortSignal.timeout(8000) }
  );
  const geo = await geoRes.json();
  if (!geo.results?.length) return `Location not found: ${location}`;
  const { latitude: lat, longitude: lng, name, country, timezone } = geo.results[0];
  const tz: string = timezone ?? "UTC";

  // Sunrise-sunset.org — returns UTC ISO strings when formatted=0
  const sunRes = await fetch(
    `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=today&formatted=0`,
    { signal: AbortSignal.timeout(8000) }
  );
  const sun = await sunRes.json();
  if (sun.status !== "OK") return `Sun times unavailable for ${location}.`;

  const r = sun.results;
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: tz,
  });
  const fmtDur = (secs: number) =>
    `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;

  const sunriseMs  = new Date(r.sunrise).getTime();
  const sunsetMs   = new Date(r.sunset).getTime();
  const goldenMorningEnd   = new Date(sunriseMs + 60 * 60 * 1000).toISOString();
  const goldenEveningStart = new Date(sunsetMs - 60 * 60 * 1000).toISOString();
  const blueHrMorningEnd   = new Date(sunriseMs - 20 * 60 * 1000).toISOString();
  const blueHrEveningStart = new Date(sunsetMs + 20 * 60 * 1000).toISOString();

  return [
    `☀️ Sun times for ${name}, ${country}`,
    `Sunrise: ${fmt(r.sunrise)}   Sunset: ${fmt(r.sunset)}`,
    `Solar noon: ${fmt(r.solar_noon)}   Day length: ${fmtDur(r.day_length)}`,
    ``,
    `🌅 Golden hour (morning): ${fmt(r.sunrise)} → ${fmt(goldenMorningEnd)}`,
    `🌇 Golden hour (evening): ${fmt(goldenEveningStart)} → ${fmt(r.sunset)}`,
    ``,
    `🔵 Blue hour (morning): ${fmt(r.civil_twilight_begin)} → ${fmt(blueHrMorningEnd)}`,
    `🔵 Blue hour (evening): ${fmt(blueHrEveningStart)} → ${fmt(r.civil_twilight_end)}`,
    ``,
    `Astronomical twilight: ${fmt(r.astronomical_twilight_begin)} → ${fmt(r.astronomical_twilight_end)}`,
    `(All times ${tz})`,
  ].join("\n");
}

// ── World clock ───────────────────────────────────────────────────────────────

function toolWorldClock(timezones?: string): string {
  const DEFAULT_ZONES = [
    "America/New_York", "America/Chicago", "America/Los_Angeles",
    "Europe/London", "Europe/Berlin", "Asia/Dubai",
    "Asia/Tokyo", "Australia/Sydney",
  ];

  const zones = timezones?.trim()
    ? timezones.split(",").map((z) => z.trim()).filter(Boolean)
    : DEFAULT_ZONES;

  const now = new Date();

  const rows = zones.map((tz) => {
    try {
      const time = now.toLocaleTimeString("en-US", {
        timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
      });
      const date = now.toLocaleDateString("en-US", {
        timeZone: tz, weekday: "short", month: "short", day: "numeric",
      });
      // Determine if daytime (6am–8pm local)
      const hourStr = now.toLocaleTimeString("en-GB", {
        timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const hour = parseInt(hourStr.split(":")[0], 10);
      const isDaytime = hour >= 6 && hour < 20;

      // UTC offset
      const offsetMin = -now.getTimezoneOffset();
      const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
      const diffMin = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
      const sign = diffMin >= 0 ? "+" : "-";
      const absH = Math.floor(Math.abs(diffMin) / 60);
      const absM = Math.abs(diffMin) % 60;
      const offset = `UTC${sign}${absH}${absM ? `:${String(absM).padStart(2, "0")}` : ""}`;

      const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
      return `${isDaytime ? "☀️" : "🌙"} ${city.padEnd(18)} ${time.padEnd(10)} ${date.padEnd(14)} ${offset}`;
    } catch {
      return `❌ ${tz} — invalid timezone`;
    }
  });

  return `🕐 World Clock — ${now.toUTCString()}\n\n${rows.join("\n")}`;
}

// ── User location (IP-based) ──────────────────────────────────────────────────

async function toolUserLocation(clientIp?: string): Promise<string> {
  const ip = clientIp?.trim() && !clientIp.startsWith("127.") && !clientIp.startsWith("::") ? clientIp : "";
  const url = ip
    ? `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp`
    : `http://ip-api.com/json/?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.status !== "success") {
      return `Location detection failed: ${data.message ?? "unknown error"}`;
    }
    return [
      `📍 Location: ${data.city}, ${data.regionName}, ${data.country}`,
      `Coordinates: ${data.lat}, ${data.lon}`,
      `Timezone: ${data.timezone}`,
      `ISP: ${data.isp}`,
    ].join("\n");
  } catch {
    return "Location detection unavailable — try again.";
  }
}

// ── Godot builder ─────────────────────────────────────────────────────────────

// Default game path for the server. Override with GAME_DIR env var.
// Hardcoded fallback avoids process.cwd() which causes Turbopack NFT
// to trace the entire project directory.
const DEFAULT_GAME_DIR = "/home/aitaskflo/game/13th-witch";

async function toolGodotBuilder(
  action: string,
  filePath?: string,
  content?: string,
  command?: string,
  message?: string
): Promise<string> {
  const GAME_DIR = process.env.GAME_DIR ?? DEFAULT_GAME_DIR;

  const safePath = (rel: string): string => {
    const resolved = nodePath.resolve(GAME_DIR, rel);
    if (!resolved.startsWith(GAME_DIR)) throw new Error("Path traversal blocked");
    return resolved;
  };

  switch (action) {
    case "write_file": {
      if (!filePath || content === undefined) return "write_file requires path and content.";
      const full = safePath(filePath);
      await fsp.mkdir(nodePath.dirname(full), { recursive: true });
      await fsp.writeFile(full, content, "utf-8");
      return `✓ Wrote ${filePath} (${content.length} chars)`;
    }

    case "write_files": {
      if (!content) return "write_files requires content as JSON array of {path, content} objects.";
      let files: Array<{ path: string; content: string }>;
      try { files = JSON.parse(content); }
      catch { return "write_files: content must be valid JSON array [{path, content}, ...]"; }
      if (!Array.isArray(files)) return "write_files: content must be a JSON array";
      const results: string[] = [];
      for (const f of files) {
        if (!f.path || f.content === undefined) { results.push(`✗ Skipped (missing path or content)`); continue; }
        const full = safePath(f.path);
        await fsp.mkdir(nodePath.dirname(full), { recursive: true });
        await fsp.writeFile(full, f.content, "utf-8");
        results.push(`✓ ${f.path} (${f.content.length} chars)`);
      }
      return results.join("\n");
    }

    case "scaffold_project": {
      // filePath holds the game concept/genre for this action
      const concept = filePath ?? "a 2D platformer game";
      await fsp.mkdir(GAME_DIR, { recursive: true });

      // Standard Godot 4 directory structure
      const dirs = [
        "scenes/world", "scenes/entities", "scenes/ui", "scenes/effects",
        "scripts/autoloads", "scripts/components", "scripts/utils",
        "assets/sprites", "assets/audio", "assets/fonts", "assets/shaders",
        "resources/items", "resources/enemies",
      ];
      for (const d of dirs) await fsp.mkdir(nodePath.join(GAME_DIR, d), { recursive: true });

      // project.godot
      const projectGodot = `; Engine configuration file.
[gd_resource type="ProjectSettings" format=3]

[configuration]
config_version=5

[application]
config/name="My Game"
config/description="${concept}"
run/main_scene="res://scenes/world/Main.tscn"
config/features=PackedStringArray("4.3", "Forward Plus")

[autoload]
GameManager="*res://scripts/autoloads/GameManager.gd"
AudioManager="*res://scripts/autoloads/AudioManager.gd"
SaveManager="*res://scripts/autoloads/SaveManager.gd"

[display]
window/size/viewport_width=1920
window/size/viewport_height=1080
window/stretch/mode="canvas_items"
window/stretch/aspect="keep"

[physics]
common/enable_pause_aware_picking=true

[rendering]
renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"
`;

      // GameManager autoload
      const gameManager = `extends Node

signal game_paused(is_paused)
signal score_changed(new_score)

var score: int = 0
var is_paused: bool = false
var current_level: int = 1

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS

func add_score(amount: int) -> void:
	score += amount
	score_changed.emit(score)

func pause_game() -> void:
	is_paused = !is_paused
	get_tree().paused = is_paused
	game_paused.emit(is_paused)

func restart_level() -> void:
	get_tree().reload_current_scene()

func go_to_scene(path: String) -> void:
	get_tree().change_scene_to_file(path)
`;

      // AudioManager autoload
      const audioManager = `extends Node

var music_bus := AudioServer.get_bus_index("Music")
var sfx_bus := AudioServer.get_bus_index("SFX")

func play_sfx(stream: AudioStream, pitch_variation: float = 0.1) -> void:
	var player := AudioStreamPlayer.new()
	add_child(player)
	player.stream = stream
	player.pitch_scale = randf_range(1.0 - pitch_variation, 1.0 + pitch_variation)
	player.bus = "SFX"
	player.play()
	player.finished.connect(player.queue_free)

func play_music(stream: AudioStream, fade_in: float = 1.0) -> void:
	# TODO: add fade logic
	var player := AudioStreamPlayer.new()
	add_child(player)
	player.stream = stream
	player.bus = "Music"
	player.play()
`;

      // SaveManager autoload
      const saveManager = `extends Node

const SAVE_PATH = "user://save.json"

func save(data: Dictionary) -> void:
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(data))

func load_save() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return {}
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if not file:
		return {}
	return JSON.parse_string(file.get_as_text()) as Dictionary

func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)

func delete_save() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.remove_absolute(SAVE_PATH)
`;

      // HealthComponent
      const healthComponent = `extends Node
class_name HealthComponent

signal health_changed(new_hp: int, max_hp: int)
signal died

@export var max_health: int = 100
var health: int

func _ready() -> void:
	health = max_health

func take_damage(amount: int) -> void:
	health = max(0, health - amount)
	health_changed.emit(health, max_health)
	if health == 0:
		died.emit()

func heal(amount: int) -> void:
	health = min(max_health, health + amount)
	health_changed.emit(health, max_health)

func is_alive() -> bool:
	return health > 0
`;

      // HitboxComponent (deals damage)
      const hitboxComponent = `extends Area2D
class_name HitboxComponent

@export var damage: int = 10
@export var knockback_force: float = 300.0

func _ready() -> void:
	area_entered.connect(_on_area_entered)

func _on_area_entered(area: Area2D) -> void:
	if area is HurtboxComponent:
		var direction = (area.global_position - global_position).normalized()
		area.take_hit(damage, direction * knockback_force)
`;

      // HurtboxComponent (receives damage)
      const hurtboxComponent = `extends Area2D
class_name HurtboxComponent

signal hit_taken(damage: int, knockback: Vector2)

@export var invincibility_duration: float = 0.5
var _invincible: bool = false

func take_hit(damage: int, knockback: Vector2) -> void:
	if _invincible:
		return
	hit_taken.emit(damage, knockback)
	_start_invincibility()

func _start_invincibility() -> void:
	_invincible = true
	await get_tree().create_timer(invincibility_duration).timeout
	_invincible = false
`;

      const filesToWrite: Record<string, string> = {
        "project.godot": projectGodot,
        "scripts/autoloads/GameManager.gd": gameManager,
        "scripts/autoloads/AudioManager.gd": audioManager,
        "scripts/autoloads/SaveManager.gd": saveManager,
        "scripts/components/HealthComponent.gd": healthComponent,
        "scripts/components/HitboxComponent.gd": hitboxComponent,
        "scripts/components/HurtboxComponent.gd": hurtboxComponent,
      };

      const written: string[] = [];
      for (const [fp, fc] of Object.entries(filesToWrite)) {
        const full = nodePath.join(GAME_DIR, fp);
        await fsp.mkdir(nodePath.dirname(full), { recursive: true });
        await fsp.writeFile(full, fc, "utf-8");
        written.push(`✓ ${fp}`);
      }

      return `Project scaffolded for: "${concept}"\n\nFiles created:\n${written.join("\n")}\n\nDirectory structure:\n${dirs.map(d => `  ${d}/`).join("\n")}\n\nNext steps:\n1. Write your Player.gd in scenes/entities/\n2. Create Main.tscn as your first scene\n3. Build your first level in scenes/world/\n4. Add enemy state machines in scenes/entities/`;
    }

    case "read_file": {
      if (!filePath) return "read_file requires path.";
      try {
        const text = await fsp.readFile(safePath(filePath), "utf-8");
        return text.slice(0, 8000);
      } catch {
        return `File not found: ${filePath}`;
      }
    }

    case "list_files": {
      try {
        await fsp.mkdir(GAME_DIR, { recursive: true });
        const cwd = filePath ? safePath(filePath) : GAME_DIR;
        const { stdout } = await execAsync("find . -type f | sort | head -80", { cwd, timeout: 10_000 });
        return stdout.trim() || "Directory is empty.";
      } catch (e) {
        return `list_files error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "delete_file": {
      if (!filePath) return "delete_file requires path.";
      await fsp.unlink(safePath(filePath));
      return `✓ Deleted ${filePath}`;
    }

    case "run_command": {
      if (!command) return "run_command requires command.";
      await fsp.mkdir(GAME_DIR, { recursive: true });
      try {
        const { stdout, stderr } = await execAsync(command, { cwd: GAME_DIR, timeout: 60_000 });
        return ((stdout + "\n" + stderr).trim()).slice(0, 4000) || "Command completed (no output)";
      } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string; message?: string };
        return ((err.stdout ?? "") + (err.stderr ?? "") + (err.message ?? "")).slice(0, 4000);
      }
    }

    case "git_commit": {
      const msg = (message ?? "chore: Lyra auto-commit").replace(/"/g, '\\"');
      await fsp.mkdir(GAME_DIR, { recursive: true });
      try {
        await execAsync("git add -A", { cwd: GAME_DIR });
        const { stdout } = await execAsync(`git commit -m "${msg}"`, { cwd: GAME_DIR });
        return stdout.trim() || "Committed.";
      } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string };
        return ((err.stdout ?? "") + (err.stderr ?? "")).trim() || "Nothing to commit.";
      }
    }

    case "git_push": {
      try {
        const { stdout, stderr } = await execAsync("git push", { cwd: GAME_DIR, timeout: 30_000 });
        return (stdout + stderr).trim() || "Pushed.";
      } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string; message?: string };
        return ((err.stdout ?? "") + (err.stderr ?? "") + (err.message ?? "")).slice(0, 2000);
      }
    }

    default:
      return `Unknown action "${action}". Valid: write_file, read_file, list_files, delete_file, run_command, git_commit, git_push`;
  }
}

// ── Groq fallback (text-only, no tools) ──────────────────────────────────────
async function streamGroqFallback(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    // No Groq key — try local Ollama
    await streamOllamaFallback(systemPrompt, messages, encoder, controller);
    return;
  }

  // Groq is text-only — flatten any image content blocks to their text parts
  const flattenContent = (c: unknown): string => {
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return c
        .filter((b): b is { type: string; text?: string } => typeof b === "object" && b !== null)
        .map((b) => (b.type === "text" && b.text ? b.text : ""))
        .join(" ")
        .trim() || "[image]";
    }
    return String(c);
  };

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: flattenContent(m.content) })),
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      stream: true,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    // Groq failed — fall through to local Ollama
    await streamOllamaFallback(systemPrompt, messages, encoder, controller);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;
  const dec = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const json = JSON.parse(line.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) controller.enqueue(encoder.encode(delta));
      } catch { /* skip malformed SSE line */ }
    }
  }
}

// ── Ollama fallback (local, unfiltered) ───────────────────────────────────────
async function streamOllamaFallback(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL ?? "llama3";

  const flattenContent = (c: unknown): string => {
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return (c as Array<{ type?: string; text?: string }>)
        .map((b) => (b.type === "text" && b.text ? b.text : ""))
        .join(" ").trim() || "[image]";
    }
    return String(c);
  };

  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: flattenContent(m.content) })),
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.status.toString());
    controller.enqueue(encoder.encode(`⚠️ Ollama error: ${errText}`));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;
  const dec = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = dec.decode(value, { stream: true }).split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        const chunk = json.message?.content;
        if (chunk) controller.enqueue(encoder.encode(chunk));
        if (json.done) return;
      } catch { /* skip malformed line */ }
    }
  }
}

// ── Task Router (Option 2) ────────────────────────────────────────────────────

interface RouterDecision {
  route: "claude" | "groq" | "ollama";
  taskType: "simple" | "creative" | "code" | "factual" | "tool" | "analysis";
  useParallel: boolean;
}

async function routeTask(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<RouterDecision> {
  const DEFAULT: RouterDecision = { route: "claude", taskType: "analysis", useParallel: false };

  // Tool-use requests always go to Claude (only model with tools)
  const toolKeywords = /send email|search(?: the web| for)?|weather|translate|qr code|calculate|generat(?:e|ing) image|draw|create image|news|what(?:'s| is) the time|moon phase|sunrise|sunset/i;
  if (toolKeywords.test(message)) return { ...DEFAULT, taskType: "tool" };

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return DEFAULT;

  try {
    const context = history
      .slice(-2)
      .map((m) => `${m.role}: ${String(m.content).slice(0, 100)}`)
      .join("\n");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 60,
        temperature: 0,
        messages: [{
          role: "user",
          content: `Classify this chat message. Reply ONLY with a JSON object — no explanation.
${context ? `Context:\n${context}\n` : ""}Message: "${message.slice(0, 300)}"

JSON: {"route":"claude|groq","taskType":"simple|creative|code|factual|analysis","parallel":true|false}
Rules:
- route=groq: greetings, jokes, simple facts, small talk, one-liners
- route=claude: code, reasoning, creative writing, long content, anything complex
- parallel=true only for: analysis, comparisons, explanations where multiple AI perspectives help
- parallel=false for everything else`,
        }],
      }),
      signal: AbortSignal.timeout(3_000),
    });

    if (!res.ok) return DEFAULT;
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");

    return {
      route: parsed.route === "groq" ? "groq" : "claude",
      taskType: parsed.taskType ?? "analysis",
      useParallel: parsed.parallel === true && process.env.ENABLE_PARALLEL !== "false",
    };
  } catch {
    return DEFAULT;
  }
}

// ── Parallel Agents + Judge (Option 3) ───────────────────────────────────────

async function streamParallelJudge(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  anthropicKey: string
): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;

  const flatMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  const lastUserMessage =
    [...flatMessages].reverse().find((m) => m.role === "user")?.content ?? "";

  // Run Claude Sonnet + Groq simultaneously (non-streaming for comparison)
  const [claudeResult, groqResult] = await Promise.allSettled([
    new Anthropic({ apiKey: anthropicKey }).messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: flatMessages,
    }).then((r) => (r.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined)?.text ?? ""),

    groqKey
      ? fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 1024,
            messages: [{ role: "system", content: systemPrompt }, ...flatMessages],
          }),
          signal: AbortSignal.timeout(20_000),
        })
          .then((r) => r.json())
          .then((d) => (d.choices?.[0]?.message?.content as string) ?? "")
      : Promise.resolve(""),
  ]);

  const claudeText = claudeResult.status === "fulfilled" ? claudeResult.value : "";
  const groqText   = groqResult.status   === "fulfilled" ? groqResult.value   : "";

  // If only one succeeded, use it
  if (!claudeText && !groqText) {
    controller.enqueue(encoder.encode("⚠️ All models failed. Please try again."));
    return;
  }
  if (!groqText || !claudeText) {
    controller.enqueue(encoder.encode(claudeText || groqText));
    return;
  }

  // Judge: pick the better response
  let winner = claudeText;
  if (groqKey) {
    try {
      const judgeData = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 10,
          temperature: 0,
          messages: [{
            role: "user",
            content: `You are a judge. Pick the better AI response to this question.
Question: "${lastUserMessage.slice(0, 400)}"
Response A: "${claudeText.slice(0, 600)}"
Response B: "${groqText.slice(0, 600)}"
Reply ONLY with the letter A or B.`,
          }],
        }),
        signal: AbortSignal.timeout(5_000),
      }).then((r) => r.json());

      const verdict: string = judgeData.choices?.[0]?.message?.content?.trim() ?? "A";
      winner = verdict.startsWith("B") ? groqText : claudeText;
    } catch {
      // Judge failed — default to Claude
    }
  }

  controller.enqueue(encoder.encode(winner));
}

// ── Tool dispatcher ───────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, string>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  userId?: string,
  clientIp?: string
): Promise<string> {
  if (name === "image_gen") {
    const url = pollinationsUrl(input.prompt ?? "");
    controller.enqueue(encoder.encode(`\n__IMG__${url}__IMG__`));
    return "Image generated.";
  }

  if (name === "send_email") {
    const card = JSON.stringify({ tool: "email", to: input.to, subject: input.subject, body: input.body });
    controller.enqueue(encoder.encode(`\n${card}`));
    return await toolSendEmail(input.to ?? "", input.subject ?? "", input.body ?? "");
  }

  if (name === "get_weather") {
    return await toolGetWeather(input.location ?? "");
  }

  if (name === "search_web") {
    return await toolSearchWeb(input.query ?? "");
  }

  if (name === "read_url") {
    return await toolReadUrl(input.url ?? "");
  }

  if (name === "get_datetime") {
    return toolGetDatetime(input.timezone);
  }

  if (name === "calculate") {
    return toolCalculate(input.expression ?? "");
  }

  if (name === "crm") {
    const contact = upsertCrmContact(
      input.contact ?? "",
      input.phone,
      input.email,
      input.note
    );
    const card = JSON.stringify({ tool: "crm", action: input.action, contact: contact.name, phone: contact.phone ?? "", email: contact.email ?? "", note: input.note ?? "" });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Contact "${contact.name}" saved to CRM (id: ${contact.id}).`;
  }

  if (name === "query_crm") {
    const contacts = searchCrmContacts(input.query);
    if (contacts.length === 0) return input.query ? `No contacts found matching "${input.query}".` : "CRM is empty — no contacts yet.";
    const rows = contacts.map((c) =>
      `• ${c.name}${c.phone ? ` | ${c.phone}` : ""}${c.email ? ` | ${c.email}` : ""}${c.notes ? ` | ${c.notes}` : ""}`
    ).join("\n");
    return `Found ${contacts.length} contact(s):\n${rows}`;
  }

  if (name === "generate_qr") {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(input.text ?? "")}&size=400x400&ecc=M`;
    controller.enqueue(encoder.encode(`\n__IMG__${qrUrl}__IMG__`));
    const card = JSON.stringify({ tool: "qr", text: input.text });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `QR code generated for: ${input.text}`;
  }

  if (name === "translate") {
    const result = await toolTranslate(input.text ?? "", input.to ?? "en", input.from ?? "auto");
    const card = JSON.stringify({ tool: "translate", from: input.from ?? "auto", to: input.to, text: input.text, result });
    controller.enqueue(encoder.encode(`\n${card}`));
    return result;
  }

  if (name === "get_news") {
    return await toolGetNews(input.topic, input.category, input.sentiment);
  }

  if (name === "moon_phase") {
    const result = toolMoonPhase();
    const card = JSON.stringify({ tool: "moon", phase: getMoonPhaseData().phase, illumination: getMoonPhaseData().illumination + "%" });
    controller.enqueue(encoder.encode(`\n${card}`));
    return result;
  }

  if (name === "sun_times") {
    return await toolSunTimes(input.location ?? "");
  }

  if (name === "world_clock") {
    return toolWorldClock(input.timezones);
  }

  if (name === "user_location") {
    return await toolUserLocation(clientIp);
  }

  if (name === "create_task") {
    if (!userId) return "Task creation requires login.";
    const task = createTask(userId, input.title ?? "Untitled", input.notes, input.due_date);
    const card = JSON.stringify({ tool: "task", action: "created", title: task.title, due: task.due_date ?? "no due date" });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Task created: "${task.title}"`;
  }

  if (name === "list_tasks") {
    if (!userId) return "Task list requires login.";
    const tasks = listTasks(userId, input.include_completed === "true");
    if (tasks.length === 0) return "No tasks found.";
    return tasks.map(t => `• ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}${t.notes ? ` — ${t.notes}` : ""}`).join("\n");
  }

  if (name === "godot_builder") {
    const result = await toolGodotBuilder(
      input.action ?? "",
      input.path,
      input.content,
      input.command,
      input.message
    );
    const preview = result.slice(0, 120).replace(/\n/g, " ");
    const card = JSON.stringify({
      tool: "godot",
      action: input.action,
      path: input.path ?? "",
      result: preview,
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    return result;
  }

  if (name === "build_game") {
    const rawConcept = input.concept ?? "a 2D platformer";
    const rawGenre = input.genre ?? "platformer";

    // Auto-enhance concept if user referenced a known game
    const { detectGameInspiration } = await import("@/lib/lyra/gamedev");
    const inspiration = detectGameInspiration(rawConcept + " " + rawGenre);
    const concept = inspiration ? `${rawConcept} — inspired by: ${inspiration.concept}. Key features: ${inspiration.keyFeatures}` : rawConcept;
    const genre = inspiration ? inspiration.genre : rawGenre;

    const slug = (input.name ?? rawConcept).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "my-game";
    const BASE_GAME_DIR = process.env.GAME_DIR ? nodePath.dirname(process.env.GAME_DIR) : "/home/aitaskflo/game";
    const gameDir = nodePath.join(BASE_GAME_DIR, slug);

    // Complex genres need more turns
    const g = genre.toLowerCase();
    const isComplex = g.includes("sim") || g.includes("tycoon") || g.includes("life") || g.includes("management") || g.includes("rpg") || g.includes("asymmetric") || g.includes("open world");
    const maxTurns = isComplex ? 45 : 30;

    controller.enqueue(encoder.encode(`\n🎮 Starting ${isComplex ? "complex " : ""}game build for **${rawConcept}** (${genre})…\n`));

    const result = await buildGame(concept, genre, gameDir, (progress) => {
      try {
        if (progress.type === "file") {
          controller.enqueue(encoder.encode(`\n📄 ${progress.message}`));
        } else if (progress.type === "status") {
          controller.enqueue(encoder.encode(`\n⚡ ${progress.message}`));
        } else if (progress.type === "phase") {
          controller.enqueue(encoder.encode(`\n\n**Phase: ${progress.message}**\n`));
        } else if (progress.type === "art") {
          controller.enqueue(encoder.encode(`\n🎨 Concept art generated`));
        }
      } catch { /* stream closed */ }
    }, maxTurns);

    const card = JSON.stringify({
      tool: "game_build",
      name: slug,
      summary: result.summary,
      files: result.files.join(", "),
      play: result.playInstructions,
      file_count: String(result.files.length),
      location: gameDir,
      art: result.artUrls.join(","),
      export_url: result.exportUrl ?? "",
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Game "${slug}" built — ${result.files.length} files written.`;
  }

  if (name === "improve_game") {
    const improvement = input.improvement ?? "improve the game";
    const slug = input.name ?? "my-game";
    const BASE_GAME_DIR = process.env.GAME_DIR ? nodePath.dirname(process.env.GAME_DIR) : "/home/aitaskflo/game";
    const gameDir = nodePath.join(BASE_GAME_DIR, slug);

    controller.enqueue(encoder.encode(`\n🔧 Improving **${slug}**: ${improvement}…\n`));

    const result = await improveGame(gameDir, improvement, (progress) => {
      try {
        if (progress.type === "file") controller.enqueue(encoder.encode(`\n📄 ${progress.message}`));
        else if (progress.type === "status") controller.enqueue(encoder.encode(`\n⚡ ${progress.message}`));
      } catch { /* closed */ }
    });

    const card = JSON.stringify({
      tool: "game_build",
      name: slug,
      summary: result.summary,
      files: result.files.join(", "),
      play: result.playInstructions,
      file_count: String(result.files.length),
      location: gameDir,
      improvement: improvement,
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Improvement "${improvement}" applied to "${slug}" — ${result.files.length} files modified.`;
  }

  if (name === "write_book") {
    const concept = input.concept ?? "an epic adventure";
    const genre = input.genre ?? "fantasy";
    const chapterCount = Math.min(10, Math.max(1, parseInt(input.chapters ?? "5", 10) || 5));

    // Stream progress messages into the chat
    const progress = (msg: string) => {
      try { controller.enqueue(encoder.encode(`\n✨ ${msg}`)); } catch { /* closed */ }
    };

    const book = await generateBook(concept, genre, chapterCount, progress);

    // Emit a book card that the frontend will render
    const card = JSON.stringify({ tool: "book", ...book });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Book "${book.title}" is ready! ${book.chapters.length} chapters generated.`;
  }

  const card = JSON.stringify({ tool: name, ...input });
  controller.enqueue(encoder.encode(`\n${card}`));
  return `${name} recorded.`;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history, conversationId, agentId, images } = await req.json();

    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;

    // Client IP for user_location tool
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? undefined;

    if (!message || typeof message !== "string") {
      return new Response("Invalid message", { status: 400 });
    }

    // ── Usage gating ──────────────────────────────────────────────────────
    if (userId) {
      const sub = getSubscription(userId);
      const plan = PLANS[sub.plan as keyof typeof PLANS] ?? PLANS.free;
      if (plan.messagesPerDay !== Infinity) {
        const usage = getTodayUsage(userId);
        if (usage >= plan.messagesPerDay) {
          return new Response(
            JSON.stringify({ error: "limit_reached", plan: sub.plan, limit: plan.messagesPerDay }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
        incrementUsage(userId);
      }
    }

    const agent = agentId ? getAgent(agentId) : getActiveAgent();
    if (!agent) return new Response("Agent not found", { status: 404 });

    // ── 1. Call Python orchestrator (non-blocking fallback if offline) ─────
    let orchestratorAddendum = "";
    try {
      const orchRes = await fetch(
        `${process.env.PYTHON_ORCHESTRATOR_URL ?? "http://localhost:5328"}/api/lyra`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, userId, history }),
          signal: AbortSignal.timeout(5000),
        }
      );
      if (orchRes.ok) {
        const orch = await orchRes.json();
        const parts: string[] = [];
        if (orch.style_guidance) {
          parts.push(`\n\n## THIS RESPONSE — STYLE\n${orch.style_guidance}`);
        }
        if (orch.approach) {
          parts.push(`\n**Approach:** ${orch.approach}`);
        }
        if (orch.domain_addendum) {
          parts.push(orch.domain_addendum);
        }
        if (orch.user_context?.name) {
          parts.push(`\n\n## USER CONTEXT FROM ORCHESTRATOR\nUser's name: ${orch.user_context.name}`);
        }
        if (orch.user_context?.facts && Object.keys(orch.user_context.facts).length > 0) {
          const factsStr = Object.entries(orch.user_context.facts)
            .map(([k, v]) => `  • ${k}: ${v}`)
            .join("\n");
          parts.push(`Known facts:\n${factsStr}`);
        }
        orchestratorAddendum = parts.join("\n");
      }
    } catch {
      // Orchestrator offline — degrade gracefully, continue with base prompt
    }

    // ── 2. Build memory context from SQLite ───────────────────────────────
    let memoryContext = "";
    if (userId) {
      upsertUser(userId);
      memoryContext = buildMemoryContext(userId, message);
    }

    const systemPrompt = agent.systemPrompt + orchestratorAddendum + memoryContext + buildLearningContext() + getLunarPersonalityNote() + buildGameContext(message);

    // ── 3. Build user content (text + optional images) ────────────────────
    type ImageBlock = { type: "image"; source: { type: "base64"; media_type: string; data: string } };
    type TextBlock = { type: "text"; text: string };
    type ContentBlock = ImageBlock | TextBlock;

    const userContent: ContentBlock[] = [];
    if (Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: img.mimeType ?? "image/jpeg", data: img.data },
        });
      }
    }
    userContent.push({ type: "text", text: message });

    // Sanitize history: strip empty-content messages and ensure alternating roles.
    // Empty assistant messages (from interrupted streams) cause Anthropic 400 errors.
    const rawHistory: Array<{ role: string; content: string }> = Array.isArray(history) ? history : [];
    const cleanHistory = rawHistory
      .filter((m) => {
        const text = typeof m.content === "string" ? m.content.trim() : "";
        return (m.role === "user" || m.role === "assistant") && text.length > 0;
      })
      .reduce<Array<{ role: string; content: string }>>((acc, msg) => {
        // Drop consecutive same-role messages (keep last)
        if (acc.length > 0 && acc[acc.length - 1].role === msg.role) {
          acc[acc.length - 1] = msg;
        } else {
          acc.push(msg);
        }
        return acc;
      }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: Anthropic.MessageParam[] = [
      ...cleanHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })) as Anthropic.MessageParam[],
      { role: "user" as const, content: (userContent.length === 1 ? message : userContent) as Anthropic.MessageParam["content"] },
    ];

    // ── Router: classify task before deciding which model handles it ──────
    const decision = await routeTask(message, cleanHistory).catch(() => ({
      route: "claude" as const,
      taskType: "analysis" as const,
      useParallel: false,
    }));

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const anthropicKey = process.env.ANTHROPIC_API_KEY;

          // No Anthropic key — fall back to Groq immediately
          if (!anthropicKey) {
            await streamGroqFallback(systemPrompt, messages as Array<{ role: string; content: string }>, encoder, controller);
            return;
          }

          // Route: simple/fast tasks go directly to Groq
          if (decision.route === "groq" && !decision.useParallel) {
            await streamGroqFallback(systemPrompt, messages as Array<{ role: string; content: string }>, encoder, controller);
            return;
          }

          // Parallel mode: fan out to multiple models, judge picks best
          if (decision.useParallel) {
            await streamParallelJudge(systemPrompt, messages as Array<{ role: string; content: string }>, encoder, controller, anthropicKey);
            return;
          }

          const client = new Anthropic({ apiKey: anthropicKey });
          let loopMessages = [...messages];
          let iterations = 0;
          const MAX_ITERATIONS = 5;

          while (iterations < MAX_ITERATIONS) {
            iterations++;

            const stream = client.messages.stream({
              model: "claude-opus-4-6",
              max_tokens: 4096,
              system: systemPrompt,
              messages: loopMessages,
              tools: LYRA_TOOLS,
              tool_choice: { type: "auto" },
            });

            let textSoFar = "";
            const toolUses: Array<{ id: string; name: string; inputJson: string }> = [];
            let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

            for await (const event of stream) {
              if (event.type === "content_block_start") {
                if (event.content_block.type === "tool_use") {
                  currentToolUse = {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    inputJson: "",
                  };
                }
              } else if (event.type === "content_block_delta") {
                if (event.delta.type === "text_delta") {
                  textSoFar += event.delta.text;
                  controller.enqueue(encoder.encode(event.delta.text));
                } else if (event.delta.type === "input_json_delta" && currentToolUse) {
                  currentToolUse.inputJson += event.delta.partial_json;
                }
              } else if (event.type === "content_block_stop") {
                if (currentToolUse) {
                  toolUses.push(currentToolUse);
                  currentToolUse = null;
                }
              }
            }

            const finalMessage = await stream.finalMessage();

            if (finalMessage.stop_reason === "end_turn" || toolUses.length === 0) {
              break;
            }

            const assistantContent: Anthropic.ContentBlock[] = finalMessage.content;
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const toolUse of toolUses) {
              let input: Record<string, string> = {};
              try {
                input = JSON.parse(toolUse.inputJson || "{}");
              } catch {
                input = {};
              }
              const result = await executeTool(toolUse.name, input, encoder, controller, userId, clientIp);
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: result,
              });
            }

            loopMessages = [
              ...loopMessages,
              { role: "assistant", content: assistantContent },
              { role: "user", content: toolResults },
            ];
          }
        } catch (err) {
          const safeEnqueue = (msg: string) => { try { controller.enqueue(encoder.encode(msg)); } catch { /* stream closed */ } };
          if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
            // API key invalid / no model access → fall back to Groq
            try {
              await streamGroqFallback(systemPrompt, messages as Array<{ role: string; content: string }>, encoder, controller);
            } catch {
              safeEnqueue("⚠️ AI service unavailable. Please try again.");
            }
          } else if (err instanceof Anthropic.RateLimitError) {
            safeEnqueue("⚠️ Rate limited — please wait a moment and try again.");
          } else if (err instanceof Anthropic.BadRequestError) {
            const msg = (err as { message?: string }).message ?? "Bad request";
            console.error("[Lyra] Anthropic 400 BadRequest:", msg, err.error);
            safeEnqueue(`⚠️ Request error: ${msg}`);
          } else {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[Lyra] Unexpected API error:", err);
            safeEnqueue(`⚠️ Something went wrong: ${msg}`);
          }
        } finally {
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    incrementConversationCount(agent.id).catch(console.error);

    // Extract and store facts from this exchange (non-blocking)
    if (userId) {
      extractAndStoreFacts(userId, message, "").catch(console.error);
    }

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Agent-Id": agent.id,
        "X-Agent-Name": agent.name,
        "X-Conversation-Id": conversationId ?? "",
      },
    });
  } catch (error) {
    console.error("Lyra chat error:", error);
    if (error instanceof Anthropic.RateLimitError) {
      return new Response("Rate limited — please try again in a moment.", { status: 429 });
    }
    return new Response("Something went wrong. Please try again.", { status: 500 });
  }
}
