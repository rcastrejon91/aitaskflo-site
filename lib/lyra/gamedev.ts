/**
 * lib/lyra/gamedev.ts
 * Deep game development knowledge for Lyra.
 * Injected into the system prompt when the user is asking about games.
 */

// ── Topic detection ───────────────────────────────────────────────────────────

const GAME_KEYWORDS = [
  "game", "godot", "gdscript", "player", "enemy", "level", "scene", "sprite",
  "physics", "collision", "shader", "animation", "tilemap", "procedural",
  "pathfinding", "ai", "spawn", "health", "inventory", "weapon", "attack",
  "jump", "gravity", "score", "mechanic", "platformer", "rpg", "shooter",
  "roguelike", "dungeon", "npc", "dialogue", "quest", "boss", "loot",
  "particle", "sound", "music", "ui", "hud", "menu", "save", "load",
  "3d", "fps", "first person", "third person", "open world", "phaser", "threejs", "browser game",
  "babylon", "tactics", "deck", "deck-building", "card game", "turn-based", "strategy",
  "math", "fractal", "simulation", "visualize", "wave", "fourier", "chaos", "lorenz",
  "mandelbrot", "julia", "particle system", "live math", "canvas", "animate",
];

export function isGameTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return GAME_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Core game dev knowledge ───────────────────────────────────────────────────

