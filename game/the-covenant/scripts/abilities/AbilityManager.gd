extends Node
## AbilityManager — Global autoload that tracks all player abilities,
## their unlock state, cooldowns, upgrade levels, and provides
## balance calculations. Dark fantasy themed powers.

signal ability_unlocked(ability_id: String)
signal ability_upgraded(ability_id: String, new_level: int)
signal ability_used(ability_id: String)
signal cooldown_updated(ability_id: String, remaining: float, total: float)

# ─────────────────── Ability Definitions ───────────────────

# Each ability has: name, description, mp_cost, cooldown, base_damage,
# unlock_level (player level needed), max_upgrade, icon_symbol, slot
var ability_defs: Dictionary = {
	"inferno_blast": {
		"name": "Inferno Blast",
		"description": "Unleash a devastating ring of cursed fire around you.",
		"mp_cost": 25,
		"cooldown": 4.0,
		"base_damage": 35,
		"unlock_level": 1,
		"max_upgrade": 5,
		"icon": "🔥",
		"color": Color(1.0, 0.3, 0.0),
		"slot": 0,
		"type": "fire"
	},
	"frost_nova": {
		"name": "Frost Nova",
		"description": "Freeze the air around you, slowing and damaging all nearby foes.",
		"mp_cost": 20,
		"cooldown": 5.0,
		"base_damage": 20,
		"unlock_level": 1,
		"max_upgrade": 5,
		"icon": "❄",
		"color": Color(0.3, 0.7, 1.0),
		"slot": 1,
		"type": "ice"
	},
	"shadow_step": {
		"name": "Shadow Step",
		"description": "Dissolve into shadow and reappear ahead, invulnerable during the dash.",
		"mp_cost": 10,
		"cooldown": 2.0,
		"base_damage": 0,
		"unlock_level": 1,
		"max_upgrade": 5,
		"icon": "👁",
		"color": Color(0.4, 0.0, 0.6),
		"slot": 2,
		"type": "shadow"
	},
	"soul_drain": {
		"name": "Soul Drain",
		"description": "Rip the life force from a nearby enemy, healing yourself.",
		"mp_cost": 30,
		"cooldown": 6.0,
		"base_damage": 40,
		"unlock_level": 2,
		"max_upgrade": 5,
		"icon": "💀",
		"color": Color(0.0, 0.9, 0.3),
		"slot": 3,
		"type": "shadow"
	},
	"blood_tithe": {
		"name": "Blood Tithe",
		"description": "Sacrifice your own blood to unleash a massive explosion of dark energy.",
		"mp_cost": 15,
		"cooldown": 8.0,
		"base_damage": 60,
		"unlock_level": 3,
		"max_upgrade": 5,
		"icon": "🩸",
		"color": Color(0.8, 0.0, 0.2),
		"slot": -1,
		"type": "dark",
		"hp_cost": 30
	},
	"supercharge": {
		"name": "Supercharged Strike",
		"description": "Channel dark power into your weapon for a devastating enhanced blow.",
		"mp_cost": 12,
		"cooldown": 3.5,
		"base_damage": 50,
		"unlock_level": 2,
		"max_upgrade": 5,
		"icon": "⚡",
		"color": Color(1.0, 0.85, 0.0),
		"slot": -1,
		"type": "physical"
	},
	"telekinesis": {
		"name": "Telekinesis",
		"description": "Use dark psychic force to grab and hurl objects at enemies. Power scales with your level.",
		"mp_cost": 15,
		"cooldown": 1.5,
		"base_damage": 20,
		"unlock_level": 1,
		"max_upgrade": 5,
		"icon": "🖐",
		"color": Color(0.6, 0.2, 1.0),
		"slot": -1,
		"type": "psychic"
	},
	"time_freeze": {
		"name": "Temporal Shatter",
		"description": "Freeze all enemies and the environment in time for 5 seconds. 30s cooldown.",
		"mp_cost": 35,
		"cooldown": 30.0,
		"base_damage": 0,
		"unlock_level": 1,
		"max_upgrade": 3,
		"icon": "⏱",
		"color": Color(0.3, 0.2, 0.8),
		"slot": -1,
		"type": "temporal"
	}
}

# ─────────────────── Player Ability State ───────────────────

# Which abilities are unlocked
var unlocked_abilities: Dictionary = {}  # ability_id -> true

# Upgrade levels (1 = base, up to max_upgrade)
var ability_levels: Dictionary = {}  # ability_id -> int

# Current cooldown timers
var cooldown_timers: Dictionary = {}  # ability_id -> float remaining

# Ability slots (quick bar) - maps slot index to ability_id
var ability_slots: Array = ["inferno_blast", "frost_nova", "shadow_step", "soul_drain"]

# Supercharge state
var supercharge_active: bool = false
var supercharge_timer: float = 0.0
var supercharge_duration: float = 5.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	# Unlock starter abilities
	unlock_ability("inferno_blast")
	unlock_ability("frost_nova")
	unlock_ability("shadow_step")
	unlock_ability("telekinesis")
	unlock_ability("time_freeze")

func _process(delta: float) -> void:
	if GameManager.is_paused:
		return
	# Tick all cooldowns
	for ability_id in cooldown_timers:
		if cooldown_timers[ability_id] > 0:
			cooldown_timers[ability_id] = max(0.0, cooldown_timers[ability_id] - delta)
			cooldown_updated.emit(ability_id, cooldown_timers[ability_id], get_ability_cooldown(ability_id))

	# Supercharge duration
	if supercharge_active:
		supercharge_timer -= delta
		if supercharge_timer <= 0:
			supercharge_active = false

