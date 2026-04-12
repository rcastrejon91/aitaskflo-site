extends Node

signal player_stats_changed(stats: Dictionary)
signal gold_changed(amount: int)
signal xp_changed(xp: int, xp_needed: int)
signal level_up(new_level: int)
signal quest_updated(quest_id: String)
signal time_frozen(is_frozen: bool)
signal scene_transition_requested(scene_path: String)
signal player_died()
signal enemy_killed(enemy_name: String)
signal artifact_collected(artifact_id: String)

var player_stats: Dictionary = {
	"str": 12,
	"dex": 10,
	"int": 14,
	"hp": 120,
	"max_hp": 120,
	"mp": 80,
	"max_mp": 80,
	"defense": 5,
	"speed": 10,
	"level": 1,
	"xp": 0,
}

var gold: int = 0
var score: int = 0
var current_level_path: String = ""
var is_time_frozen: bool = false
var time_freeze_duration: float = 5.0
var time_freeze_cooldown: float = 15.0
var time_freeze_timer: float = 0.0
var time_freeze_cooldown_timer: float = 0.0
var can_time_freeze: bool = true

var inventory: Array[Dictionary] = []
var max_inventory_slots: int = 20
var equipment: Dictionary = {
	"weapon": null,
	"armor": null,
	"accessory": null
}

var active_quests: Array[Dictionary] = []
var completed_quests: Array[String] = []

var status_effects: Dictionary = {}

var collected_artifacts: Array[String] = []
var killed_enemies_count: int = 0
var play_time: float = 0.0

var telekinesis_range: float = 200.0
var telekinesis_power: float = 1.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


func _process(delta: float) -> void:
	if not get_tree().paused:
		play_time += delta
	
	if is_time_frozen:
		time_freeze_timer -= delta
		if time_freeze_timer <= 0.0:
			unfreeze_time()
	
	if not can_time_freeze:
		time_freeze_cooldown_timer -= delta
		if time_freeze_cooldown_timer <= 0.0:
			can_time_freeze = true
	
	_process_status_effects(delta)


func xp_for_level(lvl: int) -> int:
	return int(100 * pow(lvl, 1.5))


func add_xp(amount: int) -> void:
	player_stats["xp"] += amount
	var needed := xp_for_level(player_stats["level"])
	while player_stats["xp"] >= needed:
		player_stats["xp"] -= needed
		player_stats["level"] += 1
		_apply_level_up()
		needed = xp_for_level(player_stats["level"])
	xp_changed.emit(player_stats["xp"], xp_for_level(player_stats["level"]))


func _apply_level_up() -> void:
	player_stats["max_hp"] += 10
	player_stats["hp"] = player_stats["max_hp"]
	player_stats["max_mp"] += 5
	player_stats["mp"] = player_stats["max_mp"]
	player_stats["str"] += 1
	player_stats["dex"] += 1
	player_stats["int"] += 1
	player_stats["defense"] += 1
	level_up.emit(player_stats["level"])
	player_stats_changed.emit(player_stats)


func calculate_damage(base_damage: float, attacker_str: int = 10) -> int:
	return int(base_damage * (1.0 + (attacker_str - 10) * 0.05) * randf_range(0.9, 1.1))


func add_gold(amount: int) -> void:
	gold += amount
	gold_changed.emit(gold)


func add_score(amount: int) -> void:
	score += amount


func add_to_inventory(item: Dictionary) -> bool:
	if inventory.size() < max_inventory_slots:
		inventory.append(item)
		return true
	return false


func remove_from_inventory(index: int) -> void:
	if index >= 0 and index < inventory.size():
		inventory.remove_at(index)


func equip_item(slot: String, item: Dictionary) -> void:
	if equipment.has(slot):
		if equipment[slot] != null:
			add_to_inventory(equipment[slot])
		equipment[slot] = item
		player_stats_changed.emit(player_stats)


func freeze_time() -> void:
	if can_time_freeze and player_stats["mp"] >= 20:
		is_time_frozen = true
		can_time_freeze = false
		time_freeze_timer = time_freeze_duration
		time_freeze_cooldown_timer = time_freeze_cooldown
		player_stats["mp"] -= 20
		player_stats_changed.emit(player_stats)
		time_frozen.emit(true)


func unfreeze_time() -> void:
	is_time_frozen = false
	time_freeze_timer = 0.0
	time_frozen.emit(false)


func add_status_effect(effect_name: String, duration: float, strength: float) -> void:
	status_effects[effect_name] = {"duration": duration, "strength": strength}


func _process_status_effects(delta: float) -> void:
	var to_remove: Array[String] = []
	for effect_name in status_effects:
		status_effects[effect_name]["duration"] -= delta
		if status_effects[effect_name]["duration"] <= 0:
			to_remove.append(effect_name)
		else:
			match effect_name:
				"poison":
					player_stats["hp"] -= status_effects[effect_name]["strength"] * delta
					player_stats_changed.emit(player_stats)
				"regen":
					player_stats["hp"] = min(player_stats["hp"] + status_effects[effect_name]["strength"] * delta, player_stats["max_hp"])
					player_stats_changed.emit(player_stats)
	for effect_name in to_remove:
		status_effects.erase(effect_name)


func add_quest(quest: Dictionary) -> void:
	active_quests.append(quest)
	quest_updated.emit(quest["id"])


func complete_quest(quest_id: String) -> void:
	for i in range(active_quests.size()):
		if active_quests[i]["id"] == quest_id:
			completed_quests.append(quest_id)
			active_quests.remove_at(i)
			quest_updated.emit(quest_id)
			return


func collect_artifact(artifact_id: String) -> void:
	if artifact_id not in collected_artifacts:
		collected_artifacts.append(artifact_id)
		add_score(500)
		artifact_collected.emit(artifact_id)


func change_scene(scene_path: String) -> void:
	current_level_path = scene_path
	get_tree().change_scene_to_file(scene_path)


func reset_game() -> void:
	player_stats = {
		"str": 12,
		"dex": 10,
		"int": 14,
		"hp": 120,
		"max_hp": 120,
		"mp": 80,
		"max_mp": 80,
		"defense": 5,
		"speed": 10,
		"level": 1,
		"xp": 0,
	}
	gold = 0
	score = 0
	inventory.clear()
	equipment = {"weapon": null, "armor": null, "accessory": null}
	active_quests.clear()
	completed_quests.clear()
	status_effects.clear()
	collected_artifacts.clear()
	killed_enemies_count = 0
	play_time = 0.0
	is_time_frozen = false
	can_time_freeze = true
	time_freeze_timer = 0.0
	time_freeze_cooldown_timer = 0.0
