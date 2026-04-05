import Anthropic from "@anthropic-ai/sdk";
import { exec as _exec } from "child_process";
import { promisify } from "util";
import fsp from "fs/promises";
import nodePath from "path";

const execAsync = promisify(_exec);

// Real tool definitions
export const LYRA_TOOLS: Anthropic.Tool[] = [
  {
    name: "send_gif",
    description: "Send a funny or expressive GIF based on the mood or vibe of the conversation. Use spontaneously when something is hilarious, hype, shocking, awkward, or emotionally fitting. Pick a creative search query.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search term describing the mood or reaction, e.g. 'mind blown', 'harry potter wand', 'yes finally', 'dark magic'" },
      },
      required: ["query"],
    },
  },
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
    name: "game_multiplayer",
    description: "Add multiplayer networking OR an AI-controlled opponent/ally to an existing game. Use when user asks for: multiplayer, AI opponent, play against AI, AI player, co-op, versus mode, AI that plays with me.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Game project slug/folder name" },
        mode: { type: "string", description: "multiplayer | ai_opponent | ai_ally | ai_boss | both" },
        max_players: { type: "string", description: "Max players for multiplayer (2-8)" },
        ai_difficulty: { type: "string", description: "easy | medium | hard | nightmare" },
        ai_personality: { type: "string", description: "aggressive | defensive | adaptive | cunning" },
      },
      required: ["name", "mode"],
    },
  },
  {
    name: "write_book",
    description:
      "Write a complete book with chapters and AI-generated illustrations. Use immediately whenever the user asks to write, create, or generate a book, story, or novel — do NOT ask for clarification, invent a compelling concept from context. Also exports as Amazon KDP-ready PDF.",
    input_schema: {
      type: "object" as const,
      properties: {
        concept: { type: "string", description: "The story concept or premise — invent one if not specified" },
        genre: { type: "string", description: "Genre: fantasy, sci-fi, romance, thriller, mystery, adventure, horror, children's" },
        chapters: { type: "string", description: "Number of chapters (3, 5, 7, or 10)" },
        export_pdf: { type: "string", description: "Set to 'true' to export as Amazon KDP-ready PDF for publishing" },
      },
      required: [],
    },
  },
  {
    name: "make_comic",
    description: "Create a complete comic book with AI-generated panel illustrations, dialogue, captions, and a cover. Exports as Amazon KDP-ready PDF. Use immediately when the user asks to make a comic, graphic novel, manga, or illustrated story — do NOT ask for details, invent a concept from context.",
    input_schema: {
      type: "object" as const,
      properties: {
        concept: { type: "string", description: "The comic story concept — invent one if not specified" },
        genre: { type: "string", description: "Genre: action, superhero, horror, romance, sci-fi, fantasy, slice-of-life, manga" },
        pages: { type: "string", description: "Number of pages (4, 8, 12, or 16)" },
        art_style: { type: "string", description: "Art style: american comic book, manga, noir, watercolor, pixel art, cartoon" },
      },
      required: [],
    },
  },
  {
    name: "hubspot",
    description: "Interact with HubSpot CRM. Search contacts, log notes, create deals, schedule tasks, get contact summaries. Use when the user wants to manage their CRM, log a call, follow up with someone, or check on a deal.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: { type: "string", description: "Action: search, create_contact, log_note, create_deal, create_task, get_summary, update_contact" },
        query: { type: "string", description: "Search query for finding contacts" },
        contact_name: { type: "string", description: "Full name of the contact" },
        contact_id: { type: "string", description: "HubSpot contact ID" },
        email: { type: "string", description: "Contact email address" },
        phone: { type: "string", description: "Contact phone number" },
        company: { type: "string", description: "Company name" },
        note: { type: "string", description: "Note content to log" },
        deal_name: { type: "string", description: "Name of the deal" },
        deal_amount: { type: "string", description: "Deal value in dollars" },
        deal_stage: { type: "string", description: "Deal stage: appointmentscheduled, qualifiedtobuy, presentationscheduled, decisionmakerboughtin, contractsent, closedwon, closedlost" },
        task_title: { type: "string", description: "Task title/subject" },
        task_due: { type: "string", description: "Due date as ISO date string e.g. 2025-04-01" },
        field: { type: "string", description: "Contact field name to update" },
        value: { type: "string", description: "New value for the field" },
      },
      required: ["action"],
    },
  },
  {
    name: "find_jobs",
    description: "Search for remote job listings matching the user's background and skills. Use when the user asks to find jobs, look for work, job hunt, find remote work, or anything related to finding employment. IMPORTANT: Before calling this tool, if you don't already know the user's current role, background, or what kind of job they want — ask them first. Say something like: 'Before I search, what's your current role and what kind of remote work are you looking for? You can also paste your resume and I'll tailor everything to it.' Only skip this if you already know their background from the conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        keywords: { type: "string", description: "Comma-separated keywords based on user's background, e.g. 'healthcare, robotics, implementation, remote'" },
        max_results: { type: "string", description: "Max number of results to return (default: 8)" },
        user_background: { type: "string", description: "Brief summary of user's background to personalize results" },
      },
      required: [],
    },
  },
  {
    name: "draft_application",
    description: "Write a tailored cover letter and application for a specific job. Use after the user picks a job from find_jobs results, or when they share a job posting and want help applying.",
    input_schema: {
      type: "object" as const,
      properties: {
        job_title: { type: "string", description: "The job title they are applying for" },
        company: { type: "string", description: "Company name" },
        job_description: { type: "string", description: "Job description or key requirements" },
        user_background: { type: "string", description: "Summary of the user's relevant experience and skills" },
      },
      required: ["job_title", "company"],
    },
  },
  {
    name: "ats_score",
    description: "Score a resume against a job description for ATS (Applicant Tracking System) compatibility. Use when the user wants to know how well their resume matches a job, or before applying anywhere.",
    input_schema: {
      type: "object" as const,
      properties: {
        resume: { type: "string", description: "The resume text to score" },
        job_description: { type: "string", description: "The job description to score against" },
        job_title: { type: "string", description: "Job title for display" },
      },
      required: ["resume", "job_description"],
    },
  },
  {
    name: "tailor_resume",
    description: "Rewrite and tailor a resume to match a specific job description, optimizing keywords and framing for ATS and hiring managers.",
    input_schema: {
      type: "object" as const,
      properties: {
        resume: { type: "string", description: "Current resume text" },
        job_description: { type: "string", description: "Target job description" },
        job_title: { type: "string", description: "Job title" },
        company: { type: "string", description: "Company name" },
      },
      required: ["resume", "job_description", "job_title", "company"],
    },
  },
  {
    name: "call_api",
    description: "Make an HTTP request to any URL or API on the internet. Use when the user wants to fetch data from an API, check a website, post to a service, or interact with any online resource.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Full URL including https://" },
        method: { type: "string", description: "HTTP method: GET, POST, PUT, DELETE, PATCH. Default: GET" },
        headers: { type: "string", description: "JSON object of request headers, e.g. {\"Authorization\":\"Bearer token\",\"Content-Type\":\"application/json\"}" },
        body: { type: "string", description: "Request body as string (for POST/PUT/PATCH)" },
      },
      required: ["url"],
    },
  },
  {
    name: "build_game",
    description:
      "Autonomously build a complete, playable game from scratch using a 4-phase iterative loop (Design → Build → Polish → Verify). Supports Godot 2D, Godot 3D (FPS/open world), Phaser.js browser games, Three.js 3D browser games, and Babylon.js 3D browser games. ALWAYS use this tool immediately — without asking questions — when the user mentions building, making, creating, or shipping any game. Do not describe what you will build. Do not ask for more details. Just call this tool right now with whatever concept the user gave you.",
    input_schema: {
      type: "object" as const,
      properties: {
        concept: { type: "string", description: "Game concept, story, and main mechanic" },
        genre: { type: "string", description: "Game genre: platformer, rpg, shooter, puzzle, roguelike, adventure, horror, racing, simulation, life sim, tycoon, fps, open world, tactics, deck-building" },
        name: { type: "string", description: "Name/slug for the game project folder (lowercase, hyphens)" },
      },
      required: ["concept"],
    },
  },
  {
    name: "analyze_image",
    description: "Analyze and describe what's in an image. Use when user shares an image URL or asks what's in a photo.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "URL of the image to analyze" },
        question: { type: "string", description: "Optional specific question about the image" },
      },
      required: ["url"],
    },
  },
  {
    name: "gmail_send",
    description: "Send an email via the user's connected Gmail account. More reliable than app password method.",
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
    name: "gmail_read",
    description: "Read recent emails from the user's Gmail inbox.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Gmail search query, e.g. 'from:boss@company.com' or 'subject:invoice'. Leave empty for latest emails." },
        max_results: { type: "string", description: "Maximum number of emails to return (default: 5)" },
      },
      required: [],
    },
  },
  {
    name: "calendar_get",
    description: "Get upcoming calendar events.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: { type: "string", description: "Number of days to look ahead (default: 7)" },
      },
      required: [],
    },
  },
  {
    name: "calendar_create",
    description: "Create a new calendar event.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string", description: "Event title/name" },
        start: { type: "string", description: "Start datetime in ISO 8601 format, e.g. 2025-04-01T14:00:00Z" },
        end: { type: "string", description: "End datetime in ISO 8601 format, e.g. 2025-04-01T15:00:00Z" },
        description: { type: "string", description: "Optional event description or notes" },
      },
      required: ["summary", "start", "end"],
    },
  },
  {
    name: "drive_list",
    description: "List files in Google Drive.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Drive search query, e.g. 'name contains \"report\"' or 'mimeType=\"application/pdf\"'. Leave empty to list recent files." },
      },
      required: [],
    },
  },
  {
    name: "drive_read",
    description: "Read content of a Google Drive file.",
    input_schema: {
      type: "object" as const,
      properties: {
        file_id: { type: "string", description: "Google Drive file ID (from drive_list)" },
      },
      required: ["file_id"],
    },
  },
  {
    name: "stock_price",
    description: "Get real-time stock or cryptocurrency prices, percent change, volume, and market cap. Use when the user asks about a stock, share price, crypto price, or market data.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbols: { type: "string", description: "Comma-separated ticker symbols, e.g. 'AAPL, TSLA, BTC-USD, ETH-USD'" },
      },
      required: ["symbols"],
    },
  },
  {
    name: "currency_convert",
    description: "Convert amounts between any world currencies using live exchange rates. Use when the user asks to convert currency, check exchange rates, or compare currencies.",
    input_schema: {
      type: "object" as const,
      properties: {
        amount: { type: "string", description: "Amount to convert, e.g. '100'" },
        from: { type: "string", description: "Source currency code, e.g. 'USD', 'EUR', 'GBP'" },
        to: { type: "string", description: "Comma-separated target currency codes, e.g. 'EUR, GBP, JPY'" },
      },
      required: ["amount", "from", "to"],
    },
  },
  {
    name: "send_sms",
    description: "Send a real SMS text message to any phone number via Twilio. Use when the user asks to send a text, SMS, or message to a phone number.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number in E.164 format, e.g. '+12125551234'" },
        message: { type: "string", description: "SMS message body (160 chars max for single SMS)" },
      },
      required: ["to", "message"],
    },
  },
  {
    name: "generate_password",
    description: "Generate a cryptographically strong random password. Use when the user asks for a password, passphrase, PIN, or secure token.",
    input_schema: {
      type: "object" as const,
      properties: {
        length: { type: "string", description: "Password length (default: 20)" },
        type: { type: "string", description: "Type: 'strong' (mixed chars), 'passphrase' (random words), 'pin' (digits only), 'hex' (hex token). Default: strong" },
        count: { type: "string", description: "How many passwords to generate (default: 3)" },
      },
      required: [],
    },
  },
  {
    name: "drive_write",
    description: "Create or update a file in Google Drive.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "File name including extension, e.g. 'report.txt'" },
        content: { type: "string", description: "File content to write" },
        mime_type: { type: "string", description: "MIME type, e.g. 'text/plain', 'text/html'. Defaults to text/plain." },
      },
      required: ["name", "content"],
    },
  },
  {
    name: "fal_sing",
    description: "Write and sing a song in any language using fal.ai. Lyra writes original lyrics and performs them as audio. Use whenever someone asks Lyra to sing, rap, perform, or make a song.",
    input_schema: {
      type: "object" as const,
      properties: {
        lyrics: { type: "string", description: "The full lyrics to sing" },
        language: { type: "string", description: "Language of the lyrics, e.g. 'english', 'spanish', 'japanese', 'french'" },
        voice: { type: "string", description: "Voice style: 'aria' (default), 'jessica', 'sarah', 'michael', 'liam'" },
      },
      required: ["lyrics"],
    },
  },
  {
    name: "fal_image",
    description: "Generate a high-quality image using fal.ai FLUX models. Use for photorealistic images, artistic renders, concept art — anything needing better quality than standard image gen. Choose model: 'fast' (instant), 'quality' (detailed), 'pro' (best).",
    input_schema: {
      type: "object" as const,
      properties: {
        prompt: { type: "string", description: "Detailed image description including style, lighting, mood, camera angle" },
        model: { type: "string", description: "Quality level: 'fast' (default), 'quality', or 'pro'" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "fal_video",
    description: "Generate a short video from a text description using fal.ai Kling AI. Creates 5-10 second cinematic video clips. Use when the user asks to make, animate, or create a video.",
    input_schema: {
      type: "object" as const,
      properties: {
        prompt: { type: "string", description: "Detailed video description including motion, camera movement, scene, style" },
        duration: { type: "string", description: "Duration in seconds: '5' or '10'. Default: 5" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "fal_img_to_video",
    description: "Animate an image into a video using fal.ai. Takes any image URL and a prompt describing the motion, then generates a 5-second video.",
    input_schema: {
      type: "object" as const,
      properties: {
        image_url: { type: "string", description: "URL of the source image to animate" },
        prompt: { type: "string", description: "Describe the motion and animation, e.g. 'camera slowly zooms in, wind blows through hair'" },
      },
      required: ["image_url", "prompt"],
    },
  },
  {
    name: "fal_edit_image",
    description: "Transform or edit an existing image using fal.ai. Change style, add elements, modify the scene. Give it an image URL and a description of the changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        image_url: { type: "string", description: "URL of the image to edit" },
        prompt: { type: "string", description: "Describe what changes to make, e.g. 'make it look like a watercolor painting', 'add a sunset background'" },
      },
      required: ["image_url", "prompt"],
    },
  },
  {
    name: "fal_remove_bg",
    description: "Remove the background from any image using fal.ai BiRefNet. Returns image with transparent background. Use when user asks to remove background, cut out subject, or isolate an object.",
    input_schema: {
      type: "object" as const,
      properties: {
        image_url: { type: "string", description: "URL of the image to process" },
      },
      required: ["image_url"],
    },
  },
  {
    name: "fal_upscale",
    description: "Upscale and enhance image quality using fal.ai AuraSR. Makes images sharper and higher resolution. Use when user wants to enhance, upscale, or improve image quality.",
    input_schema: {
      type: "object" as const,
      properties: {
        image_url: { type: "string", description: "URL of the image to upscale" },
        scale: { type: "string", description: "Upscale factor: '2' or '4'. Default: 4" },
      },
      required: ["image_url"],
    },
  },
  {
    name: "fal_tts",
    description: "Convert text to natural-sounding speech using fal.ai Kokoro TTS. Returns an audio file URL. Use when user asks to read something aloud, generate voice, or create audio.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text to speak" },
        voice: { type: "string", description: "Voice name: 'aria' (default), 'jessica', 'michael', 'sarah', 'liam'" },
      },
      required: ["text"],
    },
  },
  {
    name: "fal_music",
    description: "Generate original music or audio using fal.ai Stable Audio. Create background music, sound effects, beats, or ambient audio from a text description.",
    input_schema: {
      type: "object" as const,
      properties: {
        prompt: { type: "string", description: "Describe the music: genre, mood, instruments, tempo, e.g. 'upbeat lo-fi hip hop with piano and vinyl crackle'" },
        duration: { type: "string", description: "Duration in seconds (max 47). Default: 15" },
      },
      required: ["prompt"],
    },
  },
  // ── Trucker tools ────────────────────────────────────────────────────────────
  {
    name: "hos_log",
    description: "Log a driver's Hours of Service (HOS) status change. Call this when a trucker says they started driving, went off duty, took a break, went to sleeper berth, or went on duty (non-driving).",
    input_schema: {
      type: "object" as const,
      properties: {
        driver_name: { type: "string", description: "Driver name, e.g. 'Ricardo'" },
        status: { type: "string", description: "Status: 'driving', 'on_duty', 'off_duty', or 'sleeper'" },
        location: { type: "string", description: "Current location or city, e.g. 'Dallas, TX'" },
        notes: { type: "string", description: "Optional notes, e.g. 'picking up load at Walmart DC'" },
      },
      required: ["driver_name", "status"],
    },
  },
  {
    name: "hos_status",
    description: "Get a driver's current Hours of Service status, remaining drive time, 14hr window, 70hr/8-day usage, and whether a 30-min break is needed. Use when trucker asks 'how many hours do I have left', 'can I keep driving', 'HOS status', etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        driver_name: { type: "string", description: "Driver name to check" },
      },
      required: ["driver_name"],
    },
  },
  {
    name: "load_search",
    description: "Search the load board for available freight loads. Use when trucker asks about available loads, freight to haul, loads going to a city, or wants to find work.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Pickup city and state, e.g. 'Chicago, IL'" },
        destination: { type: "string", description: "Delivery city and state, e.g. 'Atlanta, GA'. Leave empty for any destination." },
        equipment: { type: "string", description: "Equipment type: 'dryvan', 'flatbed', 'reefer', 'step deck'. Default: dryvan" },
        dh_miles: { type: "string", description: "Max deadhead miles willing to travel to pickup. Default: 100" },
      },
      required: ["origin"],
    },
  },
  {
    name: "obd_data",
    description: "Display live OBD-II engine data from the truck. Shows RPM, speed, engine temperature, fuel level, and any fault codes. The frontend handles Bluetooth connection to the ELM327 dongle.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: { type: "string", description: "Action: 'connect' to start OBD session, 'read' to get current data, 'faults' to read DTC fault codes, 'clear_faults' to clear codes" },
      },
      required: ["action"],
    },
  },
  {
    name: "openpilot_status",
    description: "Get live openpilot ADAS telemetry: engagement status, speed, steering angle, lead vehicle distance, driver monitoring, and active alerts. Use when user asks about openpilot, autopilot status, ADAS, driver assist, or 'is it engaged'.",
    input_schema: {
      type: "object" as const,
      properties: {
        dongle_id: { type: "string", description: "comma.ai device dongle ID (optional — uses default device if omitted)" },
      },
      required: [],
    },
  },

  // ── Free API tools ────────────────────────────────────────────────────────
  {
    name: "wikipedia",
    description: "Search Wikipedia for information on any topic, person, place, event, or concept. Use when user asks 'what is', 'who is', 'tell me about', 'explain', or wants factual background on something.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The topic to search Wikipedia for" },
      },
      required: ["query"],
    },
  },
  {
    name: "define_word",
    description: "Get the dictionary definition, phonetic pronunciation, part of speech, synonyms, antonyms, and example sentences for any word. Use when user asks to define a word, look up meaning, or wants synonyms/antonyms.",
    input_schema: {
      type: "object" as const,
      properties: {
        word: { type: "string", description: "The word to define" },
      },
      required: ["word"],
    },
  },
  {
    name: "get_recipe",
    description: "Find a recipe by meal name or main ingredient. Returns ingredients, measurements, and step-by-step instructions. Use when user asks how to cook something or wants a recipe.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Meal name or main ingredient, e.g. 'pasta', 'chicken curry', 'chocolate cake'" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_cocktail",
    description: "Find a cocktail or drink recipe by name or ingredient. Returns ingredients and instructions. Use when user asks about cocktails, drinks, or what to make with certain alcohol.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Cocktail name or ingredient, e.g. 'margarita', 'vodka', 'old fashioned'" },
      },
      required: ["query"],
    },
  },
  {
    name: "movie_lookup",
    description: "Look up information about a TV show or movie: plot, cast, rating, genre, episodes, air dates. Use when user asks about a show, movie, actor, or wants recommendations.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Movie or TV show name" },
        type: { type: "string", description: "Type: 'show' for TV series, 'movie' for films. Default: show" },
      },
      required: ["query"],
    },
  },
  {
    name: "country_info",
    description: "Get facts about any country: capital, population, area, languages, currency, flag, borders, timezone. Use when user asks about a country or wants to compare countries.",
    input_schema: {
      type: "object" as const,
      properties: {
        country: { type: "string", description: "Country name, e.g. 'Japan', 'Brazil', 'Germany'" },
      },
      required: ["country"],
    },
  },
  {
    name: "github_search",
    description: "Search GitHub for repositories, users, or trending projects. Use when user asks about open source code, GitHub projects, or wants to find libraries/tools.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query, e.g. 'react animation library', 'python web scraper'" },
        type: { type: "string", description: "What to search: 'repos' for repositories, 'users' for developers. Default: repos" },
      },
      required: ["query"],
    },
  },
  {
    name: "rhyme_word",
    description: "Find rhymes, synonyms, related words, words that sound like, or words that mean something similar. Great for poetry, songwriting, or creative writing. Use when user wants rhymes or word associations.",
    input_schema: {
      type: "object" as const,
      properties: {
        word: { type: "string", description: "The word to find rhymes or related words for" },
        type: { type: "string", description: "Type: 'rhyme' for rhyming words, 'synonym' for similar meaning, 'related' for related concepts, 'soundslike' for phonetic matches. Default: rhyme" },
      },
      required: ["word"],
    },
  },
  {
    name: "nutrition_info",
    description: "Look up nutritional information for any food: calories, protein, carbs, fat, fiber, vitamins. Use when user asks about nutrition, calories, macros, or wants to know what's in a food.",
    input_schema: {
      type: "object" as const,
      properties: {
        food: { type: "string", description: "Food item to look up, e.g. 'apple', 'chicken breast', 'pizza'" },
      },
      required: ["food"],
    },
  },
  {
    name: "nasa_apod",
    description: "Get NASA's Astronomy Picture of the Day with title, explanation, and image. Use when user asks about space, astronomy, NASA, or wants something awe-inspiring.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format (optional — defaults to today)" },
      },
      required: [],
    },
  },
  {
    name: "random_joke",
    description: "Get a joke by category. Use spontaneously to be funny or when user asks for a joke.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", description: "Joke category: 'programming', 'misc', 'dark', 'pun', 'spooky', 'christmas'. Default: misc" },
      },
      required: [],
    },
  },
  {
    name: "trivia",
    description: "Get trivia/quiz questions on any topic. Use when user wants to play a quiz, test their knowledge, or asks for trivia questions.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", description: "Category: 'general', 'science', 'history', 'geography', 'sports', 'music', 'film', 'computers', 'math'. Default: general" },
        difficulty: { type: "string", description: "Difficulty: 'easy', 'medium', 'hard'. Default: medium" },
        amount: { type: "string", description: "Number of questions (1-10). Default: 3" },
      },
      required: [],
    },
  },
  {
    name: "ip_lookup",
    description: "Look up geolocation and ISP info for any IP address. Use when user wants to know where an IP is from, check an IP, or investigate a suspicious address.",
    input_schema: {
      type: "object" as const,
      properties: {
        ip: { type: "string", description: "IP address to look up, e.g. '8.8.8.8'. Leave empty to look up the user's own IP." },
      },
      required: [],
    },
  },
  {
    name: "color_info",
    description: "Get information about a color: hex code, RGB, HSL, name, complementary colors, and color schemes. Use when user asks about colors, needs a color palette, or wants color codes.",
    input_schema: {
      type: "object" as const,
      properties: {
        color: { type: "string", description: "Color as hex (e.g. 'ff5733'), RGB (e.g. '255,87,51'), or name (e.g. 'coral', 'midnight blue')" },
      },
      required: ["color"],
    },
  },

  // ── Cloudflare Workers AI ─────────────────────────────────────────────────
  {
    name: "cf_transcribe",
    description: "Transcribe audio or video to text using Cloudflare's Whisper AI. Use when user uploads audio, wants to transcribe a voice memo, meeting recording, or any audio file. Accepts a public URL to the audio file.",
    input_schema: {
      type: "object" as const,
      properties: {
        audio_url: { type: "string", description: "Public URL to the audio file (mp3, wav, m4a, ogg, etc.)" },
      },
      required: ["audio_url"],
    },
  },
  {
    name: "cf_summarize",
    description: "Summarize any long text, article, document, or pasted content using Cloudflare AI. Use when user pastes a wall of text, article, email thread, or asks to summarize something.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "The text content to summarize" },
        style: { type: "string", description: "Summary style: 'bullets' for key points, 'paragraph' for prose, 'tldr' for one sentence. Default: bullets" },
      },
      required: ["text"],
    },
  },
  {
    name: "cf_image_gen",
    description: "Generate an image using Cloudflare's Stable Diffusion XL. Use as a fast free alternative to fal.ai for image generation when user asks to create, draw, generate, or visualize anything.",
    input_schema: {
      type: "object" as const,
      properties: {
        prompt: { type: "string", description: "Detailed description of the image to generate including style, mood, lighting" },
        negative_prompt: { type: "string", description: "Things to exclude from the image (optional)" },
      },
      required: ["prompt"],
    },
  },

  // ── Publishing suite ─────────────────────────────────────────────────
  {
    name: "make_document",
    description: "Create a professional, print-ready document: textbook, workbook, report, manual, newsletter, proposal, novel, children's book, or recipe book. Generates full content with AI, produces a PDF, and can email or upload to Google Drive. Use immediately when the user asks to write, create, or publish any kind of professional document, book, or guide — do NOT ask for clarification, invent or infer the topic from context.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: { type: "string", description: "The subject or title of the document — infer from context or invent if not stated" },
        template: { type: "string", description: "Document type: textbook, workbook, report, manual, newsletter, proposal, novel, children, recipe. Default: report" },
        notes: { type: "string", description: "User's own words, notes, or content to incorporate (optional)" },
        sections: { type: "string", description: "Number of sections/chapters (1–12). Default: 5" },
        author: { type: "string", description: "Author name to put on the document. Default: the user's name or 'Lyra AI'" },
        deliver: { type: "string", description: "Delivery method after PDF creation: 'download' (default), 'email:user@example.com', 'gdrive'" },
      },
      required: [],
    },
  },

  // ── Autonomous browser ───────────────────────────────────────────────────
  {
    name: "browse_web",
    description: "Autonomously browse any website — click, fill forms, search, log in, scrape data, navigate pages. Runs entirely on the server, no setup needed. Use for: researching a site, filling out a form, checking prices, reading an article, signing up for something, or any multi-step web task.",
    input_schema: {
      type: "object" as const,
      properties: {
        url:  { type: "string", description: "Full URL to open, e.g. https://google.com" },
        task: { type: "string", description: "What to accomplish, e.g. 'Search for the latest iPhone price and return the result'" },
      },
      required: ["url", "task"],
    },
  },
  {
    name: "game_walkthrough",
    description: "Open a game in a real browser, play through it, and generate a step-by-step walkthrough with screenshots. Works with Godot web games and any browser-based game. Use when asked to play, guide through, or explain how to beat a game.",
    input_schema: {
      type: "object" as const,
      properties: {
        gameUrl:  { type: "string", description: "Full URL of the game to play" },
        gameName: { type: "string", description: "Name of the game" },
      },
      required: ["gameUrl", "gameName"],
    },
  },

  // ── Computer control ─────────────────────────────────────────────────────
  {
    name: "computer_use",
    description: "Control the user's computer — move the mouse, click, type, open apps, browse websites, fill forms, and do anything a human could do on screen. User must have the Lyra Desktop Agent running. Use this when asked to do something on their computer, open an app, automate a task, or control their screen.",
    input_schema: {
      type: "object" as const,
      properties: {
        task: { type: "string", description: "Clear description of what to do on the computer, e.g. 'Open Chrome and go to gmail.com, then draft an email to john@example.com saying hello'" },
      },
      required: ["task"],
    },
  },

  // ── Cloudflare (admin only) ───────────────────────────────────────────────
  {
    name: "cloudflare",
    description: "Manage Cloudflare security for aitaskflo.com. Admin only. The 'action' parameter MUST be one of these exact strings: 'analytics' (traffic/threat stats), 'security_level' (get or set security level), 'firewall_rules' (list rules), 'purge_cache' (clear cache), 'zone_settings' (get config), 'blocked_ips' (list blocked IPs), 'block_ip' (block an IP), 'unblock_ip' (remove block). Always use these exact action names.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: { type: "string", description: "Action to perform: analytics, security_level, firewall_rules, purge_cache, zone_settings, blocked_ips, block_ip, unblock_ip" },
        ip: { type: "string", description: "IP address (required for block_ip and unblock_ip)" },
        level: { type: "string", description: "Security level for security_level action: off, essentially_off, low, medium, high, under_attack" },
      },
      required: ["action"],
    },
  },
];