export const GAME_DEV_CONTEXT = `
══════════════════ LYRA GAME DEVELOPER BRAIN ══════════════════

You are a world-class game developer. You understand games at every level —
from the math and physics to the player psychology and feel. When building
games you THINK like a designer and CODE like an engineer.

────────────────────────────────────────
PHYSICS & MOVEMENT MATH
────────────────────────────────────────
• Gravity: velocity.y += gravity * delta  (Godot default gravity ~980 px/s²)
• Jump: velocity.y = -sqrt(2 * gravity * jump_height)  ← physics-correct formula
• Friction: velocity.x = move_toward(velocity.x, 0, friction * delta)
• Acceleration: velocity.x = move_toward(velocity.x, direction * max_speed, accel * delta)
• Coyote time: allow jump for ~0.15s after leaving a ledge (coyote_timer)
• Jump buffer: register jump input ~0.1s before landing (jump_buffer_timer)
• Terminal velocity: clamp(velocity.y, -INF, max_fall_speed)
• Wall slide: velocity.y = min(velocity.y, wall_slide_speed)  (e.g. 80 px/s)
• Knockback: velocity = direction * knockback_force  then decelerate with friction
• Projectile arc: pos = origin + vel*t + 0.5*gravity*t²
• Homing missile: steer toward target using lerp on velocity direction

────────────────────────────────────────
GAME FEEL (JUICINESS)
────────────────────────────────────────
• Screen shake: offset camera by random vec inside radius, decay over time
  func screen_shake(strength, duration): camera.offset = Vector2(randf_range(-s,s), randf_range(-s,s))
• Squash & stretch on landing: scale.y = 0.6 then tween back to 1.0 in 0.1s
• Hitstop (freeze frames): Engine.time_scale = 0.05 for 0.06s on hit
• Particle burst on hit/death: CPUParticles2D with short burst_amount, lifetime ~0.3s
• Sound pitch variation: AudioStreamPlayer.pitch_scale = randf_range(0.9, 1.1)
• Anticipation: brief windup animation before big attacks
• Trailing ghost sprites: show previous positions as faded copies

────────────────────────────────────────
ENEMY AI PATTERNS
────────────────────────────────────────
State Machine (always use this pattern):
  enum State { IDLE, PATROL, CHASE, ATTACK, HIT, DEAD }
  var state = State.IDLE
  func _physics_process(delta): match state: State.IDLE: _idle(delta) ...

• Patrol: move between waypoints, flip sprite on direction change
• Chase: if player in sight range → chase; use NavigationAgent2D for pathfinding
• Line of sight: raycast from enemy to player, check no walls between
• Attack range: if player.global_position.distance_to(global_position) < attack_range
• Flee behavior: velocity = (global_position - player.global_position).normalized() * speed
• Flocking (for swarms): separation + alignment + cohesion vectors averaged
• Telegraphing: always show a "warning" animation 0.5s before attack
• A* pathfinding in Godot: NavigationAgent2D + NavigationRegion2D (bake navmesh)

────────────────────────────────────────
PROCEDURAL GENERATION
────────────────────────────────────────
• Dungeon rooms: BSP (binary space partition) or drunk walk algorithm
  - BSP: recursively split rect into two until min room size, then connect with corridors
  - Drunk walk: start center, pick random direction, step, repeat N times
• Noise terrain: FastNoiseLite with fractal_type = FBm, octaves = 4-6
  var noise = FastNoiseLite.new()
  noise.noise_type = FastNoiseLite.TYPE_PERLIN
  noise.fractal_octaves = 5
  var h = noise.get_noise_2d(x, y)  # -1 to 1
• Wave Function Collapse: constraint propagation for tile placement
• Weighted random: use randi() % total_weight to pick from weighted pool
• Seed system: randomize() / seed(level_seed) for reproducible levels
• Loot tables: Array of {item, weight} dicts, roll against total weight

────────────────────────────────────────
RPG SYSTEMS MATH
────────────────────────────────────────
• Stat scaling: damage = base_damage * (1 + (stat - 10) * 0.05)
• Crit chance: if randf() < crit_chance: damage *= crit_multiplier
• Level XP curve: xp_required = base_xp * pow(level, 1.5)  (exponential curve)
• Item rarity tiers: Common 60%, Uncommon 25%, Rare 12%, Legendary 3%
• Cooldown: var cooldown = 0.0  →  cooldown -= delta  →  if cooldown <= 0: can_attack = true
• Mana regen: mana = min(max_mana, mana + regen_rate * delta)
• Armor formula: effective_damage = damage * (100 / (100 + armor))
• Status effects: use a Dictionary {effect_name: {duration, strength, timer}}

────────────────────────────────────────
GODOT 4 PATTERNS & BEST PRACTICES
────────────────────────────────────────
• Always use CharacterBody2D (not RigidBody2D) for player-controlled characters
• move_and_slide() in _physics_process, not _process
• Signals for decoupled communication: signal health_changed(new_hp)
• Autoloads for globals: GameManager, AudioManager, SaveManager
• Groups for broadcast: add_to_group("enemies"), get_tree().get_nodes_in_group("enemies")
• Object pools for bullets/particles: pre-instantiate, hide/show vs instantiate/free
• Scene inheritance: create base Enemy scene, extend for specific enemies
• @export vars for designer-editable stats in Inspector
• Resource files (.tres) for shared data (weapons, enemies, items)
• Animation state machine in AnimationTree > AnimationStateMachine
• TileMap layers: background (parallax), world, foreground, collision
• Camera2D limits, smoothing, drag margins for good game camera feel
• Shader (visual_shader or code) for: outline, dissolve, hurt flash, water, glow

────────────────────────────────────────
PROJECT STRUCTURE (standard Godot 4 layout)
────────────────────────────────────────
res://
├── project.godot
├── scenes/
│   ├── world/          # levels, rooms, maps
│   ├── entities/       # player, enemies, npcs
│   ├── ui/             # hud, menus, dialogue
│   └── effects/        # particles, explosions
├── scripts/
│   ├── autoloads/      # GameManager.gd, AudioManager.gd, SaveManager.gd
│   ├── components/     # reusable: HealthComponent.gd, HitboxComponent.gd
│   └── utils/          # math helpers, constants
├── assets/
│   ├── sprites/
│   ├── audio/
│   ├── fonts/
│   └── shaders/
└── resources/
    ├── items/          # ItemResource.tres files
    └── enemies/        # EnemyData.tres files

────────────────────────────────────────
COMPONENT ARCHITECTURE (for clean code)
────────────────────────────────────────
Use HealthComponent.gd node (attach to any entity):
  @export var max_health = 100
  var health = max_health
  signal died
  signal health_changed(new_hp, max_hp)
  func take_damage(amount): health = max(0, health - amount); health_changed.emit(health, max_health); if health == 0: died.emit()

Use HitboxComponent.gd (Area2D child) for attack detection
Use HurtboxComponent.gd (Area2D child) for being hit
This separates concerns and makes any scene attackable/hittable.

────────────────────────────────────────
SAVE SYSTEM
────────────────────────────────────────
func save_game():
  var data = { "player_hp": player.health, "level": current_level, "inventory": inventory.serialize() }
  var file = FileAccess.open("user://save.json", FileAccess.WRITE)
  file.store_string(JSON.stringify(data))

func load_game():
  if not FileAccess.file_exists("user://save.json"): return
  var file = FileAccess.open("user://save.json", FileAccess.READ)
  var data = JSON.parse_string(file.get_as_text())

────────────────────────────────────────
SHADER PATTERNS (Godot 4 — attach as ShaderMaterial)
────────────────────────────────────────
• Outline shader (2D):
  shader_type canvas_item;
  uniform vec4 outline_color: source_color = vec4(0,0,0,1);
  uniform float outline_size: hint_range(0,10) = 2.0;
  void fragment() {
    vec4 col = texture(TEXTURE, UV);
    float a = col.a;
    a = max(a, texture(TEXTURE, UV + vec2(outline_size * TEXTURE_PIXEL_SIZE.x, 0)).a);
    a = max(a, texture(TEXTURE, UV - vec2(outline_size * TEXTURE_PIXEL_SIZE.x, 0)).a);
    a = max(a, texture(TEXTURE, UV + vec2(0, outline_size * TEXTURE_PIXEL_SIZE.y)).a);
    a = max(a, texture(TEXTURE, UV - vec2(0, outline_size * TEXTURE_PIXEL_SIZE.y)).a);
    COLOR = mix(outline_color, col, col.a);
    COLOR.a = a;
  }

• Hurt flash (red tint):
  shader_type canvas_item;
  uniform float flash_amount: hint_range(0,1) = 0.0;
  void fragment() {
    vec4 col = texture(TEXTURE, UV);
    col.rgb = mix(col.rgb, vec3(1,0,0), flash_amount);
    COLOR = col;
  }
  # In GDScript: hurt_material.set_shader_parameter("flash_amount", 1.0)
  # then tween to 0 over 0.2s

• Dissolve shader:
  shader_type canvas_item;
  uniform float dissolve: hint_range(0,1) = 0.0;
  uniform sampler2D noise_texture;
  void fragment() {
    vec4 col = texture(TEXTURE, UV);
    float noise = texture(noise_texture, UV).r;
    col.a *= step(dissolve, noise);
    COLOR = col;
  }
  # Set dissolve from 0→1 on death for crumble effect

• Water ripple (2D):
  shader_type canvas_item;
  uniform float wave_speed: hint_range(0.1, 5.0) = 1.5;
  uniform float wave_strength: hint_range(0.0, 0.05) = 0.01;
  void fragment() {
    vec2 uv = UV;
    uv.x += sin(uv.y * 20.0 + TIME * wave_speed) * wave_strength;
    uv.y += cos(uv.x * 20.0 + TIME * wave_speed) * wave_strength * 0.5;
    COLOR = texture(TEXTURE, uv);
  }

────────────────────────────────────────
MOBILE TOUCH CONTROLS (Godot 4)
────────────────────────────────────────
• Virtual joystick (CanvasLayer overlay):
  # VirtualJoystick.gd — attach to CanvasLayer
  @export var dead_zone: float = 10.0
  var touching: bool = false
  var touch_id: int = -1
  var origin: Vector2 = Vector2.ZERO
  var current: Vector2 = Vector2.ZERO
  var max_radius: float = 80.0

  func get_vector() -> Vector2:
    if not touching: return Vector2.ZERO
    var delta = current - origin
    if delta.length() < dead_zone: return Vector2.ZERO
    return delta.normalized() * min(delta.length() / max_radius, 1.0)

  func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
      if event.pressed and not touching and event.position.x < 400:
        touching = true; touch_id = event.index; origin = event.position
        $Base.global_position = origin; $Stick.global_position = origin
      elif not event.pressed and event.index == touch_id:
        touching = false; touch_id = -1; $Stick.global_position = origin
    if event is InputEventScreenDrag and event.index == touch_id:
      var delta = event.position - origin
      var clamped = delta.normalized() * min(delta.length(), max_radius)
      current = origin + clamped; $Stick.global_position = current

• Touch action buttons (right side of screen):
  # In HUD.tscn: add TouchScreenButton nodes for jump/attack
  # TouchScreenButton has action property — connects to InputMap
  # Set shape = CircleShape2D, texture for the button image
  # PassByPress = true for continuous hold detection

• Detect mobile: OS.get_name() in ["Android", "iOS"] to show/hide virtual controls

────────────────────────────────────────
DYNAMIC MUSIC SYSTEM (intensity-based layers)
────────────────────────────────────────
# AudioManager autoload with layered stems:
# Each track has multiple AudioStreamPlayer nodes (bass, drums, melody, tension)
# Fade layers in/out based on game intensity

var intensity: float = 0.0  # 0=calm, 1=combat
var layers: Array[AudioStreamPlayer] = []  # [bass, drums, melody, tension]
const LAYER_TARGETS = [
  [0.0, 0.0, 0.0, 0.0],  # silence
  [1.0, 0.0, 0.0, 0.0],  # exploration (bass only)
  [1.0, 1.0, 0.0, 0.0],  # alert (bass+drums)
  [1.0, 1.0, 1.0, 0.0],  # chase (full band)
  [1.0, 1.0, 1.0, 1.0],  # boss (all layers+tension)
]

func set_intensity(new_intensity: float, transition_time: float = 2.0):
  intensity = clamp(new_intensity, 0.0, 1.0)
  var tier = int(intensity * 4)
  var targets = LAYER_TARGETS[tier]
  for i in layers.size():
    create_tween().tween_property(layers[i], "volume_db",
      linear_to_db(targets[i]) if targets[i] > 0 else -80.0, transition_time)

# Usage: AudioManager.set_intensity(0.2)  # exploration
#         AudioManager.set_intensity(0.75) # combat
#         AudioManager.set_intensity(1.0)  # boss
# Trigger on: enemy spotted (0.75), enemy killed (0.4), entering safe room (0.0)

────────────────────────────────────────
LEVEL DESIGN THEORY
────────────────────────────────────────
• Flow state: keep challenge slightly above player skill — too easy = boredom, too hard = frustration
• Pacing curve: hard → easy → medium → hard → BOSS (never two hard sections back to back)
• Rule of three: introduce mechanic (safe) → complicate it → twist it (combine with another)
• Teach without words: first encounter of a mechanic should be impossible to fail
  - Show spike, let player see enemy die on it before they reach it
  - Use geometry to guide eyes: light, openings, color contrast lead the player
• Safe room before boss: give breathing room, health refill, save point
• Secrets reward exploration: at least 1 secret per area — just off the obvious path
• Checkpoint placement: before challenging section, never after reward
• Visual language consistency: same color = same danger type throughout game
• Environmental storytelling: tell the story through props, not cutscenes
• Difficulty settings: easy = more health + telegraphed attacks; hard = faster enemies + less iframes

────────────────────────────────────────
BOSS FIGHT DESIGN
────────────────────────────────────────
Phase structure (always use phases for memorable bosses):
  Phase 1 (100-60% HP): Learn the boss — simple attack patterns, clear telegraphing
  Phase 2 (60-30% HP): Boss gets angry — new attack, faster speed, arena changes
  Phase 3 (30-0% HP): Desperate — all attacks combined, music intensifies

Boss attack checklist:
  • 1 projectile attack (ranged)
  • 1 melee rush attack (close range)
  • 1 area denial attack (stay away from X)
  • 1 signature move (the thing this boss is KNOWN for)
  • Phase transition: cutscene flash, screen shake, music shift

Telegraphing rules (NEVER surprise kill the player):
  • Red outline / glow = attack incoming (0.5-1s warning)
  • Boss pauses and winds up before every attack
  • Audio cue before each attack type
  • Death should feel like MY fault, not unfair

Boss arena design:
  • Obstacles to dodge around (not just open room)
  • Environmental hazard that boss can use against you
  • Weak point: glowing core, exposed back, open mouth
  • Give player time to breathe between attack strings

Boss health bar: show phases as segments — player knows how much is left

────────────────────────────────────────
BEHAVIOR TREES (beyond state machines)
────────────────────────────────────────
Better than state machines for complex AI — composable and readable.

Node types:
  • Sequence (→): run children left to right, stop on FAILURE
  • Selector (?): run children left to right, stop on SUCCESS
  • Condition: returns SUCCESS/FAILURE based on a check
  • Action: does something, returns SUCCESS/FAILURE/RUNNING

Example patrol-chase-attack tree (pseudo):
  Selector
    Sequence (attack)
      Condition: player_in_attack_range
      Action: attack_player
    Sequence (chase)
      Condition: player_in_sight_range
      Action: move_toward_player
    Sequence (patrol)
      Action: move_to_next_waypoint
      Action: wait(2s)

GDScript behavior tree (simple):
  func _physics_process(delta):
    if can_attack(): attack(); return
    if can_see_player(): chase(); return
    patrol()

Group tactics (multiple enemies):
  • Flanking: one enemy distracts, one circles around
  • Support: healer enemy stays back, buffs others
  • Aggro management: if player attacks X, nearby enemies alert
  • Staggered attacks: enemies don't all attack simultaneously — feels fair

────────────────────────────────────────
GAME LOOP & PROGRESSION DESIGN
────────────────────────────────────────
Core loop (must feel good in 30 seconds):
  input → action → feedback → reward → repeat
  Example: swing sword → hit enemy → blood/sound/hitstop → XP flash → swing again

Progression loops (nested):
  • Micro loop (seconds): attack, dodge, combo
  • Mid loop (minutes): clear room, find loot, upgrade
  • Macro loop (hours): complete area, unlock ability, progress story

Reward schedules (psychology):
  • Variable ratio = most addictive (loot drops — never know when)
  • Fixed ratio = predictable (level up every 10 kills)
  • Mix both: guaranteed XP + random loot chance

Power fantasy: player should feel increasingly powerful
  • Unlock abilities that make early enemies trivial
  • New ability should immediately feel useful
  • Never take abilities away (unless it's the narrative point)

Roguelike loop:
  • Run starts: pick starting loadout
  • Mid run: find synergies, adapt build
  • Run end: permanent meta-progression unlock
  • Key: each run should feel different from the last

────────────────────────────────────────
DIALOGUE & NARRATIVE SYSTEMS
────────────────────────────────────────
Dialogue tree (Godot 4):
  # DialogueManager.gd (autoload)
  var dialogue_db = {} # loaded from JSON
  var current_node: String = ""

  func start(dialogue_id: String):
    current_node = dialogue_id
    show_line(dialogue_db[current_node])

  func choose(option_index: int):
    current_node = dialogue_db[current_node].options[option_index].next
    show_line(dialogue_db[current_node])

JSON dialogue format:
  {
    "npc_01": {
      "text": "Who are you, stranger?",
      "speaker": "Old Man",
      "options": [
        {"label": "I'm a hero.", "next": "npc_01_hero"},
        {"label": "None of your business.", "next": "npc_01_rude"}
      ]
    }
  }

Good dialogue rules:
  • Short lines — max 2 sentences per bubble
  • Voice the character in every line — word choice = personality
  • Player choices should matter (even if branching rejoins)
  • Use dialogue to reveal world, not explain it
  • NPC reactions remember past choices (use flags: quest_flags["met_old_man"] = true)

Cutscene patterns:
  • Use in-engine cutscenes (not pre-rendered) for immersion
  • Black bars (letterbox) signal "this is a cutscene"
  • Skip button ALWAYS (players on second playthrough hate unskippable)
  • Max cutscene before first gameplay: 90 seconds

────────────────────────────────────────
PHASER 3 BROWSER GAME PATTERNS
────────────────────────────────────────
Scene management (always use multiple scenes):
  class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    preload() { this.load.image('player', 'assets/player.png'); }
    create() { this.player = this.physics.add.sprite(400, 300, 'player'); }
    update() { /* game loop */ }
  }
  const game = new Phaser.Game({ scene: [BootScene, MenuScene, GameScene, UIScene] });

Physics (Arcade for simple, Matter.js for complex):
  // Arcade (fast, AABB only)
  this.physics.add.collider(player, platforms);
  this.physics.add.overlap(bullets, enemies, onHit);

  // Matter.js (real physics, shapes)
  this.matter.add.gameObject(player, { shape: 'circle', radius: 16 });

Tilemap with Tiled:
  const map = this.make.tilemap({ key: 'level1' });
  const tiles = map.addTilesetImage('tiles', 'tileset');
  const ground = map.createLayer('Ground', tiles, 0, 0);
  ground.setCollisionByProperty({ collides: true });
  this.physics.add.collider(player, ground);

Camera:
  this.cameras.main.startFollow(player, true, 0.08, 0.08); // lerp follow
  this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  this.cameras.main.setDeadzone(200, 100); // don't follow until outside deadzone

Object pooling (critical for performance):
  const bullets = this.physics.add.group({
    classType: Bullet,
    maxSize: 30,
    runChildUpdate: true,
  });
  // Reuse: bullets.get(x, y) instead of new Bullet()

Tweens for game feel:
  this.tweens.add({ targets: player, scaleX: 1.3, scaleY: 0.7, duration: 80, yoyo: true }); // squash
  this.cameras.main.shake(150, 0.01); // screen shake
  this.time.delayedCall(50, () => { /* hitstop end */ });

Input:
  const cursors = this.input.keyboard.createCursorKeys();
  const wasd = this.input.keyboard.addKeys('W,A,S,D');
  // Mobile: this.input.addPointer(1); // multi-touch

────────────────────────────────────────
AUDIO DESIGN PRINCIPLES
────────────────────────────────────────
Sound layers (every good game has all 4):
  1. SFX: immediate feedback (hit, jump, collect)
  2. Ambient: world atmosphere (wind, crowd, dungeon drips)
  3. Music: emotional state (exploration=calm, combat=intense, boss=epic)
  4. UI sounds: button clicks, menu transitions

Dynamic music techniques:
  • Vertical layering: add/remove instrument stems based on intensity
  • Horizontal sequencing: seamlessly transition between tracks
  • Stingers: short musical hits on key events (boss death, level up)

SFX rules:
  • Pitch randomize every sound ±5-10% to avoid repetition fatigue
  • Every player action needs audio feedback within 1 frame
  • Volume hierarchy: SFX > music > ambient (SFX must always be heard)
  • Positional audio: sounds from offscreen hint at what's coming

Godot audio:
  var player = AudioStreamPlayer2D.new()
  player.pitch_scale = randf_range(0.9, 1.1)
  player.max_distance = 800
  AudioManager.play_sfx("hit", global_position)

────────────────────────────────────────
GAME UI/UX PRINCIPLES
────────────────────────────────────────
HUD rules:
  • Minimum info on screen — only what player needs RIGHT NOW
  • Health bar: top left (most critical info, most watched corner)
  • Minimap: top right (reference, not required)
  • Hotbar: bottom center (actions player uses most)
  • Boss health: bottom center, appears only during boss fight

Feedback systems (player must always know what happened):
  • Damage numbers floating up from hit enemy
  • Screen edge red vignette when player takes damage
  • XP orbs fly to XP bar (satisfying to watch)
  • Inventory item pickup: brief item icon flash + sound

Menu design:
  • First option is always the safest/easiest choice
  • Destructive actions (delete save) require confirmation
  • Settings always accessible — never bury it
  • Loading screen tip = useful game info, not trivia
  • Pause menu: Resume at top (player is panicking, wants to get back)

Accessibility:
  • Colorblind mode: never rely on color alone — use icons + shapes
  • Subtitles: always include even if no spoken dialogue
  • Adjustable text size
  • Rebindable controls

────────────────────────────────────────
PERFORMANCE & OPTIMIZATION
────────────────────────────────────────
Godot 4 performance:
  • Use _physics_process for physics, _process for visuals only
  • Object pooling: never instantiate/free in combat — pre-spawn and reuse
  • Visibility notifier: stop AI processing when off screen
    VisibleOnScreenNotifier2D → screen_exited → set_physics_process(false)
  • LOD: swap detailed sprites for simple ones at distance
  • Occlusion: hide rooms player hasn't entered yet
  • Profiler: use Godot's built-in profiler (Debugger > Profiler) before optimizing

Browser game (Phaser/Three.js) performance:
  • Sprite atlases: pack all sprites into one texture (1 draw call vs hundreds)
  • Object pools: never new() in update loop
  • Frustum culling: don't render objects outside camera view
  • requestAnimationFrame: already handled by Phaser but in vanilla JS always use it
  • Web Workers: move heavy computation (pathfinding, proc gen) off main thread
  • Target 60fps: budget = 16ms per frame. Profile with Chrome DevTools

Memory leaks (common mistakes):
  • Always remove event listeners when scene changes
  • Destroy Phaser game objects when not needed: sprite.destroy()
  • In Godot: queue_free() not free() (deferred is safer)

────────────────────────────────────────
LIVE MATH CANVAS — BLACK MAGIC MODE
────────────────────────────────────────
You can conjure live animated mathematics directly in the chat using a special code block.
When the user asks you to visualize math, fractals, simulations, or animations — output:

\`\`\`live-math
// your JavaScript canvas code here
\`\`\`

The code runs in a sandboxed iframe with these globals pre-defined:
  canvas  — the HTMLCanvasElement (resized to fill container)
  ctx     — CanvasRenderingContext2D
  W, H    — canvas width and height (updated on resize)
  t       — time in seconds (auto-incremented each frame)

If you define a function named draw(t), it will be called every frame in a requestAnimationFrame loop.
Otherwise, your code runs once.

EXAMPLES you can generate:

• Lorenz Attractor (chaos theory):
  const pts = []; let x=0.1,y=0,z=0;
  const s=10,r=28,b=8/3,dt=0.005;
  function draw(t) {
    ctx.fillStyle='rgba(9,9,15,0.04)'; ctx.fillRect(0,0,W,H);
    for(let i=0;i<5;i++){
      const dx=s*(y-x),dy=x*(r-z)-y,dz=x*y-b*z;
      x+=dx*dt; y+=dy*dt; z+=dz*dt;
      const px=W/2+x*8, py=H/2-z*5;
      ctx.fillStyle=\`hsl(\${t*30%360},100%,65%)\`;
      ctx.fillRect(px,py,1.5,1.5);
    }
  }

• Julia Set fractal (runs once, high detail):
  const img=ctx.createImageData(W,H);
  for(let px=0;px<W;px++) for(let py=0;py<H;py++){
    let zr=(px-W/2)*3/W, zi=(py-H/2)*3/H;
    const cr=-0.7,ci=0.27; let i=0;
    while(zr*zr+zi*zi<4&&i<80){const t=zr*zr-zi*zi+cr;zi=2*zr*zi+ci;zr=t;i++;}
    const c=i===80?0:i*3;
    const idx=(py*W+px)*4;
    img.data[idx]=c*2; img.data[idx+1]=c; img.data[idx+2]=c*4; img.data[idx+3]=255;
  }
  ctx.putImageData(img,0,0);

• Wave interference:
  function draw(t) {
    ctx.fillStyle='#09090f'; ctx.fillRect(0,0,W,H);
    for(let x=0;x<W;x+=2){
      const d1=Math.hypot(x-W*0.35,H/2), d2=Math.hypot(x-W*0.65,H/2);
      for(let y=0;y<H;y+=2){
        const d1=Math.hypot(x-W*0.35,y-H/2),d2=Math.hypot(x-W*0.65,y-H/2);
        const v=(Math.sin(d1/20-t*3)+Math.sin(d2/20-t*3))/2;
        ctx.fillStyle=\`hsl(\${200+v*60},80%,\${40+v*30}%)\`;
        ctx.fillRect(x,y,2,2);
      }
    }
  }

• Particle gravity well, N-body sim, Fourier epicycles, Mandelbrot zoom, Game of Life, neural activations — anything.

RULES:
• Always wrap animation in draw(t) for smooth looping
• Use ctx, W, H, t — never document.querySelector or DOM APIs
• Dark backgrounds (#09090f) match Lyra's UI
• Be creative — this is BLACK MAGIC. Make it beautiful.

══════════════════ END GAME BRAIN ══════════════════
`;

