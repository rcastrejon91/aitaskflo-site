extends Node

signal player_stats_changed
signal gold_changed(amount: int)
signal xp_gained(amount: int)
signal level_up(new_level: int)
signal quest_updated(quest_id: String)
signal player_died
signal scene_transition_requested(scene_path: String)

# Player stats
var stats: Dictionary = {
	"str": 12,
	"dex": 10,
	"int": 14,
	"vit": 10,
	"hp": 120,
	"max_hp": 120,
	"mp": 80,
	"max_mp": 80,
	"level": 1,
	"xp": 0,
	"gold": 0,
	"attack": 15,
	"defense": 5,
	"magic_attack": 18,
	"speed": 100.0
}

# Equipment slots
var equipment: Dictionary = {
	"weapon": null,
	"armor": null,
	"accessory": null
}

# Inventory
var inventory: Array = []
var max_inventory_slots: int = 20

# Quests
var active_quests: Array = []
var completed_quests: Array = []

# Status effects
var status_effects: Dictionary = {}

# Game state
var current_level: String = "Level1"
var is_paused: bool = false
var enemies_defeated: int = 0
var total_play_time: float = 0.0
var covenant_fragments_collected: int = 0
var max_covenant_fragments: int = 5
var dark_pacts_made: int = 0

# Covenant lore flags
var lore_flags: Dictionary = {
	"met_elder": false,
	"found_first_fragment": false,
	"learned_dark_magic": false,
	"entered_shadow_realm": false,
	"discovered_betrayal": false
}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func _process(delta: float) -> void:
	if not is_paused:
		total_play_time += delta
		_update_status_effects(delta)

func xp_for_level(lvl: int) -> int:
	return int(100 * pow(lvl, 1.5))

func add_xp(amount: int) -> void:
	stats.xp += amount
	xp_gained.emit(amount)
	var needed = xp_for_level(stats.level)
	while stats.xp >= needed:
		stats.xp -= needed
		stats.level += 1
		_apply_level_up()
		level_up.emit(stats.level)
		needed = xp_for_level(stats.level)
	player_stats_changed.emit()

func _apply_level_up() -> void:
	stats.max_hp += 10 + stats.vit
	stats.hp = stats.max_hp
	stats.max_mp += 5 + int(stats["int"] * 0.5)
	stats.mp = stats.max_mp
	stats.attack += 2
	stats.defense += 1
	stats.magic_attack += 3
	stats.str += 1
	stats.dex += 1
	stats["int"] += 1
	stats.vit += 1

func add_gold(amount: int) -> void:
	stats.gold += amount
	gold_changed.emit(stats.gold)
	player_stats_changed.emit()

func take_damage(amount: int) -> int:
	var actual_damage = max(1, amount - stats.defense)
	stats.hp = max(0, stats.hp - actual_damage)
	player_stats_changed.emit()
	if stats.hp <= 0:
		player_died.emit()
	return actual_damage

func heal(amount: int) -> void:
	stats.hp = min(stats.max_hp, stats.hp + amount)
	player_stats_changed.emit()

func use_mp(amount: int) -> bool:
	if stats.mp >= amount:
		stats.mp -= amount
		player_stats_changed.emit()
		return true
	return false

func restore_mp(amount: int) -> void:
	stats.mp = min(stats.max_mp, stats.mp + amount)
	player_stats_changed.emit()

func calculate_physical_damage(base_damage: int) -> int:
	return int(base_damage * (1.0 + (stats.str - 10) * 0.05) * randf_range(0.9, 1.1))

func calculate_magic_damage(base_damage: int) -> int:
	return int(base_damage * (1.0 + (stats["int"] - 10) * 0.07) * randf_range(0.9, 1.1))

func add_to_inventory(item: Dictionary) -> bool:
	if inventory.size() < max_inventory_slots:
		inventory.append(item)
		return true
	return false

func remove_from_inventory(index: int) -> void:
	if index >= 0 and index < inventory.size():
		inventory.remove_at(index)

func add_quest(quest_id: String, quest_data: Dictionary) -> void:
	quest_data["id"] = quest_id
	active_quests.append(quest_data)
	quest_updated.emit(quest_id)

func complete_quest(quest_id: String) -> void:
	for i in range(active_quests.size() - 1, -1, -1):
		if active_quests[i].get("id") == quest_id:
			completed_quests.append(quest_id)
			active_quests.remove_at(i)
			quest_updated.emit(quest_id)
			break

func add_status_effect(effect_name: String, duration: float, strength: float) -> void:
	status_effects[effect_name] = {"duration": duration, "strength": strength}

func _update_status_effects(delta: float) -> void:
	var to_remove: Array = []
	for effect_name in status_effects:
		status_effects[effect_name].duration -= delta
		if effect_name == "poison":
			stats.hp = max(1, stats.hp - int(status_effects[effect_name].strength * delta))
			player_stats_changed.emit()
		elif effect_name == "regen":
			heal(int(status_effects[effect_name].strength * delta))
		if status_effects[effect_name].duration <= 0:
			to_remove.append(effect_name)
	for effect_name in to_remove:
		status_effects.erase(effect_name)

func collect_covenant_fragment() -> void:
	covenant_fragments_collected += 1
	if covenant_fragments_collected >= max_covenant_fragments:
		lore_flags["discovered_betrayal"] = true

func make_dark_pact() -> void:
	dark_pacts_made += 1
	stats.magic_attack += 5
	stats.max_hp -= 10
	stats.hp = min(stats.hp, stats.max_hp)
	player_stats_changed.emit()

func change_scene(scene_path: String) -> void:
	get_tree().change_scene_to_file(scene_path)

func reset_game() -> void:
	stats = {
		"str": 12, "dex": 10, "int": 14, "vit": 10,
		"hp": 120, "max_hp": 120, "mp": 80, "max_mp": 80,
		"level": 1, "xp": 0, "gold": 0,
		"attack": 15, "defense": 5, "magic_attack": 18, "speed": 100.0
	}
	equipment = {"weapon": null, "armor": null, "accessory": null}
	inventory.clear()
	active_quests.clear()
	completed_quests.clear()
	status_effects.clear()
	enemies_defeated = 0
	total_play_time = 0.0
	covenant_fragments_collected = 0
	dark_pacts_made = 0
	lore_flags = {
		"met_elder": false, "found_first_fragment": false,
		"learned_dark_magic": false, "entered_shadow_realm": false,
		"discovered_betrayal": false
	}
	current_level = "Level1"
	is_paused = false
