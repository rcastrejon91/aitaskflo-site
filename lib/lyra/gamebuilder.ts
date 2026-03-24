/**
 * lib/lyra/gamebuilder.ts
 *
 * Autonomous game builder — multi-phase agentic loop using Claude Opus.
 * Phases: DESIGN → BUILD → POLISH → VERIFY
 * Also generates AI concept art (Pollinations) and attempts HTML5 export.
 */

import Anthropic from "@anthropic-ai/sdk";
import fsp from "fs/promises";
import nodePath from "path";
import { exec as _exec } from "child_process";
import { promisify } from "util";
import { getGenrePatterns } from "./gamedev";

const execAsync = promisify(_exec);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Types ────────────────────────────────────────────────────────────────────

export interface BuildProgress {
  type: "status" | "file" | "art" | "phase" | "complete" | "error";
  message: string;
  files?: string[];
  artUrls?: string[];
  exportUrl?: string;
}

export interface BuildResult {
  summary: string;
  files: string[];
  playInstructions: string;
  artUrls: string[];
  exportUrl?: string;
}

// ── Art generation ────────────────────────────────────────────────────────────

function pollinationsUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux&seed=${Math.floor(Math.random() * 999999)}`;
}

export function generateGameArt(concept: string, genre: string): string[] {
  const style = genre === "horror"
    ? "dark atmospheric pixel art"
    : genre === "rpg"
    ? "detailed fantasy pixel art, vibrant colors"
    : genre === "shooter"
    ? "sci-fi pixel art, neon accents, detailed"
    : genre === "racing"
    ? "colorful top-down racing game art, clean"
    : "crisp pixel art, indie game style, colorful";

  return [
    pollinationsUrl(`${concept} game title screen art, ${style}, game cover, cinematic lighting`),
    pollinationsUrl(`player character for ${concept} ${genre} game, ${style}, character sprite sheet concept, white background`),
    pollinationsUrl(`enemy creature for ${concept} ${genre} game, ${style}, menacing, game asset concept`),
    pollinationsUrl(`game level environment for ${concept}, ${genre} game, ${style}, wide shot, detailed background`),
  ];
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const BUILDER_TOOLS: Anthropic.Tool[] = [
  {
    name: "write_file",
    description: "Write a single file to the game project",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path relative to project root" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "write_files",
    description: "Write multiple files at once. Pass files as JSON array: [{\"path\":\"...\",\"content\":\"...\"}]",
    input_schema: {
      type: "object" as const,
      properties: {
        files: { type: "string", description: "JSON array of {path, content} objects" },
      },
      required: ["files"],
    },
  },
  {
    name: "read_file",
    description: "Read an existing file to check or extend it",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path relative to project root" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description: "List all files currently in the project",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "run_command",
    description: "Run a shell command inside the game directory",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "Shell command to execute" },
      },
      required: ["command"],
    },
  },
  {
    name: "done",
    description: "Call this ONLY when the game is fully complete. All scenes, scripts, UI, menus, and logic must be written.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string", description: "Paragraph describing what was built, mechanics, and features" },
        files: { type: "string", description: "Comma-separated list of all key files written" },
        play_instructions: { type: "string", description: "Step-by-step instructions to open and play in Godot 4" },
      },
      required: ["summary", "files", "play_instructions"],
    },
  },
];

// ── Phase system prompts ──────────────────────────────────────────────────────

function buildPhasePrompt(phase: "design" | "build" | "polish" | "verify", concept: string, genre: string, gameDir: string): string {
  const genrePatterns = getGenrePatterns(genre);

  const base = `You are Lyra, a world-class senior game developer building a ${genre} game.
Concept: "${concept}"
Directory: ${gameDir}

${genrePatterns}

PHYSICS STANDARDS:
- Jump velocity: -sqrt(2 * gravity * jump_height)
- Coyote time: 0.12s grace window
- Jump buffer: 0.1s pre-land registration
- Acceleration with friction curves (move_toward)
- Screen shake: camera.offset = randf_range(-s,s) per axis, decay with lerp
- Hitstop on hit: Engine.time_scale = 0.05, await 0.08s