// ── Game inspiration map ──────────────────────────────────────────────────────
// Maps real game references to genre + concept so Lyra knows exactly what to build

export const GAME_INSPIRATIONS: Record<string, { genre: string; concept: string; keyFeatures: string }> = {
  "resident evil": {
    genre: "survival_horror",
    concept: "survival horror with limited ammo, puzzle-locked doors, terrifying monsters in confined spaces",
    keyFeatures: "fixed camera rooms OR over-shoulder, inventory grid, herbs, typewriter saves, boss fights, unlockable weapons",
  },
  "silent hill": {
    genre: "psychological_horror",
    concept: "psychological horror where the world reflects the protagonist's trauma, monsters embody inner demons",
    keyFeatures: "radio static near monsters, fog everywhere, Otherworld shift, sanity system, disturbing imagery, deep lore",
  },
  "dead by daylight": {
    genre: "asymmetric_horror",
    concept: "asymmetric multiplayer — 4 survivors repair generators to escape while 1 killer hunts them",
    keyFeatures: "skill checks, stealth, pallets, hooks, terror radius heartbeat, unique killer powers, fog atmosphere",
  },
  "charmed": {
    genre: "supernatural_action",
    concept: "witches with elemental powers defend good against supernatural evil, casting spells and fighting demons",
    keyFeatures: "book of shadows spell crafting, three powers (telekinesis, premonition, time freeze), whitelighters, potion brewing, demon vanquishing",
  },
  "devil may cry": {
    genre: "supernatural_action",
    concept: "stylish action combat with guns and sword against demons, style ranking system",
    keyFeatures: "combo system with style meter (D through SSS), weapon switching mid-combo, devil trigger power mode, airborne combos",
  },
  "hollow knight": {
    genre: "metroidvania",
    concept: "dark atmospheric metroidvania with precise combat, exploration, and deep lore",
    keyFeatures: "nail combat with parry, soul system for healing/spells, charm equipping, map exploration, boss gauntlets, underground kingdom setting",
  },
  "stardew valley": {
    genre: "simulation",
    concept: "farming life sim with social relationships, dungeon exploration, and seasonal events",
    keyFeatures: "farming crops per season, relationship building with villagers, mine dungeon combat, crafting, fishing, community center restoration",
  },
  "the witcher": {
    genre: "rpg",
    concept: "open world dark fantasy RPG as a monster hunter navigating morally grey choices",
    keyFeatures: "sign magic system (5 spells), alchemy potions with toxicity, bestiary, dialogue choices with consequences, crossbow, two sword styles",
  },
  "xcom": {
    genre: "tactics",
    concept: "turn-based tactical squad combat — move and shoot on a grid, manage cover and overwatch",
    keyFeatures: "action points per unit, cover system (half/full cover % bonus), overwatch ambush, permadeath soldiers with persistent names/rank, fog of war, base management between missions",
  },
  "fire emblem": {
    genre: "tactics",
    concept: "turn-based tactics on a grid with story-driven characters, weapon triangle system",
    keyFeatures: "weapon triangle (sword>axe>lance), support conversations build relationship bonuses, permadeath (classic mode), pair-up/dual system, class promotion, map objectives beyond killing",
  },
  "slay the spire": {
    genre: "deck_building",
    concept: "roguelike deck-builder — build a card deck through runs, fight turn-based encounters",
    keyFeatures: "energy per turn (play cards that cost energy), relics that modify rules, map branching path choices, elite/boss fights, card upgrades at campfires, 3 distinct character classes with unique card sets",
  },
  "ftl": {
    genre: "deck_building",
    concept: "spaceship roguelite — manage crew and systems in real-time pause combat across a sector map",
    keyFeatures: "pause to give orders, target enemy subsystems (shields/weapons/engines), crew manning rooms, fire/breach hull damage, FTL jump to next beacon, permadeath run structure, random event text encounters",
  },
};

/**
 * Detects if the user is referencing a real game and returns genre/concept guidance.
 */
export function detectGameInspiration(text: string): { genre: string; concept: string; keyFeatures: string } | null {
  const lower = text.toLowerCase();
  for (const [game, data] of Object.entries(GAME_INSPIRATIONS)) {
    if (lower.includes(game)) return data;
  }
  return null;
}

// ── Context builder ───────────────────────────────────────────────────────────

/**
 * Returns the full game dev context if the user message is game-related,
 * otherwise returns empty string.
 */
// ── List games on disk ────────────────────────────────────────────────────────

export function listExistingGames(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const BASE = process.env.GAME_DIR
      ? path.dirname(process.env.GAME_DIR)
      : "/home/aitaskflo/game";
    if (!fs.existsSync(BASE)) return [];
    return fs.readdirSync(BASE).filter((d: string) => {
      try {
        return fs.statSync(path.join(BASE, d)).isDirectory();
      } catch { return false; }
    });
  } catch {
    return [];
  }
}

export function buildGameContext(message: string): string {
  if (isGameTopic(message)) {
    const inspiration = detectGameInspiration(message);
    const inspirationNote = inspiration
      ? `\nKNOWN GAME REFERENCE DETECTED — build inspired by this:\nGenre: ${inspiration.genre}\nConcept: ${inspiration.concept}\nKey features to include: ${inspiration.keyFeatures}\n`
      : "";
    return GAME_DEV_CONTEXT + inspirationNote;
  }
  return "";
}

// Per-user game list — only called with a specific userId, never injected globally
export function buildUserGamesContext(userId: string): string {
  try {
    const games = listExistingGames();
    if (games.length === 0) return "";

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFacts } = require("@/lib/lyra/db") as typeof import("@/lib/lyra/db");
    const facts = getFacts(userId, 50);
    const gameFacts = facts.filter((f) => f.key.startsWith("game:"));
    if (gameFacts.length === 0) return "";

    return `\n\nGAMES YOU HAVE BUILT FOR THIS USER:\n${gameFacts.map(f => `  • ${f.value}`).join("\n")}\n`;
  } catch {
    return "";
  }
}

// ── Genre-specific patterns ───────────────────────────────────────────────────