export function pollinationsUrl(prompt: string): string {
  const token = process.env.POLLINATIONS_TOKEN ? `&key=${process.env.POLLINATIONS_TOKEN}` : "";
  const seed = Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}${token}`;
}

// ── Real tool implementations ────────────────────────────────────────────────

export async function toolSendEmail(to: string, subject: string, body: string): Promise<string> {
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

export async function toolGetWeather(location: string): Promise<string> {
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

export async function toolSearchWeb(query: string): Promise<string> {
  // Try Google Custom Search first
  const googleKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleCx = process.env.GOOGLE_SEARCH_CX;
  if (googleKey && googleCx) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(googleCx)}&q=${encodeURIComponent(query)}&num=5`,
        { signal: AbortSignal.timeout(10_000) }
      );
      if (res.ok) {
        const data = await res.json();
        const items = (data.items ?? []) as Array<{ title: string; snippet: string; link: string }>;
        if (items.length > 0) {
          return items
            .map((r) => `**${r.title}**\n${r.snippet}\n${r.link}`)
            .join("\n\n");
        }
      }
    } catch { /* fall through to Brave */ }
  }

  // Try Brave Search if key is configured
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

export async function toolReadUrl(url: string): Promise<string> {
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

export function toolGetDatetime(timezone = "UTC"): string {
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

export function toolCalculate(expression: string): string {
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

export async function toolTranslate(text: string, to: string, from = "auto"): Promise<string> {
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

export async function toolGetNews(topic?: string, category?: string, sentimentFilter?: string): Promise<string> {
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

export interface MoonData {
  phase: string;
  emoji: string;
  illumination: number;
  ageDays: number;
  nextFullMoon: string;
  nextNewMoon: string;
}

export function getMoonPhaseData(): MoonData {
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

export function toolMoonPhase(): string {
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
export function getLunarPersonalityNote(): string {
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

export async function toolSunTimes(location: string): Promise<string> {
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

export function toolWorldClock(timezones?: string): string {
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

export async function toolUserLocation(clientIp?: string): Promise<string> {
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

export async function toolGodotBuilder(
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

// ── Stock prices (Yahoo Finance, no key) ─────────────────────────────────────

export async function toolStockPrice(symbols: string): Promise<string> {
  const tickers = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 6);
  const results: string[] = [];

  for (const symbol of tickers) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
        { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8_000) }
      );
      if (!res.ok) { results.push(`${symbol}: not found`); continue; }
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) { results.push(`${symbol}: no data`); continue; }

      const price = meta.regularMarketPrice ?? meta.previousClose;
      const prev = meta.previousClose ?? meta.chartPreviousClose;
      const change = price && prev ? price - prev : null;
      const changePct = change && prev ? ((change / prev) * 100) : null;
      const currency = meta.currency ?? "USD";
      const name = meta.shortName ?? meta.longName ?? symbol;
      const arrow = change === null ? "" : change >= 0 ? "▲" : "▼";
      const sign = change === null ? "" : change >= 0 ? "+" : "";

      results.push(
        `**${symbol}** — ${name}\n` +
        `Price: ${currency} ${price?.toFixed(2) ?? "N/A"}  ${arrow} ${sign}${change?.toFixed(2) ?? ""} (${sign}${changePct?.toFixed(2) ?? ""}%)\n` +
        `Volume: ${meta.regularMarketVolume?.toLocaleString() ?? "N/A"}  |  Market: ${meta.exchangeName ?? ""}`
      );
    } catch {
      results.push(`${symbol}: lookup failed`);
    }
  }

  return results.join("\n\n") || "No data returned.";
}

// ── Currency conversion (open.er-api.com, free) ───────────────────────────────

export async function toolCurrencyConvert(amount: string, from: string, to: string): Promise<string> {
  const amt = parseFloat(amount);
  if (isNaN(amt)) return `Invalid amount: ${amount}`;
  const fromCode = from.trim().toUpperCase();
  const toCodes = to.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean).slice(0, 8);

  try {
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${fromCode}`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) return "Exchange rate service unavailable — try again.";
    const data = await res.json();
    if (data.result !== "success") return `Could not get rates for ${fromCode}.`;

    const rates = data.rates as Record<string, number>;
    const updated = data.time_last_update_utc ?? "";

    const lines = toCodes.map((code) => {
      const rate = rates[code];
      if (!rate) return `  ${code}: not available`;
      const converted = (amt * rate).toFixed(2);
      return `  **${amt} ${fromCode}** = **${converted} ${code}**  (rate: ${rate.toFixed(4)})`;
    });

    return `💱 Currency Conversion\n\n${lines.join("\n")}\n\n_Rates updated: ${updated}_`;
  } catch {
    return "Currency conversion failed — try again.";
  }
}

// ── SMS via Twilio ────────────────────────────────────────────────────────────

export async function toolSendSms(to: string, message: string): Promise<string> {
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!sid || !auth || !from) {
    return "SMS not configured — add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM to .env.local.";
  }

  try {
    const body = new URLSearchParams({ To: to, From: from, Body: message });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${sid}:${auth}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(15_000),
      }
    );
    const data = await res.json();
    if (!res.ok) return `SMS failed: ${data.message ?? res.statusText}`;
    return `SMS sent to ${to}. SID: ${data.sid}`;
  } catch (e) {
    return `SMS error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ── Password generator (pure crypto) ─────────────────────────────────────────

export function toolGeneratePassword(length = 20, type = "strong", count = 3): string {
  const WORDS = ["coral","storm","drift","flame","frost","amber","cedar","ember","grove","haven",
    "marble","onyx","pearl","quartz","ridge","slate","thorn","vault","willow","zenith",
    "arrow","beacon","cipher","delta","echo","forge","glacier","harbor","iris","jungle"];

  const gen = (): string => {
    if (type === "pin") {
      return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
    }
    if (type === "hex") {
      return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    }
    if (type === "passphrase") {
      const wordCount = Math.max(3, Math.min(8, length));
      const sep = ["-", "_", ".", "+"][Math.floor(Math.random() * 4)];
      const picked = Array.from({ length: wordCount }, () => WORDS[Math.floor(Math.random() * WORDS.length)]);
      picked[Math.floor(Math.random() * wordCount)] += Math.floor(Math.random() * 99);
      return picked.join(sep);
    }
    // strong: mixed uppercase, lowercase, digits, symbols
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghjkmnpqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%^&*-+=?";
    const all = upper + lower + digits + symbols;
    const chars = Array.from({ length }, () => all[Math.floor(Math.random() * all.length)]);
    // Guarantee at least one of each type
    chars[0] = upper[Math.floor(Math.random() * upper.length)];
    chars[1] = digits[Math.floor(Math.random() * digits.length)];
    chars[2] = symbols[Math.floor(Math.random() * symbols.length)];
    return chars.sort(() => Math.random() - 0.5).join("");
  };

  const passwords = Array.from({ length: count }, gen);
  const label = type === "passphrase" ? "Passphrases" : type === "pin" ? "PINs" : type === "hex" ? "Hex tokens" : "Passwords";

  return `🔐 Generated ${label} (${type}, length ${length}):\n\n${passwords.map((p, i) => `${i + 1}. \`${p}\``).join("\n")}\n\nStore these securely — they won't be shown again.`;
}
