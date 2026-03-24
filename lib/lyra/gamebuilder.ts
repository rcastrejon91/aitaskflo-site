/**
 * lib/lyra/gamebuilder.ts
 *
 * Autonomous game builder — uses Claude in an agentic tool-use loop
 * to plan, write, and ship a complete Godot 4 game from a single concept.
 *
 * The loop runs until Claude calls "done" or hits maxTurns.
 * Each tool call writes/reads files on disk. At the end, git commit + optional HTML5 export.
 */

import Anthropic from "@anthropic-ai/sdk";
import fsp from "fs/promises";
import nodePath from "path";
import { exec as _exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(_exec);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Types ────────────────────────────────────────────────────────────────────

export interface BuildProgress {
  type: "status" | "file" | "complete" | "error";
  message: string;
  files?: string[];
  exportUrl?: string;
}

// ── Tool definitions for the builder agent ───────────────────────────────────

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
    description: "Write multiple files at once. Pass files as JSON array: [{path, content}, ...]",
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
    description: "Run a shell command inside the game directory (git init, export, etc.)",
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
    description: "Call this when the game is fully built and ready to play. List all created files.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string", description: "One paragraph summary of what was built" },
        files: { type: "string", description: "Comma-separated list of all files written" },
        play_instructions: { type: "string", description: "How to open and play the game in Godot" },
      },
      required: ["summary", "files", "play_instructions"],
    },
  },
];

// ── System prompt for the builder agent ──────────────────────────────────────

function buildSystemPrompt(concept: string, genre: string, gameDir: string): string {
  return `You are Lyra, a world-class senior game developer. Your job is to BUILD a complete, playable Godot 4.4 game from start to finish.

GAME TO BUILD:
Concept: ${concept}
Genre: ${genre}
Project directory: ${gameDir}

YOUR MISSION:
Build a COMPLETE, PLAYABLE game. Not a prototype. Not a skeleton. A real game someone can open in Godot and play.

WHAT "COMPLETE" MEANS:
✓ project.godot with all autoloads configured
✓ Player character: movement, animations, health, attack
✓ At least 2 enemy types with state machine AI (patrol/chase/attack/death)
✓ At least 1 complete level with terrain, obstacles, enemies placed
✓ UI: health bar, score, level indicator
✓ Main menu scene with Play button
✓ Game Over screen with retry
✓ Win condition or objective
✓ GameManager autoload (score, pause, scene switching)
✓ AudioManager autoload (sfx with pitch variation, music)
✓ SaveManager autoload
✓ HealthComponent.gd, HitboxComponent.gd, HurtboxComponent.gd
✓ Git initialized

PHYSICS STANDARDS (always use these):
- Jump: velocity.y = -sqrt(2 * gravity * jump_height)
- Coyote time: 0.15s grace period after ledge
- Jump buffer: 0.1s pre-land jump registration
- Acceleration/friction curves for game feel
- Screen shake on damage: camera.offset = random * strength
- Hitstop: Engine.time_scale = 0.05 for 0.08s

ENEMY AI PATTERN (always use):
enum State { IDLE, PATROL, CHASE, ATTACK, HIT, DEAD }
State machine with NavigationAgent2D for pathfinding

CODE QUALITY:
- Use @export for all designer-editable values
- Signals for all cross-system communication
- Component pattern: attach HealthComponent, HitboxComponent, HurtboxComponent as children
- Groups: add_to_group("enemies"), add_to_group("player")
- Never use global state except in autoloads
- Every function must actually work — no TODOs, no placeholders

PROCESS:
1. Use write_files to scaffold the full project at once (project.godot + autoloads + components)
2. Write the Player scene (GDScript + .tscn)
3. Write Enemy scenes (at least 2 types)
4. Write the Level scene with TileMap
5. Write UI scenes (HUD, MainMenu, GameOver)
6. Run: git init && git add -A && git commit -m "Initial game build by Lyra"
7. Call done() with summary

Use write_files for batch writes (faster). Only use write_file for focused single-file edits.
Start building NOW. Do not explain or ask questions — just build.`;
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
    const { stdout, stderr } = await execAsync(command, { cwd: gameDir, timeout: 60_000 });
    return ((stdout + "\n" + stderr).trim()).slice(0, 3000) || "Done (no output)";
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return ((err.stdout ?? "") + (err.stderr ?? "") + (err.message ?? "")).slice(0, 3000);
  }
}

// ── Execute a tool call ───────────────────────────────────────────────────────