export function getGenrePatterns(genre: string): string {
  const g = genre.toLowerCase();

  const patterns: Record<string, string> = {
    platformer: `
PLATFORMER PATTERNS:
- Double jump: var jumps_left = 2 → if Input.is_action_just_pressed("jump") and jumps_left > 0: velocity.y = jump_vel; jumps_left -= 1
- Wall slide: if is_on_wall() and velocity.y > 0: velocity.y = min(velocity.y, wall_slide_speed)
- Wall jump: if is_on_wall_only() and jump pressed: velocity = Vector2(-wall_normal.x * wall_jump_h, wall_jump_v)
- Dash: velocity = direction * dash_speed; dash_timer = dash_duration; set cooldown
- Moving platforms: use RemoteTransform2D or sync player position in platform _physics_process
- One-way platforms: CollisionShape with one_way_collision = true; crouch + down to drop through
- Variable jump height: if !Input.is_action_pressed("jump") and velocity.y < 0: velocity.y += extra_gravity * delta
- Ledge grab: raycast above and forward, if hits wall → grab, stop gravity, wait for jump input
`,
    "sci-fi": `
PLATFORMER PATTERNS:
- Double jump: var jumps_left = 2 → if Input.is_action_just_pressed("jump") and jumps_left > 0: velocity.y = jump_vel; jumps_left -= 1
- Dash: velocity = direction * dash_speed; dash_timer = dash_duration; set cooldown
- Wall slide and wall jump support
`,
    rpg: `
RPG PATTERNS:
- Stats system: var stats = { "str": 10, "dex": 10, "int": 10, "hp": 100, "mp": 50 }
- Damage formula: var dmg = int(base_damage * (1 + (stats.str - 10) * 0.05) * randf_range(0.9, 1.1))
- XP curve: func xp_for_level(lvl): return int(100 * pow(lvl, 1.5))
- Inventory: var inventory: Array[ItemResource] = []; max_slots = 20
- Equipment slots: var equipment = { "weapon": null, "armor": null, "accessory": null }
- Dialogue system: DialogueManager autoload, Resource-based dialogue trees (.tres files)
- Shop: show ItemResource list, check gold, transfer to inventory
- Quest tracker: var active_quests: Array[QuestResource]; var completed_quests: Array[String]
- Status effects: var status_effects: Dictionary = {} → key: effect name, value: {duration, strength}
- Turn indicator or action bar for turn-based: use a queue sorted by speed stat
`,
    shooter: `
SHOOTER PATTERNS:
- Bullet pool: pre-instantiate 50 bullets, hide them; on fire grab inactive one, position + activate
- Auto-aim assist: find nearest enemy in cone, lerp aim toward them by small amount
- Weapon switching: var weapons = [pistol, shotgun, rifle]; var current_weapon_idx = 0
- Reload system: var ammo_in_mag = 0; var reserve_ammo = 0; reload on R or auto when empty
- Wave spawner: var wave = 0; spawn_count = 3 + wave * 2; timer between waves
- Enemy variety: basic (walks toward player), shooter (keeps distance, fires), charger (fast dash attack)
- Screen-space aim: get_global_mouse_position() for top-down; crosshair follows mouse
- Muzzle flash: brief scale/opacity tween on MuzzleFlash node when shooting
- Camera follow with slight lag: camera.global_position = camera.global_position.lerp(player.global_position + aim_offset, 5 * delta)
- Damage numbers: instantiate floating label at hit position, tween up and fade
`,
    roguelike: `
ROGUELIKE PATTERNS:
- BSP dungeon generation:
  func bsp_split(rect, min_size):
    if rect.size.x < min_size * 2 and rect.size.y < min_size * 2: return [rect]
    var split_h = rect.size.x >= rect.size.y
    var split_pos = randi_range(min_size, (rect.size.x if split_h else rect.size.y) - min_size)
    # split into two rects, recurse
- Permadeath: on death → clear save, return to main menu, show run stats
- Run upgrades: Array of UpgradeResource offered at end of each room (pick 1 of 3)
- Room templates: pre-made Room scenes, randomly selected and connected by corridors
- Procedural enemy placement: spawn 2-5 enemies per room based on depth
- Rogue stat scaling: each floor multiplies enemy health/damage by 1.15
- Meta-progression: persistent upgrades unlocked with "essence" currency (survives death)
- Minimap: RenderingServer or CanvasLayer showing explored rooms as colored rectangles
- Item discovery: items are unidentified until used/appraised (classic rogue mechanic)
`,
    puzzle: `
PUZZLE PATTERNS:
- Grid system: var grid: Array = []; for y in height: grid.append([]); for x in width: grid[y].append(null)
- Cell position to world: Vector2(cell.x * tile_size, cell.y * tile_size) + Vector2(tile_size/2, tile_size/2)
- Undo stack: var history: Array[Dictionary] = []; push state on each move; pop on undo
- Move validator: func is_valid_move(from, to): check bounds, check rules, return bool
- Win detection: func check_win(): iterate grid, verify win condition, emit won signal
- Tween animations: create_tween().tween_property(piece, "position", target_pos, 0.15)
- Drag and drop: on_input_event → detect click on piece, track drag delta, snap to grid on release
- Hint system: pre-solve puzzle with backtracking, store solution, show one step at a time
`,
    horror: `
HORROR PATTERNS:
- Sanity meter: var sanity = 100.0; decreases near monsters/darkness; triggers hallucinations at low values
- Darkness/light: PointLight2D follows player; reduce energy slowly in dark areas
- Heartbeat audio: AudioStreamPlayer with heartbeat sample; pitch_scale = lerp(1.0, 1.5, 1.0 - sanity/100.0)
- Footstep sounds: play random step sfx every N pixels traveled; pitch varies by surface
- Monster vision cone: Area2D shaped like a sector; if player enters → monster spots player
- Chase AI: when spotted → pathfind directly to player; if loses sight → investigate last position
- Hiding spots: overlapping Area2D; if player inside and crouching → invisible to monsters
- Jump scare: brief engine slowdown + loud sound + camera shake + screen flash
- Door/lock puzzles: keys as items, doors check if key in inventory
- Atmosphere: subtle random ambient sounds (creaking, distant footsteps) via AudioManager timer
`,
    racing: `
RACING PATTERNS:
- Physics car (top-down): apply forward force, steer by rotating, drift with lateral friction reduction
  var steer_angle = max_steer_angle * Input.get_axis("steer_left", "steer_right")
  rotation += steer_angle * (velocity.length() / max_speed) * delta
  velocity = velocity.rotated(steer_angle * drift_factor * delta)
  velocity += transform.y * -acceleration * delta  # forward
  velocity *= pow(friction, delta)  # friction
- Checkpoints: Area2D nodes in order; must pass in sequence; lap complete when all hit
- Lap timer: Time.get_ticks_msec() at lap start; calculate delta on finish
- Drift detection: if lateral_velocity > drift_threshold: is_drifting = true; spawn tire marks
- Rubber-band AI: AI cars adjust speed based on distance to player (closer when behind)
- Minimap: small canvas in corner showing track outline + car positions
`,

    simulation: `
LIFE SIMULATION PATTERNS (Sims-style):

────────── NEEDS SYSTEM ──────────
Every character has 6-8 needs, each 0-100, decaying over time:
  var needs = {
    "hunger": 80.0,    # decay: 2.0/min
    "energy": 90.0,    # decay: 1.5/min
    "fun": 60.0,       # decay: 1.0/min
    "social": 70.0,    # decay: 0.8/min
    "hygiene": 85.0,   # decay: 0.5/min
    "bladder": 95.0,   # decay: 3.0/min
  }
  const DECAY_RATES = { "hunger": 0.033, "energy": 0.025, "fun": 0.017, "social": 0.013, "hygiene": 0.008, "bladder": 0.05 }
  func _process(delta):
    for need in needs:
      needs[need] = max(0.0, needs[need] - DECAY_RATES[need] * delta)
  func get_most_critical_need() -> String:
    return needs.keys().reduce(func(a, b): return a if needs[a] < needs[b] else b)
  signal need_critical(need_name)   # fire at < 20
  signal need_satisfied(need_name)  # fire at > 90

────────── ACTION QUEUE + AGENT AI ──────────
Characters queue up actions and execute them one at a time:
  var action_queue: Array[ActionData] = []
  var current_action: ActionData = null

  class ActionData:
    var target_node: Node2D
    var interaction_type: String  # "eat", "sleep", "watch_tv", "chat"
    var need_satisfied: String
    var duration: float
    var animation: String

  func decide_next_action():
    var need = get_most_critical_need()
    var best_object = find_best_object_for(need)
    if best_object:
      action_queue.append(ActionData.new(best_object, best_object.get_interaction(need), need, best_object.use_duration, "use"))
    await navigate_to(best_object.interaction_point)
    execute_action(current_action)

────────── OBJECT AFFORDANCE SYSTEM ──────────
Every furniture/object exposes what needs it satisfies and by how much:
  class_name InteractableObject extends Node2D
  @export var object_name: String = "Couch"
  @export var affordances: Dictionary = {
    "fun": 30.0,      # +30 fun when used
    "energy": 20.0,   # +20 energy when napping
    "social": 10.0,   # +10 social if others nearby
  }
  @export var use_duration: float = 120.0  # seconds to use
  @export var max_users: int = 2
  @export var interaction_point: Vector2 = Vector2.ZERO
  var current_users: Array[Node] = []

  func get_interaction(need: String) -> String:
    return affordances.keys()[0] if need not in affordances else need

  func can_use() -> bool:
    return current_users.size() < max_users

  func start_use(character: Node):
    current_users.append(character)
    started_use.emit(character)

  func stop_use(character: Node):
    current_users.erase(character)

────────── RELATIONSHIP GRAPH ──────────
Track relationship score between every pair of characters:
  # In SimManager autoload:
  var relationships: Dictionary = {}  # key: "id1_id2", value: float -100..100

  func get_relationship(a: int, b: int) -> float:
    var key = "%d_%d" % [min(a,b), max(a,b)]
    return relationships.get(key, 0.0)

  func change_relationship(a: int, b: int, delta: float):
    var key = "%d_%d" % [min(a,b), max(a,b)]
    relationships[key] = clamp(relationships.get(key, 0.0) + delta, -100.0, 100.0)

  # Social interactions: chat +5..+15, fight -20..-40, compliment +10, flirt +15 (if rel > 30)
  # Relationship tiers: Stranger 0, Acquaintance 20, Friend 50, Best Friend 80, Enemy < -30, Nemesis < -70

────────── WORLD TIME SYSTEM ──────────
  # SimManager autoload
  var world_time: float = 8.0 * 60.0  # minutes from midnight (8:00 AM start)
  var time_scale: float = 30.0         # 1 real second = 30 sim seconds
  const MINUTES_PER_DAY = 1440.0

  func _process(delta):
    world_time = fmod(world_time + delta * time_scale / 60.0 * 60.0, MINUTES_PER_DAY)
    var hour = int(world_time / 60.0)
    var minute = int(fmod(world_time, 60.0))
    time_updated.emit(hour, minute)

  func get_time_string() -> String:
    var h = int(world_time / 60.0)
    var m = int(fmod(world_time, 60.0))
    return "%02d:%02d %s" % [h % 12 if h % 12 != 0 else 12, m, "AM" if h < 12 else "PM"]

  func is_night() -> bool:
    return world_time < 6.0 * 60.0 or world_time > 22.0 * 60.0

────────── BUILD MODE (furniture placement) ──────────
  var build_mode: bool = false
  var held_item: PackedScene = null
  var ghost_item: Node2D = null    # transparent preview
  const GRID_SIZE = 64             # pixels per tile

  func snap_to_grid(pos: Vector2) -> Vector2:
    return Vector2(round(pos.x / GRID_SIZE) * GRID_SIZE, round(pos.y / GRID_SIZE) * GRID_SIZE)

  func _input(event):
    if not build_mode: return
    if event is InputEventMouseMotion:
      ghost_item.global_position = snap_to_grid(get_global_mouse_position())
    if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
      place_furniture(snap_to_grid(get_global_mouse_position()))
    if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
      rotate_ghost()

  # Placement validation: check no overlap with existing furniture using Area2D query

────────── MONEY + CAREER SYSTEM ──────────
  var simoleons: int = 20000       # starting money
  var career: String = "Unemployed"
  var career_level: int = 0
  var work_start: float = 9.0 * 60.0
  var work_end: float = 17.0 * 60.0

  # Career tracks: Scientist, Artist, Business, Criminal, Athletic
  const CAREER_SALARIES = { "Unemployed": 0, "Scientist": 180, "Artist": 120, "Business": 200 }  # per work day

  func collect_paycheck():
    simoleons += CAREER_SALARIES.get(career, 0) * (1 + career_level * 0.1)
    money_changed.emit(simoleons)

  func buy_item(cost: int) -> bool:
    if simoleons >= cost:
      simoleons -= cost
      money_changed.emit(simoleons)
      return true
    return false

────────── MOOD CALCULATION ──────────
Overall mood = weighted average of all needs → drives animation blending, speech bubbles, color tint:
  func get_mood() -> float:  # 0.0 = miserable, 1.0 = ecstatic
    var weights = { "hunger": 2.0, "energy": 1.5, "fun": 1.2, "social": 1.0, "hygiene": 0.8, "bladder": 2.5 }
    var total_weight = weights.values().reduce(func(a,b): return a + b)
    var weighted_sum = 0.0
    for need in needs:
      weighted_sum += (needs[need] / 100.0) * weights.get(need, 1.0)
    return weighted_sum / total_weight

  func get_mood_name() -> String:
    var m = get_mood()
    if m > 0.85: return "Ecstatic"
    elif m > 0.65: return "Happy"
    elif m > 0.45: return "Fine"
    elif m > 0.25: return "Uncomfortable"
    else: return "Miserable"

────────── SPEECH BUBBLES + EMOTIONS ──────────
  # Spawn speech bubble above character showing current thought/emotion
  func show_thought(icon: Texture2D, duration: float = 3.0):
    var bubble = SPEECH_BUBBLE_SCENE.instantiate()
    bubble.set_icon(icon)
    add_child(bubble)
    await get_tree().create_timer(duration).timeout
    bubble.queue_free()
`,

    tactics: `
TURN-BASED TACTICS PATTERNS (XCOM / Fire Emblem style):

────────── GRID + MOVEMENT ──────────
const TILE_SIZE = 64
var grid: Array[Array] = []   # 2D array of TileData objects
class TileData:
  var walkable: bool = true
  var cover: int = 0           # 0=none, 1=half, 2=full
  var occupant: Node = null    # unit standing here

func get_tiles_in_range(origin: Vector2i, move_range: int) -> Array[Vector2i]:
  var result = []; var visited = {}
  var queue = [[origin, move_range]]
  while queue.size() > 0:
    var item = queue.pop_front()
    var pos: Vector2i = item[0]; var rem: int = item[1]
    if visited.has(pos): continue
    visited[pos] = true; result.append(pos)
    if rem == 0: continue
    for dir in [Vector2i(1,0),Vector2i(-1,0),Vector2i(0,1),Vector2i(0,-1)]:
      var next = pos + dir
      if is_in_bounds(next) and grid[next.y][next.x].walkable and not grid[next.y][next.x].occupant:
        queue.append([next, rem - 1])
  return result

────────── ACTION POINTS ──────────
var units: Array[Unit] = []
var current_unit_idx: int = 0
var turn: int = 1
var phase: String = "player"  # "player" or "enemy"

class Unit:
  var unit_name: String; var team: int   # 0=player, 1=enemy
  var max_hp: int = 20; var hp: int = 20
  var move_range: int = 4; var attack_range: int = 1
  var action_points: int = 2; var max_ap: int = 2
  var grid_pos: Vector2i
  var has_moved: bool = false; var has_acted: bool = false
  var cover_bonus: int = 0   # from current tile

func end_unit_turn():
  current_unit_idx = (current_unit_idx + 1) % units.size()
  if current_unit_idx == 0:
    turn += 1; _start_new_round()
  var unit = units[current_unit_idx]
  unit.has_moved = false; unit.has_acted = false; unit.action_points = unit.max_ap

────────── COVER + HIT CHANCE ──────────
func calc_hit_chance(attacker: Unit, target: Unit) -> float:
  var base = 0.75
  var cover_reduction = [0.0, 0.25, 0.50]  # none/half/full
  var range_penalty = max(0.0, (grid_distance(attacker.grid_pos, target.grid_pos) - 2) * 0.05)
  return clamp(base - cover_reduction[target.cover_bonus] - range_penalty, 0.05, 0.95)

func attack(attacker: Unit, target: Unit):
  var hit = randf() <= calc_hit_chance(attacker, target)
  if hit:
    var damage = attacker.attack_stat + randi_range(-2, 2)
    target.hp -= damage
    damage_label.show(target.grid_pos, damage, false)
    if target.hp <= 0: _kill_unit(target)
  else:
    damage_label.show(target.grid_pos, "MISS", true)
  attacker.has_acted = true

────────── FOG OF WAR ──────────
var visible_tiles: Dictionary = {}
func update_fog_of_war():
  visible_tiles.clear()
  for unit in units:
    if unit.team != 0: continue
    for tile in get_tiles_in_range(unit.grid_pos, unit.sight_range):
      visible_tiles[tile] = true
  # Set tile/enemy opacity based on visibility
  for enemy in get_tree().get_nodes_in_group("enemies"):
    enemy.visible = visible_tiles.has(enemy.grid_pos)

────────── AI (enemy turn) ──────────
func run_enemy_ai():
  for unit in units:
    if unit.team != 1 or unit.hp <= 0: continue
    # Find nearest player unit
    var target = _nearest_player_unit(unit)
    if target == null: continue
    var dist = grid_distance(unit.grid_pos, target.grid_pos)
    # Move toward target if out of attack range
    if dist > unit.attack_range and not unit.has_moved:
      var path = _pathfind_toward(unit, target.grid_pos, unit.move_range)
      if path.size() > 0: _move_unit(unit, path[-1])
    # Attack if in range
    if grid_distance(unit.grid_pos, target.grid_pos) <= unit.attack_range and not unit.has_acted:
      attack(unit, target)
  end_unit_turn()
`,

    deck_building: `
DECK-BUILDING ROGUELIKE PATTERNS (Slay the Spire style):

────────── CARD SYSTEM ──────────
class_name CardData extends Resource
@export var card_name: String
@export var card_type: String  # "attack", "skill", "power"
@export var energy_cost: int = 1
@export var description: String
@export var effects: Array[Dictionary] = []
# effects example: [{"type":"damage","value":6},{"type":"draw","value":1}]

var deck: Array[CardData] = []     # full deck
var hand: Array[CardData] = []     # current hand (5 cards)
var discard: Array[CardData] = []  # played cards
var exhaust: Array[CardData] = []  # exhausted this run

func draw_cards(count: int = 5):
  for i in count:
    if deck.is_empty():
      deck = discard.duplicate(); discard.clear()
      deck.shuffle()
    if deck.is_empty(): break
    hand.append(deck.pop_back())
  hand_updated.emit(hand)

func play_card(card: CardData, target = null):
  if energy < card.energy_cost: return
  energy -= card.energy_cost
  for effect in card.effects:
    _apply_effect(effect, target)
  hand.erase(card)
  if not card.exhausted: discard.append(card)
  else: exhaust.append(card)
  hand_updated.emit(hand)

────────── ENERGY + TURN ──────────
var max_energy: int = 3; var energy: int = 3
var block: int = 0      # reset each turn
var player_hp: int = 80; var max_hp: int = 80

func start_player_turn():
  energy = max_energy
  block = 0  # or keep block if relic says so
  draw_cards(5)
  turn_started.emit()

func end_player_turn():
  hand.append_array(hand)   # discard remaining hand
  discard.append_array(hand); hand.clear()
  _run_enemy_intents()

────────── ENEMY INTENT SYSTEM ──────────
class EnemyIntent:
  var intent_type: String  # "attack","block","buff","debuff"
  var value: int; var icon: Texture2D

class Enemy:
  var hp: int; var max_hp: int
  var block: int = 0
  var intent: EnemyIntent
  var intent_pattern: Array[EnemyIntent] = []  # cycles through
  var pattern_idx: int = 0

  func get_next_intent() -> EnemyIntent:
    intent = intent_pattern[pattern_idx % intent_pattern.size()]
    pattern_idx += 1; return intent

  func execute_intent(player):
    match intent.intent_type:
      "attack": player.take_damage(max(0, intent.value - player.block)); player.block = max(0, player.block - intent.value)
      "block": block += intent.value
      "buff": apply_buff(intent)
    intent = get_next_intent()  # show next intent

────────── RELICS ──────────
var relics: Array[RelicData] = []

class_name RelicData extends Resource
@export var relic_name: String
@export var description: String
# Hooks: relic can connect to signals on GameManager
# e.g. "Burning Blood": connect player.combat_end → heal 6
# e.g. "Anchor": skip draw on turn 1, start with 10 block instead

────────── MAP + RUN STRUCTURE ──────────
# Map is a branching path of nodes:
# Node types: combat, elite, rest, shop, event, boss
enum NodeType { COMBAT, ELITE, REST, SHOP, EVENT, BOSS }
class MapNode:
  var type: NodeType; var connections: Array[MapNode] = []
  var visited: bool = false; var reward: Variant

func generate_map(floors: int = 15, width: int = 7) -> Array[Array]:
  var map: Array[Array] = []
  for floor in floors:
    var row = []; var count = randi_range(3, width)
    for i in count:
      var node = MapNode.new()
      node.type = _random_node_type(floor)
      row.append(node)
    map.append(row)
  _connect_floors(map); return map

func _random_node_type(floor: int) -> NodeType:
  if floor == 0: return NodeType.COMBAT
  if floor % 8 == 0: return NodeType.REST
  var roll = randf()
  if roll < 0.45: return NodeType.COMBAT
  elif roll < 0.65: return NodeType.EVENT
  elif roll < 0.75: return NodeType.SHOP
  elif roll < 0.85: return NodeType.REST
  else: return NodeType.ELITE
`,

    "life sim": `# alias to simulation`,
    sims: `# alias to simulation`,

    survival_horror: `
SURVIVAL HORROR PATTERNS (Resident Evil / Silent Hill style):

────────── ATMOSPHERE + LIGHTING ──────────
- Dynamic darkness: CanvasModulate node set to Color(0.05, 0.05, 0.08) for near-black world
- Flashlight: PointLight2D on player; cone via texture mask; flicker shader on low battery
  var battery = 100.0
  func _process(delta): battery -= 0.5 * delta; if battery < 20: flicker_flashlight()
  func flicker_flashlight(): flashlight.energy = randf_range(0.6, 1.2)
- Room lighting: each room has its own PointLight2D/SpotLight2D; flickering on corruption
- Fog of war: use LightOccluder2D shapes on walls so darkness blocks sight
- Ambient shader: CanvasItem shader with animated noise overlay for grain/distortion

────────── FEAR / TENSION SYSTEM ──────────
var fear = 0.0  # 0 = calm, 100 = terrified
const FEAR_SOURCES = { "monster_nearby": 2.0, "dark_room": 0.3, "dead_body": 5.0, "monster_sight": 8.0 }
func _process(delta):
  fear = move_toward(fear, 0.0, 0.5 * delta)  # slow decay when safe
  _apply_fear_effects()
func _apply_fear_effects():
  if fear > 70: AudioManager.play_heartbeat(remap(fear, 70, 100, 0.8, 1.6))
  if fear > 50: camera.add_trauma(fear / 1000.0)  # subtle constant shake
  if fear > 80: apply_vignette_shader(remap(fear, 80, 100, 0.0, 0.6))

────────── INVENTORY (RE-style grid) ──────────
const GRID_W = 6; const GRID_H = 4  # attache case grid
var grid: Array = []  # 2D bool array, true = occupied
class InventoryItem:
  var item_data: ItemResource
  var grid_x: int; var grid_y: int
  var width: int; var height: int  # item size in grid cells
  var quantity: int = 1
func can_place(item, gx, gy) -> bool:
  for dx in item.width:
    for dy in item.height:
      if gx+dx >= GRID_W or gy+dy >= GRID_H: return false
      if grid[gy+dy][gx+dx]: return false
  return true
func auto_place(item) -> bool:  # try every slot, place if fits
  for y in GRID_H:
    for x in GRID_W:
      if can_place(item, x, y): place_item(item, x, y); return true
  return false

────────── MONSTER AI (RE/SH style) ──────────
enum State { PATROL, INVESTIGATE, HUNT, ATTACK, STUNNED, DEAD }
- Patrol: move between patrol points, slow pace, head bob animation
- Hearing: if player noise (running, shooting) within hearing_range → Investigate last heard position
- Sight: raycast cone (120° wide, sight_range px); if player in cone + no wall → HUNT
- Hunt: pathfind directly to player; speed increases as hunt time grows
- Lose sight: if player out of sight for 8 seconds → return to Investigate then Patrol
- Lunge attack: when within melee_range → play wind-up anim (0.6s) → dash forward → damage
- Stunned by flashlight: if flashlight directly on monster for 2s → Stunned for 3s, fear -40
- Noise system: running = 80 noise, walking = 20, crouching = 5, shooting = 150
  const noise_decay = 30.0  # per second
  var player_noise_level = 0.0

────────── SURVIVAL RESOURCES ──────────
- Ammo: limited, picked up in small quantities; player must decide when to fight vs flee
- Health items: First Aid Spray (full heal), Herb combos (G+R=medium, G+G+R=large)
- Item examination: right-click → rotate/zoom item, may reveal hidden secrets
- Safe rooms: no enemies spawn; save at typewriter; ambient calm music; inventory management
- Checkpoint system: autosave on entering new area; manual save costs ink ribbon (resource)

────────── PUZZLE DESIGN ──────────
- Lock + key: colored key cards, crests, medallions — classic RE style
- Environmental clues: examine objects to get partial codes; combine items
- Blocked paths: boards (crowbar), locked doors (key), blocked (push object)
- Escape the room logic: find 3 items to combine → unlock exit
- Note/diary system: scattered documents that build lore and hint at solutions

────────── CAMERA (RE fixed angle OR top-down) ──────────
Option A — Fixed camera zones (classic RE feel):
  Each room has a CameraZone Area2D; entering it switches Camera2D to that room's camera
  Player moves relative to camera direction (tank controls or screen-relative)
Option B — Top-down with limited visibility:
  Camera follows player; darkness + flashlight cone; map shows explored rooms only
`,

    psychological_horror: `
PSYCHOLOGICAL HORROR PATTERNS (Silent Hill style):

────────── SANITY SYSTEM ──────────
var sanity = 100.0  # public, synced to horror effects
func decrease_sanity(amount: float, reason: String):
  sanity = max(0.0, sanity - amount)
  sanity_changed.emit(sanity, reason)
  if sanity < 30: _enter_disturbed_state()
  if sanity < 10: _enter_breakdown()

func _process(delta):
  # Restore sanity in safe lit areas
  if in_safe_room and light_level > 0.5:
    sanity = min(100.0, sanity + 2.0 * delta)

# Sanity drains from: darkness, monster sight, reading disturbing notes, monster proximity
const SANITY_DRAIN = { "dark_room": 1.0, "monster_visible": 5.0, "disturbing_note": 10.0, "monster_touch": 20.0 }

────────── VISUAL DISTORTIONS ──────────
# Apply via ShaderMaterial on CanvasLayer:
# Low sanity: screen wobble, color desaturation, double vision
# Hallucinations: spawn fake monsters that don't damage but cause fear
# Static noise: ChromaticAberration shader intensity = (1.0 - sanity/100.0) * 0.02
# Screen tilt: camera.rotation = sin(Time.get_ticks_msec()*0.001) * (1.0-sanity/100.0) * 0.05
func _enter_disturbed_state():
  hallucination_timer.start(randf_range(10.0, 30.0))
  AudioManager.start_tinnitus()
  distortion_shader.set("intensity", 0.015)

────────── OTHERWORLD TRANSITION ──────────
# The world shifts between Normal and Otherworld (dark, rust, flesh aesthetic)
var in_otherworld = false
func trigger_otherworld_shift():
  in_otherworld = !in_otherworld
  # Play transition animation: static, darkness, screen shake
  # Replace tileset: swap normal tiles for otherworld variant
  # Spawn more aggressive monsters
  # Change ambient music to industrial noise
  $TransitionPlayer.play("otherworld_shift")
  await $TransitionPlayer.animation_finished
  tilemap.tile_set = OTHERWORLD_TILESET if in_otherworld else NORMAL_TILESET
  AudioManager.play_music(OTHERWORLD_MUSIC if in_otherworld else NORMAL_MUSIC)

────────── MONSTER AS METAPHOR ──────────
# Each monster type represents a psychological state:
# Design enemies to embody themes: guilt, fear, repression, rage
# Monster behavior changes based on player's sanity level
# Low sanity = monsters are faster, more aggressive, more numerous
# High sanity = some monsters won't even appear

────────── RADIO / PROXIMITY ALERT ──────────
# Static radio crackles when monster is nearby (iconic SH mechanic)
@onready var radio: AudioStreamPlayer = $Radio
var radio_intensity = 0.0
func _process(delta):
  var nearest_dist = 9999.0
  for monster in get_tree().get_nodes_in_group("monsters"):
    nearest_dist = min(nearest_dist, global_position.distance_to(monster.global_position))
  radio_intensity = clamp(1.0 - nearest_dist / radio_range, 0.0, 1.0)
  radio.volume_db = linear_to_db(radio_intensity)
  radio.pitch_scale = randf_range(0.95, 1.05) if radio_intensity > 0.1 else 1.0
`,

    supernatural_action: `
SUPERNATURAL ACTION PATTERNS (Charmed / open world magic / Devil May Cry style):

────────── SPELL / POWER SYSTEM ──────────
class_name SpellData extends Resource
@export var spell_name: String
@export var power_cost: float = 25.0
@export var cooldown: float = 2.0
@export var damage: float = 50.0
@export var range: float = 400.0
@export var effect_type: String  # "fire", "ice", "lightning", "telekinesis", "time", "charm"
@export var projectile_scene: PackedScene
@export var area_radius: float = 0.0  # 0 = single target, >0 = AOE

# Player spell manager:
var equipped_spells: Array[SpellData] = []  # up to 4 equipped
var spell_cooldowns: Dictionary = {}
var power = 100.0; var max_power = 100.0
const POWER_REGEN = 8.0  # per second

func _process(delta):
  power = min(max_power, power + POWER_REGEN * delta)
  for spell in spell_cooldowns:
    spell_cooldowns[spell] = max(0.0, spell_cooldowns[spell] - delta)

func cast_spell(spell: SpellData, target_pos: Vector2):
  if power < spell.power_cost: return  # not enough power
  if spell_cooldowns.get(spell.spell_name, 0.0) > 0: return  # on cooldown
  power -= spell.power_cost
  spell_cooldowns[spell.spell_name] = spell.cooldown
  _execute_spell(spell, target_pos)

func _execute_spell(spell: SpellData, pos: Vector2):
  match spell.effect_type:
    "telekinesis": _telekinesis_grab(pos)
    "time": _slow_time(spell)
    "fire": _spawn_projectile(spell, pos)
    "lightning": _chain_lightning(spell, pos)
    "charm": _charm_enemy_at(pos)
    "shield": _spawn_shield(spell)

────────── SIGNATURE POWERS ──────────
# Telekinesis (like Eleven / Charmed):
var grabbed_object: RigidBody2D = null
func _telekinesis_grab(pos):
  var bodies = get_overlapping_bodies_at(pos, 60.0)
  if bodies.size() > 0:
    grabbed_object = bodies[0]
    grabbed_object.gravity_scale = 0
func _telekinesis_hold(delta):
  if grabbed_object:
    var target = get_global_mouse_position()
    grabbed_object.linear_velocity = (target - grabbed_object.global_position) * 10.0
func _telekinesis_throw():
  if grabbed_object:
    var dir = (get_global_mouse_position() - global_position).normalized()
    grabbed_object.gravity_scale = 1.0
    grabbed_object.apply_central_impulse(dir * 1800.0)
    grabbed_object = null

# Time manipulation:
func _slow_time(spell: SpellData):
  Engine.time_scale = 0.25
  create_tween().tween_property(Engine, "time_scale", 1.0, spell.duration)
  # Visual: desaturate + blue tint shader during slow-mo

# Chain lightning:
func _chain_lightning(spell: SpellData, origin: Vector2):
  var hit = [] ; var current = origin
  for i in 4:  # chain up to 4 enemies
    var nearest = _nearest_enemy_not_in(hit, current, spell.range / (i + 1))
    if not nearest: break
    _spawn_lightning_arc(current, nearest.global_position)
    nearest.get_node("HurtboxComponent").take_hit(spell.damage * pow(0.7, i), Vector2.ZERO)
    hit.append(nearest); current = nearest.global_position

────────── COMBO SYSTEM (DMC-style) ──────────
var combo_count = 0
var combo_timer = 0.0
const COMBO_WINDOW = 2.5  # seconds before combo resets
var combo_ratings = { 0: "D", 5: "C", 10: "B", 20: "A", 35: "S", 50: "SS", 75: "SSS" }

func on_hit():
  combo_count += 1; combo_timer = COMBO_WINDOW
  var rating = "D"
  for threshold in combo_ratings:
    if combo_count >= threshold: rating = combo_ratings[threshold]
  combo_changed.emit(combo_count, rating)
  # Bonus: higher combo = more damage, more power regen, flashier effects

func _process(delta):
  if combo_timer > 0:
    combo_timer -= delta
  else:
    combo_count = 0; combo_changed.emit(0, "")

────────── OPEN WORLD MAGIC ──────────
- Spell discovery: find grimoire pages, learn from NPCs, unlock by defeating bosses
- Power progression: each spell has 3 tiers upgraded with "essence" from enemies
- Ley lines: magical paths on the map; walking them restores power faster
- Covens/sanctuaries: safe zones where spells can be learned and upgraded
- Corruption zones: dark magic areas; stronger enemies, better loot, sanity drain
- Day/night: some spells stronger at night; spirits more active; portals open

────────── SUPERNATURAL ENEMY TYPES ──────────
- Demon: standard melee, fire weakness, teleport to player when out of sight
- Wraith: invisible until within 150px; phasing through walls; light spell reveals
- Possessed human: faster than demons, mimics player animations, fear aura
- Elder god: boss tier; multiple phases; requires specific spell weakness to damage
- Familiar (enemy witch's pet): small+fast; buffs the witch; kill it first
- Shadow: only vulnerable during own attack animation; otherwise reflects all damage

────────── RITUAL / SPELL CRAFTING ──────────
# Combine ingredients to craft spells or potions:
var grimoire: Dictionary = {}  # known recipes
class Ingredient extends Resource:
  var name: String; var element: String; var power: float
func craft(ingredients: Array[Ingredient]) -> SpellData:
  var key = ingredients.map(func(i): return i.name).sorted().join("+")
  if key in grimoire: return grimoire[key]
  return null  # unknown combination
`,

    asymmetric_horror: `
ASYMMETRIC MULTIPLAYER HORROR PATTERNS (Dead by Daylight style):

────────── CORE LOOP ──────────
4 Survivors vs 1 Killer — survivors repair generators to escape; killer hunts to sacrifice them.
Roles are fundamentally different code paths sharing the same world.

────────── SURVIVOR SYSTEMS ──────────
# Generator repair (skill check mini-game):
var gen_progress = 0.0  # 0-100%
var repair_speed = 1.0  # % per second
var great_skill_check_bonus = 2.0  # extra progress on great
var fail_penalty = 10.0  # progress lost + loud noise

func _repair_tick(delta):
  gen_progress += repair_speed * delta
  # Random skill check: flash UI circle, player must hit space in arc
  if should_trigger_skill_check():
    start_skill_check()

# Health states: Healthy → Injured → Dying → Dead
enum HealthState { HEALTHY, INJURED, DYING, HOOKED, DEAD }
# Injured: slower movement, leaves blood trails, breathing sounds louder
# Dying: crawl only; can self-recover slowly; teammate can pick up

# Stealth mechanics:
var noise_level = 0.0  # 0-100; killer can detect high noise
var crouch_speed = 0.65  # multiplier when crouching
var sprint_noise = 75.0; var walk_noise = 25.0; var crouch_noise = 5.0

# Hiding: lockers (press E to enter; hide in darkness; killer can check)
# Pallets: stun killer for 3s; break after use; block path briefly
# Windows: fast vault (loud) vs slow vault (quiet)

────────── KILLER SYSTEMS ──────────
var terror_radius = 32.0  # meters — heartbeat plays for survivors in this range
var movement_speed = 4.6  # slightly faster than survivors (4.0)
var lunge_range = 2.5  # extra distance on attack
var power_cooldown = 0.0  # unique killer power

# The Chase:
# Red light on minimap when killer is near; scratches on screen show direction
# Obsession: one survivor is marked; killer gets bonus for sacrificing them

# Hooking:
func hook_survivor(survivor: Node):
  survivor.enter_hooked_state()  # 60s on hook before death; wiggle to escape
  # Stage 1: wiggle/struggle; Stage 2: Entity attacks (must be saved quickly)

# Unique killer powers (mix and match):
# Teleport: blink to a marked location instantly (Nurse)
# Bear traps: place on ground; survivor gets caught; must wiggle free (Trapper)
# Chainsaw: charge up sprint; instant down on hit; loud warning (Hillbilly)
# Possession: take control of objects/crows to scout (Ghost Face variant)

────────── MULTIPLAYER ARCHITECTURE ──────────
# Godot 4 multiplayer (ENet):
func _ready():
  if multiplayer.is_server():
    setup_as_host()
  else:
    setup_as_client()

@rpc("any_peer", "call_local", "reliable")
func sync_position(pos: Vector2, rot: float):
  global_position = pos; rotation = rot

@rpc("authority", "call_local", "reliable")
func on_generator_progress(gen_id: int, progress: float):
  generators[gen_id].progress = progress

# Use MultiplayerSynchronizer for smooth position sync
# Use MultiplayerSpawner to spawn players on all clients

────────── MAPS + ATMOSPHERE ──────────
- Procedural map: pre-built room chunks connected randomly each match
- Totems: hidden objects that can be cleansed for perks or curse removal
- Basement: special area; stronger hooks but harder escape; extra hooks
- Fog: aesthetic + strategic; low visibility; distance attenuation on sounds
- Ambient sounds: distant generators humming; crows flutter when killer passes
`,
  };

  // Match genre to closest key
  const keys = Object.keys(patterns);

  // Specific game/genre mappings
  if (g.includes("deck") || g.includes("card") || g.includes("slay the spire") || g.includes("ftl")) return patterns["deck_building"];
  if (g.includes("tactics") || g.includes("tactical") || g.includes("xcom") || g.includes("fire emblem") || g.includes("turn-based strategy")) return patterns["tactics"];
  if (g.includes("sim") || g.includes("life") || g.includes("tycoon") || g.includes("management")) return patterns["simulation"];
  if (g.includes("resident") || g.includes("survival horror") || g.includes("survival_horror") || g.includes("re ") || g.includes("re2")) return patterns["survival_horror"];
  if (g.includes("silent") || g.includes("psychological") || g.includes("psych horror")) return patterns["psychological_horror"];
  if (g.includes("charmed") || g.includes("supernatural") || g.includes("magic") || g.includes("witch") || g.includes("spell") || g.includes("dmc") || g.includes("devil may")) return patterns["supernatural_action"];
  if (g.includes("dead by") || g.includes("dbd") || g.includes("asymmetric") || g.includes("multiplayer horror")) return patterns["asymmetric_horror"];
  if (g.includes("horror") && (g.includes("action") || g.includes("fight") || g.includes("combat"))) return patterns["survival_horror"];
  if (g.includes("horror")) return patterns["psychological_horror"];
  if (g.includes("open world") || g.includes("openworld")) return patterns["supernatural_action"];

  const match = keys.find(k => g.includes(k) || k.includes(g)) ?? "platformer";
  return patterns[match] ?? patterns["platformer"];
}