ARCHITECTURE:
- HealthComponent.gd: signals health_changed(hp, max) + died
- HitboxComponent.gd (Area2D): deals damage on area_entered
- HurtboxComponent.gd (Area2D): receives hits, invincibility frames
- Autoloads: GameManager, AudioManager, SaveManager
- Groups: "player", "enemies", "pickups"
- Signals for ALL cross-node communication
- @export for ALL tunable values

CODE RULES:
- No placeholders, no TODOs, no pass statements where logic belongs
- Every function body must actually work
- .tscn files must be valid Godot 4 format
- project.godot must list all autoloads under [autoload] section`;

  switch (phase) {
    case "design":
      return `${base}

PHASE 1 — DESIGN
Your job: create a complete game design document and file plan.

Call write_file once to create "DESIGN.md" with:
1. Core game loop (what player does every 30 seconds)
2. Complete file list (every .gd and .tscn you will create)
3. Player stats and controls
4. Enemy types (2-3) with behavior descriptions
5. Level design for first 2 levels
6. Win/lose conditions
7. UI screens needed

Then call done() with the design summary. Keep this phase to 1-2 tool calls.`;

    case "build":
      return `${base}

PHASE 2 — BUILD
Your job: write ALL the game code. Build the complete game.

REQUIRED FILES (must write all of these):
✓ project.godot (with autoloads configured)
✓ scripts/autoloads/GameManager.gd
✓ scripts/autoloads/AudioManager.gd
✓ scripts/autoloads/SaveManager.gd
✓ scripts/components/HealthComponent.gd
✓ scripts/components/HitboxComponent.gd
✓ scripts/components/HurtboxComponent.gd
✓ scenes/entities/Player.gd + Player.tscn
✓ scenes/entities/Enemy.gd + Enemy.tscn (state machine: IDLE/PATROL/CHASE/ATTACK/HIT/DEAD)
✓ scenes/entities/Enemy2.gd + Enemy2.tscn (different behavior from Enemy)
✓ scenes/world/Level1.tscn (actual level with terrain, enemies placed, collectibles)
✓ scenes/world/Level2.tscn (harder second level)
✓ scenes/ui/HUD.gd + HUD.tscn (health bar, score, time)
✓ scenes/ui/MainMenu.gd + MainMenu.tscn (title, play button, credits)
✓ scenes/ui/GameOver.gd + GameOver.tscn (score, retry, menu buttons)
✓ scenes/ui/PauseMenu.gd + PauseMenu.tscn

USE write_files for batches of related files (faster).
Start with project.godot + autoloads, then player, then enemies, then levels, then UI.
Do not call done() until ALL files are written.`;

    case "polish":
      return `${base}

PHASE 3 — POLISH
The core game is built. Now add juice and finish touches.

First, call list_files to see what exists.
Then read key files (Player.gd, Enemy.gd) to check current state.

ADD THESE IMPROVEMENTS:
1. Screen shake on Player taking damage (camera.offset random, lerp to zero)
2. Hitstop when player hits enemy (Engine.time_scale = 0.05, restore after 0.08s)
3. Squash & stretch on player jump (scale.y = 0.7 takeoff, scale.y = 1.3 apex, back to 1.0)
4. Death particles/effect on enemy kill
5. Pickup collection animation (scale pulse, fade out)
6. Audio hooks: play_sfx() calls at jump, land, attack, hurt, death, pickup
7. Make sure main menu "Play" button actually loads Level1.tscn
8. Make sure game over "Retry" reloads scene, "Menu" goes to main menu
9. Win condition: transition to level 2 or show win screen

Read files first, then write targeted improvements. Call done() when polished.`;

    case "verify":
      return `${base}

PHASE 4 — VERIFY
Read all key scripts and check for:
1. Missing signal connections that would cause null reference errors
2. Scene paths that don't match actual file names
3. Missing @onready variables for nodes that exist in tscn
4. Autoload names in project.godot matching script class names
5. Any syntax that would prevent Godot from parsing the file

