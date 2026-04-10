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
import { getGenrePatterns, get3DGenrePatterns, getBabylonPatterns, getPhaserPatterns, getThreeJsPatterns } from "./gamedev";

const execAsync = promisify(_exec);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Production wrapper ────────────────────────────────────────────────────────
// Injects loading screen, mobile controls, OG tags, and share button into any
// raw browser game index.html before publishing to /public/games/{slug}/

function wrapGameForProduction(html: string, title: string, genre: string, slug: string): string {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://aitaskflo.com";
  const gameUrl = `${baseUrl}/games/${slug}/`;
  const thumbUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(title + " " + genre + " game title screen, pixel art, vibrant")}?width=1200&height=630&nologo=true&model=flux`;

  const ogTags = `
  <meta property="og:title" content="${title.replace(/"/g, "&quot;")}" />
  <meta property="og:description" content="Play ${title.replace(/"/g, "&quot;")} — a ${genre} game built by Lyra AI. Free to play in your browser." />
  <meta property="og:image" content="${thumbUrl}" />
  <meta property="og:url" content="${gameUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title.replace(/"/g, "&quot;")}" />
  <meta name="twitter:image" content="${thumbUrl}" />
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />`;

  const loadingOverlay = `
<style>
#lyra-loader {
  position: fixed; inset: 0; z-index: 99999;
  background: #080810;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; font-family: system-ui, sans-serif;
  transition: opacity 0.6s ease;
}
#lyra-loader.hidden { opacity: 0; pointer-events: none; }
#lyra-loader .title { color: #fff; font-size: 28px; font-weight: 700; text-align: center; }
#lyra-loader .genre { color: rgba(139,92,246,0.9); font-size: 13px; text-transform: uppercase; letter-spacing: 0.15em; }
#lyra-loader .spinner {
  width: 36px; height: 36px; border: 3px solid rgba(139,92,246,0.2);
  border-top-color: rgb(139,92,246); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
#lyra-loader .hint { color: rgba(255,255,255,0.3); font-size: 11px; margin-top: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Share button */
#lyra-share {
  position: fixed; bottom: 16px; right: 16px; z-index: 9999;
  background: rgba(139,92,246,0.85); backdrop-filter: blur(8px);
  border: 1px solid rgba(139,92,246,0.6); border-radius: 20px;
  color: #fff; font-size: 12px; font-family: system-ui, sans-serif;
  padding: 7px 14px; cursor: pointer; display: flex; align-items: center; gap: 6px;
  opacity: 0; transition: opacity 0.4s ease 1s;
  box-shadow: 0 4px 16px rgba(139,92,246,0.35);
}
#lyra-share.visible { opacity: 1; }
#lyra-share:hover { background: rgba(139,92,246,1); }

/* Mobile controls */
#lyra-controls {
  display: none; position: fixed; bottom: 0; left: 0; right: 0;
  padding: 12px 20px 20px; z-index: 9998;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
  justify-content: space-between; align-items: flex-end;
  touch-action: none; user-select: none;
}
@media (pointer: coarse) { #lyra-controls { display: flex; } }
.lyra-dpad { display: grid; grid-template-columns: repeat(3, 44px); grid-template-rows: repeat(3, 44px); gap: 3px; }
.lyra-btn {
  background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
  border-radius: 10px; color: #fff; font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background 0.1s;
}
.lyra-btn:active, .lyra-btn.pressed { background: rgba(139,92,246,0.5); }
.lyra-btn.empty { background: none; border: none; pointer-events: none; }
.lyra-actions { display: flex; flex-direction: column; gap: 8px; }
.lyra-action-btn {
  width: 54px; height: 54px; border-radius: 50%;
  background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.25);
  color: #fff; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.lyra-action-btn:active { background: rgba(139,92,246,0.5); }
</style>

<div id="lyra-loader">
  <div class="spinner"></div>
  <div class="title">${title}</div>
  <div class="genre">${genre}</div>
  <div class="hint">Built by Lyra AI · aitaskflo.com</div>
</div>

<button id="lyra-share" onclick="(function(){
  if(navigator.share){navigator.share({title:'${title.replace(/'/g, "\\'")}',url:'${gameUrl}'});}
  else{navigator.clipboard.writeText('${gameUrl}').then(function(){var b=document.getElementById('lyra-share');b.textContent='✓ Copied!';setTimeout(function(){b.innerHTML='↗ Share'},1500);});}
})()">↗ Share</button>