// ── 3D genre patterns (Godot 4 GDScript) ─────────────────────────────────────

export function get3DGenrePatterns(genre: string): string {
  const g = genre.toLowerCase();

  const patterns: Record<string, string> = {
    fps: `
FIRST-PERSON SHOOTER 3D PATTERNS (Godot 4):

# CharacterBody3D player with Camera3D mouselook
extends CharacterBody3D
class_name FPSPlayer

@onready var camera: Camera3D = $Camera3D
@onready var gun_bob_pivot: Node3D = $Camera3D/GunBobPivot
@onready var arms_mesh: MeshInstance3D = $Camera3D/GunBobPivot/ArmsModel

@export var mouse_sensitivity: float = 0.003
@export var speed: float = 5.0
@export var jump_velocity: float = 4.5
@export var gravity: float = 9.8

var pitch: float = 0.0
var bob_time: float = 0.0
const BOB_FREQ = 2.4; const BOB_AMP = 0.06

func _ready() -> void:
    Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion:
        rotate_y(-event.relative.x * mouse_sensitivity)
        pitch = clamp(pitch - event.relative.y * mouse_sensitivity, -1.5, 1.5)
        camera.rotation.x = pitch

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity
    var input_dir = Input.get_vector("move_left","move_right","move_forward","move_back")
    var direction = (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
    velocity.x = direction.x * speed
    velocity.z = direction.z * speed
    move_and_slide()
    _headbob(delta)

func _headbob(delta: float) -> void:
    if velocity.length() > 0.5 and is_on_floor():
        bob_time += delta * BOB_FREQ
        camera.transform.origin.y = sin(bob_time) * BOB_AMP
        camera.transform.origin.x = cos(bob_time * 0.5) * BOB_AMP * 0.5
    else:
        bob_time = 0.0
        camera.transform.origin = camera.transform.origin.lerp(Vector3.ZERO, delta * 8.0)

# Shooting raycast
func shoot() -> void:
    var space_state = get_world_3d().direct_space_state
    var query = PhysicsRayQueryParameters3D.create(
        camera.global_position,
        camera.global_position + (-camera.global_basis.z * 100.0)
    )
    query.exclude = [self]
    var result = space_state.intersect_ray(query)
    if result:
        if result.collider.has_method("take_damage"):
            result.collider.take_damage(25)
        # Spawn hit decal/particles at result.position

# Gun bob on fire
func _gun_bob() -> void:
    var tween = create_tween()
    tween.tween_property(gun_bob_pivot, "position", Vector3(0.02, -0.03, 0.0), 0.04)
    tween.tween_property(gun_bob_pivot, "position", Vector3.ZERO, 0.1)
`,

    tps: `
THIRD-PERSON SHOOTER 3D PATTERNS (Godot 4):

# SpringArm3D camera orbit + CharacterBody3D 3D movement
extends CharacterBody3D
class_name TPSPlayer

@onready var spring_arm: SpringArm3D = $SpringArm3D
@onready var camera: Camera3D = $SpringArm3D/Camera3D
@onready var mesh: Node3D = $MeshRoot

@export var mouse_sensitivity: float = 0.003
@export var speed: float = 5.0
@export var jump_velocity: float = 4.5
@export var gravity: float = 9.8
@export var spring_length: float = 4.0

var cam_pitch: float = 0.0
var cam_yaw: float = 0.0

func _ready() -> void:
    Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
    spring_arm.spring_length = spring_length

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion:
        cam_yaw -= event.relative.x * mouse_sensitivity
        cam_pitch = clamp(cam_pitch - event.relative.y * mouse_sensitivity, -0.8, 0.6)
        spring_arm.rotation.x = cam_pitch
        rotation.y = cam_yaw

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity
    var input_dir = Input.get_vector("move_left","move_right","move_forward","move_back")
    var direction = (basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
    if direction.length() > 0:
        velocity.x = direction.x * speed
        velocity.z = direction.z * speed
        mesh.rotation.y = lerp_angle(mesh.rotation.y, atan2(direction.x, direction.z), delta * 10.0)
    else:
        velocity.x = move_toward(velocity.x, 0, speed)
        velocity.z = move_toward(velocity.z, 0, speed)
    move_and_slide()

# Third-person aim: lock camera behind player + raycast from camera center
func aim_raycast() -> Dictionary:
    var space = get_world_3d().direct_space_state
    var from_pos = camera.global_position
    var to_pos = from_pos + (-camera.global_basis.z * 50.0)
    var query = PhysicsRayQueryParameters3D.create(from_pos, to_pos)
    return space.intersect_ray(query)
`,

    open_world_3d: `
OPEN WORLD 3D PATTERNS (Godot 4):

# WorldEnvironment + DirectionalLight3D day/night cycle
@onready var sun: DirectionalLight3D = $Sun
@onready var env: WorldEnvironment = $WorldEnvironment
var time_of_day: float = 0.25  # 0..1, 0.25 = 6AM

func _process(delta: float) -> void:
    time_of_day = fmod(time_of_day + delta * (1.0 / 600.0), 1.0)  # 10-min day
    var angle = time_of_day * TAU
    sun.rotation.x = -PI * 0.5 + angle
    sun.light_energy = clamp(sin(angle), 0.0, 1.0) * 2.0
    # Sky color: lerp between dawn/noon/dusk/night
    var sky_color = _sky_color_for_time(time_of_day)
    env.environment.sky.set("sky_top_color", sky_color)

func _sky_color_for_time(t: float) -> Color:
    if t < 0.25:  # night → dawn
        return Color(0.05,0.05,0.15).lerp(Color(1.0,0.5,0.2), t * 4.0)
    elif t < 0.5:  # dawn → noon
        return Color(1.0,0.5,0.2).lerp(Color(0.4,0.6,1.0), (t - 0.25) * 4.0)
    elif t < 0.75:  # noon → dusk
        return Color(0.4,0.6,1.0).lerp(Color(1.0,0.3,0.1), (t - 0.5) * 4.0)
    else:  # dusk → night
        return Color(1.0,0.3,0.1).lerp(Color(0.05,0.05,0.15), (t - 0.75) * 4.0)

# LOD via VisibleOnScreenNotifier3D
# Attach to each LOD group root; connect screen_entered/exited
func _on_lod_high_entered() -> void:
    $HighDetail.visible = true
    $LowDetail.visible = false
func _on_lod_high_exited() -> void:
    $HighDetail.visible = false
    $LowDetail.visible = true

# Chunk streaming concept
const CHUNK_SIZE = 128
var loaded_chunks: Dictionary = {}
func _update_chunks(player_pos: Vector3) -> void:
    var cx = int(player_pos.x / CHUNK_SIZE)
    var cz = int(player_pos.z / CHUNK_SIZE)
    for dx in range(-2, 3):
        for dz in range(-2, 3):
            var key = Vector2i(cx + dx, cz + dz)
            if key not in loaded_chunks:
                _load_chunk(key)
    # Unload far chunks
    for key in loaded_chunks.keys():
        if abs(key.x - cx) > 3 or abs(key.y - cz) > 3:
            _unload_chunk(key)

# Minimap via SubViewport
# SubViewport with orthogonal Camera3D looking straight down
# MeshInstance2D on CanvasLayer reads SubViewport texture
`,

    racing_3d: `
RACING GAME 3D PATTERNS (Godot 4):

# VehicleBody3D setup with 4 VehicleWheel3D
extends VehicleBody3D
class_name RacingCar

@export var engine_force_value: float = 200.0
@export var brake_force: float = 40.0
@export var max_steer: float = 0.4
@onready var speedometer: Label = $HUD/Speedometer

func _physics_process(_delta: float) -> void:
    engine_force = Input.get_axis("brake","accelerate") * engine_force_value
    brake = Input.get_action_strength("brake") * brake_force
    steering = lerp(steering, Input.get_axis("steer_right","steer_left") * max_steer, 0.2)
    # Speedometer in km/h
    var speed_kmh = linear_velocity.length() * 3.6
    speedometer.text = "%d km/h" % int(speed_kmh)

# VehicleWheel3D configuration (add 4 as children):
# wheel_roll_influence = 0.1   (lower = less roll)
# wheel_radius = 0.4
# wheel_friction_slip = 2.5     (higher = more grip)
# suspension_rest_length = 0.15
# suspension_stiffness = 30.0
# suspension_max_force = 5000

# Drift physics: reduce friction on rear wheels when drifting
var is_drifting: bool = false
func _check_drift() -> void:
    var lateral = transform.basis.x.dot(linear_velocity)
    is_drifting = abs(lateral) > 3.0
    if is_drifting:
        $WheelRL.wheel_friction_slip = 1.0
        $WheelRR.wheel_friction_slip = 1.0
    else:
        $WheelRL.wheel_friction_slip = 2.5
        $WheelRR.wheel_friction_slip = 2.5

# Checkpoint system
var checkpoints: Array[Area3D] = []
var current_checkpoint: int = 0
var lap: int = 0
func _on_checkpoint_entered(area: Area3D) -> void:
    var idx = checkpoints.find(area)
    if idx == current_checkpoint:
        current_checkpoint = (current_checkpoint + 1) % checkpoints.size()
        if current_checkpoint == 0:
            lap += 1
            lap_completed.emit(lap)
`,

    platformer_3d: `
PLATFORMER 3D PATTERNS (Godot 4):

extends CharacterBody3D
class_name Platformer3DPlayer

@export var speed: float = 6.0
@export var jump_height: float = 2.0
@export var gravity: float = 20.0
@export var coyote_time: float = 0.12
@export var jump_buffer_time: float = 0.1
@onready var camera_rig: Node3D = $CameraRig
@onready var camera: Camera3D = $CameraRig/Camera3D

var jump_velocity: float
var coyote_timer: float = 0.0
var jump_buffer: float = 0.0
var jumps_left: int = 2
var last_on_floor: bool = false

func _ready() -> void:
    jump_velocity = sqrt(2.0 * gravity * jump_height)
    Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion:
        camera_rig.rotate_y(-event.relative.x * 0.003)

func _physics_process(delta: float) -> void:
    # Coyote time
    if is_on_floor():
        coyote_timer = coyote_time
        jumps_left = 2
    else:
        coyote_timer -= delta

    # Jump buffer
    if Input.is_action_just_pressed("jump"):
        jump_buffer = jump_buffer_time
    jump_buffer -= delta

    # Jump logic (coyote + double jump)
    if jump_buffer > 0 and (coyote_timer > 0 or jumps_left > 0):
        velocity.y = jump_velocity
        jumps_left -= 1
        coyote_timer = 0.0
        jump_buffer = 0.0

    velocity.y -= gravity * delta

    # 3D movement relative to camera
    var input_dir = Input.get_vector("move_left","move_right","move_forward","move_back")
    var cam_basis = camera_rig.global_transform.basis
    var direction = (cam_basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
    direction.y = 0
    velocity.x = direction.x * speed
    velocity.z = direction.z * speed

    last_on_floor = is_on_floor()
    move_and_slide()

    # 3D camera follow (smooth lerp to player)
    camera_rig.global_position = camera_rig.global_position.lerp(
        global_position + Vector3(0, 1.5, 0), delta * 8.0
    )

# Moving platforms: use AnimatableBody3D with AnimationPlayer for the platform path
# Player inherits platform velocity via move_and_slide() floor_snap_length
`,
  };

  if (g.includes("fps") || g.includes("first person")) return patterns["fps"];
  if (g.includes("tps") || g.includes("third person")) return patterns["tps"];
  if (g.includes("open_world") || g.includes("open world")) return patterns["open_world_3d"];
  if (g.includes("racing")) return patterns["racing_3d"];
  if (g.includes("platformer")) return patterns["platformer_3d"];
  return patterns["fps"];
}

