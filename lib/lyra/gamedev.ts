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