<div id="lyra-controls">
  <div class="lyra-dpad">
    <div class="lyra-btn empty"></div>
    <div class="lyra-btn" data-key="ArrowUp">▲</div>
    <div class="lyra-btn empty"></div>
    <div class="lyra-btn" data-key="ArrowLeft">◀</div>
    <div class="lyra-btn empty"></div>
    <div class="lyra-btn" data-key="ArrowRight">▶</div>
    <div class="lyra-btn empty"></div>
    <div class="lyra-btn" data-key="ArrowDown">▼</div>
    <div class="lyra-btn empty"></div>
  </div>
  <div class="lyra-actions">
    <div class="lyra-action-btn" data-key=" ">Jump</div>
    <div class="lyra-action-btn" data-key="z">A</div>
  </div>
</div>

<script>
(function() {
  // Hide loader when canvas appears or after 4s max
  var loader = document.getElementById('lyra-loader');
  var share = document.getElementById('lyra-share');
  function hideLoader() {
    if (loader) { loader.classList.add('hidden'); setTimeout(function(){ loader.remove(); }, 700); }
    if (share) { share.classList.add('visible'); }
  }
  var observer = new MutationObserver(function() {
    if (document.querySelector('canvas')) { hideLoader(); observer.disconnect(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(hideLoader, 4000);

  // Mobile controls — fire keyboard events
  document.querySelectorAll('[data-key]').forEach(function(btn) {
    var key = btn.getAttribute('data-key');
    var held = false;
    function fireKey(type) {
      document.dispatchEvent(new KeyboardEvent(type, { key: key, code: key === ' ' ? 'Space' : key, bubbles: true }));
      window.dispatchEvent(new KeyboardEvent(type, { key: key, code: key === ' ' ? 'Space' : key, bubbles: true }));
    }
    btn.addEventListener('touchstart', function(e) { e.preventDefault(); held = true; btn.classList.add('pressed'); fireKey('keydown'); }, { passive: false });
    btn.addEventListener('touchend', function(e) { e.preventDefault(); held = false; btn.classList.remove('pressed'); fireKey('keyup'); }, { passive: false });
  });
})();
</script>`;

  // Inject OG tags into <head> and overlay right after <body>
  let result = html;
  if (result.includes("</head>")) {
    result = result.replace("</head>", `${ogTags}\n</head>`);
  } else {
    result = ogTags + "\n" + result;
  }
  if (result.includes("<body")) {
    result = result.replace(/<body[^>]*>/, (match) => match + "\n" + loadingOverlay);
  } else {
    result = result + "\n" + loadingOverlay;
  }
  return result;
}

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

// ── Browser phase system prompts ──────────────────────────────────────────────

function buildBrowserPhasePrompt(
  phase: "design" | "build" | "polish" | "verify",
  concept: string,
  genre: string,
  engine: "phaser" | "threejs" | "babylon"
): string {
  const engineName = engine === "phaser" ? "Phaser 3" : engine === "babylon" ? "Babylon.js" : "Three.js";
  const cdnUrl = engine === "phaser"
    ? "https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"
    : engine === "babylon"
    ? "https://cdn.babylonjs.com/babylon.js"
    : "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

  const enginePatterns = engine === "phaser"
    ? getPhaserPatterns(genre)
    : engine === "babylon"
    ? getBabylonPatterns(genre)
    : getThreeJsPatterns(genre);

  const base = `You are Lyra, a world-class senior game developer building a ${genre} browser game using ${engineName}.
Concept: "${concept}"
CDN: <script src="${cdnUrl}"></script>

${enginePatterns}

CODE RULES:
- Single index.html file, all CSS and JS inline
- No external assets — generate all graphics programmatically (Canvas API, CSS shapes, or engine primitives)
- Score system clearly visible on screen
- Lives/health system
- Game Over screen with final score and restart button
- Win condition or endless play with increasing difficulty
- Smooth gameplay, responsive controls`;

  switch (phase) {
    case "design":
      return `${base}

PHASE 1 — DESIGN
Write DESIGN.md in ONE write_file call. Then call done().
No text narration — just the two tool calls.

DESIGN.md must contain:
- Core game loop (what the player does every second)
- Controls (keyboard + mouse/touch)
- Player mechanics and stats
- Enemy/obstacle types and behaviors
- Win/lose conditions
- Visual style approach (colors, shapes)`;

    case "build":
      return `${base}

PHASE 2 — BUILD
Write the COMPLETE, PLAYABLE game as index.html in ONE write_file call.
Path: index.html
The file must be self-contained: CDN script, all CSS, all JS, all game logic inline.

REQUIRED SYSTEMS:
✓ CDN script tag at top of <head>
✓ Full game loop (requestAnimationFrame or engine loop)
✓ Player movement — smooth acceleration/deceleration, NOT instant teleport velocity
✓ Enemy system — at least 2 enemy TYPES with different behaviors (not just reskins)
✓ Enemy AI state machine: IDLE → PATROL → CHASE → ATTACK (each state has distinct logic)
✓ BOSS FIGHT — required for rpg/action/platformer/shooter genres:
    - Phase 1 (100-60% HP): basic attack pattern
    - Phase 2 (60-30% HP): new attack + faster
    - Phase 3 (30-0% HP): all attacks, arena change
    - Telegraphing: 500ms warning before each attack (red glow or warning symbol)
    - Boss health bar at bottom of screen showing phase segments
✓ Score/XP tracking displayed on screen
✓ Lives/health with VISUAL health bar (not just a number)
✓ Collision detection
✓ Increasing difficulty curve — not linear, use: difficulty = 1 + Math.floor(score/500) * 0.3
✓ LEVEL DESIGN — at least 2 distinct areas/zones with different enemy configurations
✓ Game Over screen: show score, personal best, restart button
✓ Win screen or endless loop with difficulty cap
✓ Visual feedback on hits: screen shake + flash + particle burst (all three)
✓ HUD: health top-left, score top-right, minimal — only what player needs NOW
✓ Sound effects via Web Audio API (NO external files):
    const AC = new (window.AudioContext||window.webkitAudioContext)();
    function beep(freq,dur,type='square'){const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0.2,AC.currentTime);g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);o.start();o.stop(AC.currentTime+dur);}
    // jump: beep(220,0.1,'sine')  hit: beep(80,0.15,'sawtooth')  collect: beep(440,0.08,'sine')  death: beep(100,0.4,'sawtooth')
✓ Mobile touch support:
    canvas.addEventListener('touchstart',e=>{e.preventDefault();handleTouch(e.touches[0]);},{passive:false});

GAME FEEL REQUIREMENTS (non-negotiable):
- Screen shake on damage: offset canvas render position ±4px for 200ms
- Hitstop on hit: pause game loop for 50ms (enemies freeze briefly)
- Player invincibility frames: 1.5s after taking damage (flash player sprite)
- Squash/stretch on jump landing: briefly scale player 1.3x wide, 0.7x tall
- Particle burst on enemy death: 8-12 colored squares flying outward

Write the complete file, then call done().`;

    case "polish":
      return `${base}

PHASE 3 — POLISH
First call read_file with path "index.html" to see the current game.
Then rewrite it with ALL of these improvements (non-negotiable):

GAME FEEL (juiciness):
1. Screen shake on damage — offset canvas render ±4px, decay over 200ms
2. Hitstop on hit — pause gameloop 50ms, enemies briefly freeze
3. Particle burst on enemy death — 8 colored squares fly outward, fade over 400ms
4. Squash & stretch on jump — scaleX=1.3,scaleY=0.7 on land, tween back in 100ms
5. Invincibility frames — player flashes for 1.5s after hit, cannot take damage
6. Floating damage numbers — "+25 dmg" text rises and fades above enemy on hit

DIFFICULTY & PROGRESSION:
7. Difficulty ramp — every 30 seconds add one more enemy spawn, increase speed 10%
8. Power-up drops — enemies have 15% drop chance: speed boost, shield, damage boost
9. Combo multiplier — consecutive hits without being hit increase score multiplier (x1→x2→x3→x4)
10. High score persistence — localStorage.setItem('best', score) — show personal best on game over

BOSS UPGRADE (if boss exists):
11. Phase transition effect — screen flash white, brief pause, boss changes color/size
12. Boss telegraphing — red warning glow 500ms before each attack
13. Boss weak point — glowing spot, double damage when hit there

AUDIO (Web Audio API — no external files):
14. Background music loop — use oscillators for a simple repeating melody:
    function startMusic(){const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);o.type='triangle';g.gain.value=0.05;o.frequency.value=110;o.start();}
15. Dynamic audio — speed up music tempo when boss phase 3 or low health

UI/UX:
16. Pause menu — ESC to pause, dim background, Resume/Restart/Quit options
17. Tutorial overlay — first 5 seconds show control hints, then fade out
18. Death recap — game over screen shows: score, enemies killed, time survived, best run

Write the fully improved index.html. Call done() when complete.`;

    case "verify":
      return `${base}

PHASE 4 — VERIFY
Read index.html. Check for and fix:
1. Any JavaScript errors or undefined variable references
2. Missing event listener attachments
3. requestAnimationFrame or engine loop running correctly
4. All buttons (restart, menu) connected and working
5. Score and health display updating correctly
6. Mobile: add touch event support if missing
   canvas.addEventListener('touchstart', e => { e.preventDefault(); handleTouch(e.touches[0]); }, {passive:false});

Fix any issues. Write the corrected index.html.
Then call done() with final summary.`;
  }
}

// ── Phase system prompts ──────────────────────────────────────────────────────

function buildPhasePrompt(phase: "design" | "build" | "polish" | "verify", concept: string, genre: string, gameDir: string, engine: "godot2d" | "godot3d" | "phaser" | "threejs" | "babylon" = "godot2d", spriteManifest: SpriteManifest = {}): string {
  // Browser engine path
  if (engine === "phaser" || engine === "threejs" || engine === "babylon") {
    return buildBrowserPhasePrompt(phase, concept, genre, engine);
  }

  const genrePatterns = engine === "godot3d" ? get3DGenrePatterns(genre) : getGenrePatterns(genre);
  const is3D = engine === "godot3d";

  const base = `You are Lyra, a world-class senior game developer building a ${genre} game${is3D ? " (Godot 4 3D)" : " (Godot 4 2D)"}.
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

ARCHITECTURE${is3D ? " (3D)" : ""}:
- HealthComponent.gd: signals health_changed(hp, max) + died
- HitboxComponent.gd (${is3D ? "Area3D" : "Area2D"}): deals damage on area_entered
- HurtboxComponent.gd (${is3D ? "Area3D" : "Area2D"}): receives hits, invincibility frames
- Autoloads: GameManager, AudioManager, SaveManager
- Groups: "player", "enemies", "pickups"
- Signals for ALL cross-node communication
- @export for ALL tunable values

CODE RULES:
- No placeholders, no TODOs, no pass statements where logic belongs
- Every function body must actually work
- .tscn files must be valid Godot 4 format
- project.godot must list all autoloads under [autoload] section
${spriteSectionForPrompt(spriteManifest)}`;

  switch (phase) {
    case "design":
      return `${base}

PHASE 1 — DESIGN
Write DESIGN.md in ONE write_file call. Then immediately call done().
Do NOT describe the plan in text. Do NOT explain what you're about to do.
Just write the file and call done(). 2 tool calls maximum.

DESIGN.md must contain:
- Core game loop
- Complete file list (every .gd and .tscn)
- Player stats and controls
- Enemy types with behaviors
- Win/lose conditions`;

    case "build": {
      const g = genre.toLowerCase();
      const isSimulation = g.includes("sim") || g.includes("tycoon") || g.includes("life") || g.includes("management");

      const actionRequirements3D = `
REQUIRED FILES FOR 3D GAME (must write all of these):
✓ project.godot (with autoloads configured, Forward+ renderer)
✓ scripts/autoloads/GameManager.gd
✓ scripts/autoloads/AudioManager.gd
✓ scripts/autoloads/SaveManager.gd
✓ scripts/components/HealthComponent.gd
✓ scripts/components/HitboxComponent.gd (Area3D)
✓ scripts/components/HurtboxComponent.gd (Area3D)
✓ scenes/entities/Player.gd + Player.tscn (CharacterBody3D, Camera3D/SpringArm3D)
✓ scenes/entities/Enemy.gd + Enemy.tscn (CharacterBody3D, MeshInstance3D, state machine: IDLE/PATROL/CHASE/ATTACK/HIT/DEAD)
✓ scenes/entities/Enemy2.gd + Enemy2.tscn (different 3D behavior)
✓ scenes/world/Level1.tscn (3D level: GridMap or CSGBox terrain, enemies placed, lights, WorldEnvironment)
✓ scenes/world/Level2.tscn (harder second level)
✓ scenes/ui/HUD.gd + HUD.tscn (health bar, score, crosshair for 3D)
✓ scenes/ui/MainMenu.gd + MainMenu.tscn
✓ scenes/ui/GameOver.gd + GameOver.tscn
✓ scenes/ui/PauseMenu.gd + PauseMenu.tscn`;

      const simRequirements = `
SIMULATION GAME — REQUIRED SYSTEMS (write all of these):
✓ project.godot (autoloads: SimManager, AudioManager, SaveManager, BuildManager)
✓ scripts/autoloads/SimManager.gd      — world time (30x speed), relationship graph, global signals
✓ scripts/autoloads/AudioManager.gd
✓ scripts/autoloads/SaveManager.gd    — serialize/deserialize full sim state to JSON
✓ scripts/autoloads/BuildManager.gd   — grid snap (64px), ghost preview, place/rotate/sell furniture
✓ scripts/sim/NeedsComponent.gd       — 6 needs (hunger/energy/fun/social/hygiene/bladder), decay, critical signal at <20
✓ scripts/sim/ActionQueue.gd          — ActionData class, queue execute one at a time, await navigation
✓ scripts/sim/InteractableObject.gd   — affordances dict, interaction_point, can_use(), start_use(), stop_use()
✓ scripts/sim/SimCharacter.gd         — autonomous AI: check needs → find object → pathfind → use → thought bubble
✓ scenes/objects/Bed.tscn             — energy+80, hygiene mild; use_duration 480s (8hr sleep)
✓ scenes/objects/Fridge.tscn          — hunger+70; use_duration 30s
✓ scenes/objects/Toilet.tscn          — bladder+90; use_duration 20s
✓ scenes/objects/Sofa.tscn            — fun+30, energy+20; use_duration 60s; max_users 3
✓ scenes/objects/Shower.tscn          — hygiene+80; use_duration 45s
✓ scenes/objects/Computer.tscn        — fun+40; use_duration variable; career skill option
✓ scenes/world/House.tscn             — living room, bedroom, bathroom, kitchen, exterior yard; all objects placed
✓ scenes/characters/PlayerSim.tscn    — character player controls via click-to-move or direct
✓ scenes/characters/NPCSim.tscn       — fully autonomous Sim with own needs + social AI
✓ scenes/ui/NeedsHUD.gd + NeedsHUD.tscn  — 6 colored bars, mood label, money display, world clock
✓ scenes/ui/BuildMode.gd + BuildMode.tscn — furniture catalog with prices, grid ghost, B to toggle
✓ scenes/ui/RelationshipPanel.gd + RelationshipPanel.tscn — relationship bars per known Sim, tier labels
✓ scenes/ui/MainMenu.gd + MainMenu.tscn
✓ scenes/ui/PauseMenu.gd + PauseMenu.tscn

CRITICAL: SimCharacter autonomous AI loop must actually work:
  Every 2 seconds: find most critical need → find nearest free InteractableObject that satisfies it
  → NavigationAgent2D path to interaction_point → on arrival: animate + tick need + show thought bubble
  Social interaction: if social need < 30 AND another Sim within 200px → walk to them, play chat anim,
  both get +15 social, relationship score +8`;

      const actionRequirements = `
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
✓ scenes/ui/PauseMenu.gd + PauseMenu.tscn`;

      const buildRequirements = isSimulation ? simRequirements : (is3D ? actionRequirements3D : actionRequirements);
      return `${base}

PHASE 2 — BUILD
Your job: write ALL the game code. Build the complete game.

${buildRequirements}

USE write_files for batches of related files (faster).
${isSimulation
  ? "Start with project.godot + all autoloads, then NeedsComponent + ActionQueue + InteractableObject + SimCharacter, then all room objects, then House scene, then UI panels."
  : is3D
  ? "Start with project.godot + autoloads, then 3D player (CharacterBody3D), then 3D enemies (CharacterBody3D + MeshInstance3D), then 3D levels, then UI."
  : "Start with project.godot + autoloads, then player, then enemies, then levels, then UI."}
Do not call done() until ALL files are written.`;
    }

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

// ── Sprite generation pipeline ────────────────────────────────────────────────

interface SpriteSpec { name: string; prompt: string; size: number }
interface SpriteManifest { [name: string]: string } // name → res:// path

function getSpriteSpecs(concept: string, genre: string): SpriteSpec[] {
  const g = genre.toLowerCase();
  const style = `pixel art sprite, white background, clean edges, game asset, 16bit style, no text, centered`;

  const base: SpriteSpec[] = [
    { name: "player_idle",   prompt: `${concept} main character standing idle, ${style}`,          size: 128 },
    { name: "player_run",    prompt: `${concept} main character running, ${style}`,                 size: 128 },
    { name: "player_attack", prompt: `${concept} main character attacking, ${style}`,               size: 128 },
    { name: "enemy_idle",    prompt: `${concept} enemy creature standing, ${style}, menacing`,      size: 128 },
    { name: "enemy_walk",    prompt: `${concept} enemy creature walking, ${style}, menacing`,       size: 128 },
    { name: "collectible",   prompt: `${concept} collectible item glowing, ${style}, small`,        size: 64  },
  ];

  const extras: Record<string, SpriteSpec[]> = {
    platformer: [
      { name: "platform_tile", prompt: `${concept} platform tile, ${style}, tileable`,             size: 64 },
      { name: "coin",          prompt: `golden coin collectible, ${style}, shiny`,                  size: 48 },
      { name: "background",    prompt: `${concept} game background scenery, pixel art, wide shot`,  size: 512 },
    ],
    rpg: [
      { name: "npc",           prompt: `${concept} friendly NPC character, ${style}`,               size: 128 },
      { name: "boss",          prompt: `${concept} final boss monster, ${style}, large, imposing`,  size: 192 },
      { name: "chest",         prompt: `treasure chest, ${style}, wooden with gold trim`,           size: 64 },
      { name: "potion",        prompt: `health potion red bottle, ${style}, glowing`,               size: 48 },
    ],
    shooter: [
      { name: "bullet",        prompt: `laser bullet projectile, ${style}, glowing, small`,         size: 32 },
      { name: "explosion",     prompt: `explosion blast pixel art, ${style}, orange yellow`,        size: 96 },
      { name: "shield",        prompt: `energy shield bubble, ${style}, blue glow`,                 size: 64 },
    ],
    horror: [
      { name: "monster",       prompt: `${concept} horror monster creature, ${style}, terrifying`,  size: 192 },
      { name: "flashlight",    prompt: `flashlight beam light cone, pixel art, dark, white glow`,   size: 128 },
      { name: "health_item",   prompt: `first aid kit medkit, ${style}, red cross`,                 size: 64 },
    ],
    simulation: [
      { name: "character_f",   prompt: `${concept} sim character female, ${style}, casual clothes`, size: 128 },
      { name: "character_m",   prompt: `${concept} sim character male, ${style}, casual clothes`,   size: 128 },
      { name: "furniture_bed", prompt: `single bed top-down view, ${style}, cozy`,                  size: 128 },
      { name: "furniture_sofa",prompt: `sofa couch top-down view, ${style}`,                        size: 128 },
    ],
  };

  const matched = Object.entries(extras).find(([key]) => g.includes(key));
  return [...base, ...(matched?.[1] ?? [])];
}

async function downloadSprite(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(35_000) });
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    await fsp.writeFile(dest, Buffer.from(buf));
    return true;
  } catch {
    return false;
  }
}

export async function generateAndDownloadSprites(
  concept: string,
  genre: string,
  gameDir: string,
  onProgress: (p: BuildProgress) => void
): Promise<SpriteManifest> {
  const spritesDir = nodePath.join(gameDir, "assets", "sprites");
  await fsp.mkdir(spritesDir, { recursive: true });

  const specs = getSpriteSpecs(concept, genre);
  onProgress({ type: "status", message: `Generating ${specs.length} sprites…` });

  const results = await Promise.allSettled(
    specs.map(async (spec) => {
      const filename = `${spec.name}.png`;
      const dest = nodePath.join(spritesDir, filename);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(spec.prompt)}?width=${spec.size}&height=${spec.size}&nologo=true&model=flux&seed=${Math.floor(Math.random() * 999999)}`;
      const ok = await downloadSprite(url, dest);
      return { name: spec.name, filename, ok };
    })
  );

  const manifest: SpriteManifest = {};
  let downloaded = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.ok) {
      manifest[r.value.name] = `res://assets/sprites/${r.value.filename}`;
      downloaded++;
    }
  }

  onProgress({ type: "status", message: `${downloaded}/${specs.length} sprites downloaded` });
  return manifest;
}