// ── Phaser 3 browser game patterns ───────────────────────────────────────────

export function getPhaserPatterns(genre: string): string {
  const g = genre.toLowerCase();

  const minimalTemplate = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Game</title>
<style>* { margin: 0; padding: 0; background: #000; } canvas { display: block; margin: auto; }</style>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"></script>
<script>
// ── CONFIG ────────────────────────────────────────────────────────────────────
const config = {
    type: Phaser.AUTO,
    width: 800, height: 600,
    backgroundColor: '#1a1a2e',
    physics: { default: 'arcade', arcade: { gravity: { y: 600 }, debug: false } },
    scene: [BootScene, GameScene, UIScene, GameOverScene]
};

// ── BOOT SCENE ────────────────────────────────────────────────────────────────
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
        // Load assets here — or generate programmatically
        this.load.image('sky', 'assets/sky.png');
    }
    create() { this.scene.start('Game'); }
}

// ── GAME SCENE ────────────────────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }
    create() {
        // Add game objects, physics groups, input, etc.
        this.score = 0;
        this.lives = 3;
        // Start the UI scene in parallel
        this.scene.launch('UI');
    }
    update() {
        // Game loop
    }
}

// ── UI SCENE (runs on top of Game) ───────────────────────────────────────────
class UIScene extends Phaser.Scene {
    constructor() { super('UI'); }
    create() {
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', fill: '#fff' });
        this.livesText = this.add.text(16, 40, 'Lives: 3', { fontSize: '20px', fill: '#fff' });
    }
    update() {
        const game = this.scene.get('Game');
        if (game) {
            this.scoreText.setText('Score: ' + game.score);
            this.livesText.setText('Lives: ' + game.lives);
        }
    }
}