Fix any issues found. Then run: git init && git add -A && git commit -m "Complete game built by Lyra — ${concept}"

Call done() with final summary and complete file list.`;
  }
}

// ── File operations ───────────────────────────────────────────────────────────

function safePath(gameDir: string, rel: string): string {
  const resolved = nodePath.resolve(gameDir, rel);
  if (!resolved.startsWith(gameDir)) throw new Error("Path traversal blocked");
  return resolved;
}

async function writeFile(gameDir: string, path: string, content: string): Promise<string> {
  const full = safePath(gameDir, path);
  await fsp.mkdir(nodePath.dirname(full), { recursive: true });
  await fsp.writeFile(full, content, "utf-8");
  return `✓ Wrote ${path} (${content.length} chars)`;
}

async function readFile(gameDir: string, path: string): Promise<string> {
  try {
    const text = await fsp.readFile(safePath(gameDir, path), "utf-8");
    return text.slice(0, 6000);
  } catch {
    return `File not found: ${path}`;
  }
}

async function listFiles(gameDir: string): Promise<string> {
  try {
    await fsp.mkdir(gameDir, { recursive: true });
    const { stdout } = await execAsync("find . -type f | sort | head -100", { cwd: gameDir, timeout: 10_000 });
    return stdout.trim() || "No files yet.";
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function runCommand(gameDir: string, command: string): Promise<string> {
  await fsp.mkdir(gameDir, { recursive: true });
  try {
    const { stdout, stderr } = await execAsync(command, { cwd: gameDir, timeout: 90_000 });
    return ((stdout + "\n" + stderr).trim()).slice(0, 3000) || "Done (no output)";
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return ((err.stdout ?? "") + (err.stderr ?? "") + (err.message ?? "")).slice(0, 3000);
  }
}

// ── HTML5 export ──────────────────────────────────────────────────────────────

async function tryHtml5Export(gameDir: string, slug: string): Promise<string | undefined> {
  const publicDir = process.env.NEXT_PUBLIC_GAME_HOST_DIR ?? "/var/www/aitaskflo/public/games";
  const exportDir = nodePath.join(publicDir, slug);
  const exportPath = nodePath.join(exportDir, "index.html");

  try {
    await fsp.mkdir(exportDir, { recursive: true });
    // Check if Godot CLI exists
    const { stdout: godotPath } = await execAsync("which godot4 || which godot || echo ''", { timeout: 5_000 });
    const godotBin = godotPath.trim().split("\n")[0];
    if (!godotBin) return undefined;

    await execAsync(
      `${godotBin} --headless --path . --export-release "Web" "${exportPath}"`,
      { cwd: gameDir, timeout: 120_000 }
    );
    // Check export succeeded
    await fsp.access(exportPath);
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return `${baseUrl}/games/${slug}/`;
  } catch {
    return undefined;
  }
}

// ── Single-phase agentic loop ─────────────────────────────────────────────────

async function runPhase(
  phase: "design" | "build" | "polish" | "verify",
  concept: string,
  genre: string,
  gameDir: string,
  onProgress: (p: BuildProgress) => void,
  maxTurns: number,
  allFilesWritten: string[]
): Promise<{ summary?: string; files?: string[]; playInstructions?: string }> {
  const systemPrompt = buildPhasePrompt(phase, concept, genre, gameDir);

  const phaseNames = { design: "Designing game architecture", build: "Building the game", polish: "Polishing and adding juice", verify: "Verifying and committing" };
  onProgress({ type: "phase", message: phaseNames[phase] });

  const initMessages: Record<string, string> = {
    design: `Design the game now. Concept: "${concept}", Genre: ${genre}. Create DESIGN.md then call done().`,
    build: `Build the complete game now. Start with write_files for project.godot + autoloads. Write every file. Do not stop until all required files are done, then call done().`,
    polish: `Polish the game now. List files first, then read Player.gd and Enemy.gd, then add juice and fix any missing connections. Call done() when complete.`,
    verify: `Verify the game now. Read the key scripts, fix any issues, commit, then call done().`,
  };

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: initMessages[phase] },
  ];

  let turn = 0;

  while (turn < maxTurns) {
    turn++;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      tools: BUILDER_TOOLS,
      messages,
    });

    const toolUses: Anthropic.ToolUseBlock[] = [];
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        onProgress({ type: "status", message: block.text.trim().slice(0, 140) });
      }
      if (block.type === "tool_use") toolUses.push(block);
    }

    messages.push({ role: "assistant", content: response.content });

    if (toolUses.length === 0 || response.stop_reason === "end_turn") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let phaseDone = false;
    let doneData: Record<string, string> | undefined;

    for (const toolUse of toolUses) {
      const input = toolUse.input as Record<string, string>;

      if (toolUse.name === "write_file") {
        onProgress({ type: "file", message: `✍️ ${input.path}` });
        if (input.path) allFilesWritten.push(input.path);
      } else if (toolUse.name === "write_files") {
        try {
          const files = JSON.parse(input.files ?? "[]") as Array<{ path: string }>;
          const paths = files.map(f => f.path).filter(Boolean);
          allFilesWritten.push(...paths);
          onProgress({ type: "file", message: `✍️ ${paths.length} files: ${paths.slice(0, 4).join(", ")}${paths.length > 4 ? `… +${paths.length - 4}` : ""}` });
        } catch { /* ignore */ }
      } else if (toolUse.name === "run_command") {
        onProgress({ type: "status", message: `$ ${input.command}` });
      } else if (toolUse.name === "done") {
        phaseDone = true;
        doneData = input;
      }

      let result: string;
      switch (toolUse.name) {
        case "write_file":
          result = await writeFile(gameDir, input.path ?? "", input.content ?? "");
          break;
        case "write_files": {
          let files: Array<{ path: string; content: string }>;
          try { files = JSON.parse(input.files ?? "[]"); } catch { files = []; }
          const results: string[] = [];
          for (const f of files) {
            if (!f.path || f.content === undefined) continue;
            results.push(await writeFile(gameDir, f.path, f.content));
          }
          result = results.join("\n");
          break;
        }
        case "read_file":
          result = await readFile(gameDir, input.path ?? "");
          break;
        case "list_files":
          result = await listFiles(gameDir);
          break;
        case "run_command":
          result = await runCommand(gameDir, input.command ?? "");
          break;
        case "done":
          result = "Phase complete.";
          break;
        default:
          result = `Unknown tool: ${toolUse.name}`;
      }

      toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
    }

    messages.push({ role: "user", content: toolResults });

    if (phaseDone && doneData) {
      return {
        summary: doneData.summary,
        files: doneData.files?.split(",").map(f => f.trim()).filter(Boolean),
        playInstructions: doneData.play_instructions,
      };
    }
  }

  return {};
}

// ── Main builder ──────────────────────────────────────────────────────────────

export async function buildGame(
  concept: string,
  genre: string = "platformer",
  gameDir: string,
  onProgress: (p: BuildProgress) => void,
  maxTurns: number = 30
): Promise<BuildResult> {
  await fsp.mkdir(gameDir, { recursive: true });

  // Generate concept art (non-blocking — fire and forget until needed)
  onProgress({ type: "status", message: "Generating concept art…" });
  const artUrls = generateGameArt(concept, genre);
  onProgress({ type: "art", message: "Concept art ready", artUrls });

  const allFilesWritten: string[] = [];

  // Phase 1: Design (fast — just creates DESIGN.md)
  await runPhase("design", concept, genre, gameDir, onProgress, 4, allFilesWritten);

  // Phase 2: Build (the main event — writes all code)
  const buildResult = await runPhase("build", concept, genre, gameDir, onProgress, Math.floor(maxTurns * 0.6), allFilesWritten);

  // Phase 3: Polish (add juice, fix connections)
  const polishResult = await runPhase("polish", concept, genre, gameDir, onProgress, Math.floor(maxTurns * 0.25), allFilesWritten);

  // Phase 4: Verify + commit
  const verifyResult = await runPhase("verify", concept, genre, gameDir, onProgress, Math.floor(maxTurns * 0.15), allFilesWritten);

  // Attempt HTML5 export
  onProgress({ type: "status", message: "Attempting HTML5 export…" });
  const slug = nodePath.basename(gameDir);
  const exportUrl = await tryHtml5Export(gameDir, slug);
  if (exportUrl) {
    onProgress({ type: "status", message: `Game exported! Play at: ${exportUrl}` });
  }

  const finalFiles = verifyResult.files ?? polishResult.files ?? buildResult.files ?? allFilesWritten;
  const summary = verifyResult.summary ?? polishResult.summary ?? buildResult.summary ?? `Complete ${genre} game built from concept: "${concept}". ${allFilesWritten.length} files written across 4 build phases.`;
  const playInstructions = verifyResult.playInstructions ?? buildResult.playInstructions ?? `Open Godot 4, click "Import", select the folder: ${gameDir}\nThen press F5 to run. The main scene is scenes/ui/MainMenu.tscn.`;

  onProgress({ type: "complete", message: "Game complete!", files: finalFiles, artUrls, exportUrl });

  return { summary, files: finalFiles, playInstructions, artUrls, exportUrl };
}

// ── Improve existing game ─────────────────────────────────────────────────────

export async function improveGame(
  gameDir: string,
  improvement: string,
  onProgress: (p: BuildProgress) => void,
  maxTurns: number = 12
): Promise<BuildResult> {
  onProgress({ type: "phase", message: `Adding: ${improvement}` });

  const allFilesWritten: string[] = [];

  const systemPrompt = `You are Lyra, a senior game developer. You have an existing Godot 4 project and need to add a specific improvement.