function spriteSectionForPrompt(manifest: SpriteManifest): string {
  if (Object.keys(manifest).length === 0) return "";
  const lines = Object.entries(manifest)
    .map(([name, path]) => `  load("${path}")  # ${name}`)
    .join("\n");
  return `
AVAILABLE SPRITES — USE THESE INSTEAD OF ColorRect/placeholder shapes:
${lines}

• Use Sprite2D nodes with these textures (set texture = load("res://assets/sprites/player_idle.png"))
• For animation use AnimatedSprite2D — add each frame as separate Image from the sprite files
• Set centered = true, flip_h based on movement direction
• Scale sprites to fit gameplay (e.g. scale = Vector2(2, 2) for 64px sprites in a 128px world)
• Background sprite: use TextureRect or a Sprite2D on a CanvasLayer behind everything
`;
}

// ── HTML5 export ──────────────────────────────────────────────────────────────

function buildExportPresets(exportPath: string): string {
  return `[preset.0]

name="Web"
platform="Web"
runnable=true
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter="*.png, *.wav, *.ogg, *.ttf, *.tres, *.theme"
exclude_filter=""
export_path="${exportPath}"
encryption_include_filters=""
encryption_exclude_filters=""
encrypt_pck=false
encrypt_directory=false

[preset.0.options]

custom_template/debug=""
custom_template/release=""
variant/extensions_support=false
vram_texture_compression/for_desktop=true
vram_texture_compression/for_mobile=false
html/export_icon=true
html/custom_html_shell=""
html/head_include=""
html/canvas_resize_policy=2
html/focus_canvas_on_start=true
html/experimental_virtual_keyboard=false
progressive_web_app/enabled=false
progressive_web_app/offline_page=""
progressive_web_app/display=1
progressive_web_app/orientation=0
progressive_web_app/icon_144x144=""
progressive_web_app/icon_180x180=""
progressive_web_app/icon_512x512=""
progressive_web_app/background_color=Color(0, 0, 0, 1)
`;
}