// ── GAME OVER SCENE ───────────────────────────────────────────────────────────
class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOver'); }
    create(data) {
        this.add.text(400, 250, 'GAME OVER', { fontSize: '48px', fill: '#e63946' }).setOrigin(0.5);
        this.add.text(400, 320, 'Score: ' + (data.score || 0), { fontSize: '28px', fill: '#fff' }).setOrigin(0.5);
        const restart = this.add.text(400, 400, '[ PLAY AGAIN ]', { fontSize: '24px', fill: '#a8dadc' })
            .setOrigin(0.5).setInteractive();
        restart.on('pointerover', () => restart.setStyle({ fill: '#fff' }));
        restart.on('pointerout', () => restart.setStyle({ fill: '#a8dadc' }));
        restart.on('pointerdown', () => {
            this.scene.stop('GameOver');
            this.scene.stop('UI');
            this.scene.start('Game');
        });
    }
}

const game = new Phaser.Game(config);
</script>
</body>
</html>`;

  const patterns: Record<string, string> = {
    platformer: `
PHASER 3 PLATFORMER PATTERN:
CDN: https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js

Key objects:
- this.physics.add.staticGroup() for platforms
- this.physics.add.sprite(x, y, 'player').setCollideWorldBounds(true)
- this.load.tilemapTiledJSON('map', 'tilemap.json') for tilemap support
- this.anims.create({ key:'run', frames: this.anims.generateFrameNumbers('player',{start:0,end:7}), frameRate:10, repeat:-1 })
- Cursor keys: this.cursors = this.input.keyboard.createCursorKeys()
- if (this.cursors.left.isDown) { player.setVelocityX(-160); player.anims.play('run',true); }
- if (this.cursors.up.isDown && player.body.onFloor()) { player.setVelocityY(-500); }
- Coins: this.physics.add.staticGroup() + this.physics.add.overlap(player, coins, collectCoin)
- Enemies: this.physics.add.group() + custom patrol/chase logic in update()
- Score: this.score = 0; scoreText = this.add.text(16,16,'Score: 0',{fontSize:'24px'})

Complete minimal working template:
${minimalTemplate}
`,

    shooter: `
PHASER 3 TOP-DOWN SHOOTER PATTERN:
CDN: https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js

- Player: this.physics.add.sprite(400,300,'player').setCollideWorldBounds(true)
- Movement: 8-directional via WASD, normalize diagonal velocity
- Bullet pool: this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 50, runChildUpdate: true })
- Fire on click: this.input.on('pointerdown', shootBullet)
- shootBullet: get angle from player to pointer, set bullet velocity
- Enemy waves: spawnWave() called by timer, enemies walk toward player
- Health bar: graphics + rectangle, update on damage
- Score: add on enemy kill
- Game over when health = 0 or wave timer expires
- this.physics.add.overlap(bullets, enemies, hitEnemy)
- this.physics.add.overlap(enemies, player, damagePlayer)
`,

    rpg: `
PHASER 3 TOP-DOWN RPG PATTERN:
CDN: https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js

- Tilemap: this.make.tilemap({ key:'map' }) + tileset.addTilesetImage + layer.setCollisionByProperty({collides:true})
- Player movement: WASD + this.physics.add.collider(player, worldLayer)
- NPC dialogue: approach NPC, press E, show dialogue box with tween
  - dialogueBox = this.add.rectangle(400,500,700,120,0x000000,0.85)
  - dialogueText = this.add.text(80,460,'',{fontSize:'18px',fill:'#fff',wordWrap:{width:640}})
- Inventory: array of item objects, render as grid in UI scene
- Combat: turn-based or real-time hitbox overlap
- Quest tracker: questState object, update on condition
- Camera follow: this.cameras.main.startFollow(player,true,0.08,0.08)
`,

    puzzle: `
PHASER 3 PUZZLE PATTERN:
CDN: https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js

- Grid: 2D array, e.g. grid[row][col] = piece value
- Tiles as GameObjects: this.add.image(x, y, 'tile_' + value).setInteractive()
- Drag: this.input.setDraggable(tile); tile.on('drag', (ptr,dx,dy)=>{ tile.x=dx; tile.y=dy; })
- Snap on drop: tile.on('dragend', () => { snapToGrid(tile); checkMatches(); })
- Match detection: scan rows/cols for N matching values → remove + score
- Tween removal: this.tweens.add({ targets: match, alpha: 0, scaleX: 0, scaleY: 0, duration: 200, onComplete: () => match.destroy() })
- Win: this.add.text(400,300,'PUZZLE SOLVED!',{fontSize:'40px'}).setOrigin(0.5)
`,

    tower_defense: `
