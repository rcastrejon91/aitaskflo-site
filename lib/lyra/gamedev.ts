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

// ── Context builder ───────────────────────────────────────────────────────────

/**
 * Returns the full game dev context if the user message is game-related,
 * otherwise returns empty string.
 */
export function buildGameContext(message: string): string {
  if (isGameTopic(message)) {
    return GAME_DEV_CONTEXT;
  }
  return "";
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

    "life sim": `# alias to simulation
`,
    sims: `# alias to simulation
`,
  };

  // Match genre to closest key
  const keys = Object.keys(patterns);
  // Check for simulation/life sim aliases
  if (g.includes("sim") || g.includes("life") || g.includes("tycoon") || g.includes("management")) {
    return patterns["simulation"];
  }
  const match = keys.find(k => g.includes(k) || k.includes(g)) ?? "platformer";
  return patterns[match] ?? patterns["platformer"];
}
