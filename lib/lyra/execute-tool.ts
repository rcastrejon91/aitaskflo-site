import nodePath from "path";
import { upsertCrmContact, searchCrmContacts, createTask, listTasks } from "@/lib/lyra/db";
import { buildGame, improveGame } from "@/lib/lyra/gamebuilder";
import { scanJobs, formatJobsForChat, buildCoverLetterPrompt } from "@/lib/lyra/jobscan";
import { scoreAts, formatAtsScore, buildTailorPrompt } from "@/lib/lyra/resume";
import { executeHsAction } from "@/lib/lyra/hubspot";
import { detectEngine } from "@/lib/lyra/gamedev";
import { generateBook } from "@/lib/lyra/bookgen";
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
} from "@/lib/lyra/tools";

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

  const card = JSON.stringify({ tool: name, ...input });
  controller.enqueue(encoder.encode(`\n${card}`));
  return `${name} recorded.`;
}