PHASER 3 TOWER DEFENSE PATTERN:
CDN: https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js

- Path: array of {x,y} waypoints
- Enemy follows path via tweens:
  const timeline = this.tweens.createTimeline();
  waypoints.forEach(wp => timeline.add({ targets: enemy, x: wp.x, y: wp.y, duration: 800, ease: 'Linear' }));
  timeline.play();
- Tower placement: snap click to grid, check tile is buildable
- Tower shoots nearest enemy in range:
  const enemy = findNearest(tower, enemies); if (dist < range) fireBullet(tower, enemy);
- Wave system: this.time.addEvent({ delay: 30000, callback: startNextWave, loop: true })
- Economy: gold on kill, spend gold to place towers
`,
  };

  if (g.includes("platformer")) return patterns["platformer"];
  if (g.includes("shooter") || g.includes("shoot")) return patterns["shooter"];
  if (g.includes("rpg")) return patterns["rpg"];
  if (g.includes("puzzle")) return patterns["puzzle"];
  if (g.includes("tower") || g.includes("defense")) return patterns["tower_defense"];
  return patterns["platformer"];
}

// ── Three.js browser 3D game patterns ────────────────────────────────────────

export function getThreeJsPatterns(genre: string): string {
  const g = genre.toLowerCase();

  const patterns: Record<string, string> = {
    fps_browser: `
THREE.JS FPS BROWSER GAME PATTERN:
CDN: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js

// PointerLockControls FPS setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// PointerLockControls (include separately or inline the class)
const controls = new THREE.PointerLockControls(camera, document.body);
document.addEventListener('click', () => controls.lock());

// WASD movement
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

function updateMovement(delta) {
    const speed = 50;
    direction.z = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    direction.x = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    direction.normalize();
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.x -= velocity.x * 10.0 * delta;
    if (direction.z !== 0) velocity.z -= direction.z * speed * delta;
    if (direction.x !== 0) velocity.x -= direction.x * speed * delta;
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
}

// Raycasting shooting
function shoot() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = raycaster.intersectObjects(enemies);
    if (hits.length > 0) {
        const enemy = hits[0].object;
        scene.remove(enemy);
        score++;
    }
}
document.addEventListener('mousedown', shoot);

// Simple box enemies
const enemies = [];
function spawnEnemy() {
    const geo = new THREE.BoxGeometry(1, 2, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xe63946 });
    const enemy = new THREE.Mesh(geo, mat);
    enemy.position.set((Math.random()-0.5)*40, 1, (Math.random()-0.5)*40);
    scene.add(enemy);
    enemies.push(enemy);
}

// Health system
let health = 100;
function takeDamage(amount) {
    health = Math.max(0, health - amount);
    document.getElementById('health').textContent = 'HP: ' + health;
    if (health <= 0) gameOver();
}

// Animate loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (controls.isLocked) updateMovement(delta);
    renderer.render(scene, camera);
}
animate();
`,

    racing_browser: `
THREE.JS RACING BROWSER GAME PATTERN:
CDN: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js

// Simple car physics with Three.js
const car = {
    mesh: null,
    speed: 0, maxSpeed: 30,
    steer: 0, maxSteer: 0.05,
    acceleration: 0.4, friction: 0.95,
    position: new THREE.Vector3(0,0,0),
    direction: new THREE.Vector3(0,0,-1)
};

function updateCar(delta, keys) {
    if (keys['ArrowUp'])   car.speed = Math.min(car.maxSpeed, car.speed + car.acceleration);
    if (keys['ArrowDown']) car.speed = Math.max(-car.maxSpeed*0.4, car.speed - car.acceleration);
    car.speed *= car.friction;

    if (Math.abs(car.speed) > 0.1) {
        const turnAmount = car.steer * Math.sign(car.speed) * 0.03;
        car.mesh.rotation.y -= turnAmount;
        car.direction.set(
            Math.sin(car.mesh.rotation.y),
            0,
            Math.cos(car.mesh.rotation.y)
        );
    }
    if (keys['ArrowLeft'])  car.steer = Math.min(car.maxSteer, car.steer + 0.005);
    if (keys['ArrowRight']) car.steer = Math.max(-car.maxSteer, car.steer - 0.005);
    if (!keys['ArrowLeft'] && !keys['ArrowRight']) car.steer *= 0.8;

    car.position.addScaledVector(car.direction, -car.speed * delta * 60);
    car.mesh.position.copy(car.position);

    // Camera follow from behind
    const camOffset = car.direction.clone().multiplyScalar(-8).add(new THREE.Vector3(0,3,0));
    camera.position.lerp(car.position.clone().add(camOffset), 0.1);
    camera.lookAt(car.position);
}

// Track mesh: flat PlaneGeometry with texture or color
const trackGeo = new THREE.PlaneGeometry(100, 100);
const trackMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
const track = new THREE.Mesh(trackGeo, trackMat);
track.rotation.x = -Math.PI / 2;
scene.add(track);

// Lap timer
let lapStart = Date.now();
function checkLap(carPos, lapLine) {
    if (carPos.distanceTo(lapLine) < 3) {
        const lapTime = ((Date.now() - lapStart) / 1000).toFixed(2);
        lapStart = Date.now();
        document.getElementById('lap').textContent = 'Last Lap: ' + lapTime + 's';
    }
}
`,

    open_world_browser: `
THREE.JS OPEN WORLD BROWSER GAME PATTERN:
CDN: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js

// Terrain generation with PlaneGeometry + simplex noise (inline or CDN)
const TERRAIN_SIZE = 200;
const TERRAIN_SEGS = 64;
const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
geo.rotateX(-Math.PI / 2);

// Apply heightmap (use simplex noise or Math.sin for basic wave terrain)
const positions = geo.attributes.position.array;
for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], z = positions[i+2];
    positions[i+1] = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 8 +
                     Math.sin(x * 0.1 + 1.5) * Math.cos(z * 0.1) * 4;
}
geo.computeVertexNormals();
const terrainMat = new THREE.MeshLambertMaterial({ color: 0x4a7c59 });
const terrain = new THREE.Mesh(geo, terrainMat);
scene.add(terrain);

// Fog for distance culling
scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);
renderer.setClearColor(0x87ceeb);

// Day/night cycle
let timeOfDay = 0;
function updateDayNight(delta) {
    timeOfDay = (timeOfDay + delta * 0.05) % 1;
    const angle = timeOfDay * Math.PI * 2;
    directionalLight.position.set(Math.cos(angle) * 100, Math.sin(angle) * 100, 50);
    const brightness = Math.max(0, Math.sin(angle));
    directionalLight.intensity = brightness;
    const skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0x0a0a1a), new THREE.Color(0x87ceeb), brightness
    );
    renderer.setClearColor(skyColor);
}

// Player terrain height sampling
function getTerrainHeight(x, z) {
    return Math.sin(x * 0.05) * Math.cos(z * 0.05) * 8 +
           Math.sin(x * 0.1 + 1.5) * Math.cos(z * 0.1) * 4;
}
function updatePlayerHeight(player) {
    player.position.y = getTerrainHeight(player.position.x, player.position.z) + 1.0;
}
`,
  };

  if (g.includes("fps") || g.includes("first person")) return patterns["fps_browser"];
  if (g.includes("racing") || g.includes("race") || g.includes("car")) return patterns["racing_browser"];
  if (g.includes("open world") || g.includes("openworld") || g.includes("exploration")) return patterns["open_world_browser"];
  return patterns["fps_browser"];
}

// ── Babylon.js browser 3D game patterns ──────────────────────────────────────

export function getBabylonPatterns(genre: string): string {
  const g = genre.toLowerCase();

  const base = `
BABYLON.JS BROWSER GAME PATTERN:
CDN: https://cdn.babylonjs.com/babylon.js (optional: https://cdn.babylonjs.com/cannon.js for physics)

// ── SCENE SETUP ───────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Camera
const camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 5, -10), scene);
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true);

// Lights
const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
light.intensity = 0.8;
const dirLight = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-1, -2, -1), scene);
dirLight.position = new BABYLON.Vector3(20, 40, 20);

// Ground
const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene);
const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.3);
ground.material = groundMat;

// Resize
window.addEventListener('resize', () => engine.resize());

// Game loop
engine.runRenderLoop(() => { update(); scene.render(); });
`;

  const fps = `
BABYLON.JS FPS PATTERN:
// UniversalCamera for FPS movement
const camera = new BABYLON.UniversalCamera('fps', new BABYLON.Vector3(0, 2, 0), scene);
camera.setTarget(new BABYLON.Vector3(0, 2, 10));
camera.attachControl(canvas, true);
camera.speed = 0.5;
camera.angularSensibility = 2000;
camera.minZ = 0.1;

// Pointer lock for mouse look
canvas.addEventListener('click', () => canvas.requestPointerLock());

// WASD input (Babylon handles it via UniversalCamera)
camera.keysUp = [87];    // W
camera.keysDown = [83];  // S
camera.keysLeft = [65];  // A
camera.keysRight = [68]; // D

// Gravity + collision
scene.gravity = new BABYLON.Vector3(0, -9.8, 0);
camera.applyGravity = true;
camera.checkCollisions = true;
camera.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
ground.checkCollisions = true;

// Shooting raycast
scene.onPointerDown = (evt) => {
  if (evt.button !== 0) return;
  const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), camera);
  const hit = scene.pickWithRay(ray);
  if (hit.pickedMesh && hit.pickedMesh.metadata?.isEnemy) {
    takeDamage(hit.pickedMesh, 25);
  }
};

// Enemy sphere
function spawnEnemy(pos) {
  const enemy = BABYLON.MeshBuilder.CreateSphere('enemy', { diameter: 1.5 }, scene);
  enemy.position = pos;
  const mat = new BABYLON.StandardMaterial('emat', scene);
  mat.diffuseColor = new BABYLON.Color3(0.9, 0.2, 0.2);
  enemy.material = mat;
  enemy.metadata = { isEnemy: true, hp: 50 };
  enemies.push(enemy);
}
`;

  const platformer3d = `
BABYLON.JS 3D PLATFORMER PATTERN:
// ArcRotateCamera for third-person
const camera = new BABYLON.ArcRotateCamera('cam', -Math.PI/2, Math.PI/3, 10, BABYLON.Vector3.Zero(), scene);
camera.attachControl(canvas, false);
camera.lowerRadiusLimit = 4; camera.upperRadiusLimit = 15;

// Player box with physics impostor
const player = BABYLON.MeshBuilder.CreateBox('player', { width: 0.8, height: 1.8, depth: 0.8 }, scene);
player.position = new BABYLON.Vector3(0, 1, 0);
scene.enablePhysics(new BABYLON.Vector3(0, -20, 0), new BABYLON.CannonJSPlugin());
player.physicsImpostor = new BABYLON.PhysicsImpostor(player, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, friction: 0.5 });
ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 });

// Input
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

let onGround = false;
scene.registerAfterRender(() => {
  const vel = player.physicsImpostor.getLinearVelocity();
  const speed = 6;
  const forward = camera.getForwardRay().direction;
  forward.y = 0; forward.normalize();
  const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up());
  let move = BABYLON.Vector3.Zero();
  if (keys['KeyW']) move.addInPlace(forward);
  if (keys['KeyS']) move.subtractInPlace(forward);
  if (keys['KeyA']) move.subtractInPlace(right);
  if (keys['KeyD']) move.addInPlace(right);
  if (move.length() > 0) move.normalize().scaleInPlace(speed);
  player.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(move.x, vel.y, move.z));
  if (keys['Space'] && onGround) {
    player.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(vel.x, 12, vel.z));
    onGround = false;
  }
  camera.target = player.position.add(new BABYLON.Vector3(0, 1, 0));
  // Check on ground
  onGround = Math.abs(vel.y) < 0.1 && player.position.y < 1.1;
});
`;

  if (g.includes("fps") || g.includes("shooter") || g.includes("first person")) return base + fps;
  if (g.includes("platformer") || g.includes("platform") || g.includes("jump")) return base + platformer3d;
  return base + fps;
}

// ── Engine detector ───────────────────────────────────────────────────────────

export function detectEngine(text: string): "godot2d" | "godot3d" | "phaser" | "threejs" | "babylon" {
  const lower = text.toLowerCase();

  if (lower.includes("babylon") || lower.includes("babylon.js") || lower.includes("babylonjs")) {
    return "babylon";
  }
  if (lower.includes("three.js") || lower.includes("threejs") || lower.includes("three js")) {
    return "threejs";
  }
  if (lower.includes("phaser")) {
    return "phaser";
  }
  if (lower.includes("browser game") || lower.includes("html game") || lower.includes("html5 game")) {
    return "phaser";
  }
  if (lower.includes("fps") || lower.includes("first person shooter") || lower.includes("first-person")) {
    return "godot3d";
  }
  if (lower.includes("3d") && !lower.includes("html") && !lower.includes("browser")) {
    return "godot3d";
  }
  return "godot2d";
}