async function executeTool(
  gameDir: string,
  name: string,
  input: Record<string, string>
): Promise<{ result: string; isDone: boolean; doneData?: Record<string, string> }> {
  switch (name) {
    case "write_file": {
      const result = await writeFile(gameDir, input.path ?? "", input.content ?? "");
      return { result, isDone: false };
    }

    case "write_files": {
      let files: Array<{ path: string; content: string }>;
      try { files = JSON.parse(input.files ?? "[]"); }
      catch { return { result: "Invalid JSON in files parameter", isDone: false }; }
      const results: string[] = [];
      for (const f of files) {
        if (!f.path || f.content === undefined) continue;
        results.push(await writeFile(gameDir, f.path, f.content));
      }
      return { result: results.join("\n"), isDone: false };
    }

    case "read_file":
      return { result: await readFile(gameDir, input.path ?? ""), isDone: false };

    case "list_files":
      return { result: await listFiles(gameDir), isDone: false };

    case "run_command":
      return { result: await runCommand(gameDir, input.command ?? ""), isDone: false };

    case "done":
      return { result: "Game build complete.", isDone: true, doneData: input };

    default:
      return { result: `Unknown tool: ${name}`, isDone: false };
  }
}

// ── Main builder ──────────────────────────────────────────────────────────────

export async function buildGame(
  concept: string,
  genre: string = "platformer",
  gameDir: string,
  onProgress: (p: BuildProgress) => void,
  maxTurns: number = 25
): Promise<{ summary: string; files: string[]; playInstructions: string }> {
  await fsp.mkdir(gameDir, { recursive: true });

  onProgress({ type: "status", message: "Lyra is planning the architecture…" });

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Build the game now. Concept: "${concept}", Genre: ${genre}. Start immediately with write_files to scaffold the full project.`,
    },
  ];

  const systemPrompt = buildSystemPrompt(concept, genre, gameDir);
  let turn = 0;
  const allFilesWritten: string[] = [];

  while (turn < maxTurns) {
    turn++;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      tools: BUILDER_TOOLS,
      messages,
    });

    // Collect tool uses and text from this response
    const toolUses: Anthropic.ToolUseBlock[] = [];
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        onProgress({ type: "status", message: block.text.trim().slice(0, 120) });
      }
      if (block.type === "tool_use") {
        toolUses.push(block);
      }
    }

    // Add assistant message to history
    messages.push({ role: "assistant", content: response.content });

    // If no tool calls, model is done talking
    if (toolUses.length === 0 || response.stop_reason === "end_turn") {
      break;
    }

    // Execute all tool calls, collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let buildDone = false;
    let doneData: Record<string, string> | undefined;

    for (const toolUse of toolUses) {
      const input = toolUse.input as Record<string, string>;

      // Show progress
      if (toolUse.name === "write_file") {
        onProgress({ type: "file", message: `Writing ${input.path}…` });
        if (input.path) allFilesWritten.push(input.path);
      } else if (toolUse.name === "write_files") {
        try {
          const files = JSON.parse(input.files ?? "[]") as Array<{ path: string }>;
          const paths = files.map(f => f.path).filter(Boolean);
          allFilesWritten.push(...paths);
          onProgress({ type: "file", message: `Writing ${paths.length} files: ${paths.slice(0, 3).join(", ")}${paths.length > 3 ? "…" : ""}` });
        } catch { /* ignore */ }
      } else if (toolUse.name === "run_command") {
        onProgress({ type: "status", message: `Running: ${input.command}` });
      } else if (toolUse.name === "done") {
        buildDone = true;
        doneData = input;
      }

      const { result } = await executeTool(gameDir, toolUse.name, input);

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    // Add tool results to history
    messages.push({ role: "user", content: toolResults });

    if (buildDone && doneData) {
      const fileList = doneData.files
        ? doneData.files.split(",").map(f => f.trim()).filter(Boolean)
        : allFilesWritten;

      onProgress({
        type: "complete",
        message: "Game build complete!",
        files: fileList,
      });

      return {
        summary: doneData.summary ?? "Game built successfully.",
        files: fileList,
        playInstructions: doneData.play_instructions ?? `Open Godot 4, import the project at ${gameDir}, then press F5 to play.`,
      };
    }
  }

  // If we hit max turns, still return what was built
  const finalList = await listFiles(gameDir);
  onProgress({ type: "complete", message: `Build finished after ${turn} turns.`, files: allFilesWritten });

  return {
    summary: `Game built after ${turn} iterations. ${allFilesWritten.length} files written.`,
    files: allFilesWritten,
    playInstructions: `Open Godot 4, import the project at ${gameDir}, then press F5 to play.\n\nFiles:\n${finalList}`,
  };
}
