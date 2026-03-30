import nodePath from "path";
import { randomUUID } from "crypto";
import { upsertCrmContact, searchCrmContacts, createTask, listTasks } from "@/lib/lyra/db";
import { buildGame, improveGame } from "@/lib/lyra/gamebuilder";
import { scanJobs, formatJobsForChat, buildCoverLetterPrompt } from "@/lib/lyra/jobscan";
import { scoreAts, formatAtsScore, buildTailorPrompt } from "@/lib/lyra/resume";
import { executeHsAction } from "@/lib/lyra/hubspot";
import { detectEngine } from "@/lib/lyra/gamedev";
import { generateBook } from "@/lib/lyra/bookgen";
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
    return await toolSearchWeb(input.query ?? "");
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
    const BASE_GAME_DIR = process.env.GAME_DIR ? nodePath.dirname(process.env.GAME_DIR) : "/home/aitaskflo/game";
    const gameDir = nodePath.join(BASE_GAME_DIR, slug);

    // Complex genres need more turns (browser games are single-call, so maxTurns is irrelevant)
    const g = genre.toLowerCase();
    const isComplex = g.includes("sim") || g.includes("tycoon") || g.includes("life") || g.includes("management") || g.includes("rpg") || g.includes("asymmetric") || g.includes("open world");
    const maxTurns = isComplex ? 45 : 30;

    const engineLabel = engine === "phaser" ? "Phaser 3 browser" : engine === "threejs" ? "Three.js browser" : engine === "godot3d" ? "Godot 4 3D" : "Godot 4 2D";
    controller.enqueue(encoder.encode(`\n🎮 Starting ${isComplex ? "complex " : ""}${engineLabel} game build for **${rawConcept}** (${genre})…\n`));

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
    }, maxTurns, engine);

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
      play: needsMulti
        ? `Host: call NetworkManager.host_game() on start\nJoin: call NetworkManager.join_game("server-ip")\nAI endpoint: ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/lyra/game-ai`
        : `AI endpoint running at: ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/lyra/game-ai\nGame Guide endpoint: ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/lyra/game-guide`,
      file_count: String(result.files.length),
      location: gameDir,
    });
    controller.enqueue(encoder.encode(`\n${card}`));
    return `${mode} added to "${slug}" — ${result.files.length} files written.`;
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

  if (name === "analyze_image") {
    return await toolAnalyzeImage(input.url ?? "", userId);
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

      return `Unknown Cloudflare action: ${action}`;
    } catch (err) {
      return `Cloudflare error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const card = JSON.stringify({ tool: name, ...input });
  controller.enqueue(encoder.encode(`\n${card}`));
  return `${name} recorded.`;
}