# ─────────────────── Unlock / Upgrade ───────────────────

func unlock_ability(ability_id: String) -> void:
	if ability_id in ability_defs and ability_id not in unlocked_abilities:
		unlocked_abilities[ability_id] = true
		ability_levels[ability_id] = 1
		cooldown_timers[ability_id] = 0.0
		ability_unlocked.emit(ability_id)

func upgrade_ability(ability_id: String) -> bool:
	if ability_id not in unlocked_abilities:
		return false
	var max_lvl = ability_defs[ability_id].max_upgrade
	var current = ability_levels.get(ability_id, 1)
	if current >= max_lvl:
		return false
	ability_levels[ability_id] = current + 1
	ability_upgraded.emit(ability_id, current + 1)
	return true

func get_ability_level(ability_id: String) -> int:
	return ability_levels.get(ability_id, 0)

func is_unlocked(ability_id: String) -> bool:
	return ability_id in unlocked_abilities

# ─────────────────── Cooldown & Cost Checks ───────────────────

func can_use_ability(ability_id: String) -> bool:
	if ability_id not in unlocked_abilities:
		return false
	if cooldown_timers.get(ability_id, 0.0) > 0:
		return false
	var def = ability_defs[ability_id]
	if GameManager.stats.mp < get_ability_mp_cost(ability_id):
		return false
	# Blood Tithe HP check
	if ability_id == "blood_tithe":
		var hp_cost = get_blood_tithe_hp_cost()
		if GameManager.stats.hp <= hp_cost:
			return false
	return true

func use_ability(ability_id: String) -> bool:
	if not can_use_ability(ability_id):
		return false
	var mp_cost = get_ability_mp_cost(ability_id)
	if not GameManager.use_mp(mp_cost):
		return false
	# Blood Tithe HP sacrifice
	if ability_id == "blood_tithe":
		var hp_cost = get_blood_tithe_hp_cost()
		GameManager.stats.hp = max(1, GameManager.stats.hp - hp_cost)
		GameManager.player_stats_changed.emit()
	cooldown_timers[ability_id] = get_ability_cooldown(ability_id)
	ability_used.emit(ability_id)
	return true

func start_cooldown(ability_id: String) -> void:
	cooldown_timers[ability_id] = get_ability_cooldown(ability_id)

func get_cooldown_remaining(ability_id: String) -> float:
	return cooldown_timers.get(ability_id, 0.0)

func is_on_cooldown(ability_id: String) -> bool:
	return cooldown_timers.get(ability_id, 0.0) > 0

# ─────────────────── Scaling Formulas ───────────────────

func get_ability_mp_cost(ability_id: String) -> int:
	var def = ability_defs.get(ability_id, {})
	var base_cost = def.get("mp_cost", 10)
	var level = ability_levels.get(ability_id, 1)
	# Slight cost reduction with upgrades
	return max(5, int(base_cost * (1.0 - (level - 1) * 0.05)))

func get_ability_cooldown(ability_id: String) -> float:
	var def = ability_defs.get(ability_id, {})
	var base_cd = def.get("cooldown", 5.0)
	var level = ability_levels.get(ability_id, 1)
	return base_cd * (1.0 - (level - 1) * 0.05)

func get_ability_damage(ability_id: String) -> int:
	var def = ability_defs.get(ability_id, {})
	var base_dmg = def.get("base_damage", 10)
	var level = ability_levels.get(ability_id, 1)
	var player_level = GameManager.stats.level
	var scaling = 1.0 + (level - 1) * 0.15 + (player_level - 1) * 0.08
	return int(base_dmg * scaling)

func get_blood_tithe_hp_cost() -> int:
	var base_hp = ability_defs["blood_tithe"].get("hp_cost", 30)
	var level = ability_levels.get("blood_tithe", 1)
	return max(10, int(base_hp * (1.0 - (level - 1) * 0.08)))

# ─────────────────── Telekinesis Scaling ───────────────────

func get_telekinesis_power_scale() -> float:
	## Returns a power multiplier for telekinesis based on player level and ability level
	var ability_level = ability_levels.get("telekinesis", 1)
	var player_level = GameManager.stats.level
	var base_power = 1.0
	var level_bonus = (player_level - 1) * 0.12
	var upgrade_bonus = (ability_level - 1) * 0.20
	return base_power + level_bonus + upgrade_bonus

func get_telekinesis_range() -> float:
	## Returns the telekinesis grab range, scaling with ability level
	var ability_level = ability_levels.get("telekinesis", 1)
	var base_range = 120.0
	return base_range + (ability_level - 1) * 15.0

# ─────────────────── Serialization ───────────────────

func get_save_data() -> Dictionary:
	return {
		"unlocked": unlocked_abilities.duplicate(),
		"levels": ability_levels.duplicate(),
		"cooldowns": cooldown_timers.duplicate(),
		"slots": ability_slots.duplicate()
	}

func load_save_data(data: Dictionary) -> void:
	unlocked_abilities = data.get("unlocked", {})
	ability_levels = data.get("levels", {})
	cooldown_timers = data.get("cooldowns", {})
	ability_slots = data.get("slots", ability_slots)