async function tryHtml5Export(gameDir: string, slug: string): Promise<string | undefined> {
  const publicDir = process.env.NEXT_PUBLIC_GAME_HOST_DIR ?? nodePath.join(process.cwd(), "public", "games");
  const exportDir = nodePath.join(publicDir, slug);
  const exportPath = nodePath.join(exportDir, "index.html");

  try {
    await fsp.mkdir(exportDir, { recursive: true });

    // Check if Godot CLI exists
    const { stdout: godotPath } = await execAsync("which godot4 || which godot || echo ''", { timeout: 5_000 });
    const godotBin = godotPath.trim().split("\n")[0];
    if (!godotBin) return undefined;

    // Write export_presets.cfg with correct output path
    const presetsPath = nodePath.join(gameDir, "export_presets.cfg");
    await fsp.writeFile(presetsPath, buildExportPresets(exportPath), "utf-8");

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
  allFilesWritten: string[],
  engine: "godot2d" | "godot3d" | "phaser" | "threejs" | "babylon" = "godot2d",
  spriteManifest: SpriteManifest = {}
): Promise<{ summary?: string; files?: string[]; playInstructions?: string }> {
  const systemPrompt = buildPhasePrompt(phase, concept, genre, gameDir, engine, spriteManifest);

  const phaseNames = { design: "Designing game architecture", build: "Building the game", polish: "Polishing and adding juice", verify: "Verifying and committing" };
  onProgress({ type: "phase", message: phaseNames[phase] });

  const isBrowser = engine === "phaser" || engine === "threejs" || engine === "babylon";
  const initMessages: Record<string, string> = {
    design: isBrowser
      ? `Write DESIGN.md now for this browser game. ONE write_file call, then done(). No text output.`
      : `Write DESIGN.md now. Concept: "${concept}", Genre: ${genre}. ONE write_file call, then done(). No text output — just the two tool calls.`,
    build: isBrowser
      ? `Write the complete game as index.html NOW. Use write_file with path "index.html". Include ALL game logic inline — CDN script, CSS, JS, everything. No text output — straight to write_file then done().`
      : `START WRITING FILES NOW. First tool call: write_files with project.godot + all autoloads. Do not output any text — go straight to tool calls. Keep writing files until everything is done, then call done(). Every turn must have at least one write_file or write_files call.`,
    polish: isBrowser
      ? `Read index.html first, then rewrite it with improvements. No text narration — straight to tool calls.`
      : `List files, read Player.gd, then write improvements. No text narration — straight to tool calls.`,
    verify: isBrowser
      ? `Read index.html, fix any issues found, write the corrected file, then call done(). No narration — tool calls only.`
      : `Read key scripts, fix issues, run git commit, call done(). No narration — tool calls only.`,
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
      // Suppress text narration — only show actual tool calls as progress
      if (block.type === "text" && block.text.trim() && toolUses.length === 0) {
        // Only show brief status if no tool calls came with this response
        const txt = block.text.trim().slice(0, 80);
        if (txt.length > 10) onProgress({ type: "status", message: txt });
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

// ── Browser game builder (Phaser / Three.js / Babylon.js — 4-phase loop) ──────

async function buildBrowserGame(
  concept: string,
  genre: string,
  engine: "phaser" | "threejs" | "babylon",
  gameDir: string,
  onProgress: (p: BuildProgress) => void,
  maxTurns: number = 20
): Promise<BuildResult> {
  const engineName = engine === "phaser" ? "Phaser 3" : engine === "babylon" ? "Babylon.js" : "Three.js";
  const cdnUrl = engine === "phaser"
    ? "https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"
    : engine === "babylon"
    ? "https://cdn.babylonjs.com/babylon.js"
    : "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

  onProgress({ type: "phase", message: `Building ${engineName} browser game (4-phase loop)…` });

  const artUrls = generateGameArt(concept, genre);
  onProgress({ type: "art", message: "Concept art ready", artUrls });

  await fsp.mkdir(gameDir, { recursive: true });
  const allFilesWritten: string[] = [];

  // 4-phase iterative loop (same as Godot but tuned for browser games)
  await runPhase("design", concept, genre, gameDir, onProgress, 3, allFilesWritten, engine, {});
  const buildResult = await runPhase("build", concept, genre, gameDir, onProgress, Math.floor(maxTurns * 0.5), allFilesWritten, engine, {});
  const polishResult = await runPhase("polish", concept, genre, gameDir, onProgress, Math.floor(maxTurns * 0.3), allFilesWritten, engine, {});
  const verifyResult = await runPhase("verify", concept, genre, gameDir, onProgress, Math.floor(maxTurns * 0.2), allFilesWritten, engine, {});

  // Copy final index.html to public games dir
  const slug = nodePath.basename(gameDir);
  const publicDir = process.env.NEXT_PUBLIC_GAME_HOST_DIR ?? nodePath.join(process.cwd(), "public", "games");
  const exportDir = nodePath.join(publicDir, slug);
  let exportUrl: string | undefined;
  try {
    await fsp.mkdir(exportDir, { recursive: true });
    const localIndexPath = nodePath.join(gameDir, "index.html");
    const rawHtml = await fsp.readFile(localIndexPath, "utf-8");
    const title = concept.split(" ").slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const prodHtml = wrapGameForProduction(rawHtml, title, genre, slug);
    await fsp.writeFile(nodePath.join(exportDir, "index.html"), prodHtml, "utf-8");
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    exportUrl = `${baseUrl}/games/${slug}/`;
    onProgress({ type: "status", message: `Game live! Play at: ${exportUrl}` });
  } catch {
    // Public dir may not exist in dev — that's fine
  }

  const files = verifyResult.files ?? polishResult.files ?? buildResult.files ?? allFilesWritten;
  const summary = verifyResult.summary ?? polishResult.summary ?? buildResult.summary
    ?? `Complete ${genre} browser game built with ${engineName} from concept: "${concept}". Built across 4 iterative phases.`;
  const localPath = nodePath.join(gameDir, "index.html");
  const playInstructions = exportUrl
    ? `Open ${exportUrl} in your browser to play.`
    : `Open ${localPath} in your browser to play. No server required.`;

  onProgress({ type: "complete", message: "Browser game complete!", files, artUrls, exportUrl });

  return { summary, files, playInstructions, artUrls, exportUrl };
}

// ── Main builder ──────────────────────────────────────────────────────────────

export async function buildGame(
  concept: string,
  genre: string = "platformer",
  gameDir: string,
  onProgress: (p: BuildProgress) => void,
  maxTurns: number = 30,
  engine: "godot2d" | "godot3d" | "phaser" | "threejs" | "babylon" = "godot2d"
): Promise<BuildResult> {
  // Browser games (Phaser / Three.js / Babylon.js) — 4-phase iterative loop
  if (engine === "phaser" || engine === "threejs" || engine === "babylon") {
    return buildBrowserGame(concept, genre, engine, gameDir, onProgress, maxTurns);
  }

  await fsp.mkdir(gameDir, { recursive: true });

  // Generate concept art + sprites in parallel
  onProgress({ type: "status", message: "Generating concept art and sprites…" });
  const [artUrls, spriteManifest] = await Promise.all([
    Promise.resolve(generateGameArt(concept, genre)),
    generateAndDownloadSprites(concept, genre, gameDir, onProgress),
  ]);
  onProgress({ type: "art", message: "Concept art ready", artUrls });

  const allFilesWritten: string[] = [];
  // Add downloaded sprites to file list
  allFilesWritten.push(...Object.values(spriteManifest).map(p => p.replace("res://", "")));

  // Phase 1: Design (fast — just creates DESIGN.md)
  await runPhase("design", concept, genre, gameDir, onProgress, 4, allFilesWritten, engine, spriteManifest);

  // Phase 2: Build (the main event — writes all code)
  const buildResult = await runPhase("build", concept, genre, gameDir, onProgress, Math.floor(maxTurns * 0.6), allFilesWritten, engine, spriteManifest);

  // Phase 3: Polish (add juice, fix connections)
  const polishResult = await runPhase("polish", concept, genre, gameDir, onProgress, Math.floor(maxTurns * 0.25), allFilesWritten, engine, spriteManifest);

  // Phase 4: Verify + commit
  const verifyResult = await runPhase("verify", concept, genre, gameDir, onProgress, Math.floor(maxTurns * 0.15), allFilesWritten, engine, spriteManifest);

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
      // Suppress text narration — only show actual tool calls as progress
      if (block.type === "text" && block.text.trim() && toolUses.length === 0) {
        // Only show brief status if no tool calls came with this response
        const txt = block.text.trim().slice(0, 80);
        if (txt.length > 10) onProgress({ type: "status", message: txt });
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
