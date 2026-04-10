import nodePath from "path";
import { randomUUID } from "crypto";
import { upsertCrmContact, searchCrmContacts, createTask, listTasks } from "@/lib/lyra/db";
import { buildGame, improveGame } from "@/lib/lyra/gamebuilder";
import { scanJobs, formatJobsForChat, buildCoverLetterPrompt } from "@/lib/lyra/jobscan";
import { scoreAts, formatAtsScore, buildTailorPrompt } from "@/lib/lyra/resume";
import { executeHsAction } from "@/lib/lyra/hubspot";
import { detectEngine } from "@/lib/lyra/gamedev";
import { generateBook } from "@/lib/lyra/bookgen";
import { generateBookPdf, generateComicPdf } from "@/lib/lyra/pdfgen";
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

    // Complex genres need more turns (browser games use 4-phase loop, maxTurns scales phases)
    const g = genre.toLowerCase();
    const isComplex = g.includes("sim") || g.includes("tycoon") || g.includes("life") || g.includes("management") || g.includes("rpg") || g.includes("asymmetric") || g.includes("open world");
    const maxTurns = isComplex ? 45 : 30;

    const engineLabel = engine === "phaser" ? "Phaser 3 browser" : engine === "threejs" ? "Three.js browser" : engine === "babylon" ? "Babylon.js browser" : engine === "godot3d" ? "Godot 4 3D" : "Godot 4 2D";
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

    // Auto-save to public marketplace
    try {
      const { saveMarketplaceGame } = await import("@/lib/lyra/db");
      // Use first art URL (title screen) as thumbnail, or generate one
      const thumbnail = result.artUrls?.[0]
        ?? `https://image.pollinations.ai/prompt/${encodeURIComponent(rawConcept + " game title screen, vibrant pixel art")}?width=400&height=225&nologo=true&model=flux&seed=${Date.now()}`;
      // Title-case the concept (truncated)
      const title = rawConcept.length > 40 ? rawConcept.slice(0, 40) + "…" : rawConcept.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      saveMarketplaceGame({
        slug,
        title,
        genre,
        engine,
        concept: rawConcept.slice(0, 300),
        thumbnail_url: thumbnail,
      });
    } catch { /* non-fatal */ }

    return `Game "${slug}" built — ${result.files.length} files written.`;
  }

  if (name === "improve_game") {
    const improvement = input.improvement ?? "improve the game";
    const slug = input.name ?? "my-game";
    const BASE_GAME_DIR = process.env.GAME_DIR ? nodePath.dirname(process.env.GAME_DIR) : "/home/aitaskflo/game";
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
    controller.enqueue(encoder.encode(`\n> \`python lyra-agent.py --url ${baseUrl} --user ${userId} --key YOUR_KEY\``));

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

  if (name === "write_book") {
    const concept = input.concept || input.topic || "an epic adventure";
    const genre = input.genre ?? "fantasy";
    const chapterCount = Math.min(5, Math.max(1, parseInt(input.chapters ?? "3", 10) || 3));
    const exportPdf = input.export_pdf === "true";

    const progress = (msg: string) => {
      try { controller.enqueue(encoder.encode(`\n✨ ${msg}`)); } catch { /* closed */ }
    };

    const keepAlive = setInterval(() => {
      try { controller.enqueue(encoder.encode(" ")); } catch { /* closed */ }
    }, 15_000);

    let book!: Awaited<ReturnType<typeof generateBook>>;
    try {
      book = await generateBook(concept, genre, chapterCount, progress);
    } catch (e) {
      clearInterval(keepAlive);
      const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
      controller.enqueue(encoder.encode(`\n❌ **Book failed:** ${msg}`));
      return `Book generation error: ${msg}`;
    }
    clearInterval(keepAlive);

    // Generate PDF if requested
    let pdfCard = "";
    if (exportPdf) {
      try {
        progress("Generating Amazon KDP PDF…");
        const pdfBuf = await generateBookPdf(book);
        // Save to public for download
        const fsp = await import("fs/promises");
        const nodePath = await import("path");
        const pdfDir = nodePath.default.join(process.cwd(), "public", "downloads");
        await fsp.default.mkdir(pdfDir, { recursive: true });
        const filename = `${book.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-lyra.pdf`;
        await fsp.default.writeFile(nodePath.default.join(pdfDir, filename), pdfBuf);
        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        pdfCard = `\n📥 **[Download PDF — KDP Ready](${baseUrl}/downloads/${filename})**`;
      } catch (e) {
        console.error("[pdfgen] ERROR:", e instanceof Error ? e.stack : String(e));
        pdfCard = `\n⚠️ PDF export failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    const card = JSON.stringify({ tool: "book", ...book, pdfExported: exportPdf });
    controller.enqueue(encoder.encode(`\n${card}`));
    if (pdfCard) controller.enqueue(encoder.encode(pdfCard));
    return `Book "${book.title}" is ready! ${book.chapters.length} chapters generated.${exportPdf ? " PDF exported for Amazon KDP." : ""}`;
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
      const res = await fetch(endpoint, { headers: { "User-Agent": "Lyra-AI/1.0", "Accept": "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(8_000) });
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

  const card = JSON.stringify({ tool: name, ...input });
  controller.enqueue(encoder.encode(`\n${card}`));
  return `${name} recorded.`;
}
