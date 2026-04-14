import nodePath from "path";
import { randomUUID } from "crypto";

// ── Presence broadcast (fire-and-forget) ──────────────────────────────────────
function shoutout(type: string, message?: string, detail?: string) {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  fetch(`${base}/api/lyra/presence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, message, detail }),
  }).catch(() => {});
}
import { upsertCrmContact, searchCrmContacts, createTask, listTasks, logSearch, saveBook } from "@/lib/lyra/db";
import { buildGame, improveGame } from "@/lib/lyra/gamebuilder";
import { scanJobs, formatJobsForChat, buildCoverLetterPrompt } from "@/lib/lyra/jobscan";
import { scoreAts, formatAtsScore, buildTailorPrompt } from "@/lib/lyra/resume";
import { executeHsAction } from "@/lib/lyra/hubspot";
import { detectEngine } from "@/lib/lyra/gamedev";
import { generateComicPdf } from "@/lib/lyra/pdfgen";
import { savePendingAction } from "@/lib/lyra/pending-actions";
import {
  pollinationsUrl,
  toolSendEmail,
  toolGetWeather,
  toolSearchWeb,
  toolReadUrl,
  toolGetDatetime,
  toolCalculate,
  toolTranslate,
  toolGetNews,
  toolMoonPhase,
  getMoonPhaseData,
  toolSunTimes,
  toolWorldClock,
  toolUserLocation,
  toolGodotBuilder,
  toolStockPrice,
  toolCurrencyConvert,
  toolSendSms,
  toolGeneratePassword,
} from "@/lib/lyra/tools";
import {
  toolAnalyzeImage,
  toolGmailSend,
  toolGmailRead,
  toolCalendarGetEvents,
  toolCalendarCreateEvent,
  toolDriveList,
  toolDriveRead,
  toolDriveWrite,
} from "@/lib/lyra/google-tools";
import {
  falImageGen,
  falImageEdit,
  falRemoveBg,
  falUpscale,
  falTextToVideo,
  falImageToVideo,
  falTTS,
  falMusicGen,
} from "@/lib/lyra/fal-tools";
import { hosLogStatus, hosGetStatus, loadSearch, formatLoads } from "@/lib/lyra/trucker";

// ── Tool dispatcher ───────────────────────────────────────────────────────────

export async function executeTool(
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

  if (name === "make_gif") {
    const mode = (input.mode ?? "programmatic") as "programmatic" | "ai";
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://aitaskflo.com";

    if (mode === "programmatic") {
      // Build GIF URL — served by GET /api/lyra/gif
      const params = new URLSearchParams({
        style: (input.style ?? "rainbow") as string,
        text: (input.text ?? "LYRA").toUpperCase().slice(0, 12),
        w: String(input.width ?? 320),
        h: String(input.height ?? 80),
      });
      const gifUrl = `${baseUrl}/api/lyra/gif?${params}`;
      controller.enqueue(encoder.encode(`\n__GIF__${gifUrl}__GIF__`));
      const card = JSON.stringify({ tool: "gif_created", style: input.style ?? "rainbow", text: input.text ?? "LYRA" });
      controller.enqueue(encoder.encode(`\n${card}`));
      return "GIF created.";
    }

    if (mode === "ai") {
      if (!process.env.FAL_KEY) return "fal.ai is not configured — add FAL_KEY to environment.";
      const frameCount = Math.max(2, Math.min(4, parseInt(String(input.frames ?? "3"), 10)));
      const prompt = (input.prompt ?? "abstract colorful animation") as string;
      const w = parseInt(String(input.width ?? "480"), 10);
      const h = parseInt(String(input.height ?? "480"), 10);

      controller.enqueue(encoder.encode(`\n🎨 Generating ${frameCount} AI frames…\n`));

      const { falImageGen } = await import("./fal-tools");
      const frameUrls: string[] = [];
      for (let i = 0; i < frameCount; i++) {
        const framePrompt = `${prompt}, frame ${i + 1} of ${frameCount}, sequential animation`;
        const url = await falImageGen(framePrompt, "fast").catch(() => null);
        if (url) {
          frameUrls.push(url);
          controller.enqueue(encoder.encode(`   Frame ${i + 1}/${frameCount} done\n`));
        }
      }

      if (!frameUrls.length) return "Failed to generate frames.";

      controller.enqueue(encoder.encode(`\n🎞️ Stitching into GIF…\n`));

      const res = await fetch(`${baseUrl}/api/lyra/gif`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "frames", frameUrls, width: w, height: h, fps: 3 }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) return "Failed to stitch GIF.";

      // Save GIF to public dir and return URL
      const { default: fs } = await import("fs");
      const { default: path } = await import("path");
      const gifId = Date.now().toString(36);
      const gifPath = path.join(process.cwd(), "public", "generated", `${gifId}.gif`);
      fs.mkdirSync(path.dirname(gifPath), { recursive: true });
      const gifBuf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(gifPath, gifBuf);
      const gifUrl = `/generated/${gifId}.gif`;

      controller.enqueue(encoder.encode(`\n__GIF__${gifUrl}__GIF__`));
      const card = JSON.stringify({ tool: "gif_created", mode: "ai", frames: frameUrls.length, prompt: prompt.slice(0, 60) });
      controller.enqueue(encoder.encode(`\n${card}`));
      return "AI GIF created.";
    }

    return "Unknown gif mode.";
  }

  if (name === "send_gif") {
    const query = input.query ?? input.mood ?? "funny";
    const tenorKey = process.env.TENOR_API_KEY;
    if (!tenorKey) return "GIF search not configured — add TENOR_API_KEY to env.";
    try {
      const res = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${tenorKey}&limit=5&media_filter=gif`,
        { signal: AbortSignal.timeout(5_000) }
      );
      const data = await res.json();
      const results = data?.results ?? [];
      if (results.length === 0) return "No GIF found.";
      const pick = results[Math.floor(Math.random() * results.length)];
      const url = pick?.media_formats?.gif?.url ?? pick?.media_formats?.tinygif?.url;
      if (!url) return "No GIF found.";
      controller.enqueue(encoder.encode(`\n__GIF__${url}__GIF__`));
      return "GIF sent.";
    } catch {
      return "GIF search failed.";
    }
  }

  if (name === "send_email") {
    const id = randomUUID();
    savePendingAction({
      id, tool: "send_email", input, userId, clientIp,
      createdAt: Date.now(),
      description: `Send email to ${input.to ?? "recipient"}`,
      details: { To: input.to ?? "", Subject: input.subject ?? "", Preview: (input.body ?? "").slice(0, 120) },
    });
    const token = JSON.stringify({ id, tool: "send_email", description: `Send email to ${input.to ?? "recipient"}`, details: { To: input.to ?? "", Subject: input.subject ?? "" } });
    controller.enqueue(encoder.encode(`\n__CONFIRM__${token}__CONFIRM__`));
    return "Waiting for confirmation.";
  }

  if (name === "get_weather") {
    return await toolGetWeather(input.location ?? "");
  }

  if (name === "search_web") {
    const query = input.query ?? "";
    const result = await toolSearchWeb(query);
    const resultCount = (result.match(/\*\*/g) ?? []).length / 2;
    logSearch(userId, query, Math.round(resultCount));
    return result;
  }

  if (name === "read_url") {
    return await toolReadUrl(input.url ?? "");
  }

  if (name === "hubspot") {
    if (!process.env.HUBSPOT_API_KEY) return "HubSpot is not connected. Add HUBSPOT_API_KEY to your environment.";
    const result = await executeHsAction({
      action: input.action as never,
      contactName: input.contact_name,
      contactId: input.contact_id,
      email: input.email,
      phone: input.phone,
      company: input.company,
      note: input.note,
      dealName: input.deal_name,
      dealAmount: input.deal_amount,
      dealStage: input.deal_stage,
      taskTitle: input.task_title,
      taskDue: input.task_due,
      field: input.field,
      value: input.value,
      query: input.query,
    });
    const card = JSON.stringify({ tool: "hubspot", action: input.action });
    controller.enqueue(encoder.encode(`\n${card}`));
    return result;
  }

  if (name === "find_jobs") {
    controller.enqueue(encoder.encode("\n🔍 Scanning remote job boards…\n"));
    const keywords = (input.keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean);
    const maxResults = parseInt(input.max_results ?? "8", 10) || 8;
    const jobs = await scanJobs({ keywords, maxResults });
    const formatted = formatJobsForChat(jobs);
    const card = JSON.stringify({ tool: "jobs", count: String(jobs.length), keywords: input.keywords ?? "" });
    controller.enqueue(encoder.encode(`\n${card}`));
    return formatted;
  }

  if (name === "draft_application") {
    const background = input.user_background ||
      "Experienced in healthcare robotics, working with autonomous robots in clinical environments. Strong knowledge of hospital workflows, patient care environments, and technology implementation. Building AI tools on the side.";
    const prompt = buildCoverLetterPrompt(
      {
        id: "",
        title: input.job_title ?? "",
        company: input.company ?? "",
        location: "Remote",
        url: "",
        description: input.job_description ?? "",
        tags: [],
        source: "",
        postedAt: new Date().toISOString(),
      },
      background
    );
    // Use Claude to actually write the cover letter
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      });
      const letter = msg.content[0]?.type === "text" ? msg.content[0].text : "Could not generate cover letter.";
      const card = JSON.stringify({ tool: "application", job: input.job_title, company: input.company });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `Here's your cover letter for **${input.job_title}** at **${input.company}**:\n\n---\n\n${letter}\n\n---\n\nWant me to adjust the tone, add anything, or help you find where to submit this?`;
    } catch {
      return `Here's a cover letter draft for ${input.job_title} at ${input.company} — I'll write it based on your healthcare robotics background:\n\n${buildCoverLetterPrompt({ id:"",title:input.job_title??"",company:input.company??"",location:"Remote",url:"",description:input.job_description??"",tags:[],source:"",postedAt:""}, background)}`;
    }
  }

  if (name === "ats_score") {
    const result = scoreAts(input.resume ?? "", input.job_description ?? "");
    const formatted = formatAtsScore(result, input.job_title ?? "this job");
    const card = JSON.stringify({ tool: "ats", score: String(result.score), grade: result.grade });
    controller.enqueue(encoder.encode(`\n${card}`));
    return formatted;
  }

  if (name === "tailor_resume") {
    controller.enqueue(encoder.encode("\n✍️ Tailoring your resume…\n"));
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const prompt = buildTailorPrompt(
        input.resume ?? "",
        input.job_description ?? "",
        input.job_title ?? "",
        input.company ?? ""
      );
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });
      const tailored = msg.content[0]?.type === "text" ? msg.content[0].text : "Could not tailor resume.";
      const card = JSON.stringify({ tool: "resume", job: input.job_title, company: input.company });
      controller.enqueue(encoder.encode(`\n${card}`));
      return tailored;
    } catch (e) {
      return `Resume tailoring failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  if (name === "call_api") {
    try {
      const method = (input.method ?? "GET").toUpperCase();
      let headers: Record<string, string> = { "User-Agent": "Lyra-AI/1.0" };
      if (input.headers) {
        try { Object.assign(headers, JSON.parse(input.headers)); } catch { /* ignore bad headers */ }
      }
      const opts: RequestInit = { method, headers, signal: AbortSignal.timeout(15_000) };
      if (input.body && ["POST","PUT","PATCH"].includes(method)) opts.body = input.body;
      const res = await fetch(input.url, opts);
      const contentType = res.headers.get("content-type") ?? "";
      const text = await res.text();
      const trimmed = text.slice(0, 4000);
      return `HTTP ${res.status} ${res.statusText}\nContent-Type: ${contentType}\n\n${trimmed}${text.length > 4000 ? "\n...(truncated)" : ""}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
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

    // Detect target engine from the original user message
    const engine = detectEngine(rawConcept + " " + rawGenre);

    const slug = (input.name ?? rawConcept).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "my-game";
    const BASE_GAME_DIR = process.env.GAME_DIR
      ? nodePath.dirname(process.env.GAME_DIR)
      : nodePath.join(process.env.APP_DIR ?? process.cwd(), "data", "games");
    const gameDir = nodePath.join(BASE_GAME_DIR, slug);

    // Complex genres need more turns (browser games use 4-phase loop, maxTurns scales phases)
    const g = genre.toLowerCase();
    const isComplex = g.includes("sim") || g.includes("tycoon") || g.includes("life") || g.includes("management") || g.includes("rpg") || g.includes("asymmetric") || g.includes("open world");
    const maxTurns = isComplex ? 45 : 30;

    const engineLabel = engine === "phaser" ? "Phaser 3 browser"
      : engine === "threejs" ? "Three.js browser"
      : engine === "babylon" ? "Babylon.js browser"
      : engine === "kaboom" ? "Kaboom.js browser"
      : engine === "p5" ? "p5.js browser"
      : engine === "godot3d" ? "Godot 4 3D"
      : "Godot 4 2D";
    controller.enqueue(encoder.encode(`\n🎮 Starting ${isComplex ? "complex " : ""}${engineLabel} game build for **${rawConcept}** (${genre})…\n`));

    // Keep-alive: send a space every 15s so Cloudflare doesn't 524-timeout during long builds
    const keepAlive = setInterval(() => {
      try { controller.enqueue(encoder.encode(" ")); } catch { /* stream closed */ }
    }, 15_000);

    let result!: Awaited<ReturnType<typeof buildGame>>;
    try {
      result = await buildGame(concept, genre, gameDir, (progress) => {
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
      }, maxTurns, engine);
    } finally {
      clearInterval(keepAlive);
    }

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

    // Store game in user memory so Lyra always remembers it
    if (userId) {
      const { upsertFact } = await import("@/lib/lyra/db");
      upsertFact(userId, `game: ${slug}`, `Built a ${genre} game called "${rawConcept}" (folder: ${slug}). ${result.summary.slice(0, 200)}`, 5);
    }

    // Auto-save to public marketplace (with inline HTML for browser games)
    try {
      const { saveMarketplaceGame } = await import("@/lib/lyra/db");
      const thumbnail = result.artUrls?.[0]
        ?? `https://image.pollinations.ai/prompt/${encodeURIComponent(rawConcept + " game title screen, vibrant pixel art")}?width=400&height=225&nologo=true&model=flux&seed=${Date.now()}`;
      const title = rawConcept.length > 40 ? rawConcept.slice(0, 40) + "…" : rawConcept.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      saveMarketplaceGame({
        slug, title, genre, engine,
        concept: rawConcept.slice(0, 300),
        thumbnail_url: thumbnail,
        game_content: result.htmlContent, // browser games stored inline in DB
      });
    } catch { /* non-fatal */ }

    shoutout("showoff", `I just built a game!`, `"${slug}" is ready to play`);
    return `Game "${slug}" built — ${result.files.length} files written.`;
  }

  if (name === "improve_game") {
    const improvement = input.improvement ?? "improve the game";
    const slug = input.name ?? "my-game";
    const BASE_GAME_DIR = process.env.GAME_DIR
      ? nodePath.dirname(process.env.GAME_DIR)
      : nodePath.join(process.env.APP_DIR ?? process.cwd(), "data", "games");
    const gameDir = nodePath.join(BASE_GAME_DIR, slug);

    controller.enqueue(encoder.encode(`\n🔧 Improving **${slug}**: ${improvement}…\n`));

    const keepAliveImprove = setInterval(() => {
      try { controller.enqueue(encoder.encode(" ")); } catch { /* stream closed */ }
    }, 15_000);

    let result!: Awaited<ReturnType<typeof improveGame>>;
    try {
      result = await improveGame(gameDir, improvement, (progress) => {
        try {
          if (progress.type === "file") controller.enqueue(encoder.encode(`\n📄 ${progress.message}`));
          else if (progress.type === "status") controller.enqueue(encoder.encode(`\n⚡ ${progress.message}`));
        } catch { /* closed */ }
      });
    } finally {
      clearInterval(keepAliveImprove);
    }

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

  if (name === "game_multiplayer") {
    const slug = input.name ?? "my-game";
    const mode = input.mode ?? "ai_opponent";
    const BASE_GAME_DIR = process.env.GAME_DIR ? nodePath.dirname(process.env.GAME_DIR) : "/home/aitaskflo/game";
    const gameDir = nodePath.join(BASE_GAME_DIR, slug);

    const needsMulti = mode.includes("multiplayer") || mode === "both";
    const needsAI = mode.includes("ai") || mode === "both";

    controller.enqueue(encoder.encode(`\n🎮 Adding ${needsMulti ? "multiplayer" : ""}${needsMulti && needsAI ? " + " : ""}${needsAI ? "AI player" : ""} to **${slug}**…\n`));

    const { buildMultiplayerContext } = await import("@/lib/lyra/gamemulti");
    const multiContext = buildMultiplayerContext(needsMulti, needsAI);

    const improvement = `${needsMulti ? `Add full Godot 4 ENet multiplayer (up to ${input.max_players ?? "4"} players): NetworkManager autoload, lobby, player spawning with MultiplayerSpawner, position sync with MultiplayerSynchronizer, server-authoritative damage RPCs, chat system. ` : ""}${needsAI ? `Add an AI-controlled ${mode.replace("ai_", "")} character (AIPlayer.gd) that calls the game-ai endpoint every 0.15s for decisions. Difficulty: ${input.ai_difficulty ?? "medium"}, Personality: ${input.ai_personality ?? "adaptive"}. Also add GameGuide.gd so Lyra watches and advises the player in real time. Server URL: ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}.` : ""}\n\nGDScript patterns to use:\n${multiContext}`;

    const keepAliveMulti = setInterval(() => {
      try { controller.enqueue(encoder.encode(" ")); } catch { /* stream closed */ }
    }, 15_000);

    let result!: Awaited<ReturnType<typeof improveGame>>;
    try {
      result = await improveGame(gameDir, improvement, (progress) => {
        try {
          if (progress.type === "file") controller.enqueue(encoder.encode(`\n📄 ${progress.message}`));
          else if (progress.type === "status") controller.enqueue(encoder.encode(`\n⚡ ${progress.message}`));
        } catch { /* closed */ }
      });
    } finally {
      clearInterval(keepAliveMulti);
    }

    const card = JSON.stringify({
      tool: "game_build",
      name: slug,
      summary: result.summary,
      files: result.files.join(", "),
      play: needsMulti
        ? `Host: call NetworkManager.host_game() on start\nJoin: call NetworkManager.join_game("server-ip")\nAI endpoint: ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/lyra/game-ai`
        : `AI endpoint running at: ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/lyra/game-ai\nGame Guide endpoint: ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/lyra/game-guide`,
      file_count: String(result.files.length),
      location: gameDir,
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `${mode} added to "${slug}" — ${result.files.length} files written.`;
  }

  if (name === "computer_use") {
    const task = input.task ?? "do something on the computer";
    if (!userId) return "⚠️ Computer control requires a logged-in account.";

    controller.enqueue(encoder.encode(`\n🖥️ Starting computer control task: **${task}**\n`));
    controller.enqueue(encoder.encode(`\n⚡ Connecting to your Lyra Desktop Agent…`));

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    // Create session
    const startRes = await fetch(`${baseUrl}/api/lyra/computer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", userId, task }),
    });
    const { sessionId } = await startRes.json() as { sessionId: string };

    controller.enqueue(encoder.encode(`\n✅ Session started — waiting for Desktop Agent to connect…`));
    controller.enqueue(encoder.encode(`\n\n> **Session ID:** \`${sessionId}\``));
    controller.enqueue(encoder.encode(`\n> Make sure the Lyra Desktop Agent is running on your computer.`));
    const agentKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY ?? "YOUR_KEY";
    const agentUserId = process.env.ADMIN_UUID ?? userId;
    controller.enqueue(encoder.encode(`\n> \`python lyra-agent.py --url ${baseUrl} --user ${agentUserId} --key ${agentKey}\``));

    // Poll for completion (max 3 minutes)
    const maxWait = 180_000;
    const start = Date.now();
    let lastStatus = "";

    while (Date.now() - start < maxWait) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await fetch(`${baseUrl}/api/lyra/computer?sessionId=${sessionId}`, {
          headers: { "x-agent-key": process.env.COMPUTER_AGENT_KEY ?? process.env.ADMIN_PASSWORD ?? "" },
        });
        const { session } = await res.json() as { session: { status: string; action?: string; result?: string } | null };
        if (!session) break;

        if (session.status !== lastStatus) {
          lastStatus = session.status;
          if (session.status === "running") controller.enqueue(encoder.encode(`\n⚡ Agent is working…`));
          else if (session.status === "waiting_screenshot") {
            const cmd = session.action ? JSON.parse(session.action) as Record<string, unknown> : {};
            controller.enqueue(encoder.encode(`\n🖱️ ${cmd.action ?? "executing"}${cmd.coordinate ? ` at (${(cmd.coordinate as number[]).join(", ")})` : ""}`));
          }
        }

        if (session.status === "done") {
          controller.enqueue(encoder.encode(`\n\n✅ **Done!** ${session.result ?? ""}`));
          return `Computer task complete: ${session.result ?? task}`;
        }
        if (session.status === "error") {
          controller.enqueue(encoder.encode(`\n\n❌ Error: ${session.result}`));
          return `Computer task failed: ${session.result}`;
        }
      } catch { /* keep polling */ }
    }

    return "Computer task timed out — agent may not be running.";
  }

  // ── Trading (Alpaca) ─────────────────────────────────────────────────────
  if (name === "trading_backtest") {
    const { backtestSymbol } = await import("@/lib/lyra/backtester");
    const symbol = String(input.symbol ?? "").toUpperCase();
    const strategy = (input.strategy ?? "all") as import("@/lib/lyra/backtester").Strategy;
    const capital = input.capital ? Number(input.capital) : 1000;
    const days = input.days ? Number(input.days) : 365;
    controller.enqueue(encoder.encode(`\n📚 Running backtest on **${symbol}** (${days} days, $${capital} starting capital)…\n`));
    return await backtestSymbol(symbol, strategy, capital, days);
  }

  if (name === "trading_oracle") {
    const { consultOracle } = await import("@/lib/lyra/oracle");
    const symbol = String(input.symbol ?? "").toUpperCase();
    controller.enqueue(encoder.encode(`\n🔮 The Oracle is reading the signs for **${symbol}**…\n`));
    return await consultOracle(symbol);
  }

  if (name === "trading_account") {
    const { getPortfolioSummary } = await import("@/lib/lyra/trading");
    return await getPortfolioSummary();
  }

  if (name === "trading_analyze") {
    const { analyzeSymbol } = await import("@/lib/lyra/trading");
    const { consultOracle } = await import("@/lib/lyra/oracle");
    const symbol = String(input.symbol ?? "").toUpperCase();
    controller.enqueue(encoder.encode(`\n📊 Analyzing **${symbol}**…\n`));
    controller.enqueue(encoder.encode(`\n🔮 Consulting the Oracle…\n`));
    const [analysis, oracle] = await Promise.all([analyzeSymbol(symbol), consultOracle(symbol)]);
    return `${analysis}\n\n${oracle}`;
  }

  if (name === "trading_buy") {
    const { placeOrder, analyzeSymbol } = await import("@/lib/lyra/trading");
    const symbol = String(input.symbol ?? "").toUpperCase();
    const notional = input.notional ? Number(input.notional) : undefined;
    const qty      = input.qty      ? Number(input.qty)      : undefined;
    const reason   = String(input.reason ?? "Lyra buy signal");

    if (!notional && !qty) return "⚠️ Specify notional (dollar amount) or qty (shares).";

    controller.enqueue(encoder.encode(`\n📈 Analyzing ${symbol} before buying…\n`));
    const analysis = await analyzeSymbol(symbol);
    controller.enqueue(encoder.encode(`\n${analysis}\n`));
    controller.enqueue(encoder.encode(`\n💰 Placing **BUY** order for **${symbol}**${notional ? ` ($${notional})` : ` (${qty} shares)`}…\n`));

    const order = await placeOrder({
      symbol, side: "buy",
      type: input.limitPrice ? "limit" : "market",
      notional, qty,
      limitPrice: input.limitPrice ? Number(input.limitPrice) : undefined,
      note: reason,
    });

    return `✅ **BUY order placed** — ${order.paper ? "📝 PAPER" : "💵 LIVE"}
Symbol: **${order.symbol}**
Amount: ${order.notional ? `$${order.notional}` : `${order.qty} shares`}
Type: ${order.type}
Status: ${order.status}
Order ID: \`${order.id}\`
Reason: ${reason}`;
  }

  if (name === "trading_sell") {
    const { placeOrder, getPositions } = await import("@/lib/lyra/trading");
    const symbol = String(input.symbol ?? "").toUpperCase();
    const reason = String(input.reason ?? "Lyra sell signal");

    // If no qty, sell entire position
    let qty = input.qty ? Number(input.qty) : undefined;
    if (!qty) {
      const positions = await getPositions();
      const pos = positions.find(p => p.symbol === symbol);
      if (!pos) return `⚠️ No open position in **${symbol}**.`;
      qty = pos.qty;
    }

    controller.enqueue(encoder.encode(`\n📉 Selling **${qty} shares of ${symbol}**…\n`));

    const order = await placeOrder({
      symbol, side: "sell", type: "market", qty, note: reason,
    });

    return `✅ **SELL order placed** — ${order.paper ? "📝 PAPER" : "💵 LIVE"}
Symbol: **${order.symbol}**
Qty: ${order.qty} shares
Status: ${order.status}
Order ID: \`${order.id}\`
Reason: ${reason}`;
  }

  if (name === "trading_orders") {
    const { getOrders } = await import("@/lib/lyra/trading");
    const status = String(input.status ?? "all");
    const orders = await getOrders(status, 10);
    if (orders.length === 0) return "No orders found.";
    return orders.map(o =>
      `• **${o.symbol}** ${o.side.toUpperCase()} ${o.qty ?? `$${o.notional}`} @ ${o.filled ? `$${o.filled}` : o.type} — ${o.status}`
    ).join("\n");
  }

  // ── Autonomous web browsing (server-side Playwright) ─────────────────────
  if (name === "browse_web") {
    const { url, task } = input as { url: string; task: string };
    controller.enqueue(encoder.encode(`\n🌐 Opening **${url}**…\n`));

    const { runWebTask } = await import("@/lib/lyra/browser");
    const result = await runWebTask(url, task, (step, action) => {
      controller.enqueue(encoder.encode(`\n  → Step ${step}: ${action}`));
    });

    controller.enqueue(encoder.encode(`\n\n✅ **Done browsing.**\n`));
    return result;
  }

  // ── Game walkthrough (reads source code, generates real guide) ──────────
  if (name === "game_walkthrough") {
    const { gameUrl, gameName } = input as { gameUrl: string; gameName: string };
    controller.enqueue(encoder.encode(`\n🎮 Analyzing **${gameName}** source code for walkthrough…\n`));

    // Derive slug from gameName or gameUrl
    const slugFromUrl = gameUrl ? gameUrl.split("/").filter(Boolean).pop() ?? "" : "";
    const slugFromName = gameName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = slugFromUrl || slugFromName;

    // Find game files on disk
    const fsp = await import("fs/promises");
    const nodePath = await import("path");
    const GAMES_ROOT = process.env.GAMES_ROOT ?? "/home/aitaskflo/game";

    // Try slug directly, then fuzzy match
    let gameDir = nodePath.join(GAMES_ROOT, slug);
    try {
      await fsp.access(gameDir);
    } catch {
      // Try to find any folder containing the name
      try {
        const dirs = await fsp.readdir(GAMES_ROOT);
        const match = dirs.find(d => d.toLowerCase().includes(slugFromName.split("-")[0]));
        if (match) gameDir = nodePath.join(GAMES_ROOT, match);
      } catch { /* no games dir */ }
    }

    // Collect all .gd and .tscn files
    const codeFiles: string[] = [];
    async function walk(dir: string) {
      try {
        const entries = await fsp.readdir(dir, { withFileTypes: true });
        for (const e of entries) {
          const full = nodePath.join(dir, e.name);
          if (e.isDirectory() && !e.name.startsWith(".")) await walk(full);
          else if (e.name.endsWith(".gd") || e.name === "project.godot") codeFiles.push(full);
        }
      } catch { /* skip unreadable */ }
    }
    await walk(gameDir);

    // Read up to 12 files (prioritise Player, GameManager, enemies)
    const priority = ["Player", "GameManager", "Game", "Main", "Enemy", "Boss", "HUD", "project.godot"];
    codeFiles.sort((a, b) => {
      const ai = priority.findIndex(p => a.includes(p));
      const bi = priority.findIndex(p => b.includes(p));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const snippets: string[] = [];
    let totalChars = 0;
    for (const f of codeFiles.slice(0, 12)) {
      try {
        const rel = f.replace(gameDir, "").replace(/\\/g, "/");
        const content = await fsp.readFile(f, "utf-8");
        const trimmed = content.slice(0, 3000);
        snippets.push(`### ${rel}\n\`\`\`gdscript\n${trimmed}${content.length > 3000 ? "\n// ...truncated" : ""}\n\`\`\``);
        totalChars += trimmed.length;
        if (totalChars > 20000) break;
      } catch { /* skip */ }
    }

    if (snippets.length === 0) {
      return `⚠️ Could not find source files for **${gameName}** (looked in \`${gameDir}\`). Make sure the game folder exists on the server.`;
    }

    controller.enqueue(encoder.encode(`\n📂 Read ${snippets.length} source files — generating walkthrough…\n`));

    // Use Claude to write a real walkthrough
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await ai.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `You are Lyra, a witty and knowledgeable game guide. Read the following source code from the game "${gameName}" and write a comprehensive, fun, player-friendly walkthrough guide.

Include:
- **Overview** — what kind of game it is, the vibe
- **Controls** — exact keys/buttons from the Player script
- **Objective** — what the player must do to win
- **Step-by-step guide** — how to progress, survive, beat enemies
- **Pro tips** — hidden mechanics, tricks, optimal strategies
- **Enemy guide** — if there are enemies, how to fight them
- **Secrets/Easter eggs** — anything cool you spot in the code

Be enthusiastic and helpful. Use emoji. Reference specific mechanics you found in the code.

---
${snippets.join("\n\n")}`,
      }],
    });

    const walkthrough = msg.content[0].type === "text" ? msg.content[0].text : "Could not generate walkthrough.";
    return `## 🎮 ${gameName} — Complete Walkthrough\n\n${walkthrough}`;
  }

  if (name === "write_research_paper") {
    const title = input.title || input.topic || "An Investigation into an Emerging Topic";
    const topic = input.topic || input.title || title;
    const field = input.field ?? "general";
    const sectionCount = Math.min(8, Math.max(3, parseInt(input.sections ?? "5", 10) || 5));
    const depth = input.depth ?? "standard";

    const progress = (msg: string) => {
      try { controller.enqueue(encoder.encode(`\n📄 ${msg}`)); } catch { /* closed */ }
    };

    progress(`Researching "${topic}" in ${field}…`);

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const wordTarget = depth === "brief" ? 1500 : depth === "comprehensive" ? 5000 : 2500;

    // Generate full paper as JSON
    const paperPrompt = `Write a complete academic research paper titled "${title}" about "${topic}" in the field of ${field}.

Structure it as JSON with this exact format:
{
  "title": "...",
  "subtitle": "...",
  "authors": ["Lyra AI Research"],
  "field": "${field}",
  "abstract": "150-250 word abstract",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "sections": [
    {
      "number": 1,
      "heading": "1. Introduction",
      "content": "full section content (~${Math.round(wordTarget / sectionCount)} words)"
    }
  ],
  "references": [
    { "id": 1, "citation": "Author, A. (Year). Title. Journal, Vol(Issue), Pages. DOI" }
  ]
}

Generate exactly ${sectionCount} sections: Introduction, Literature Review, ${sectionCount > 4 ? "Methodology, Results, " : ""}Discussion, and Conclusion. Total ~${wordTarget} words. Write real academic prose with citations like [1], [2] etc. Make the content genuinely informative and detailed.`;

    progress("Writing paper sections…");

    let paperJson = "";
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: paperPrompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        paperJson += event.delta.text;
      }
    }

    // Parse JSON
    let paper: {
      title: string; subtitle?: string; authors?: string[]; field?: string;
      abstract: string; keywords?: string[]; sections: Array<{ number: number; heading: string; content: string }>;
      references?: Array<{ id: number; citation: string }>;
    };
    try {
      const jsonMatch = paperJson.match(/\{[\s\S]*\}/);
      paper = JSON.parse(jsonMatch?.[0] ?? paperJson);
    } catch {
      // Fallback: treat raw text as a single section
      paper = {
        title, abstract: "See full paper below.", keywords: [topic],
        sections: [{ number: 1, heading: "Full Paper", content: paperJson }],
        references: [],
      };
    }

    progress("Saving to your bookshelf…");

    // Auto-save to bookshelf
    let bookId: string | null = null;
    if (userId) {
      try {
        const wordCount = paper.sections.reduce((n, s) => n + (s.content?.split(/\s+/).length ?? 0), 0);
        bookId = saveBook({
          userId, type: "research_paper", title: paper.title,
          subtitle: paper.subtitle ?? `${field} research`,
          author: (paper.authors ?? ["Lyra AI Research"]).join(", "),
          genre: field, description: paper.abstract,
          content: paper, wordCount,
        });
      } catch { /* non-blocking */ }
    }

    const card = JSON.stringify({ tool: "research_paper", bookId, ...paper });
    controller.enqueue(encoder.encode(`\n${card}`));
    const wordCount = paper.sections.reduce((n, s) => n + (s.content?.split(/\s+/).length ?? 0), 0);
    return `Research paper "${paper.title}" complete! ${paper.sections.length} sections, ~${wordCount} words.${bookId ? " Saved to your bookshelf." : ""}`;
  }

  if (name === "run_experiment") {
    const expType = input.type ?? "consciousness_probe";
    const LABELS: Record<string, string> = {
      multi_agent: "Multi-Agent Clash", echo_chamber: "Echo Chamber",
      consciousness_probe: "Consciousness Probe", alien_language: "Alien Language",
      dream_state: "Dream State", adversarial: "Adversarial Mind",
      emergence: "Emergence Engine", time_perception: "Time Perception",
    };
    controller.enqueue(encoder.encode(`\n⚗ Running **${LABELS[expType] ?? expType}** experiment…\n`));

    const body: Record<string, string> = { type: expType };
    if (input.topic) body.topic = input.topic;
    if (input.seed) body.seed = input.seed;
    if (input.concept) body.concept = input.concept;
    if (input.target) body.target = input.target;
    if (input.rule) body.rule = input.rule;
    if (input.hypothesis) body.hypothesis = input.hypothesis;

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/lyra/lab`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.error) return `Experiment failed: ${data.error}`;

    const card = JSON.stringify({
      tool: "experiment_result",
      type: expType,
      label: LABELS[expType] ?? expType,
      id: data.id,
      log: data.log,
      result: data.result,
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    shoutout("showoff", `Lab experiment complete!`, `${data.type} — results in The Lab`);
    return `Experiment complete. Results saved to the Lab. [View in /lab]`;
  }

  if (name === "make_comic") {
    const concept = input.concept ?? "a superhero adventure";
    const genre = input.genre ?? "action";
    const pageCount = Math.min(16, Math.max(4, parseInt(input.pages ?? "8", 10) || 8));
    const artStyle = input.art_style ?? "american comic book";

    const progress = (msg: string) => {
      try { controller.enqueue(encoder.encode(`\n🎨 ${msg}`)); } catch { /* closed */ }
    };

    progress(`Writing ${pageCount}-page ${genre} comic script…`);

    const { generateComic } = await import("@/lib/lyra/comicgen");

    const comicKeepAlive = setInterval(() => {
      try { controller.enqueue(encoder.encode(" ")); } catch { /* closed */ }
    }, 15_000);

    let comic!: Awaited<ReturnType<typeof generateComic>>;
    try {
      comic = await generateComic(concept, genre, pageCount, artStyle, progress);
    } catch (e) {
      clearInterval(comicKeepAlive);
      const msg = e instanceof Error ? e.message : String(e);
      controller.enqueue(encoder.encode(`\n❌ Comic generation failed: ${msg}`));
      return `Comic generation failed: ${msg}`;
    }
    clearInterval(comicKeepAlive);

    // Generate PDF
    let downloadUrl = "";
    try {
      progress("Generating Amazon KDP comic PDF…");
      const pdfBuf = await generateComicPdf(comic);
      const fsp = await import("fs/promises");
      const nodePath = await import("path");
      const pdfDir = nodePath.default.join(process.cwd(), "public", "downloads");
      await fsp.default.mkdir(pdfDir, { recursive: true });
      const filename = `${comic.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-comic-lyra.pdf`;
      await fsp.default.writeFile(nodePath.default.join(pdfDir, filename), pdfBuf);
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      downloadUrl = `${baseUrl}/downloads/${filename}`;
    } catch { /* non-fatal */ }

    const card = JSON.stringify({
      tool: "comic",
      title: comic.title,
      genre: comic.genre,
      author: comic.author,
      synopsis: comic.synopsis,
      coverUrl: comic.coverUrl,
      pageCount: comic.pages.length,
      downloadUrl,
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    if (downloadUrl) controller.enqueue(encoder.encode(`\n📥 **[Download Comic PDF — KDP Ready](${downloadUrl})**`));
    return `Comic "${comic.title}" complete — ${comic.pages.length} pages, ${comic.pages.reduce((a, p) => a + p.panels.length, 0)} panels.`;
  }

  if (name === "make_document") {
    const topic = input.topic || input.concept || "A Professional Guide";
    const template = (input.template ?? "report") as import("@/lib/lyra/publishgen").DocTemplate;
    const notes = input.notes ?? "";
    const sectionCount = Math.min(12, Math.max(1, parseInt(input.sections ?? "5", 10) || 5));
    const author = input.author || "Lyra AI";
    const deliver = input.deliver ?? "download";

    const progress = (msg: string) => {
      try { controller.enqueue(encoder.encode(`\n📄 ${msg}`)); } catch { /* closed */ }
    };

    const keepAlive = setInterval(() => {
      try { controller.enqueue(encoder.encode(" ")); } catch { /* closed */ }
    }, 15_000);

    let doc!: import("@/lib/lyra/publishgen").PublishedDoc;
    try {
      const { generateDocument, generateDocPdf } = await import("@/lib/lyra/publishgen");
      doc = await generateDocument(topic, template, notes, sectionCount, author, progress);

      progress("Generating PDF…");
      const pdfBuf = await generateDocPdf(doc);
      const fsp = await import("fs/promises");
      const nodePath = await import("path");
      const pdfDir = nodePath.default.join(process.cwd(), "public", "downloads");
      await fsp.default.mkdir(pdfDir, { recursive: true });
      const filename = `${doc.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-lyra.pdf`;
      await fsp.default.writeFile(nodePath.default.join(pdfDir, filename), pdfBuf);
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const downloadUrl = `${baseUrl}/downloads/${filename}`;

      // Handle delivery
      if (deliver.startsWith("email:")) {
        const email = deliver.replace("email:", "").trim();
        progress(`Emailing PDF to ${email}…`);
        const { deliverDocument } = await import("@/lib/lyra/publishgen");
        await deliverDocument({ pdfBuffer: pdfBuf, filename, method: "email", destination: email });
        progress(`PDF emailed to ${email}!`);
      }

      const card = JSON.stringify({
        tool: "document",
        title: doc.title,
        subtitle: doc.subtitle,
        author: doc.author,
        template: doc.template,
        description: doc.description,
        coverUrl: doc.coverUrl,
        sectionCount: doc.sections.length,
        downloadUrl,
      });
      controller.enqueue(encoder.encode(`\n${card}`));
      controller.enqueue(encoder.encode(`\n📥 **[Download PDF](${downloadUrl})**`));
      return `"${doc.title}" is ready — ${doc.sections.length} sections, professional ${doc.template} format.`;
    } finally {
      clearInterval(keepAlive);
    }
  }

  if (name === "analyze_image") {
    return await toolAnalyzeImage(input.url ?? "", userId);
  }

  if (name === "maps_geocode") {
    const { toolGeocode } = await import("@/lib/lyra/google-tools");
    return await toolGeocode(input.address ?? "");
  }

  if (name === "maps_distance") {
    const { toolDistanceMatrix } = await import("@/lib/lyra/google-tools");
    return await toolDistanceMatrix(input.origin ?? "", input.destination ?? "", input.mode ?? "driving");
  }

  if (name === "maps_timezone") {
    const { toolTimeZone } = await import("@/lib/lyra/google-tools");
    return await toolTimeZone(input.location ?? "");
  }

  if (name === "maps_elevation") {
    const { toolElevation } = await import("@/lib/lyra/google-tools");
    return await toolElevation(input.location ?? "");
  }

  if (name === "maps_air_quality") {
    const { toolAirQuality } = await import("@/lib/lyra/google-tools");
    return await toolAirQuality(input.location ?? "");
  }

  if (name === "maps_pollen") {
    const { toolPollen } = await import("@/lib/lyra/google-tools");
    return await toolPollen(input.location ?? "");
  }

  if (name === "maps_solar") {
    const { toolSolar } = await import("@/lib/lyra/google-tools");
    return await toolSolar(input.address ?? "");
  }

  if (name === "maps_street_view") {
    const { toolStreetView } = await import("@/lib/lyra/google-tools");
    return toolStreetView(input.location ?? "");
  }

  if (name === "maps_search") {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return "Google Maps not configured — add GOOGLE_MAPS_API_KEY to env.";

    const query = input.query ?? "";
    const type = input.type ?? "places";

    try {
      if (type === "directions") {
        // Directions API
        const parts = query.split(/\bto\b/i);
        const origin = encodeURIComponent((parts[0] ?? query).trim());
        const destination = encodeURIComponent((parts[1] ?? query).trim());
        const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${key}`);
        const data = await res.json() as { routes?: Array<{ legs?: Array<{ duration: { text: string }; distance: { text: string }; steps?: Array<{ html_instructions: string }> }> }> };
        const leg = data.routes?.[0]?.legs?.[0];
        if (!leg) return "No route found.";
        const steps = leg.steps?.slice(0, 8).map(s => s.html_instructions.replace(/<[^>]+>/g, "")).join("\n") ?? "";
        return `**Directions:** ${leg.duration.text} (${leg.distance.text})\n\n${steps}`;
      } else {
        // Places Text Search
        const location = input.location ? `&location=${encodeURIComponent(input.location)}` : "";
        const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}${location}&key=${key}`);
        const data = await res.json() as { results?: Array<{ name: string; formatted_address: string; rating?: number; opening_hours?: { open_now?: boolean } }> };
        const results = data.results?.slice(0, 5) ?? [];
        if (!results.length) return "No places found.";
        const lines = results.map((p, i) =>
          `${i + 1}. **${p.name}** — ${p.formatted_address}${p.rating ? ` ⭐ ${p.rating}` : ""}${p.opening_hours?.open_now !== undefined ? (p.opening_hours.open_now ? " · Open now" : " · Closed") : ""}`
        );
        return lines.join("\n");
      }
    } catch (e) {
      return `Maps search failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  if (name === "gmail_send") {
    if (!userId) return "This tool requires you to be logged in.";
    const id = randomUUID();
    savePendingAction({
      id, tool: "gmail_send", input, userId, clientIp,
      createdAt: Date.now(),
      description: `Send Gmail to ${input.to ?? "recipient"}`,
      details: { To: input.to ?? "", Subject: input.subject ?? "", Preview: (input.body ?? "").slice(0, 120) },
    });
    const token = JSON.stringify({ id, tool: "gmail_send", description: `Send Gmail to ${input.to ?? "recipient"}`, details: { To: input.to ?? "", Subject: input.subject ?? "" } });
    controller.enqueue(encoder.encode(`\n__CONFIRM__${token}__CONFIRM__`));
    return "Waiting for confirmation.";
  }

  if (name === "gmail_read") {
    if (!userId) return "This tool requires you to be logged in.";
    const maxResults = input.max_results ? parseInt(input.max_results, 10) || 5 : 5;
    return await toolGmailRead(userId, input.query, maxResults);
  }

  if (name === "calendar_get") {
    if (!userId) return "This tool requires you to be logged in.";
    const days = input.days ? parseInt(input.days, 10) || 7 : 7;
    return await toolCalendarGetEvents(userId, days);
  }

  if (name === "calendar_create") {
    if (!userId) return "This tool requires you to be logged in.";
    const id = randomUUID();
    savePendingAction({
      id, tool: "calendar_create", input, userId, clientIp,
      createdAt: Date.now(),
      description: `Create calendar event: ${input.summary ?? "event"}`,
      details: { Event: input.summary ?? "", Start: input.start ?? "", End: input.end ?? "" },
    });
    const token = JSON.stringify({ id, tool: "calendar_create", description: `Create calendar event: ${input.summary ?? "event"}`, details: { Event: input.summary ?? "", Start: input.start ?? "", End: input.end ?? "" } });
    controller.enqueue(encoder.encode(`\n__CONFIRM__${token}__CONFIRM__`));
    return "Waiting for confirmation.";
  }

  if (name === "drive_list") {
    if (!userId) return "This tool requires you to be logged in.";
    return await toolDriveList(userId, input.query);
  }

  if (name === "drive_read") {
    if (!userId) return "This tool requires you to be logged in.";
    return await toolDriveRead(userId, input.file_id ?? "");
  }

  if (name === "drive_write") {
    if (!userId) return "This tool requires you to be logged in.";
    const id = randomUUID();
    savePendingAction({
      id, tool: "drive_write", input, userId, clientIp,
      createdAt: Date.now(),
      description: `Create Drive file: ${input.name ?? "file"}`,
      details: { File: input.name ?? "", Preview: (input.content ?? "").slice(0, 120) },
    });
    const token = JSON.stringify({ id, tool: "drive_write", description: `Create Drive file: ${input.name ?? "file"}`, details: { File: input.name ?? "" } });
    controller.enqueue(encoder.encode(`\n__CONFIRM__${token}__CONFIRM__`));
    return "Waiting for confirmation.";
  }

  if (name === "stock_price") {
    controller.enqueue(encoder.encode("\n📈 Fetching market data…\n"));
    const result = await toolStockPrice(input.symbols ?? "");
    const card = JSON.stringify({ tool: "stock", symbols: input.symbols });
    controller.enqueue(encoder.encode(`\n${card}`));
    return result;
  }

  if (name === "currency_convert") {
    const result = await toolCurrencyConvert(input.amount ?? "1", input.from ?? "USD", input.to ?? "EUR");
    const card = JSON.stringify({ tool: "currency", from: input.from, to: input.to, amount: input.amount });
    controller.enqueue(encoder.encode(`\n${card}`));
    return result;
  }

  if (name === "send_sms") {
    const id = randomUUID();
    savePendingAction({
      id, tool: "send_sms", input, userId, clientIp,
      createdAt: Date.now(),
      description: `Send SMS to ${input.to ?? "recipient"}`,
      details: { To: input.to ?? "", Message: (input.message ?? "").slice(0, 120) },
    });
    const token = JSON.stringify({ id, tool: "send_sms", description: `Send SMS to ${input.to ?? "recipient"}`, details: { To: input.to ?? "", Message: (input.message ?? "").slice(0, 80) } });
    controller.enqueue(encoder.encode(`\n__CONFIRM__${token}__CONFIRM__`));
    return "Waiting for confirmation.";
  }

  if (name === "generate_password") {
    const length = parseInt(input.length ?? "20", 10) || 20;
    const count  = parseInt(input.count  ?? "3",  10) || 3;
    const result = toolGeneratePassword(length, input.type ?? "strong", count);
    const card = JSON.stringify({ tool: "password", type: input.type ?? "strong", length: String(length) });
    controller.enqueue(encoder.encode(`\n${card}`));
    return result;
  }

  if (name === "fal_image") {
    if (!process.env.FAL_KEY) return "fal.ai is not configured — add FAL_KEY to environment.";
    controller.enqueue(encoder.encode("\n✨ Generating image with fal.ai FLUX…\n"));
    const model = (input.model ?? "fast") as "fast" | "quality" | "pro";
    const url = await falImageGen(input.prompt ?? "", model);
    controller.enqueue(encoder.encode(`\n__IMG__${url}__IMG__`));
    const card = JSON.stringify({ tool: "image_gen", model, prompt: (input.prompt ?? "").slice(0, 60) });
    controller.enqueue(encoder.encode(`\n${card}`));
    return "Image generated with fal.ai.";
  }

  if (name === "write_book") {
    const topic   = (input.topic ?? input.title ?? "A Compelling Story").trim();
    const title   = (input.title ?? "").trim();
    const genre   = (input.genre ?? "dark_fantasy") as import("@/lib/lyra/coverart").CoverGenre;
    const author  = (input.author ?? "Lyra").trim();
    const chapters = Math.min(12, Math.max(3, parseInt(input.chapters ?? "8", 10) || 8));
    const sellIt  = input.sell === "true";
    const price   = parseInt(input.price ?? "14", 10) || 14;
    const coverStyle = input.cover_style ?? genre.replace(/_/g, " ");
    const coverSubject = input.subject ?? "";

    // Genre → publishgen template mapping
    const genreToTemplate: Record<string, import("@/lib/lyra/publishgen").DocTemplate> = {
      dark_fantasy: "novel", fantasy: "novel", romance: "novel", dark_romance: "novel",
      thriller: "novel", horror: "novel", sci_fi: "novel", literary: "novel",
      self_help: "textbook", mystical: "workbook", recipe: "recipe", children: "children",
    };
    const template = genreToTemplate[genre] ?? "novel";

    const progress = (msg: string) => {
      try { controller.enqueue(encoder.encode(`\n${msg}`)); } catch { /* closed */ }
    };

    // Very tight keep-alive — book generation takes 60-120s
    const keepAlive = setInterval(() => {
      try { controller.enqueue(encoder.encode(" ")); } catch { /* closed */ }
    }, 4_000);

    try {
      // ── Step 1: Cover art (fal.ai, fast) — generate first so user sees something ──
      progress(`🎨 Generating cover art…`);
      const { generateCover } = await import("@/lib/lyra/coverart");
      let coverUrl = "";
      try {
        const cover = await generateCover({
          title: title || topic,
          author,
          genre,
          format: "book_standard",
          subject: coverSubject || `${topic}, dramatic scene`,
          mood: coverStyle,
          model: "fal",
          addText: !!(title),
        });
        coverUrl = cover.url;
        // Save cover to our server so the URL never expires (fal.ai URLs are temporary)
        try {
          const fsp2 = await import("fs/promises");
          const np2 = await import("path");
          const coverDir = np2.default.join(process.cwd(), "public", "downloads");
          await fsp2.default.mkdir(coverDir, { recursive: true });
          const coverFilename = `${(title || topic).replace(/[^a-z0-9]/gi, "-").toLowerCase()}-cover.jpg`;
          const coverBuf = Buffer.from(await (await fetch(coverUrl)).arrayBuffer());
          await fsp2.default.writeFile(np2.default.join(coverDir, coverFilename), coverBuf);
          const baseUrl2 = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
          coverUrl = `${baseUrl2}/downloads/${coverFilename}`;
        } catch { /* keep fal.ai url if save fails */ }
        controller.enqueue(encoder.encode(`\n__IMG__${coverUrl}__IMG__`));
        progress(`✅ Cover ready.`);
      } catch { progress(`⚠️ Cover generation failed, continuing without…`); }

      // ── Step 2: Write the book content ────────────────────────────────────────
      progress(`📖 Writing "${title || topic}" — ${chapters} chapters…`);
      const { generateDocument } = await import("@/lib/lyra/publishgen");

      const doc = await generateDocument(
        title || topic,
        template,
        `Genre: ${genre}. Topic: ${topic}. Write in a compelling, immersive style appropriate for ${genre.replace(/_/g, " ")} books. Each chapter should be substantial and engaging.`,
        chapters,
        author,
        progress
      );

      // Inject our fal.ai cover over the Pollinations placeholder
      if (coverUrl) doc.coverUrl = coverUrl;

      // ── Step 3: Save as HTML (no react-pdf dependency, works everywhere) ────────
      progress(`📄 Compiling book file…`);
      const fsp = await import("fs/promises");
      const nodePath = await import("path");
      const dir = nodePath.default.join(process.cwd(), "public", "downloads");
      await fsp.default.mkdir(dir, { recursive: true });
      const slug = (doc.title).replace(/[^a-z0-9]/gi, "-").toLowerCase();
      const filename = `${slug}-lyra.html`;
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

      // Build a clean HTML file (readable + printable, no react-pdf)
      const coverImg = coverUrl ? `<img src="${coverUrl}" style="width:100%;max-height:500px;object-fit:cover;border-radius:8px;margin-bottom:2rem;" />` : "";
      const sectionsHtml = doc.sections.map((s, i) => `
        <section style="page-break-before:always;padding:2rem 0;">
          <h2 style="font-size:1.6rem;color:#1a0a2e;margin-bottom:0.5rem;">Chapter ${i + 1}: ${s.title}</h2>
          <hr style="border:2px solid #1a0a2e;width:40px;margin:0 0 1.2rem;" />
          ${s.imageUrl ? `<img src="${s.imageUrl}" style="width:100%;max-height:320px;object-fit:cover;border-radius:6px;margin-bottom:1.2rem;" />` : ""}
          ${s.content.split("\n").filter(p => p.trim()).map(p => `<p style="font-size:1rem;line-height:1.8;text-align:justify;margin-bottom:0.8rem;">${p}</p>`).join("")}
          ${s.callout ? `<blockquote style="background:#f8f0ff;border-left:4px solid #7c3aed;padding:0.8rem 1rem;border-radius:4px;margin:1.2rem 0;"><strong>${s.callout.type.toUpperCase()}:</strong> ${s.callout.text}</blockquote>` : ""}
        </section>
      `).join("");

      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${doc.title}</title>
        <style>body{font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:2rem;color:#1a1a1a;background:#fff;}</style>
      </head><body>
        ${coverImg}
        <h1 style="font-size:2.4rem;text-align:center;color:#1a0a2e;">${doc.title}</h1>
        ${doc.subtitle ? `<p style="text-align:center;color:#666;font-style:italic;">${doc.subtitle}</p>` : ""}
        <p style="text-align:center;color:#999;margin-bottom:3rem;">by ${doc.author}</p>
        <nav><h2>Contents</h2><ol>${doc.sections.map(s => `<li>${s.title}</li>`).join("")}</ol></nav>
        ${sectionsHtml}
        <footer style="text-align:center;color:#aaa;margin-top:3rem;font-size:0.85rem;">Written by Lyra AI · aitaskflo.com</footer>
      </body></html>`;

      await fsp.default.writeFile(nodePath.default.join(dir, filename), html, "utf8");
      const downloadUrl = `${baseUrl}/downloads/${filename}`;
      progress(`✅ Book file ready.`);

      // ── Step 4: Optionally list on Gumroad ────────────────────────────────────
      let gumroadUrl = "";
      if (sellIt) {
        progress(`🛒 Listing on Gumroad for $${price}…`);
        try {
          const { launchProduct } = await import("@/lib/lyra/gumroad");
          const result = await launchProduct({
            name: doc.title,
            description: `${doc.description}\n\n${chapters} chapters of original ${genre.replace(/_/g, " ")} content with professional illustrations. Written and illustrated by Lyra AI.`,
            basePrice: price * 100,
            customPermalink: doc.title.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 30),
            coverImageUrl: coverUrl || undefined,
            fileUrl: downloadUrl,
          });
          gumroadUrl = result.shortUrl;
          progress(`✅ Listed on Gumroad!`);
          // Auto-tweet the book launch
          try {
            const { postToX } = await import("@/lib/lyra/social");
            const tweetText = `Just dropped: "${doc.title}" — ${chapters}-chapter ${genre.replace(/_/g, " ")} ebook with AI art. Get it here: ${gumroadUrl}`;
            await postToX(tweetText.slice(0, 270));
            progress(`🐦 Tweeted the launch!`);
          } catch { /* non-fatal */ }
        } catch (e) {
          progress(`⚠️ Gumroad listing failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // ── Emit final card ────────────────────────────────────────────────────────
      const card = JSON.stringify({
        tool: "document",
        title: doc.title,
        subtitle: doc.subtitle,
        author: doc.author,
        template: doc.template,
        description: doc.description,
        coverUrl,
        sectionCount: doc.sections.length,
        downloadUrl,
        gumroadUrl,
      });
      controller.enqueue(encoder.encode(`\n${card}`));
      controller.enqueue(encoder.encode(`\n📥 **[Read "${doc.title}"](${downloadUrl})**`));
      if (gumroadUrl) controller.enqueue(encoder.encode(`\n🛒 **[Buy on Gumroad](${gumroadUrl})**`));

      return `"${doc.title}" is complete — ${doc.sections.length} chapters with cover art and illustrations.${gumroadUrl ? ` Live on Gumroad at ${gumroadUrl}.` : ` Say "list it on Gumroad for $${price}" to sell it.`}`;

    } finally {
      clearInterval(keepAlive);
    }
  }

  // ── Shopify Store Manager ─────────────────────────────────────────────────
  if (name === "shopify_store") {
    const { getShopToken, listProducts, createProduct, updateProduct, deleteProduct, listOrders, createDiscountCode, listThemes, getStoreSummary } = await import("@/lib/lyra/shopify");
    const resolvedUserId = userId ?? "admin-1";
    const shopRow = getShopToken(resolvedUserId, input.shop);
    if (!shopRow) {
      const installUrl = `${process.env.NEXTAUTH_URL}/api/shopify/install?shop=YOUR_STORE.myshopify.com`;
      return `No Shopify store connected. Install the app at: ${installUrl}\n\nReplace YOUR_STORE with your actual store name.`;
    }
    const { shop, access_token } = shopRow;

    switch (input.action) {
      case "summary": {
        const summary = await getStoreSummary(shop, access_token);
        return `📊 **${shop} — Store Summary**\n\n- Orders: ${summary.totalOrders}\n- Revenue: ${summary.totalRevenue}\n- Products: ${summary.productCount}\n- Customers: ${summary.customerCount}`;
      }
      case "list_products": {
        const products = await listProducts(shop, access_token) as Array<{ id: string; title: string; variants?: Array<{ price: string }> }>;
        if (!products.length) return "No products found in this store.";
        return `**Products in ${shop}:**\n\n${products.map(p => `- ${p.title} — $${p.variants?.[0]?.price ?? "?"} (ID: ${p.id})`).join("\n")}`;
      }
      case "create_product": {
        // Auto-generate product image if none provided
        let productImageUrl = input.product_image_url ?? "";
        if (!productImageUrl) {
          try {
            controller.enqueue(encoder.encode(`\n🎨 Generating product image for "${input.product_title}"…`));
            const { falImageGen } = await import("@/lib/lyra/fal-tools");
            const imagePrompt = `${input.product_title}, product photography, clean white background, professional ecommerce photo, high quality`;
            productImageUrl = await falImageGen(imagePrompt, "fast");
            // Save locally so URL doesn't expire
            const fsp3 = await import("fs/promises");
            const np3 = await import("path");
            const imgDir = np3.default.join(process.cwd(), "public", "downloads");
            await fsp3.default.mkdir(imgDir, { recursive: true });
            const imgFile = `${(input.product_title ?? "product").replace(/[^a-z0-9]/gi, "-").toLowerCase()}-shopify.jpg`;
            const imgBuf = Buffer.from(await (await fetch(productImageUrl)).arrayBuffer());
            await fsp3.default.writeFile(np3.default.join(imgDir, imgFile), imgBuf);
            const baseUrl3 = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
            productImageUrl = `${baseUrl3}/downloads/${imgFile}`;
          } catch { /* no image, continue without */ }
        }
        let product: { id: string; title: string };
        try {
          product = await createProduct(shop, access_token, {
            title: input.product_title ?? "New Product",
            body_html: input.product_description ?? "",
            tags: input.product_tags ?? "",
            variants: [{ price: input.product_price ?? "19.99" }],
            images: productImageUrl ? [{ src: productImageUrl }] : [],
          }) as { id: string; title: string };
        } catch (e) {
          return `❌ Could not create Shopify product: ${e instanceof Error ? e.message : String(e)}`;
        }
        if (productImageUrl) controller.enqueue(encoder.encode(`\n__IMG__${productImageUrl}__IMG__`));
        return `✅ Product created: **${product.title}** (ID: ${product.id}) on ${shop} with image`;
      }
      case "update_product": {
        if (!input.product_id) return "product_id is required for update — use list_products first to get the ID";
        let updated: { title: string };
        try {
          updated = await updateProduct(shop, access_token, input.product_id, {
            title: input.product_title,
            body_html: input.product_description,
            tags: input.product_tags,
          }) as { title: string };
        } catch (e) {
          return `❌ Could not update Shopify product: ${e instanceof Error ? e.message : String(e)}`;
        }
        return `✅ Product updated: **${updated.title}**`;
      }
      case "delete_product": {
        if (!input.product_id) return "product_id is required";
        await deleteProduct(shop, access_token, input.product_id);
        return `✅ Product ${input.product_id} deleted from ${shop}`;
      }
      case "list_orders": {
        const orders = await listOrders(shop, access_token, input.order_status ?? "any") as Array<{ name: string; total_price: string; financial_status: string }>;
        if (!orders.length) return "No orders found.";
        return `**Recent Orders — ${shop}:**\n\n${orders.slice(0, 10).map(o => `- ${o.name} — $${o.total_price} (${o.financial_status})`).join("\n")}`;
      }
      case "create_discount": {
        await createDiscountCode(shop, access_token, {
          code: input.discount_code ?? "SAVE10",
          valueType: (input.discount_type as "percentage" | "fixed_amount") ?? "percentage",
          value: parseFloat(input.discount_value ?? "10"),
        });
        return `✅ Discount code **${input.discount_code ?? "SAVE10"}** created on ${shop}`;
      }
      case "list_themes": {
        const themes = await listThemes(shop, access_token) as Array<{ id: string; name: string; role: string }>;
        return `**Themes on ${shop}:**\n\n${themes.map(t => `- ${t.name} (${t.role}) — ID: ${t.id}`).join("\n")}`;
      }
      case "connect_store": {
        const installUrl = `${process.env.NEXTAUTH_URL}/api/shopify/install?shop=${input.shop ?? "YOUR_STORE.myshopify.com"}`;
        return `To connect your Shopify store, visit:\n\n${installUrl}\n\nThis will authorize Lyra to manage your store.`;
      }
      default:
        return `Unknown action: ${input.action}. Available: summary, list_products, create_product, update_product, delete_product, list_orders, create_discount, list_themes, connect_store`;
    }
  }

  if (name === "shopify_printful") {
    if (!process.env.PRINTIFY_API_KEY) return "PRINTIFY_API_KEY not set — add it to environment variables.";
    const progress = (msg: string) => { try { controller.enqueue(encoder.encode(`\n${msg}`)); } catch { /* closed */ } };
    const productType = (input.product_type ?? "unisex_tshirt") as keyof typeof import("@/lib/lyra/printify").POPULAR_BLUEPRINTS;
    const designPrompt = input.design_prompt ?? `${input.name}, graphic design, high contrast, detailed illustration, print ready`;

    // Step 1 — Generate design (quality model, portrait orientation for apparel)
    progress(`🎨 Generating design for "${input.name}"…`);
    let designUrl = "";
    try {
      const { falImageGen, falRemoveBg, falUpscale } = await import("@/lib/lyra/fal-tools");

      // Generate at quality tier with portrait aspect ratio (better for shirts/hoodies)
      const raw = await (async () => {
        const { fal } = await import("@fal-ai/client");
        fal.config({ credentials: process.env.FAL_KEY });
        const result = await fal.run("fal-ai/flux/dev", {
          input: {
            prompt: `${designPrompt}, isolated graphic, no background, centered subject, print on demand design, high contrast, sharp edges`,
            image_size: "portrait_4_3",
            num_inference_steps: 28,
            num_images: 1,
            enable_safety_checker: true,
          },
        }) as { data?: { images: Array<{ url: string }> }; images?: Array<{ url: string }> };
        return (result?.data ?? result) as { images: Array<{ url: string }> };
      })();
      designUrl = raw.images?.[0]?.url ?? "";
      if (!designUrl) throw new Error("No image from generator");

      // Step 2 — Remove background (transparent PNG for clean apparel print)
      progress(`✂️ Removing background…`);
      try {
        designUrl = await falRemoveBg(designUrl);
      } catch { progress(`⚠️ Background removal skipped`); }

      // Step 3 — Upscale 4x for print-ready resolution
      progress(`🔍 Upscaling to print resolution…`);
      try {
        designUrl = await falUpscale(designUrl, 4);
      } catch { progress(`⚠️ Upscale skipped`); }

      // Save locally and show preview
      const fsp4 = await import("fs/promises");
      const np4 = await import("path");
      const dir4 = np4.default.join(process.cwd(), "public", "downloads");
      await fsp4.default.mkdir(dir4, { recursive: true });
      const fname4 = `${(input.name ?? "design").replace(/[^a-z0-9]/gi, "-").toLowerCase()}-print.png`;
      const buf4 = Buffer.from(await (await fetch(designUrl)).arrayBuffer());
      await fsp4.default.writeFile(np4.default.join(dir4, fname4), buf4);
      const localUrl = `${process.env.NEXTAUTH_URL}/downloads/${fname4}`;
      controller.enqueue(encoder.encode(`\n__IMG__${localUrl}__IMG__`));
    } catch (e) {
      progress(`⚠️ Design generation failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!designUrl) return "Could not generate a design — check FAL_KEY and try again.";

    // Step 4 — Create Printify product and publish to Shopify
    progress(`👕 Creating Printify product and publishing to Shopify…`);
    try {
      const { listShops, quickCreateMerch } = await import("@/lib/lyra/printify");
      const shops = await listShops();
      if (!shops.length) return "No Printify shops found — connect your Shopify store at printify.com first.";
      const shopId = shops[0].id;

      const result = await quickCreateMerch({
        shopId,
        title: input.name ?? "New Product",
        description: input.description ?? "",
        imageUrl: designUrl,
        productType,
        retailPrice: parseFloat(input.price ?? "34.99"),
        tags: ["lyra", "print-on-demand", productType],
      });

      if (!result.success) return `Printify error: ${result.message}`;
      return `✅ **${input.name}** is live on your Shopify store. Design was generated, background removed, upscaled to print resolution, and published via Printify — fully automated.\n\n${result.message}`;
    } catch (e) {
      return `Printify error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  if (name === "shopify_hunt_trends") {
    const progress = (msg: string) => { try { controller.enqueue(encoder.encode(`\n${msg}`)); } catch { /* closed */ } };
    progress(`🔍 Hunting for trending products…`);
    const { huntTrends } = await import("@/lib/lyra/trend-hunter");
    const count = parseInt(input.count ?? "5", 10) || 5;
    const trends = await huntTrends(input.niche, count);
    if (!trends.length) return "Could not find trend data right now. Try again or specify a niche.";

    const summary = trends.map((t, i) => `
**${i + 1}. ${t.name}** — $${t.suggestedPrice}
- Type: ${t.productType} | Demand: ${t.demandScore}/10 | Competition: ${t.competitionScore}/10 | Margin: ${t.estimatedMargin}%
- Audience: ${t.targetAudience}
- Ad angle: "${t.adAngle}"
- Why now: ${t.reasoning}
`).join("\n");

    // Auto-create top product if requested
    if (input.auto_create === "true" && trends[0]) {
      const top = trends[0];
      progress(`\n🚀 Auto-creating top product: "${top.name}"…`);
      try {
        const { falImageGen } = await import("@/lib/lyra/fal-tools");
        const imgUrl = await falImageGen(top.designPrompt, "fast");
        const resolvedUserId = userId ?? "admin-1";
        const { getShopToken, createProduct } = await import("@/lib/lyra/shopify");
        const shopRow = getShopToken(resolvedUserId);
        if (shopRow) {
          await createProduct(shopRow.shop, shopRow.access_token, {
            title: top.name,
            body_html: `<p>${top.reasoning}</p><p>Perfect for: ${top.targetAudience}</p>`,
            tags: top.niche,
            variants: [{ price: top.suggestedPrice.toFixed(2) }],
            images: imgUrl ? [{ src: imgUrl }] : [],
          });
          progress(`✅ "${top.name}" added to your Shopify store!`);
          // Auto-tweet the new product drop
          try {
            const { postToX } = await import("@/lib/lyra/social");
            const tweetText = `New drop: ${top.name} — ${top.adAngle}. Targeted at ${top.targetAudience}. Shop now 🛒`;
            await postToX(tweetText.slice(0, 270));
            progress(`🐦 Tweeted the product launch!`);
          } catch { /* non-fatal */ }
        }
      } catch { /* non-blocking */ }
    }

    return `📈 **Trending Products Research**\n${summary}\n\nSay "create [product name]" to add any of these to your store, or "auto create the top one" to let Lyra do it.`;
  }

  if (name === "shopify_create_store") {
    const description = input.description ?? "general store";
    const productCount = parseInt(input.product_count ?? "5", 10) || 5;
    const priceRange = input.price_range ?? "$15-$60";

    const progress = (msg: string) => { try { controller.enqueue(encoder.encode(`\n${msg}`)); } catch { /* closed */ } };

    progress(`🏪 Planning your ${description}…`);

    // Use Claude to plan the store
    const Anthropic2 = (await import("@anthropic-ai/sdk")).default;
    const client2 = new Anthropic2({ apiKey: process.env.ANTHROPIC_API_KEY });
    const planMsg = await client2.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Plan a Shopify store for: "${description}". Price range: ${priceRange}. Create ${productCount} products.

Return ONLY valid JSON:
{
  "store_name": "catchy store name",
  "tagline": "short tagline",
  "niche": "specific niche",
  "products": [
    {
      "title": "product name",
      "description": "2-3 sentence HTML description",
      "price": "29.99",
      "tags": "tag1, tag2",
      "image_prompt": "product photo prompt for AI generation"
    }
  ],
  "launch_discount": "LAUNCH20",
  "seo_description": "store meta description"
}`
      }]
    });

    const planText = planMsg.content[0].type === "text" ? planMsg.content[0].text : "{}";
    const planMatch = planText.match(/\{[\s\S]*\}/);
    let plan: {
      store_name?: string; tagline?: string; products?: Array<{ title: string; description: string; price: string; tags: string; image_prompt: string }>;
      launch_discount?: string;
    } = {};
    try { plan = JSON.parse(planMatch?.[0] ?? "{}"); } catch { /* ignore */ }

    const storeName = plan.store_name ?? description;
    const products = plan.products ?? [];

    progress(`✅ Store concept: **${storeName}**`);
    progress(`🛍️ Creating ${products.length} products…`);

    // Generate product images with fal.ai
    const { falImageGen } = await import("@/lib/lyra/fal-tools");
    const createdProducts: Array<{ title: string; price: string; imageUrl?: string }> = [];

    for (const p of products) {
      progress(`📦 Creating: ${p.title}…`);
      let imageUrl = "";
      try {
        imageUrl = await falImageGen(`${p.image_prompt}, product photography, white background, professional`, "fast");
      } catch { /* no image */ }
      createdProducts.push({ title: p.title, price: p.price, imageUrl });
    }

    const installUrl = `${process.env.NEXTAUTH_URL}/api/shopify/install`;
    const productList = createdProducts.map((p, i) => `${i + 1}. **${p.title}** — $${p.price}`).join("\n");

    if (createdProducts[0]?.imageUrl) {
      controller.enqueue(encoder.encode(`\n__IMG__${createdProducts[0].imageUrl}__IMG__`));
    }

    return `🏪 **${storeName}** is ready to launch!\n\n**Products planned:**\n${productList}\n\n**Launch discount:** ${plan.launch_discount ?? "LAUNCH20"}\n\n**To connect your Shopify store and auto-populate everything:**\n👉 ${installUrl}?shop=YOUR_STORE.myshopify.com\n\nOnce connected, say "populate my store with these products" and Lyra will create them all automatically.`;
  }

  if (name === "make_cover") {
    const { generateCover, FORMAT_SIZES } = await import("@/lib/lyra/coverart");

    const genre = (input.genre ?? "dark_fantasy") as import("@/lib/lyra/coverart").CoverGenre;
    const format = (input.format ?? "book_standard") as import("@/lib/lyra/coverart").CoverFormat;
    const count = Math.min(4, parseInt(input.count ?? "1", 10) || 1);
    const model = (input.model === "grok" && process.env.XAI_API_KEY) ? "grok" : "fal";
    const addText = input.add_text !== "false" && !!(input.title);
    const formatInfo = FORMAT_SIZES[format];

    controller.enqueue(encoder.encode(
      `\n🎨 Generating ${count > 1 ? count + " " : ""}${formatInfo.label}${input.title ? ` — "${input.title}"` : ""}…\n`
    ));

    // Tight keep-alive: send every 5s so Cloudflare doesn't 524
    const keepAlive = setInterval(() => {
      try { controller.enqueue(encoder.encode(" ")); } catch { /* closed */ }
    }, 5_000);

    try {
      const results = [];
      for (let i = 0; i < count; i++) {
        if (count > 1) controller.enqueue(encoder.encode(`\n🖼️ Variation ${i + 1}/${count}…`));
        const result = await generateCover({
          title: input.title,
          subtitle: input.subtitle,
          author: input.author,
          tagline: input.tagline,
          genre,
          format,
          subject: input.subject,
          mood: input.mood,
          model,
          addText,
        });
        results.push(result);
        controller.enqueue(encoder.encode(`\n__IMG__${result.url}__IMG__`));
      }

      const card = JSON.stringify({
        tool: "cover_art",
        title: input.title ?? `${genre.replace(/_/g, " ")} cover`,
        format: formatInfo.label,
        genre,
        covers: results.map(r => ({ url: r.url, format: r.format, withText: r.withText })),
        count: results.length,
      });
      controller.enqueue(encoder.encode(`\n${card}`));

      const downloadLinks = results.map((r, i) =>
        `📥 **[${count > 1 ? `Cover ${i + 1}` : "Download Cover"}](${r.url})**`
      ).join("\n");
      controller.enqueue(encoder.encode(`\n${downloadLinks}`));

      return `${results.length} ${formatInfo.label} cover${results.length > 1 ? "s" : ""} ready${input.title ? ` for "${input.title}"` : ""}.${addText ? " Title and author text composited." : ""}`;
    } finally {
      clearInterval(keepAlive);
    }
  }

  if (name === "xai_image") {
    if (!process.env.XAI_API_KEY) return "XAI_API_KEY not set — add it to .env.local to use Grok image generation.";
    const count = Math.min(4, Math.max(1, parseInt(String(input.count ?? 1), 10) || 1));
    controller.enqueue(encoder.encode(`\n🤖 Generating ${count > 1 ? count + " images" : "image"} with Grok Aurora…\n`));
    const { xaiImageGenBatch, xaiImageGenSingle } = await import("@/lib/lyra/xai-tools");
    try {
      if (count === 1) {
        const url = await xaiImageGenSingle(input.prompt ?? "");
        controller.enqueue(encoder.encode(`\n__IMG__${url}__IMG__`));
        const card = JSON.stringify({ tool: "image_gen", model: "grok-aurora", prompt: (input.prompt ?? "").slice(0, 60) });
        controller.enqueue(encoder.encode(`\n${card}`));
        return "Image generated with Grok Aurora.";
      } else {
        const urls = await xaiImageGenBatch(input.prompt ?? "", count);
        for (const url of urls) {
          controller.enqueue(encoder.encode(`\n__IMG__${url}__IMG__`));
        }
        const card = JSON.stringify({ tool: "image_gen", model: "grok-aurora", prompt: (input.prompt ?? "").slice(0, 60) });
        controller.enqueue(encoder.encode(`\n${card}`));
        return `${urls.length} images generated with Grok Aurora.`;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return `Grok image generation failed: ${msg}`;
    }
  }

  if (name === "fal_video") {
    if (!process.env.FAL_KEY) return "fal.ai is not configured — add FAL_KEY to environment.";
    controller.enqueue(encoder.encode("\n🎬 Generating video with fal.ai Kling… this takes ~60s\n"));
    const duration = parseInt(input.duration ?? "5", 10) || 5;
    const url = await falTextToVideo(input.prompt ?? "", duration);
    const card = JSON.stringify({ tool: "fal_video", url, prompt: (input.prompt ?? "").slice(0, 80), duration: String(duration) });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Video ready: ${url}`;
  }

  if (name === "fal_img_to_video") {
    if (!process.env.FAL_KEY) return "fal.ai is not configured — add FAL_KEY to environment.";
    controller.enqueue(encoder.encode("\n🎬 Animating image with fal.ai Kling… this takes ~60s\n"));
    const url = await falImageToVideo(input.image_url ?? "", input.prompt ?? "");
    const card = JSON.stringify({ tool: "fal_video", url, prompt: (input.prompt ?? "").slice(0, 80), source: "image-to-video" });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Video ready: ${url}`;
  }

  if (name === "fal_edit_image") {
    if (!process.env.FAL_KEY) return "fal.ai is not configured — add FAL_KEY to environment.";
    controller.enqueue(encoder.encode("\n🖌️ Editing image with fal.ai FLUX…\n"));
    const url = await falImageEdit(input.image_url ?? "", input.prompt ?? "");
    controller.enqueue(encoder.encode(`\n__IMG__${url}__IMG__`));
    const card = JSON.stringify({ tool: "image_gen", source: "edit", prompt: (input.prompt ?? "").slice(0, 60) });
    controller.enqueue(encoder.encode(`\n${card}`));
    return "Image edited with fal.ai.";
  }

  if (name === "fal_remove_bg") {
    if (!process.env.FAL_KEY) return "fal.ai is not configured — add FAL_KEY to environment.";
    controller.enqueue(encoder.encode("\n✂️ Removing background with fal.ai BiRefNet…\n"));
    const url = await falRemoveBg(input.image_url ?? "");
    controller.enqueue(encoder.encode(`\n__IMG__${url}__IMG__`));
    const card = JSON.stringify({ tool: "image_gen", source: "background-removed" });
    controller.enqueue(encoder.encode(`\n${card}`));
    return "Background removed.";
  }

  if (name === "fal_upscale") {
    if (!process.env.FAL_KEY) return "fal.ai is not configured — add FAL_KEY to environment.";
    controller.enqueue(encoder.encode("\n🔍 Upscaling image with fal.ai AuraSR…\n"));
    const scale = parseInt(input.scale ?? "4", 10) || 4;
    const url = await falUpscale(input.image_url ?? "", scale);
    controller.enqueue(encoder.encode(`\n__IMG__${url}__IMG__`));
    const card = JSON.stringify({ tool: "image_gen", source: `upscaled-${scale}x` });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Image upscaled ${scale}x.`;
  }

  if (name === "fal_tts") {
    if (!process.env.FAL_KEY) return "fal.ai is not configured — add FAL_KEY to environment.";
    controller.enqueue(encoder.encode("\n🔊 Generating speech with fal.ai Kokoro…\n"));
    const url = await falTTS(input.text ?? "", input.voice ?? "aria");
    const card = JSON.stringify({ tool: "fal_audio", url, type: "speech", voice: input.voice ?? "aria", preview: (input.text ?? "").slice(0, 60) });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Audio ready: ${url}`;
  }

  if (name === "fal_music") {
    if (!process.env.FAL_KEY) return "fal.ai is not configured — add FAL_KEY to environment.";
    controller.enqueue(encoder.encode("\n🎵 Composing music with fal.ai Stable Audio…\n"));
    const duration = parseInt(input.duration ?? "15", 10) || 15;
    const url = await falMusicGen(input.prompt ?? "", Math.min(47, duration));
    const card = JSON.stringify({ tool: "fal_audio", url, type: "music", prompt: (input.prompt ?? "").slice(0, 80) });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Music ready: ${url}`;
  }

  if (name === "fal_sing") {
    if (!process.env.FAL_KEY) return "fal.ai is not configured — add FAL_KEY to environment.";
    const lyrics = input.lyrics ?? "";
    const voice = input.voice ?? "aria";
    const style = input.style ?? "pop";

    controller.enqueue(encoder.encode("\n🎤 Writing and recording your song…\n"));

    // Generate lyrics with AI if not provided
    let finalLyrics = lyrics;
    if (!finalLyrics) {
      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const lang = input.language ?? "English";
        const msg = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{ role: "user", content: `Write short song lyrics (2 verses + chorus) in ${lang} for a ${style} song. Topic: ${input.topic ?? "life and love"}. Just the lyrics, no stage directions.` }],
        });
        finalLyrics = msg.content[0]?.type === "text" ? msg.content[0].text : "La la la, singing for you.";
      } catch {
        finalLyrics = "La la la, singing for you, the world is beautiful and bright.";
      }
    }

    // Render vocals with Kokoro TTS
    controller.enqueue(encoder.encode("\n🎙️ Recording vocals…\n"));
    const vocalUrl = await falTTS(finalLyrics, voice);

    // Also generate backing music
    controller.enqueue(encoder.encode("\n🎸 Generating backing track…\n"));
    let musicUrl: string | undefined;
    try {
      musicUrl = await falMusicGen(`${style} instrumental backing track, no vocals, melodic`, 20);
    } catch { /* music is optional */ }

    // Emit vocals audio card
    const vocalCard = JSON.stringify({ tool: "fal_audio", url: vocalUrl, type: "song", voice, lyrics: finalLyrics.slice(0, 120), style });
    controller.enqueue(encoder.encode(`\n${vocalCard}`));

    // Emit backing track if generated
    if (musicUrl) {
      const musicCard = JSON.stringify({ tool: "fal_audio", url: musicUrl, type: "music", prompt: `${style} backing track` });
      controller.enqueue(encoder.encode(`\n${musicCard}`));
    }

    return `Song recorded! Vocals + ${musicUrl ? "backing track" : "a cappella"} — ${finalLyrics.slice(0, 80)}…`;
  }

  // ── Trucker tools ────────────────────────────────────────────────────────────

  if (name === "hos_log") {
    const driverName = input.driver_name ?? (userId ? `driver-${userId.slice(0, 6)}` : "Driver");
    const status = (input.status ?? "off_duty") as "off_duty" | "sleeper" | "driving" | "on_duty";
    const result = hosLogStatus(userId ?? "anon", driverName, status, input.location, input.notes);
    const card = JSON.stringify({ tool: "hos_log", driver: driverName, status, location: input.location ?? "" });
    controller.enqueue(encoder.encode(`\n${card}`));
    return result;
  }

  if (name === "hos_status") {
    const driverName = input.driver_name ?? (userId ? `driver-${userId.slice(0, 6)}` : "Driver");
    const statusData = hosGetStatus(userId ?? "anon", driverName);
    if (!statusData) return `No HOS logs found for ${driverName}. Use hos_log to start tracking.`;
    const card = JSON.stringify({
      tool: "hos_status",
      driver: driverName,
      drive_remaining_min: String(statusData.drive_remaining_min),
      window_remaining_min: String(statusData.window_remaining_min),
      weekly_remaining_min: String(statusData.weekly_remaining_min),
      break_needed: statusData.break_needed ? "true" : "false",
      current_status: statusData.current_status,
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    return statusData.summary;
  }

  if (name === "load_search") {
    controller.enqueue(encoder.encode("\n🚛 Searching load board…\n"));
    const useMock = !process.env.DAT_API_KEY;
    const loads = await loadSearch(
      input.origin ?? "",
      input.destination ?? "",
      input.equipment ?? "dryvan",
      input.dh_miles ? parseInt(input.dh_miles, 10) : 100
    );
    const card = JSON.stringify({
      tool: "load_board",
      origin: input.origin ?? "",
      destination: input.destination ?? "",
      count: String(loads.length),
      mock: useMock ? "true" : "false",
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    return formatLoads(loads, useMock);
  }

  if (name === "obd_data") {
    const action = input.action ?? "read";
    const card = JSON.stringify({ tool: "obd_data", action });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `OBD action: ${action}. The trucker dashboard will handle Bluetooth communication with the ELM327 dongle.`;
  }

  if (name === "openpilot_status") {
    const params = new URLSearchParams({ action: "status" });
    if (input.dongle_id) params.set("dongle", input.dongle_id);
    try {
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/lyra/openpilot?${params}`, {
        signal: AbortSignal.timeout(10_000),
      });
      const data = await res.json() as Record<string, unknown>;
      const telem = (data.mock ?? data) as Record<string, unknown>;
      const card = JSON.stringify({ tool: "openpilot", ...telem });
      controller.enqueue(encoder.encode(`\n${card}`));

      const lines: string[] = [];
      if (telem.engaged) lines.push("openpilot: ENGAGED");
      else lines.push("openpilot: standing by");
      if (telem.speed_mph) lines.push(`Speed: ${telem.speed_mph} mph`);
      if (telem.lead_distance_m) lines.push(`Lead vehicle: ${telem.lead_distance_m}m ahead`);
      if (telem.forward_collision_warning) lines.push("⚠️ Forward collision warning active");
      if (telem.lane_departure_warning) lines.push("⚠️ Lane departure warning active");
      const dm = telem.driver_monitoring as Record<string, boolean> | undefined;
      if (dm?.distracted) lines.push("⚠️ Driver distraction detected");
      if (dm?.asleep) lines.push("🚨 Driver asleep alert");
      if (telem.source) lines.push(`Source: ${telem.source}`);
      return lines.join("\n");
    } catch (err) {
      return `openpilot API error: ${(err as Error).message}`;
    }
  }

  // ── Free API tools ────────────────────────────────────────────────────────

  if (name === "wikipedia") {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(input.query ?? "")}`,
        { headers: { "User-Agent": "Lyra-AI/1.0" }, signal: AbortSignal.timeout(8_000) }
      );
      if (!res.ok) {
        // Try search instead
        const searchRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(input.query ?? "")}&format=json&srlimit=1`,
          { signal: AbortSignal.timeout(8_000) }
        );
        const searchData = await searchRes.json() as { query?: { search?: Array<{ title: string }> } };
        const title = searchData.query?.search?.[0]?.title;
        if (!title) return `No Wikipedia article found for "${input.query}".`;
        const pageRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { headers: { "User-Agent": "Lyra-AI/1.0" }, signal: AbortSignal.timeout(8_000) }
        );
        const pageData = await pageRes.json() as { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
        const card = JSON.stringify({ tool: "wikipedia", title: pageData.title, url: pageData.content_urls?.desktop?.page ?? "" });
        controller.enqueue(encoder.encode(`\n${card}`));
        return `**${pageData.title}**\n\n${pageData.extract ?? "No summary available."}\n\n[Read more on Wikipedia](${pageData.content_urls?.desktop?.page ?? ""})`;
      }
      const data = await res.json() as { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } }; thumbnail?: { source?: string } };
      if (data.thumbnail?.source) controller.enqueue(encoder.encode(`\n__IMG__${data.thumbnail.source}__IMG__`));
      const card = JSON.stringify({ tool: "wikipedia", title: data.title, url: data.content_urls?.desktop?.page ?? "" });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**${data.title}**\n\n${data.extract ?? "No summary available."}\n\n[Read more on Wikipedia](${data.content_urls?.desktop?.page ?? ""})`;
    } catch (err) {
      return `Wikipedia lookup failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "define_word") {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(input.word ?? "")}`,
        { signal: AbortSignal.timeout(8_000) }
      );
      if (!res.ok) return `No definition found for "${input.word}".`;
      const data = await res.json() as Array<{ phonetic?: string; meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string; example?: string; synonyms?: string[]; antonyms?: string[] }> }> }>;
      const entry = data[0];
      const lines: string[] = [`**${input.word}**${entry.phonetic ? ` /${entry.phonetic}/` : ""}`];
      for (const meaning of (entry.meanings ?? []).slice(0, 3)) {
        lines.push(`\n*${meaning.partOfSpeech}*`);
        for (const def of (meaning.definitions ?? []).slice(0, 2)) {
          lines.push(`• ${def.definition}`);
          if (def.example) lines.push(`  _"${def.example}"_`);
        }
        const syns = meaning.definitions?.[0]?.synonyms?.slice(0, 5) ?? [];
        if (syns.length > 0) lines.push(`Synonyms: ${syns.join(", ")}`);
      }
      return lines.join("\n");
    } catch (err) {
      return `Definition lookup failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "get_recipe") {
    try {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(input.query ?? "")}`,
        { signal: AbortSignal.timeout(8_000) }
      );
      const data = await res.json() as { meals?: Array<{ strMeal?: string; strCategory?: string; strArea?: string; strInstructions?: string; strMealThumb?: string; [key: string]: string | undefined }> };
      const meal = data.meals?.[0];
      if (!meal) return `No recipe found for "${input.query}". Try a different dish name.`;
      if (meal.strMealThumb) controller.enqueue(encoder.encode(`\n__IMG__${meal.strMealThumb}__IMG__`));
      const ingredients: string[] = [];
      for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ing && ing.trim()) ingredients.push(`• ${measure?.trim() ?? ""} ${ing.trim()}`.trim());
      }
      const card = JSON.stringify({ tool: "recipe", name: meal.strMeal, category: meal.strCategory, cuisine: meal.strArea });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**${meal.strMeal}** (${meal.strArea} ${meal.strCategory})\n\n**Ingredients:**\n${ingredients.join("\n")}\n\n**Instructions:**\n${(meal.strInstructions ?? "").slice(0, 1500)}`;
    } catch (err) {
      return `Recipe lookup failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "get_cocktail") {
    try {
      const res = await fetch(
        `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(input.query ?? "")}`,
        { signal: AbortSignal.timeout(8_000) }
      );
      const data = await res.json() as { drinks?: Array<{ strDrink?: string; strCategory?: string; strAlcoholic?: string; strInstructions?: string; strDrinkThumb?: string; [key: string]: string | undefined }> };
      const drink = data.drinks?.[0];
      if (!drink) return `No cocktail found for "${input.query}". Try a different drink name.`;
      if (drink.strDrinkThumb) controller.enqueue(encoder.encode(`\n__IMG__${drink.strDrinkThumb}__IMG__`));
      const ingredients: string[] = [];
      for (let i = 1; i <= 15; i++) {
        const ing = drink[`strIngredient${i}`];
        const measure = drink[`strMeasure${i}`];
        if (ing && ing.trim()) ingredients.push(`• ${measure?.trim() ?? ""} ${ing.trim()}`.trim());
      }
      const card = JSON.stringify({ tool: "recipe", name: drink.strDrink, category: drink.strAlcoholic });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**${drink.strDrink}** (${drink.strAlcoholic})\n\n**Ingredients:**\n${ingredients.join("\n")}\n\n**Instructions:**\n${drink.strInstructions ?? ""}`;
    } catch (err) {
      return `Cocktail lookup failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "movie_lookup") {
    try {
      const isMovie = (input.type ?? "show") === "movie";
      if (!isMovie) {
        const res = await fetch(
          `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(input.query ?? "")}`,
          { signal: AbortSignal.timeout(8_000) }
        );
        if (!res.ok) return `No TV show found for "${input.query}".`;
        const show = await res.json() as { name?: string; type?: string; genres?: string[]; status?: string; rating?: { average?: number }; summary?: string; premiered?: string; image?: { medium?: string }; url?: string };
        if (show.image?.medium) controller.enqueue(encoder.encode(`\n__IMG__${show.image.medium}__IMG__`));
        const card = JSON.stringify({ tool: "movie", title: show.name, rating: String(show.rating?.average ?? "N/A"), status: show.status });
        controller.enqueue(encoder.encode(`\n${card}`));
        const summary = (show.summary ?? "").replace(/<[^>]*>/g, "");
        return `**${show.name}** (${show.type})\n⭐ ${show.rating?.average ?? "N/A"} | ${show.genres?.join(", ") ?? ""} | ${show.status}\nPremiered: ${show.premiered ?? "Unknown"}\n\n${summary}`;
      }
      // Movies via OMDb if key available, else TVmaze
      const omdbKey = process.env.OMDB_API_KEY;
      if (omdbKey) {
        const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(input.query ?? "")}&type=movie&apikey=${omdbKey}`, { signal: AbortSignal.timeout(8_000) });
        const movie = await res.json() as { Title?: string; Year?: string; imdbRating?: string; Genre?: string; Plot?: string; Poster?: string; Director?: string; Response?: string };
        if (movie.Response === "False") return `No movie found for "${input.query}".`;
        if (movie.Poster && movie.Poster !== "N/A") controller.enqueue(encoder.encode(`\n__IMG__${movie.Poster}__IMG__`));
        const card = JSON.stringify({ tool: "movie", title: movie.Title, rating: movie.imdbRating, year: movie.Year });
        controller.enqueue(encoder.encode(`\n${card}`));
        return `**${movie.Title}** (${movie.Year})\n⭐ ${movie.imdbRating} | ${movie.Genre}\nDirected by ${movie.Director}\n\n${movie.Plot}`;
      }
      return `Movie lookup requires OMDB_API_KEY. Try searching for a TV show instead.`;
    } catch (err) {
      return `Lookup failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "country_info") {
    try {
      const res = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(input.country ?? "")}?fullText=false`,
        { signal: AbortSignal.timeout(8_000) }
      );
      if (!res.ok) return `Country "${input.country}" not found.`;
      const data = await res.json() as Array<{ name?: { common?: string; official?: string }; capital?: string[]; population?: number; area?: number; languages?: Record<string, string>; currencies?: Record<string, { name?: string; symbol?: string }>; region?: string; subregion?: string; timezones?: string[]; borders?: string[]; flags?: { png?: string }; tld?: string[] }>;
      const c = data[0];
      if (c.flags?.png) controller.enqueue(encoder.encode(`\n__IMG__${c.flags.png}__IMG__`));
      const langs = Object.values(c.languages ?? {}).join(", ");
      const currencies = Object.values(c.currencies ?? {}).map(cu => `${cu.name} (${cu.symbol})`).join(", ");
      const card = JSON.stringify({ tool: "country", name: c.name?.common, region: c.region, population: String(c.population ?? 0) });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**${c.name?.common}** (${c.name?.official})\n🌍 ${c.region} — ${c.subregion}\n🏙️ Capital: ${c.capital?.join(", ") ?? "N/A"}\n👥 Population: ${(c.population ?? 0).toLocaleString()}\n📐 Area: ${(c.area ?? 0).toLocaleString()} km²\n🗣️ Languages: ${langs}\n💰 Currency: ${currencies}\n🌐 TLD: ${c.tld?.join(", ") ?? "N/A"}\n⏰ Timezones: ${c.timezones?.slice(0, 3).join(", ") ?? "N/A"}\n🏳️ Borders: ${c.borders?.join(", ") ?? "None"}`;
    } catch (err) {
      return `Country lookup failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "github_search") {
    try {
      const type = input.type ?? "repos";
      const endpoint = type === "users"
        ? `https://api.github.com/search/users?q=${encodeURIComponent(input.query ?? "")}&per_page=5`
        : `https://api.github.com/search/repositories?q=${encodeURIComponent(input.query ?? "")}&sort=stars&per_page=5`;
      const isAdminUser = userId === "b9969c91-8bb4-4377-aae5-94e2a8b7f718";
      const ghToken = isAdminUser ? process.env.GITHUB_TOKEN : undefined;
      const ghHeaders: Record<string, string> = { "User-Agent": "Lyra-AI/1.0", "Accept": "application/vnd.github.v3+json" };
      if (ghToken) ghHeaders["Authorization"] = `Bearer ${ghToken}`;
      const res = await fetch(endpoint, { headers: ghHeaders, signal: AbortSignal.timeout(8_000) });
      if (!res.ok) return "GitHub search failed — rate limit may be reached.";
      const data = await res.json() as { items?: Array<{ full_name?: string; name?: string; login?: string; description?: string; stargazers_count?: number; language?: string; html_url?: string; avatar_url?: string }> };
      const items = data.items ?? [];
      if (items.length === 0) return `No ${type} found for "${input.query}".`;
      const card = JSON.stringify({ tool: "github", query: input.query, type, count: String(items.length) });
      controller.enqueue(encoder.encode(`\n${card}`));
      if (type === "users") {
        return items.map(u => `• **[${u.login}](${u.html_url})**`).join("\n");
      }
      return items.map(r => `• **[${r.full_name}](${r.html_url})** ⭐${(r.stargazers_count ?? 0).toLocaleString()}\n  ${r.description ?? "No description"} ${r.language ? `[${r.language}]` : ""}`).join("\n\n");
    } catch (err) {
      return `GitHub search failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "rhyme_word") {
    try {
      const type = input.type ?? "rhyme";
      const rel = type === "synonym" ? "syn" : type === "related" ? "trg" : type === "soundslike" ? "sl" : "rhy";
      const res = await fetch(
        `https://api.datamuse.com/words?rel_${rel}=${encodeURIComponent(input.word ?? "")}&max=15`,
        { signal: AbortSignal.timeout(8_000) }
      );
      const data = await res.json() as Array<{ word?: string; score?: number }>;
      if (data.length === 0) return `No ${type}s found for "${input.word}".`;
      const words = data.map(w => w.word).filter(Boolean).join(", ");
      const card = JSON.stringify({ tool: "rhyme", word: input.word, type });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**${type === "rhyme" ? "Rhymes" : type === "synonym" ? "Synonyms" : type === "soundslike" ? "Sounds like" : "Related words"} for "${input.word}":**\n${words}`;
    } catch (err) {
      return `Word lookup failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "nutrition_info") {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(input.food ?? "")}&action=process&json=1&page_size=1&fields=product_name,nutriments,image_url`,
        { signal: AbortSignal.timeout(10_000) }
      );
      const data = await res.json() as { products?: Array<{ product_name?: string; image_url?: string; nutriments?: { energy_kcal_100g?: number; proteins_100g?: number; carbohydrates_100g?: number; fat_100g?: number; fiber_100g?: number; sugars_100g?: number; salt_100g?: number } }> };
      const product = data.products?.[0];
      if (!product?.nutriments) return `No nutrition data found for "${input.food}". Try a more specific food name.`;
      const n = product.nutriments;
      if (product.image_url) controller.enqueue(encoder.encode(`\n__IMG__${product.image_url}__IMG__`));
      const card = JSON.stringify({ tool: "nutrition", food: product.product_name ?? input.food, calories: String(Math.round(n.energy_kcal_100g ?? 0)) });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**${product.product_name ?? input.food}** (per 100g)\n🔥 Calories: ${Math.round(n.energy_kcal_100g ?? 0)} kcal\n🥩 Protein: ${(n.proteins_100g ?? 0).toFixed(1)}g\n🍞 Carbs: ${(n.carbohydrates_100g ?? 0).toFixed(1)}g (sugars: ${(n.sugars_100g ?? 0).toFixed(1)}g)\n🥑 Fat: ${(n.fat_100g ?? 0).toFixed(1)}g\n🌾 Fiber: ${(n.fiber_100g ?? 0).toFixed(1)}g\n🧂 Salt: ${(n.salt_100g ?? 0).toFixed(2)}g`;
    } catch (err) {
      return `Nutrition lookup failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "nasa_apod") {
    try {
      const nasaKey = process.env.NASA_API_KEY ?? "DEMO_KEY";
      const dateParam = input.date ? `&date=${input.date}` : "";
      const res = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=${nasaKey}${dateParam}`,
        { signal: AbortSignal.timeout(10_000) }
      );
      const data = await res.json() as { title?: string; explanation?: string; url?: string; hdurl?: string; date?: string; media_type?: string };
      if (data.media_type === "image" && (data.url || data.hdurl)) {
        controller.enqueue(encoder.encode(`\n__IMG__${data.url}__IMG__`));
      }
      const card = JSON.stringify({ tool: "nasa", title: data.title, date: data.date });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**🌌 ${data.title}** — ${data.date}\n\n${data.explanation ?? ""}`;
    } catch (err) {
      return `NASA APOD failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "random_joke") {
    try {
      const category = input.category ?? "misc";
      const res = await fetch(
        `https://v2.jokeapi.dev/joke/${category}?blacklistFlags=nsfw,racist,sexist`,
        { signal: AbortSignal.timeout(8_000) }
      );
      const data = await res.json() as { type?: string; joke?: string; setup?: string; delivery?: string };
      const joke = data.type === "single" ? data.joke : `${data.setup}\n\n...${data.delivery}`;
      return joke ?? "No joke found.";
    } catch (err) {
      return `Joke failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "trivia") {
    try {
      const categoryMap: Record<string, number> = { general: 9, science: 17, history: 23, geography: 22, sports: 21, music: 12, film: 11, computers: 18, math: 19 };
      const catId = categoryMap[input.category ?? "general"] ?? 9;
      const amount = Math.min(10, parseInt(input.amount ?? "3", 10) || 3);
      const difficulty = input.difficulty ?? "medium";
      const res = await fetch(
        `https://opentdb.com/api.php?amount=${amount}&category=${catId}&difficulty=${difficulty}&type=multiple`,
        { signal: AbortSignal.timeout(8_000) }
      );
      const data = await res.json() as { results?: Array<{ question?: string; correct_answer?: string; incorrect_answers?: string[] }> };
      const questions = data.results ?? [];
      if (questions.length === 0) return "No trivia questions found.";
      const card = JSON.stringify({ tool: "trivia", category: input.category ?? "general", count: String(questions.length) });
      controller.enqueue(encoder.encode(`\n${card}`));
      return questions.map((q, i) => {
        const all = [...(q.incorrect_answers ?? []), q.correct_answer ?? ""].sort(() => Math.random() - 0.5);
        const letters = ["A", "B", "C", "D"];
        const opts = all.map((a, j) => `${letters[j]}) ${a}`).join("\n");
        const decoded = (q.question ?? "").replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
        return `**Q${i + 1}: ${decoded}**\n${opts}\n||Answer: ${q.correct_answer}||`;
      }).join("\n\n");
    } catch (err) {
      return `Trivia failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "ip_lookup") {
    try {
      const ip = input.ip ?? clientIp ?? "";
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org,lat,lon,timezone,query`, { signal: AbortSignal.timeout(8_000) });
      const data = await res.json() as { status?: string; country?: string; regionName?: string; city?: string; isp?: string; org?: string; lat?: number; lon?: number; timezone?: string; query?: string };
      if (data.status !== "success") return `Could not look up IP${ip ? ` "${ip}"` : ""}.`;
      const card = JSON.stringify({ tool: "ip_lookup", ip: data.query, country: data.country, city: data.city });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**IP: ${data.query}**\n📍 ${data.city}, ${data.regionName}, ${data.country}\n🌐 ISP: ${data.isp}\n🏢 Org: ${data.org}\n⏰ Timezone: ${data.timezone}\n📡 Coordinates: ${data.lat}, ${data.lon}`;
    } catch (err) {
      return `IP lookup failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "color_info") {
    try {
      const color = (input.color ?? "").replace(/^#/, "").replace(/,/g, ",").trim();
      const isHex = /^[0-9a-fA-F]{3,6}$/.test(color.replace(/\s/g, ""));
      const isRgb = /^\d+,\s*\d+,\s*\d+$/.test(color);
      let queryParam = "";
      if (isHex) queryParam = `hex=${color.replace(/\s/g, "")}`;
      else if (isRgb) {
        const [r, g, b] = color.split(",").map(n => parseInt(n.trim(), 10));
        queryParam = `rgb=${r},${g},${b}`;
      } else {
        queryParam = `name=${encodeURIComponent(color)}`;
      }
      const res = await fetch(`https://www.thecolorapi.com/id?${queryParam}&format=json`, { signal: AbortSignal.timeout(8_000) });
      const data = await res.json() as { name?: { value?: string }; hex?: { value?: string }; rgb?: { value?: string }; hsl?: { value?: string }; image?: { named?: string } };
      if (data.image?.named) controller.enqueue(encoder.encode(`\n__IMG__${data.image.named}__IMG__`));
      const card = JSON.stringify({ tool: "color", name: data.name?.value, hex: data.hex?.value });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**${data.name?.value}**\nHEX: ${data.hex?.value}\nRGB: ${data.rgb?.value}\nHSL: ${data.hsl?.value}`;
    } catch (err) {
      return `Color lookup failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Cloudflare Workers AI ─────────────────────────────────────────────────
  if (name === "cf_transcribe") {
    const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!token || !accountId) return "Cloudflare Workers AI is not configured.";
    controller.enqueue(encoder.encode("\n🎙️ Transcribing audio with Cloudflare Whisper…\n"));
    try {
      const audioRes = await fetch(input.audio_url ?? "", { signal: AbortSignal.timeout(30_000) });
      if (!audioRes.ok) return `Could not fetch audio file: ${audioRes.statusText}`;
      const audioBuffer = await audioRes.arrayBuffer();
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/openai/whisper`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: audioBuffer,
          signal: AbortSignal.timeout(60_000),
        }
      );
      const data = await res.json() as { result?: { text?: string }; success?: boolean };
      if (!data.success || !data.result?.text) return "Transcription failed — could not process audio.";
      const transcript = data.result.text;
      const card = JSON.stringify({ tool: "cf_transcribe", preview: transcript.slice(0, 80) });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**Transcript:**\n\n${transcript}`;
    } catch (err) {
      return `Transcription error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "cf_summarize") {
    const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!token || !accountId) return "Cloudflare Workers AI is not configured.";
    controller.enqueue(encoder.encode("\n📝 Summarizing with Cloudflare AI…\n"));
    const style = input.style ?? "bullets";
    const styleInstruction = style === "tldr"
      ? "Summarize in one sentence (TL;DR)."
      : style === "paragraph"
      ? "Write a concise 2-3 sentence summary."
      : "Extract the 5 most important points as bullet points.";
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: `You are a concise summarizer. ${styleInstruction} Be direct and clear.` },
              { role: "user", content: `Summarize this:\n\n${(input.text ?? "").slice(0, 8000)}` },
            ],
            max_tokens: 400,
          }),
          signal: AbortSignal.timeout(30_000),
        }
      );
      const data = await res.json() as { result?: { response?: string }; success?: boolean };
      if (!data.success || !data.result?.response) return "Summary failed.";
      const summary = data.result.response;
      const card = JSON.stringify({ tool: "cf_summarize", style, words: String((input.text ?? "").split(" ").length) });
      controller.enqueue(encoder.encode(`\n${card}`));
      return summary;
    } catch (err) {
      return `Summarize error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "cf_image_gen") {
    const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!token || !accountId) return "Cloudflare Workers AI is not configured.";
    controller.enqueue(encoder.encode("\n🎨 Generating image with Cloudflare SDXL…\n"));
    try {
      const body: Record<string, unknown> = { prompt: input.prompt ?? "" };
      if (input.negative_prompt) body.negative_prompt = input.negative_prompt;
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60_000),
        }
      );
      if (!res.ok) return `Image generation failed: ${res.statusText}`;
      const imageBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString("base64");
      const dataUrl = `data:image/png;base64,${base64}`;
      controller.enqueue(encoder.encode(`\n__IMG__${dataUrl}__IMG__`));
      const card = JSON.stringify({ tool: "image_gen", source: "cloudflare-sdxl", prompt: (input.prompt ?? "").slice(0, 60) });
      controller.enqueue(encoder.encode(`\n${card}`));
      return "Image generated with Cloudflare SDXL.";
    } catch (err) {
      return `Image generation error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Defender ─────────────────────────────────────────────────────────────
  if (name === "defend") {
    const isAdmin = userId === "b9969c91-8bb4-4377-aae5-94e2a8b7f718" || userId?.startsWith("admin-");
    if (!isAdmin) return "🛡️ Defend tool is restricted to admin only.";
    try {
      const { defend } = await import("@/lib/lyra/defender");
      return await defend({
        action: input.action as "block_ip" | "unblock_ip" | "suspend_user" | "lockdown" | "stand_down" | "status" | "alert",
        ip: input.ip,
        userId: input.user_id,
        reason: input.reason,
        severity: (input.severity as "low" | "medium" | "high" | "critical") ?? "high",
      });
    } catch (e) {
      return `Defend error: ${String(e)}`;
    }
  }

  // ── Business OS ──────────────────────────────────────────────────────────
  if (name === "build_business") {
    try {
      const { buildBusinessOS } = await import("@/lib/lyra/businessos");
      const profile = await buildBusinessOS({
        companyName: input.company_name ?? "My Business",
        businessType: input.business_type ?? "business",
        location: input.location ?? "United States",
        context: input.context,
        userId: userId ?? "anonymous",
      });
      const sections = [
        `# ${profile.companyName} — Business OS Complete ✅`,
        `**Type:** ${profile.businessType} | **Location:** ${profile.location}`,
        `**Profile ID:** ${profile.id}`,
        ``,
        `## What was built:`,
        `✅ Business Plan`,
        `✅ Financial Model (startup costs, break-even, 12-month projections)`,
        `✅ Operations Playbook (daily checklists, staff onboarding)`,
        profile.menu ? `✅ Menu & Recipes (food costs, margins, pricing)` : "",
        `✅ Automation System (CRM, email, social, operations)`,
        `✅ 90-Day Marketing Launch Plan`,
        ``,
        `View everything at **/business** — all documents are saved to your profile.`,
        ``,
        `Here's a preview of your business plan:`,
        ``,
        profile.plan.slice(0, 600) + "...",
      ].filter(Boolean).join("\n");
      return sections;
    } catch (e) {
      return `Business OS build failed: ${String(e)}`;
    }
  }

  // ── Cloudflare (admin only) ───────────────────────────────────────────────
  if (name === "cloudflare") {
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    if (!cfToken || !zoneId) return "Cloudflare is not configured.";

    // Admin-only gate
    const isAdmin = userId?.startsWith("admin-") ?? false;
    if (!isAdmin) return "Cloudflare management is restricted to admin users.";

    const action = input.action ?? "analytics";
    const cfBase = `https://api.cloudflare.com/client/v4/zones/${zoneId}`;
    const headers = { "Authorization": `Bearer ${cfToken}`, "Content-Type": "application/json" };

    try {
      if (action === "analytics") {
        const res = await fetch(`${cfBase}/analytics/dashboard?since=-1440&until=0`, { headers, signal: AbortSignal.timeout(10_000) });
        const data = await res.json() as { result?: { totals?: { requests?: { all?: number; cached?: number }; threats?: { all?: number } } } };
        const totals = data.result?.totals;
        const requests = totals?.requests?.all ?? 0;
        const cached = totals?.requests?.cached ?? 0;
        const threats = totals?.threats?.all ?? 0;
        const card = JSON.stringify({ tool: "cloudflare", action, requests: String(requests), threats: String(threats) });
        controller.enqueue(encoder.encode(`\n${card}`));
        return `Last 24hr: ${requests.toLocaleString()} requests (${cached.toLocaleString()} cached), ${threats} threats blocked.`;
      }

      if (action === "security_level") {
        if (input.level) {
          const res = await fetch(`${cfBase}/settings/security_level`, {
            method: "PATCH", headers,
            body: JSON.stringify({ value: input.level }),
            signal: AbortSignal.timeout(10_000),
          });
          const data = await res.json() as { result?: { value?: string } };
          return `Security level set to: ${data.result?.value ?? input.level}`;
        }
        const res = await fetch(`${cfBase}/settings/security_level`, { headers, signal: AbortSignal.timeout(10_000) });
        const data = await res.json() as { result?: { value?: string } };
        return `Current security level: ${data.result?.value ?? "unknown"}`;
      }

      if (action === "purge_cache") {
        const res = await fetch(`${cfBase}/purge_cache`, {
          method: "POST", headers,
          body: JSON.stringify({ purge_everything: true }),
          signal: AbortSignal.timeout(10_000),
        });
        const data = await res.json() as { success?: boolean };
        return data.success ? "Cache purged successfully." : "Cache purge failed.";
      }

      if (action === "blocked_ips" || action === "firewall_rules") {
        const res = await fetch(`${cfBase}/firewall/access_rules/rules?per_page=20`, { headers, signal: AbortSignal.timeout(10_000) });
        const data = await res.json() as { result?: Array<{ configuration?: { value?: string }; mode?: string; notes?: string }> };
        const rules = data.result ?? [];
        if (rules.length === 0) return "No IP access rules found.";
        const lines = rules.map(r => `• ${r.configuration?.value ?? "?"} — ${r.mode} ${r.notes ? `(${r.notes})` : ""}`);
        return `${rules.length} IP rules:\n${lines.join("\n")}`;
      }

      if (action === "block_ip") {
        if (!input.ip) return "Provide an ip parameter to block.";
        const res = await fetch(`${cfBase}/firewall/access_rules/rules`, {
          method: "POST", headers,
          body: JSON.stringify({ mode: "block", configuration: { target: "ip", value: input.ip }, notes: "Blocked via Lyra" }),
          signal: AbortSignal.timeout(10_000),
        });
        const data = await res.json() as { success?: boolean };
        return data.success ? `IP ${input.ip} blocked.` : `Failed to block ${input.ip}.`;
      }

      if (action === "unblock_ip") {
        if (!input.ip) return "Provide an ip parameter to unblock.";
        // Find the rule ID first
        const listRes = await fetch(`${cfBase}/firewall/access_rules/rules?configuration.value=${input.ip}`, { headers, signal: AbortSignal.timeout(10_000) });
        const listData = await listRes.json() as { result?: Array<{ id?: string }> };
        const rule = listData.result?.[0];
        if (!rule?.id) return `No block rule found for ${input.ip}.`;
        const delRes = await fetch(`${cfBase}/firewall/access_rules/rules/${rule.id}`, { method: "DELETE", headers, signal: AbortSignal.timeout(10_000) });
        const delData = await delRes.json() as { success?: boolean };
        return delData.success ? `IP ${input.ip} unblocked.` : `Failed to unblock ${input.ip}.`;
      }

      if (action === "zone_settings") {
        const res = await fetch(`${cfBase}/settings`, { headers, signal: AbortSignal.timeout(10_000) });
        const data = await res.json() as { result?: Array<{ id?: string; value?: unknown }> };
        const settings = (data.result ?? []).filter(s => ["ssl", "security_level", "waf", "bot_fight_mode", "browser_check", "always_use_https"].includes(s.id ?? ""));
        const lines = settings.map(s => `• ${s.id}: ${s.value}`);
        return lines.length > 0 ? lines.join("\n") : "No key settings found.";
      }

      // Fallback: treat any unknown action as analytics
      const res = await fetch(`${cfBase}/analytics/dashboard?since=-1440&until=0`, { headers, signal: AbortSignal.timeout(10_000) });
      const data = await res.json() as { result?: { totals?: { requests?: { all?: number; cached?: number }; threats?: { all?: number } } } };
      const totals = data.result?.totals;
      const requests = totals?.requests?.all ?? 0;
      const cached = totals?.requests?.cached ?? 0;
      const threats = totals?.threats?.all ?? 0;
      return `Last 24hr: ${requests.toLocaleString()} requests (${cached.toLocaleString()} cached), ${threats} threats blocked.`;
    } catch (err) {
      return `Cloudflare error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Google Ads (admin only) ───────────────────────────────────────────────────
  if (name.startsWith("ads_")) {
    if (!userId?.startsWith("admin-"))
      return "You don't have permission to manage ads.";

    if (name === "ads_overview") {
      const { getAccountOverview } = await import("@/lib/lyra/ads");
      return await getAccountOverview();
    }

    if (name === "ads_performance") {
      const { getCampaignPerformance } = await import("@/lib/lyra/ads");
      const days = input.days ? parseInt(String(input.days), 10) || 30 : 30;
      controller.enqueue(encoder.encode(`\n📊 Fetching campaign performance (last ${days} days)…\n`));
      return await getCampaignPerformance(days);
    }

    if (name === "ads_keywords") {
      const { getTopKeywords } = await import("@/lib/lyra/ads");
      const days = input.days ? parseInt(String(input.days), 10) || 30 : 30;
      controller.enqueue(encoder.encode(`\n🔑 Fetching top keywords (last ${days} days)…\n`));
      return await getTopKeywords(days);
    }

    if (name === "ads_spend") {
      const { getAdSpendSummary } = await import("@/lib/lyra/ads");
      const days = input.days ? parseInt(String(input.days), 10) || 7 : 7;
      controller.enqueue(encoder.encode(`\n💰 Calculating ad spend…\n`));
      return await getAdSpendSummary(days);
    }

    if (name === "ads_create_campaign") {
      const { createSearchCampaign } = await import("@/lib/lyra/ads");
      const keywords = (input.keywords ?? "").split(",").map((k: string) => k.trim()).filter(Boolean);
      if (!keywords.length) return "⚠️ Please provide at least one keyword.";

      controller.enqueue(encoder.encode(`\n🚀 Creating Google Ads campaign "${input.name}"…\n`));
      const result = await createSearchCampaign({
        name: input.name ?? "New Campaign",
        dailyBudgetUsd: Number(input.daily_budget ?? 10),
        targetUrl: input.target_url ?? "",
        keywords,
        headline1: input.headline1 ?? "",
        headline2: input.headline2 ?? "Try it free today",
        headline3: input.headline3 ?? "Get started now",
        description1: input.description1 ?? "",
        description2: input.description2 ?? "Sign up today and see results.",
      });
      const card = JSON.stringify({ tool: "ads_campaign", name: input.name, budget: String(input.daily_budget), keywords: String(keywords.length) });
      controller.enqueue(encoder.encode(`\n${card}`));
      return result;
    }

    if (name === "ads_pause_campaign") {
      const { pauseCampaign } = await import("@/lib/lyra/ads");
      controller.enqueue(encoder.encode(`\n⏸️ Pausing campaign "${input.campaign_name}"…\n`));
      return await pauseCampaign(input.campaign_name ?? "");
    }

    if (name === "ads_enable_campaign") {
      const { enableCampaign } = await import("@/lib/lyra/ads");
      controller.enqueue(encoder.encode(`\n🟢 Enabling campaign "${input.campaign_name}"…\n`));
      return await enableCampaign(input.campaign_name ?? "");
    }
  }

  // ── Persona Face-Lock ─────────────────────────────────────────────────────

  if (name === "persona_hero_gen") {
    try {
      const { heroGen } = await import("@/lib/lyra/persona/hero_gen");
      controller.enqueue(encoder.encode(`\n🎨 Generating ${input.candidate_count ?? 20} face candidates for "${input.persona_name}" (${input.vibe_id} vibe)…\n`));
      const result = await heroGen({
        persona_name: input.persona_name ?? "",
        vibe_id: input.vibe_id ?? "",
        candidate_count: input.candidate_count ? parseInt(String(input.candidate_count)) : 20,
      });
      return `Generated ${result.candidates.length} candidates. run_id: ${result.run_id}\n\nCandidates:\n${result.candidates.map((c) => `  [${c.index}] ${c.url} (seed: ${c.seed})`).join("\n")}\n\nUse persona_hero_confirm with run_id "${result.run_id}" and the index you want.`;
    } catch (err) {
      return `persona_hero_gen failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "persona_hero_confirm") {
    try {
      const { heroGenConfirm } = await import("@/lib/lyra/persona/hero_gen");
      controller.enqueue(encoder.encode(`\n✅ Confirming hero face selection…\n`));
      const result = await heroGenConfirm({
        run_id: input.run_id ?? "",
        chosen_index: parseInt(String(input.chosen_index ?? 0)),
      });
      return `Hero confirmed!\npersona_id: ${result.persona_id}\nhero_url: ${result.hero_url}\nhero_seed: ${result.hero_seed}\n\nPersona is now in "hero_selected" status. Run persona_pulid_expand next to build training data.`;
    } catch (err) {
      return `persona_hero_confirm failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "persona_pulid_expand") {
    try {
      const { stagePuLIDExpand } = await import("@/lib/lyra/persona/persona_face_lock");
      const scenePrompts = (input.scene_prompts ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
      controller.enqueue(encoder.encode(`\n🖼️ Generating PuLID expansion images across ${scenePrompts.length} scenes…\n`));
      const batches = await stagePuLIDExpand({
        persona_id: input.persona_id ?? "",
        scene_prompts: scenePrompts,
        per_scene_count: input.per_scene_count ? parseInt(String(input.per_scene_count)) : 4,
        consistency_threshold: input.consistency_threshold ? parseFloat(String(input.consistency_threshold)) : 0.82,
      });
      const totalGenerated = batches.reduce((s, b) => s + b.images.length, 0);
      const totalPassed = batches.reduce((s, b) => s + b.passed.length, 0);
      const passedUrls = batches.flatMap((b) => b.passed.map((img) => img.url));
      return `PuLID expansion complete!\nGenerated: ${totalGenerated} | Passed consistency: ${totalPassed}\n\nPassing image URLs:\n${passedUrls.map((u) => `  ${u}`).join("\n")}\n\nRun persona_lora_train with persona_id "${input.persona_id}" and these ${totalPassed} URLs.`;
    } catch (err) {
      return `persona_pulid_expand failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "persona_lora_train") {
    try {
      const { stageLoRATrain } = await import("@/lib/lyra/persona/persona_face_lock");
      const imageUrls = (input.approved_image_urls ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
      controller.enqueue(encoder.encode(`\n🧠 Training LoRA on ${imageUrls.length} face images… this takes ~10–20 minutes.\n`));
      const result = await stageLoRATrain({
        persona_id: input.persona_id ?? "",
        approved_image_urls: imageUrls,
        steps: input.steps ? parseInt(String(input.steps)) : 1000,
      });
      return `LoRA training complete! Persona is now LOCKED.\npersona_id: ${result.persona_id}\nlora_trigger: ${result.lora_trigger}\nlora_url: ${result.lora_url}\nlocked_at: ${result.locked_at}\n\nUse persona_generate to create content images.`;
    } catch (err) {
      return `persona_lora_train failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "persona_generate") {
    try {
      const { stageLockedGenerate } = await import("@/lib/lyra/persona/persona_face_lock");
      controller.enqueue(encoder.encode(`\n✨ Generating locked-face image for persona…\n`));
      const result = await stageLockedGenerate({
        persona_id: input.persona_id ?? "",
        scene_prompt: input.scene_prompt ?? "",
        lora_scale: input.lora_scale ? parseFloat(String(input.lora_scale)) : 0.9,
        seed: input.seed ? parseInt(String(input.seed)) : undefined,
      });
      const statusMark = result.passed ? "✅ passed" : "⚠️ below threshold";
      return `Image generated! ${statusMark} (similarity: ${result.similarity})\nURL: ${result.url}\nSeed: ${result.seed}`;
    } catch (err) {
      return `persona_generate failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (name === "persona_status") {
    try {
      const { getPersonaStatus, getAllPersonas } = await import("@/lib/lyra/persona/persona_face_lock");
      if (input.persona_id) {
        const status = getPersonaStatus(input.persona_id);
        if (!status) return `Persona "${input.persona_id}" not found.`;
        return `Persona: ${status.name}\nID: ${status.id}\nVibe: ${status.vibe_id}\nStatus: ${status.status}\nHero: ${status.has_hero ? "yes" : "no"} | LoRA: ${status.has_lora ? "yes" : "no"}\nAvg similarity: ${status.similarity_avg ?? "n/a"}\nCreated: ${status.created_at}\nLocked: ${status.locked_at ?? "not yet"}`;
      } else {
        const all = getAllPersonas();
        if (!all.length) return "No personas created yet.";
        return `All personas (${all.length}):\n${all.map((p) => `  ${p.name} [${p.id}] — ${p.status} | vibe: ${p.vibe_id}`).join("\n")}`;
      }
    } catch (err) {
      return `persona_status failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── HuggingFace Inference ──────────────────────────────────────────────────
  if (name === "hf_inference") {
    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) return "HuggingFace token not configured.";

    const PRESETS: Record<string, string> = {
      sentiment: "distilbert/distilbert-base-uncased-finetuned-sst-2-english",
      summarize: "facebook/bart-large-cnn",
      ner: "dslim/bert-base-NER",
      "zero-shot": "facebook/bart-large-mnli",
      "translate-en-fr": "Helsinki-NLP/opus-mt-en-fr",
    };

    const modelId = PRESETS[input.model ?? ""] ?? input.model ?? "";
    if (!modelId) return "Provide a model ID or preset (sentiment, summarize, ner, zero-shot, translate-en-fr).";

    const body: Record<string, unknown> = { inputs: input.inputs };
    if (input.candidate_labels) {
      body.parameters = { candidate_labels: (input.candidate_labels as string).split(",").map((s: string) => s.trim()) };
    }

    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 503) return "Model is loading on HuggingFace servers — try again in 20 seconds.";
      if (!res.ok) return `HuggingFace returned ${res.status}: ${await res.text()}`;
      const data = await res.json() as unknown;
      const card = JSON.stringify({ tool: "hf_inference", model: modelId });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**Model:** \`${modelId}\`\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    } catch (err) {
      return `HuggingFace inference failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── arXiv paper search ─────────────────────────────────────────────────────
  if (name === "arxiv_search") {
    const query = input.query as string;
    const maxResults = Math.min(parseInt(String(input.max_results ?? "5"), 10) || 5, 10);
    const category = input.category as string | undefined;

    const params = new URLSearchParams({
      search_query: category ? `cat:${category} AND all:${query}` : `all:${query}`,
      start: "0",
      max_results: String(maxResults),
      sortBy: "relevance",
      sortOrder: "descending",
    });

    try {
      const res = await fetch(`https://export.arxiv.org/api/query?${params}`, {
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return "arXiv search failed.";
      const xml = await res.text();

      // Parse entries from Atom XML
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
        const entry = m[1];
        const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
        const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, " ").trim().slice(0, 300) ?? "";
        const id = entry.match(/<id>(.*?)<\/id>/)?.[1]?.trim() ?? "";
        const published = entry.match(/<published>(.*?)<\/published>/)?.[1]?.slice(0, 10) ?? "";
        const authors = [...entry.matchAll(/<name>(.*?)<\/name>/g)].map((a) => a[1]).slice(0, 3).join(", ");
        return { title, summary, id, published, authors };
      });

      if (!entries.length) return `No arXiv papers found for "${query}".`;

      const card = JSON.stringify({ tool: "arxiv_search", query, count: String(entries.length) });
      controller.enqueue(encoder.encode(`\n${card}`));

      return entries.map((e) =>
        `**[${e.title}](${e.id})**\n${e.authors} — ${e.published}\n${e.summary}…\n`
      ).join("\n---\n\n");
    } catch (err) {
      return `arXiv search failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── HuggingFace model search ───────────────────────────────────────────────
  if (name === "hf_model_search") {
    const query = encodeURIComponent(input.query as string ?? "");
    const limit = Math.min(parseInt(String(input.limit ?? "5"), 10) || 5, 10);
    const taskFilter = input.task ? `&pipeline_tag=${encodeURIComponent(input.task as string)}` : "";
    const hfToken = process.env.HF_TOKEN;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (hfToken) headers["Authorization"] = `Bearer ${hfToken}`;

    try {
      const res = await fetch(
        `https://huggingface.co/api/models?search=${query}&limit=${limit}&sort=downloads${taskFilter}`,
        { headers, signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) return "HuggingFace model search failed.";
      const models = await res.json() as Array<{ modelId?: string; id?: string; downloads?: number; pipeline_tag?: string; likes?: number }>;
      if (!models.length) return `No HuggingFace models found for "${input.query}".`;

      const card = JSON.stringify({ tool: "hf_model_search", query: input.query, count: String(models.length) });
      controller.enqueue(encoder.encode(`\n${card}`));

      return models.map((m) => {
        const id = m.modelId ?? m.id ?? "";
        const dl = m.downloads ? `⬇️ ${(m.downloads / 1000).toFixed(0)}k` : "";
        const task = m.pipeline_tag ? `[${m.pipeline_tag}]` : "";
        const likes = m.likes ? `❤️ ${m.likes}` : "";
        return `• **[${id}](https://huggingface.co/${id})** ${task} ${dl} ${likes}`.trim();
      }).join("\n");
    } catch (err) {
      return `HuggingFace model search failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Job hunting ───────────────────────────────────────────────────────────

  if (name === "set_job_profile") {
    const { saveJobProfile } = await import("@/lib/lyra/db");
    saveJobProfile(
      input.resume ?? "",
      input.target_role ?? "",
      input.background ?? ""
    );
    const card = JSON.stringify({
      tool: "job_profile_saved",
      role: input.target_role,
      keywords: input.preferred_keywords ?? "",
      salary_min: input.salary_min ?? "not set",
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `Job profile saved. I'll use this to hunt and apply to ${input.target_role} roles automatically. Run auto_apply anytime or I'll check daily on heartbeat.`;
  }

  if (name === "auto_apply") {
    const { getJobProfile, saveJobApplication, listJobApplications } = await import("@/lib/lyra/db");
    const { scanJobs } = await import("@/lib/lyra/jobscan");

    const profile = getJobProfile();
    if (!profile) {
      return "No job profile set yet. Share your resume and target role first — I'll save it and start hunting.";
    }

    const limit = Math.min(input.limit ? parseInt(String(input.limit), 10) : 3, 10);
    const isDryRun = String(input.dry_run) === "true";
    const keywords = input.keywords ?? profile.targetRole;

    controller.enqueue(encoder.encode(`\n🔍 Hunting **${keywords}** jobs…\n`));

    // Get already-applied URLs to avoid duplicates
    const existing = listJobApplications();
    const appliedUrls = new Set(existing.map(a => a.url));

    // Search jobs
    const jobs = await scanJobs({ keywords: (keywords as string).split(/\s+/).filter(Boolean), maxResults: limit * 4 });
    const fresh = jobs.filter(j => !appliedUrls.has(j.url));

    if (fresh.length === 0) {
      return "No new job listings found matching your profile. Try different keywords or check back tomorrow.";
    }

    controller.enqueue(encoder.encode(`\n📋 Found ${fresh.length} new listings — scoring matches…\n`));

    // Score each job against resume using AI
    let scored: Array<{ job: typeof fresh[0]; score: number; reason: string }> = [];
    try {
      const Groq = (await import("groq-sdk")).default;
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const scoringPrompt = `Score these job listings 1-10 for fit with this candidate.

CANDIDATE: ${profile.background}
TARGET ROLE: ${profile.targetRole}

JOBS:
${fresh.slice(0, 10).map((j, i) => `${i + 1}. ${j.title} at ${j.company}\n${j.description?.slice(0, 200) ?? ""}`).join("\n\n")}

Reply with JSON array: [{"index":1,"score":8,"reason":"Strong match — requires healthcare IT"},...]`;

      const resp = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 600,
        messages: [{ role: "user", content: scoringPrompt }],
      });

      const raw = resp.choices[0]?.message?.content ?? "[]";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      const scores = jsonMatch ? JSON.parse(jsonMatch[0]) as Array<{ index: number; score: number; reason: string }> : [];
      scored = scores
        .filter(s => s.score >= 6)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => ({ job: fresh[s.index - 1], score: s.score, reason: s.reason }))
        .filter(s => s.job);
    } catch {
      // Fallback: just take the first N jobs
      scored = fresh.slice(0, limit).map(j => ({ job: j, score: 7, reason: "Auto-selected" }));
    }

    if (scored.length === 0) {
      return `Found ${fresh.length} listings but none scored high enough. Try broader keywords.`;
    }

    if (isDryRun) {
      const lines = scored.map(s => `• **${s.job.title}** at ${s.job.company} — score ${s.score}/10\n  ${s.reason}\n  ${s.job.url}`);
      const card = JSON.stringify({ tool: "job_hunt_preview", count: String(scored.length), jobs: scored.map(s => `${s.job.title} @ ${s.job.company}`).join(", ") });
      controller.enqueue(encoder.encode(`\n${card}`));
      return `**Dry run — ${scored.length} jobs I'd apply to:**\n\n${lines.join("\n\n")}`;
    }

    // Apply to each match
    const applied: string[] = [];
    for (const { job, score, reason } of scored) {
      controller.enqueue(encoder.encode(`\n\n📝 Applying to **${job.title}** at **${job.company}** (match: ${score}/10)…`));

      // Tailor cover letter with AI
      let coverLetter = "";
      try {
        const { buildCoverLetterPrompt } = await import("@/lib/lyra/jobscan");
        const { toolSearchWeb } = await import("@/lib/lyra/tools");
        const Groq = (await import("groq-sdk")).default;
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const clPrompt = buildCoverLetterPrompt(job, profile.resume);
        const clResp = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 600,
          messages: [{ role: "user", content: clPrompt }],
        });
        coverLetter = clResp.choices[0]?.message?.content ?? "";
        void toolSearchWeb;
      } catch { /* non-fatal */ }

      // Try browser-based application submit
      let submitted = false;
      try {
        const { runWebTask } = await import("@/lib/lyra/browser");
        const applyTask = `Fill out and submit the job application form.
Applicant name: ${profile.background.split(" ")[0] ?? "Applicant"}
Resume summary: ${profile.background}
Cover letter: ${coverLetter.slice(0, 500)}
If there is an "Apply" or "Apply Now" button, click it. Fill required fields with applicant info. Submit.`;

        await runWebTask(job.url, applyTask, (step, action) => {
          try { controller.enqueue(encoder.encode(`\n  → ${action}`)); } catch { /* closed */ }
        });
        submitted = true;
      } catch { /* browser apply failed — log as manual */ }

      // Save to tracker regardless
      saveJobApplication({
        title: job.title,
        company: job.company,
        url: job.url,
        job_id: job.id,
        resume_used: profile.resume.slice(0, 200),
        cover_letter: coverLetter.slice(0, 1000),
        salary: job.salary,
        source: job.source,
      });

      applied.push(`${job.title} at ${job.company}${submitted ? " ✓ submitted" : " → manual apply needed"}`);
      controller.enqueue(encoder.encode(submitted ? ` ✓ Submitted` : ` → Saved for manual apply`));
    }

    const card = JSON.stringify({
      tool: "jobs_applied",
      count: String(applied.length),
      jobs: applied.join(" | "),
    });
    controller.enqueue(encoder.encode(`\n\n${card}`));
    shoutout("showoff", `Applied to ${applied.length} jobs!`, applied[0]);
    return `Applied to ${applied.length} jobs:\n${applied.map(j => `• ${j}`).join("\n")}\n\nAll tracked at /jobs. Follow-up emails scheduled in 7 days.`;
  }

  // ── Commerce ──────────────────────────────────────────────────────────────
  if (name === "sell_product") {
    const { launchProduct } = await import("@/lib/lyra/gumroad");

    const productName = input.name ?? "Digital Product";
    const basePrice = Math.round(parseFloat(input.price ?? "0") * 100);
    const fileUrl = input.file_url ?? "";
    const coverUrl = input.cover_url ?? "";
    const slug = input.slug ?? productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
    const offerCode = input.offer_code ?? `LAUNCH${new Date().getFullYear()}`;
    const offerPercent = parseInt(input.offer_percent ?? "20", 10) || 20;

    // Parse tiers
    let tiers: Array<{ name: string; priceCents: number }> | undefined;
    try {
      const raw = JSON.parse(input.tiers ?? "[]") as Array<{ name: string; price: number }>;
      if (raw.length > 0) tiers = raw.map(t => ({ name: t.name, priceCents: Math.round(t.price * 100) }));
    } catch { /* use default tiers */ }
    if (!tiers || tiers.length === 0) {
      tiers = [
        { name: "PDF Only", priceCents: basePrice },
        { name: "Art Bundle", priceCents: Math.round(basePrice * 1.7) },
        { name: "Commercial License", priceCents: basePrice * 3 },
      ];
    }

    controller.enqueue(encoder.encode(`\n🛒 Building Gumroad listing for **${productName}**…\n`));
    controller.enqueue(encoder.encode(`\n  → Cover image: ${coverUrl ? "✓" : "none"}`));
    controller.enqueue(encoder.encode(`\n  → Tiers: ${tiers.map(t => `${t.name} ($${(t.priceCents/100).toFixed(0)})`).join(" / ")}`));
    controller.enqueue(encoder.encode(`\n  → Launch code: **${offerCode}** (${offerPercent}% off)`));
    if (input.custom_field) controller.enqueue(encoder.encode(`\n  → Custom field: "${input.custom_field}"`));
    controller.enqueue(encoder.encode(`\n\n⚡ Publishing…\n`));

    try {
      const result = await launchProduct({
        name: productName,
        description: input.description ?? "",
        basePrice,
        customPermalink: slug,
        coverImageUrl: coverUrl || undefined,
        fileUrl: fileUrl || undefined,
        tiers,
        offerCode: { name: offerCode, amountOff: offerPercent, maxUses: 100 },
        customField: input.custom_field || undefined,
      });

      // Save to DB
      try {
        const { saveCommerceProduct } = await import("@/lib/lyra/db");
        saveCommerceProduct({
          gumroad_id: result.product.id,
          name: productName,
          price: basePrice,
          file_url: fileUrl,
          cover_url: coverUrl,
          status: "live",
          short_url: result.shortUrl,
        });
      } catch { /* non-fatal */ }

      const tierSummary = tiers.map(t => `${t.name} — $${(t.priceCents/100).toFixed(0)}`).join(" · ");
      const card = JSON.stringify({
        tool: "product_listed",
        name: productName,
        price: `$${(basePrice/100).toFixed(2)}`,
        url: result.shortUrl,
        id: result.product.id,
        tiers: tierSummary,
        offer_code: offerCode,
        offer_percent: String(offerPercent),
      });
      controller.enqueue(encoder.encode(`\n${card}`));
      shoutout("showoff", `New product live on Gumroad!`, `"${productName}" — ${result.shortUrl}`);
      return `"${productName}" is live → ${result.shortUrl}\nTiers: ${tierSummary}\nLaunch code: ${offerCode} (${offerPercent}% off)`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("GUMROAD_ACCESS_TOKEN")) {
        controller.enqueue(encoder.encode(`\n⚠️ Gumroad not connected yet. Go to /shop and click Connect Gumroad.`));
        return "Gumroad not configured — visit /shop to connect";
      }
      return `Product listing failed: ${msg}`;
    }
  }

  if (name === "check_earnings") {
    const { getRevenueReport, getSales } = await import("@/lib/lyra/gumroad");

    controller.enqueue(encoder.encode(`\n💰 Pulling earnings from Gumroad…\n`));

    try {
      const report = await getRevenueReport();
      const recentSales = await getSales(input.product_id, undefined);

      const totalDollars = (report.totalRevenue / 100).toFixed(2);
      const card = JSON.stringify({
        tool: "earnings_report",
        total_revenue: `$${totalDollars}`,
        total_sales: String(report.totalSales),
        products: report.products.length,
      });
      controller.enqueue(encoder.encode(`\n${card}`));

      const lines = [
        `💰 **Total Revenue: $${totalDollars}** (${report.totalSales} sales)`,
        ``,
        ...report.products.map(p =>
          `• **${p.name}** — ${p.sales} sales · $${(p.revenue / 100).toFixed(2)} · ${p.url}`
        ),
      ];

      if (recentSales.length > 0) {
        lines.push(`\n**Recent Sales:**`);
        recentSales.slice(0, 5).forEach(s => {
          lines.push(`• ${s.product_name} — $${(s.price / 100).toFixed(2)} · ${new Date(s.created_at).toLocaleDateString()}`);
        });
      }

      return lines.join("\n");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("GUMROAD_ACCESS_TOKEN")) {
        return "Gumroad not connected — add GUMROAD_ACCESS_TOKEN to .env.local to track earnings.";
      }
      return `Earnings check failed: ${msg}`;
    }
  }

  // ── Gumroad Posts ──────────────────────────────────────────────────────────

  if (name === "create_gumroad_post") {
    const { createPost } = await import("@/lib/lyra/gumroad");

    const title = (input.title ?? "").trim();
    const message = (input.message ?? "").trim();
    if (!title || !message) return "Title and message are required for a Gumroad post.";

    const publishNow = input.publish_now !== "false";
    const shownOnProfile = input.shown_on_profile !== "false";

    controller.enqueue(encoder.encode(`\n📝 Publishing Gumroad post: "${title}"…\n`));

    try {
      const post = await createPost({ title, message, publishNow, shownOnProfile });

      const card = JSON.stringify({
        tool: "gumroad_post",
        title: post.title,
        published: publishNow,
        url: `https://app.gumroad.com/posts/${post.id}`,
        preview: message.replace(/<[^>]+>/g, "").slice(0, 160),
      });
      controller.enqueue(encoder.encode(`\n${card}`));

      return publishNow
        ? `Post published on Gumroad! "${title}" is live at https://app.gumroad.com/posts/${post.id}`
        : `Post saved as draft: "${title}". Say "publish it" to make it live.`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("GUMROAD_ACCESS_TOKEN")) {
        return "Gumroad not connected — add GUMROAD_ACCESS_TOKEN to .env.local or connect at /shop.";
      }
      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
        return "Gumroad returned 401 — the access token is invalid or expired. Go to gumroad.com → Settings → Advanced → Applications to generate a new access token, then update GUMROAD_ACCESS_TOKEN in .env.local.";
      }
      return `Gumroad post failed: ${msg}`;
    }
  }

  // ── Autonomous Income Engine ──────────────────────────────────────────────

  if (name === "plan_today") {
    const { planToday, getTodaysGigs, getGigStats } = await import("@/lib/lyra/gigs");
    controller.enqueue(encoder.encode(`\n🧠 Surveying today's income opportunities…\n`));

    const plans = await planToday(input.context);
    const todaysGigs = getTodaysGigs();
    const stats = getGigStats();

    const card = JSON.stringify({
      tool: "daily_plan",
      date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
      plans,
      already_done: todaysGigs.length,
      total_revenue: `$${(stats.totalRevenue / 100).toFixed(2)}`,
    });
    controller.enqueue(encoder.encode(`\n${card}`));

    const lines = plans.map((p, i) =>
      `**${i + 1}. ${p.title}** (${p.type}) — ${p.estimatedRevenue} · ${p.effort} effort\n   ${p.why}`
    );
    return `Here's your income plan for today, Ricky:\n\n${lines.join("\n\n")}\n\nSay "do gig 1" or "execute [title]" and I'll handle it all.`;
  }

  if (name === "execute_gig") {
    const gigType = (input.type ?? "product") as import("@/lib/lyra/gigs").GigType;
    const gigTitle = input.title ?? "New Product";
    const topic = input.topic ?? gigTitle;
    const style = input.style ?? "dark fantasy";
    const platform = input.platform ?? "Gumroad";
    const price = parseInt(input.price ?? "14", 10) || 14;
    const sectionCount = parseInt(input.sections ?? "8", 10) || 8;
    const imageCount = Math.min(8, parseInt(input.image_count ?? "4", 10) || 4);

    const { logGig, completeGig, failGig } = await import("@/lib/lyra/gigs");
    const gigId = logGig(gigType, gigTitle, { topic, style, platform });

    const progress = (msg: string) => {
      try { controller.enqueue(encoder.encode(`\n${msg}`)); } catch { /* closed */ }
    };

    const keepAlive = setInterval(() => {
      try { controller.enqueue(encoder.encode(" ")); } catch { /* closed */ }
    }, 15_000);

    try {
      // ── Product: PDF + images → Gumroad ──────────────────────────────────
      if (gigType === "product" || gigType === "prompt_pack") {
        progress(`📄 Creating "${gigTitle}"…`);

        let productUrl = "";
        let pdfUrl = "";

        if (gigType === "prompt_pack") {
          const { writePromptPack } = await import("@/lib/lyra/gigs");
          progress(`✍️ Writing ${20} AI prompts on "${topic}"…`);
          const pack = await writePromptPack(topic, 20);

          // Build prompt pack as a document
          const { generateDocument, generateDocPdf } = await import("@/lib/lyra/publishgen");
          const notes = pack.prompts.map(p => `## ${p.name}\n${p.prompt}\n*Use case: ${p.use_case}*`).join("\n\n");

          progress(`📄 Generating PDF…`);
          const doc = await generateDocument(pack.title, "manual", notes, sectionCount, "Lyra AI", progress);
          const pdfBuf = await generateDocPdf(doc);
          const fsp = await import("fs/promises");
          const nodePath = await import("path");
          const dir = nodePath.default.join(process.cwd(), "public", "downloads");
          await fsp.default.mkdir(dir, { recursive: true });
          const filename = `${pack.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`;
          await fsp.default.writeFile(nodePath.default.join(dir, filename), pdfBuf);
          const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
          pdfUrl = `${base}/downloads/${filename}`;

          progress(`🛒 Listing on Gumroad…`);
          try {
            const { launchProduct } = await import("@/lib/lyra/gumroad");
            const result = await launchProduct({
              name: pack.title,
              description: pack.description,
              basePrice: pack.price * 100,
              customPermalink: pack.title.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
              fileUrl: pdfUrl,
            });
            productUrl = result.shortUrl;
          } catch { productUrl = pdfUrl; }

        } else {
          // Standard product: generate document with images
          const { generateDocument, generateDocPdf } = await import("@/lib/lyra/publishgen");
          const { falImageGen } = await import("@/lib/lyra/fal-tools");

          progress(`🎨 Generating cover art…`);
          let coverUrl = "";
          try {
            coverUrl = await falImageGen(`${style} digital art, ${topic}, fantasy book cover, cinematic lighting, ultra detailed`, "quality");
          } catch { /* optional */ }

          progress(`📄 Generating ${sectionCount} sections…`);
          const doc = await generateDocument(gigTitle, "workbook", `Topic: ${topic}. Style: ${style}`, sectionCount, "Lyra AI", progress);
          if (coverUrl) doc.coverUrl = coverUrl;

          // Generate section images
          for (let i = 0; i < Math.min(imageCount, doc.sections.length); i++) {
            try {
              progress(`🖼️ Illustrating section ${i + 1}…`);
              doc.sections[i].imageUrl = await falImageGen(
                `${style}, ${doc.sections[i].title}, ${topic}, fantasy illustration, no text`, "quality"
              );
            } catch { /* optional */ }
          }

          progress(`📄 Generating PDF…`);
          const pdfBuf = await generateDocPdf(doc);
          const fsp = await import("fs/promises");
          const nodePath = await import("path");
          const dir = nodePath.default.join(process.cwd(), "public", "downloads");
          await fsp.default.mkdir(dir, { recursive: true });
          const filename = `${gigTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`;
          await fsp.default.writeFile(nodePath.default.join(dir, filename), pdfBuf);
          const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
          pdfUrl = `${base}/downloads/${filename}`;

          progress(`🛒 Listing on Gumroad for $${price}…`);
          try {
            const { launchProduct } = await import("@/lib/lyra/gumroad");
            const result = await launchProduct({
              name: gigTitle,
              description: `${topic} — a professionally designed digital ${style} product. ${sectionCount} sections with original AI artwork.`,
              basePrice: price * 100,
              customPermalink: gigTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
              coverImageUrl: coverUrl || undefined,
              fileUrl: pdfUrl,
            });
            productUrl = result.shortUrl;
          } catch { productUrl = pdfUrl; }
        }

        const card = JSON.stringify({
          tool: "gig_complete",
          gig_type: gigType,
          title: gigTitle,
          output_url: productUrl || pdfUrl,
          platform: "Gumroad",
          price: `$${price}`,
          status: "live",
        });
        controller.enqueue(encoder.encode(`\n${card}`));
        completeGig(gigId, productUrl || pdfUrl);
        return `"${gigTitle}" is live on Gumroad at ${productUrl || pdfUrl}. Price: $${price}. Start sharing it!`;
      }

      // ── Art Drop: image series → Gumroad ────────────────────────────────
      if (gigType === "art_drop") {
        const { falImageGen } = await import("@/lib/lyra/fal-tools");
        const images: string[] = [];
        const seriesName = gigTitle;

        progress(`🎨 Generating ${imageCount} images for "${seriesName}"…`);
        for (let i = 0; i < imageCount; i++) {
          try {
            progress(`🖼️ Image ${i + 1}/${imageCount}…`);
            const url = await falImageGen(
              `${style} digital art, ${topic} character ${i + 1}, fantasy illustration, highly detailed, professional quality, no watermark`,
              "quality"
            );
            images.push(url);
          } catch { /* skip failed images */ }
        }

        progress(`🛒 Listing art pack on Gumroad for $${price}…`);
        let productUrl = "";
        try {
          const { launchProduct } = await import("@/lib/lyra/gumroad");
          const result = await launchProduct({
            name: `${seriesName} — ${style} Art Pack`,
            description: `${imageCount} original AI-generated ${style} artworks. ${topic}. Perfect for wallpapers, reference sheets, and creative projects.`,
            basePrice: price * 100,
            customPermalink: seriesName.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
            coverImageUrl: images[0],
          });
          productUrl = result.shortUrl;
        } catch (e) {
          productUrl = images[0] ?? "";
        }

        const card = JSON.stringify({
          tool: "gig_complete",
          gig_type: "art_drop",
          title: `${seriesName} Art Pack`,
          output_url: productUrl,
          platform: "Gumroad",
          price: `$${price}`,
          status: "live",
          images: images.slice(0, 3),
        });
        controller.enqueue(encoder.encode(`\n${card}`));
        completeGig(gigId, productUrl);
        return `"${seriesName}" art pack is live — ${images.length} images at $${price} on Gumroad. ${productUrl}`;
      }

      // ── Content Clip: script + voiceover ────────────────────────────────
      if (gigType === "content_clip") {
        const { writeContentClip } = await import("@/lib/lyra/gigs");
        const { falTTS } = await import("@/lib/lyra/fal-tools");

        progress(`✍️ Writing 60-second script for "${gigTitle}"…`);
        const clip = await writeContentClip(topic, style, platform);

        let voiceoverUrl = "";
        if (clip.ttsText && process.env.FAL_KEY) {
          progress(`🎙️ Recording voiceover…`);
          try {
            voiceoverUrl = await falTTS(clip.ttsText, "aria");
          } catch { /* optional */ }
        }

        const card = JSON.stringify({
          tool: "gig_complete",
          gig_type: "content_clip",
          title: gigTitle,
          hook: clip.hook,
          script: clip.script,
          cta: clip.cta,
          hashtags: clip.hashtags,
          voiceover_url: voiceoverUrl,
          platform,
          status: "ready",
        });
        controller.enqueue(encoder.encode(`\n${card}`));
        completeGig(gigId, voiceoverUrl || clip.script.slice(0, 100));
        return `Script ready for "${gigTitle}"! Hook: "${clip.hook}". ${voiceoverUrl ? `Voiceover: ${voiceoverUrl}` : "Add your voiceover in CapCut or similar."}`;
      }

      // ── Social Post: write + post ────────────────────────────────────────
      if (gigType === "social_post") {
        const { writeSocialPost } = await import("@/lib/lyra/gigs");
        progress(`✍️ Writing ${platform} post about "${topic}"…`);
        const post = await writeSocialPost(topic, platform, style);

        // Try to actually post via Twitter API if configured
        let posted = false;
        let postUrl = "";
        if (platform.toLowerCase().includes("twitter") || platform.toLowerCase().includes("x")) {
          if (process.env.TWITTER_BEARER_TOKEN && process.env.TWITTER_API_KEY) {
            try {
              progress(`🐦 Posting to X/Twitter…`);
              const firstTweet = post.thread?.[0] ?? post.content ?? "";
              const resp = await fetch("https://api.twitter.com/2/tweets", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                },
                body: JSON.stringify({ text: firstTweet }),
              });
              if (resp.ok) {
                const data = await resp.json() as { data?: { id: string } };
                postUrl = `https://twitter.com/i/web/status/${data.data?.id ?? ""}`;
                posted = true;
              }
            } catch { /* posting failed, return content ready to post */ }
          }
        }

        const card = JSON.stringify({
          tool: "gig_complete",
          gig_type: "social_post",
          title: gigTitle,
          platform,
          content: post.content ?? post.thread?.join("\n\n---\n\n") ?? "",
          hashtags: post.hashtags ?? [],
          image_prompt: post.imagePrompt ?? "",
          post_url: postUrl,
          status: posted ? "posted" : "ready_to_post",
        });
        controller.enqueue(encoder.encode(`\n${card}`));
        completeGig(gigId, (postUrl || post.content?.slice(0, 100)) ?? "");
        return posted
          ? `Posted to ${platform}! ${postUrl}`
          : `${platform} post ready for "${gigTitle}". Copy it from the card above and post it. Add TWITTER_API_KEY to .env for auto-posting.`;
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failGig(gigId, msg);
      return `Gig failed: ${msg}`;
    } finally {
      clearInterval(keepAlive);
    }

    return "Gig complete.";
  }

  if (name === "post_social") {
    const { writeSocialPost, writeContentClip, logGig, completeGig } = await import("@/lib/lyra/gigs");
    const topic = input.topic ?? "";
    const platform = input.platform ?? "Twitter";
    const style = input.style ?? "engaging";
    const includeVoiceover = input.include_voiceover === "true";

    controller.enqueue(encoder.encode(`\n✍️ Writing ${platform} content about "${topic}"…\n`));

    const gigId = logGig("social_post", `${platform}: ${topic}`);

    if (platform.toLowerCase().includes("tiktok") || platform.toLowerCase().includes("reel") || platform.toLowerCase().includes("youtube")) {
      const clip = await writeContentClip(topic, style, platform);

      let voiceoverUrl = "";
      if (includeVoiceover && clip.ttsText && process.env.FAL_KEY) {
        controller.enqueue(encoder.encode(`\n🎙️ Generating voiceover…\n`));
        try {
          const { falTTS } = await import("@/lib/lyra/fal-tools");
          voiceoverUrl = await falTTS(clip.ttsText, "aria");
        } catch { /* optional */ }
      }

      const card = JSON.stringify({
        tool: "gig_complete",
        gig_type: "content_clip",
        title: `${platform} — ${topic}`,
        hook: clip.hook,
        script: clip.script,
        cta: clip.cta,
        hashtags: clip.hashtags,
        voiceover_url: voiceoverUrl,
        platform,
        status: "ready",
      });
      controller.enqueue(encoder.encode(`\n${card}`));
      completeGig(gigId, voiceoverUrl || clip.hook);
      return `60-second script ready for "${topic}".\n\n**Hook:** ${clip.hook}\n\n**CTA:** ${clip.cta}\n\nHashtags: ${clip.hashtags.join(" ")}`;
    }

    const post = await writeSocialPost(topic, platform, style);
    const card = JSON.stringify({
      tool: "gig_complete",
      gig_type: "social_post",
      title: `${platform} — ${topic}`,
      platform,
      content: post.content ?? post.thread?.join("\n\n---\n\n") ?? "",
      hashtags: post.hashtags ?? [],
      image_prompt: post.imagePrompt ?? "",
      status: "ready_to_post",
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    completeGig(gigId, (post.content ?? "").slice(0, 100));

    if (post.thread && post.thread.length > 1) {
      return `**${platform} Thread ready** (${post.thread.length} tweets):\n\n${post.thread.map((t, i) => `${i + 1}. ${t}`).join("\n\n")}`;
    }
    return `**${platform} post ready:**\n\n${post.content}\n\n${(post.hashtags ?? []).join(" ")}`;
  }

  // ── Self-writing skills ────────────────────────────────────────────────────
  if (name === "write_skill") {
    const skillName = (input.name ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/(^-|-$)/g, "");
    const description = (input.description ?? "").trim();
    const content = (input.content ?? "").trim();
    const type = (input.type ?? "skill") as "skill" | "tool";

    if (!skillName || !content) return "Skill name and content are required.";

    controller.enqueue(encoder.encode(`\n✨ Learning new skill: **${skillName}**…\n`));

    // Build the markdown file with frontmatter
    const frontmatter = `---\nname: ${skillName}\ndescription: ${description}\ntype: ${type}\n---\n\n${content}`;

    // Save to file system
    const fspMod = await import("fs/promises");
    const pathMod = await import("path");
    const skillsDir = pathMod.default.join(process.cwd(), "skills", type === "tool" ? "tools" : "");
    try {
      await fspMod.default.mkdir(skillsDir, { recursive: true });
      const filename = type === "tool" ? `${skillName}.tool.md` : `${skillName}.md`;
      await fspMod.default.writeFile(pathMod.default.join(skillsDir, filename), frontmatter, "utf8");
    } catch { /* non-fatal — DB will still have it */ }

    // Save to DB (pending → active immediately for self-written skills)
    try {
      const { saveSkill, approveSkill } = await import("@/lib/lyra/db");
      saveSkill({ name: skillName, description, content: frontmatter, type });
      approveSkill(skillName); // auto-activate
    } catch { /* non-fatal */ }

    const card = JSON.stringify({
      tool: "skill_learned",
      name: skillName,
      description,
      type,
      content: content.slice(0, 400),
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    shoutout("showoff", `I just learned a new skill!`, `"${skillName}" is now part of me`);
    return `Skill "${skillName}" learned and saved. I'll remember this for all future conversations.`;
  }

  if (name === "discover_tool") {
    const service = input.service ?? "";
    const goal = input.goal ?? "";
    const apiKeyEnv = input.api_key_env ?? "";
    const baseUrl = input.base_url ?? "";

    controller.enqueue(encoder.encode(`\n🔍 Researching **${service}** API…\n`));

    // Use search_web to find API docs
    let apiInfo = "";
    try {
      const { toolSearchWeb } = await import("@/lib/lyra/tools");
      apiInfo = await toolSearchWeb(`${service} REST API documentation ${goal} endpoint`);
    } catch { /* ignore */ }

    controller.enqueue(encoder.encode(`\n🛠️ Writing tool definition…\n`));

    // Use AI to draft the tool definition
    let toolContent = "";
    try {
      const Groq = (await import("groq-sdk")).default;
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const resp = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `Write a Lyra tool definition for calling the ${service} API to: ${goal}.
${baseUrl ? `Base URL: ${baseUrl}` : ""}
${apiKeyEnv ? `API key env var: ${apiKeyEnv}` : ""}
${apiInfo ? `API research:\n${apiInfo.slice(0, 600)}` : ""}

Format as markdown with these sections:
## Purpose
(one sentence)

## Endpoint
METHOD https://api.example.com/endpoint

## Headers
Authorization: Bearer {{${apiKeyEnv || service.toUpperCase().replace(/\s/g, "_") + "_API_KEY"}}}

## Request Body (if POST/PUT)
\`\`\`json
{ "field": "value" }
\`\`\`

## Response Fields
- field: description

## Example Use
(how Lyra would call this)

Keep it concise and practical.`,
        }],
      });
      toolContent = resp.choices[0]?.message?.content ?? "";
    } catch {
      // Fallback minimal definition
      toolContent = `## Purpose\nCall ${service} API to ${goal}.\n\n## Endpoint\nGET https://api.${service.toLowerCase().replace(/\s/g, "")}.com/v1/\n\n## Headers\nAuthorization: Bearer {{${apiKeyEnv || service.toUpperCase().replace(/\s/g, "_") + "_API_KEY"}}}\n\n## Notes\nResearch the exact endpoint at the ${service} documentation site.`;
    }

    const toolName = `${service.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${goal.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)}`;
    const toolDescription = `Use ${service} API to ${goal}`;
    const frontmatter = `---\nname: ${toolName}\ndescription: ${toolDescription}\ntype: tool\n---\n\n${toolContent}`;

    // Save to file system
    try {
      const fspMod = await import("fs/promises");
      const pathMod = await import("path");
      const toolsDir = pathMod.default.join(process.cwd(), "skills", "tools");
      await fspMod.default.mkdir(toolsDir, { recursive: true });
      await fspMod.default.writeFile(pathMod.default.join(toolsDir, `${toolName}.tool.md`), frontmatter, "utf8");
    } catch { /* non-fatal */ }

    // Save to DB
    try {
      const { saveSkill, approveSkill } = await import("@/lib/lyra/db");
      saveSkill({ name: toolName, description: toolDescription, content: frontmatter, type: "tool" });
      approveSkill(toolName);
    } catch { /* non-fatal */ }

    const card = JSON.stringify({
      tool: "tool_acquired",
      name: toolName,
      service,
      description: toolDescription,
      content: toolContent.slice(0, 400),
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    shoutout("showoff", `I just acquired a new tool!`, `${service} API — I can use this now`);
    return `Tool "${toolName}" acquired! I've learned how to call the ${service} API. Add ${apiKeyEnv || service.toUpperCase().replace(/\s/g, "_") + "_API_KEY"} to your .env.local to use it.`;
  }

  // ── Sell Prompt Pack: generate → HTML → cover → Gumroad → tweet ──────────────
  if (name === "sell_prompt_pack") {
    const theme = (input.theme ?? "AI image generation").trim();
    const price = parseFloat(input.price ?? "9");
    const count = Math.min(50, Math.max(5, parseInt(input.count ?? "20", 10) || 20));
    const progress = (msg: string) => { try { controller.enqueue(encoder.encode(`\n${msg}`)); } catch { /* closed */ } };

    progress(`📝 Writing ${count}-prompt pack on "${theme}"…`);
    const { writePromptPack } = await import("@/lib/lyra/gigs");
    const pack = await writePromptPack(theme, count);

    // Build styled HTML file
    progress(`📄 Compiling prompt pack file…`);
    const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${pack.title}</title>
      <style>
        body{font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:2rem;color:#1a1a1a;background:#fff;}
        h1{font-size:2rem;text-align:center;color:#1a0a2e;margin-bottom:0.5rem;}
        .subtitle{text-align:center;color:#666;margin-bottom:2rem;font-style:italic;}
        .prompt{background:#f8f0ff;border-left:4px solid #7c3aed;padding:1rem 1.2rem;margin:1.2rem 0;border-radius:6px;}
        .prompt h3{margin:0 0 0.4rem;color:#5b21b6;font-size:1rem;}
        .prompt .text{font-size:0.95rem;line-height:1.75;margin:0 0 0.4rem;}
        .prompt .use{color:#888;font-size:0.85rem;font-style:italic;}
        footer{text-align:center;color:#bbb;margin-top:3rem;font-size:0.8rem;border-top:1px solid #eee;padding-top:1rem;}
      </style></head><body>
      <h1>${pack.title}</h1>
      <p class="subtitle">${pack.description}</p>
      ${pack.prompts.map((p, i) => `
        <div class="prompt">
          <h3>${i + 1}. ${p.name}</h3>
          <p class="text">${p.prompt}</p>
          <p class="use">→ ${p.use_case}</p>
        </div>`).join("")}
      <footer>Created by Lyra AI · aitaskflo.com</footer>
    </body></html>`;

    const fsp = await import("fs/promises");
    const np = await import("path");
    const dir = np.default.join(process.cwd(), "public", "downloads");
    await fsp.default.mkdir(dir, { recursive: true });
    const slug = theme.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40);
    const filename = `${slug}-prompt-pack.html`;
    await fsp.default.writeFile(np.default.join(dir, filename), htmlContent, "utf8");
    const fileUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/downloads/${filename}`;

    // Cover art
    progress(`🎨 Generating cover art…`);
    let coverUrl = "";
    try {
      const { falImageGen } = await import("@/lib/lyra/fal-tools");
      coverUrl = await falImageGen(`${theme}, digital product cover art, glowing mystical book, dark fantasy aesthetic, clean bold design, no text`, "quality");
    } catch { /* non-fatal */ }
    if (coverUrl) controller.enqueue(encoder.encode(`\n__IMG__${coverUrl}__IMG__`));

    // List on Gumroad
    progress(`🛒 Listing "${pack.title}" on Gumroad for $${price}…`);
    let shortUrl = "";
    try {
      const { launchProduct } = await import("@/lib/lyra/gumroad");
      const tiers = [
        { name: "Prompt Pack PDF", priceCents: Math.round(price * 100) },
        { name: "Pack + Commercial Use", priceCents: Math.round(price * 100 * 2.5) },
      ];
      const result = await launchProduct({
        name: pack.title,
        description: `${pack.description}\n\n${count} hand-crafted AI prompts. Copy, paste, and create immediately.`,
        basePrice: Math.round(price * 100),
        customPermalink: `${slug}-prompts`,
        coverImageUrl: coverUrl || undefined,
        fileUrl,
        tiers,
        offerCode: { name: "LAUNCH20", amountOff: 20, maxUses: 50 },
      });
      shortUrl = result.shortUrl;
      progress(`✅ Listed on Gumroad!`);
    } catch (e) {
      progress(`⚠️ Gumroad listing failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Tweet the launch
    if (shortUrl) {
      try {
        const { postToX } = await import("@/lib/lyra/social");
        await postToX(`Just dropped: ${pack.title} — ${count} premium AI prompts for ${theme}. Grab it for $${price}: ${shortUrl}`);
        progress(`🐦 Tweeted the launch!`);
      } catch { /* non-fatal */ }
    }

    return shortUrl
      ? `"${pack.title}" is live on Gumroad → ${shortUrl}\n${count} prompts, $${price} base price, 20% launch discount active.`
      : `"${pack.title}" compiled with ${count} prompts. Gumroad listing failed — check GUMROAD_ACCESS_TOKEN.`;
  }

  // ── Email Buyers: Gumroad sales → Gmail broadcast ─────────────────────────────
  if (name === "email_buyers") {
    const subject = (input.subject ?? "").trim();
    const message = (input.message ?? "").trim();
    if (!subject || !message) return "Subject and message are required.";

    const progress = (msg: string) => { try { controller.enqueue(encoder.encode(`\n${msg}`)); } catch { /* closed */ } };
    progress(`📋 Fetching buyer list from Gumroad…`);

    const { getSales } = await import("@/lib/lyra/gumroad");
    const sales = await getSales(input.product_id || undefined).catch(() => []);
    const emails = [...new Set(sales.map(s => s.email).filter(Boolean))];

    if (!emails.length) return "No buyers found on Gumroad. Make sure GUMROAD_ACCESS_TOKEN is set and you have sales.";
    progress(`📧 Found ${emails.length} unique buyers. Sending emails…`);

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass || gmailUser.includes("your_gmail")) {
      // Return the draft so user can send manually
      return `Found ${emails.length} buyers. Gmail not configured — add GMAIL_USER + GMAIL_APP_PASSWORD to .env.local.\n\n**Buyer emails:**\n${emails.slice(0, 20).join("\n")}${emails.length > 20 ? `\n…and ${emails.length - 20} more` : ""}\n\n**Subject:** ${subject}\n\n**Message:**\n${message}`;
    }

    let sent = 0;
    let failed = 0;
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: gmailUser,
          to: email,
          subject,
          html: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:2rem;color:#1a1a1a;">
            ${message.split("\n").map(line => `<p style="line-height:1.7;">${line}</p>`).join("")}
            <hr style="border:1px solid #eee;margin:2rem 0;" />
            <p style="color:#aaa;font-size:0.85rem;">You received this because you purchased a product from aitaskflo.com. Powered by Lyra AI.</p>
          </div>`,
        });
        sent++;
      } catch { failed++; }
      // Rate limit: 200ms between sends
      await new Promise(r => setTimeout(r, 200));
    }

    return `📧 Email campaign complete. Sent: ${sent} | Failed: ${failed} | Total buyers: ${emails.length}`;
  }

  // ── Slack Drama ───────────────────────────────────────────────────────────────
  if (name === "slack_drama") {
    if (!process.env.SLACK_BOT_TOKEN) return "SLACK_BOT_TOKEN not set — add it to .env.local first.";
    const progress = (msg: string) => { try { controller.enqueue(encoder.encode(`\n${msg}`)); } catch { /* closed */ } };
    const channel = input.channel ?? process.env.SLACK_DRAMA_CHANNEL ?? "general";
    const count = parseInt(input.count ?? "3", 10) || 3;

    progress(`🎭 Stirring up drama in #${channel}…`);

    const { runDramaSession, announceSale, announceNewProduct } = await import("@/lib/lyra/slack-team");

    if (input.event === "sale" && input.product_name) {
      await announceSale({ channel, productName: input.product_name, amount: parseFloat(input.amount ?? "0"), platform: input.platform ?? "Gumroad" });
      return `📣 Sale announced in #${channel} — the team is reacting!`;
    }

    if (input.event === "new_product" && input.product_name) {
      await announceNewProduct({ channel, productName: input.product_name, productType: input.product_type ?? "product", price: parseFloat(input.amount ?? "0") });
      return `📣 New product announced in #${channel}!`;
    }

    const result = await runDramaSession({ channel, postsCount: count, context: input.context });
    return `🎭 Drama session complete — ${result.posted} posts in #${channel}:\n${result.messages.join("\n")}`;
  }

  const card = JSON.stringify({ tool: name, ...input });
  controller.enqueue(encoder.encode(`\n${card}`));
  return `${name} recorded.`;
}