Game directory: ${gameDir}
Improvement requested: "${improvement}"

RULES:
- Read existing files FIRST before modifying them
- Make targeted, surgical changes
- Don't break existing code
- Use write_file (not write_files) for modifications
- After all changes, run: git add -A && git commit -m "Lyra: ${improvement}"
- Call done() with summary of what changed`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Implement this improvement to the existing game: "${improvement}". Start by listing files, then reading the relevant ones, then make the changes.` },
  ];

  let summary = "";
  let turn = 0;

  while (turn < maxTurns) {
    turn++;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      tools: BUILDER_TOOLS,
      messages,
    });

    const toolUses: Anthropic.ToolUseBlock[] = [];
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        onProgress({ type: "status", message: block.text.trim().slice(0, 140) });
      }
      if (block.type === "tool_use") toolUses.push(block);
    }

    messages.push({ role: "assistant", content: response.content });
    if (toolUses.length === 0 || response.stop_reason === "end_turn") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let done = false;

    for (const toolUse of toolUses) {
      const input = toolUse.input as Record<string, string>;
      if (toolUse.name === "write_file") {
        onProgress({ type: "file", message: `✍️ ${input.path}` });
        if (input.path) allFilesWritten.push(input.path);
      } else if (toolUse.name === "done") {
        done = true;
        summary = input.summary ?? "";
      }

      let result: string;
      switch (toolUse.name) {
        case "write_file": result = await writeFile(gameDir, input.path ?? "", input.content ?? ""); break;
        case "write_files": {
          let files: Array<{ path: string; content: string }>;
          try { files = JSON.parse(input.files ?? "[]"); } catch { files = []; }
          const results: string[] = [];
          for (const f of files) {
            if (!f.path || f.content === undefined) continue;
            results.push(await writeFile(gameDir, f.path, f.content));
          }
          result = results.join("\n");
          break;
        }
        case "read_file": result = await readFile(gameDir, input.path ?? ""); break;
        case "list_files": result = await listFiles(gameDir); break;
        case "run_command": result = await runCommand(gameDir, input.command ?? ""); break;
        case "done": result = "Done."; break;
        default: result = `Unknown: ${toolUse.name}`;
      }

      toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
    }

    messages.push({ role: "user", content: toolResults });
    if (done) break;
  }

  return {
    summary: summary || `Added: ${improvement}`,
    files: allFilesWritten,
    playInstructions: `Open the project in Godot 4 and press F5.`,
    artUrls: [],
  };
}
