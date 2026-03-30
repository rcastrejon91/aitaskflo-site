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
  // Always inject the list of existing games so Lyra always remembers them
  const games = listExistingGames();
  const gamesNote = games.length > 0
    ? `\n\nGAMES YOU HAVE BUILT (on disk — always remember these when asked):\n${games.map(g => `  • ${g}`).join("\n")}\n`
    : "";

  if (isGameTopic(message)) {
    // Add inspiration note if a known game is referenced
    const inspiration = detectGameInspiration(message);
    const inspirationNote = inspiration
      ? `\nKNOWN GAME REFERENCE DETECTED — build inspired by this:\nGenre: ${inspiration.genre}\nConcept: ${inspiration.concept}\nKey features to include: ${inspiration.keyFeatures}\n`
      : "";
    return GAME_DEV_CONTEXT + inspirationNote + gamesNote;
  }
  return gamesNote;
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

// ── Engine detector ───────────────────────────────────────────────────────────

export function detectEngine(text: string): "godot2d" | "godot3d" | "phaser" | "threejs" {
  const lower = text.toLowerCase();

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
