extends Node

const SAVE_PATH := "user://covenant2_save.json"

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


func save_game() -> bool:
	var save_data := {
		"player_stats": GameManager.player_stats,
		"gold": GameManager.gold,
		"score": GameManager.score,
		"inventory": GameManager.inventory,
		"equipment": GameManager.equipment,
		"active_quests": GameManager.active_quests,
		"completed_quests": GameManager.completed_quests,
		"collected_artifacts": GameManager.collected_artifacts,
		"killed_enemies_count": GameManager.killed_enemies_count,
		"play_time": GameManager.play_time,
		"current_level": GameManager.current_level_path,
	}
	
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(save_data, "\t"))
	file.close()
	return true


func load_game() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return false
	
	var json_string := file.get_as_text()
	file.close()
	
	var json := JSON.new()
	var error := json.parse(json_string)
	if error != OK:
		return false
	
	var data: Dictionary = json.data
	
	if data.has("player_stats"):
		for key in data["player_stats"]:
			GameManager.player_stats[key] = data["player_stats"][key]
	if data.has("gold"):
		GameManager.gold = int(data["gold"])
	if data.has("score"):
		GameManager.score = int(data["score"])
	if data.has("inventory"):
		GameManager.inventory.clear()
		for item in data["inventory"]:
			GameManager.inventory.append(item)
	if data.has("completed_quests"):
		GameManager.completed_quests.clear()
		for q in data["completed_quests"]:
			GameManager.completed_quests.append(q)
	if data.has("collected_artifacts"):
		GameManager.collected_artifacts.clear()
		for a in data["collected_artifacts"]:
			GameManager.collected_artifacts.append(a)
	if data.has("killed_enemies_count"):
		GameManager.killed_enemies_count = int(data["killed_enemies_count"])
	if data.has("play_time"):
		GameManager.play_time = float(data["play_time"])
	if data.has("current_level"):
		GameManager.current_level_path = data["current_level"]
	
	return true


func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)


func delete_save() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.remove_absolute(SAVE_PATH)
