extends Node

const SAVE_PATH: String = "user://covenant_save.dat"

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func save_game() -> bool:
	var save_data: Dictionary = {
		"stats": GameManager.stats,
		"equipment": GameManager.equipment,
		"inventory": GameManager.inventory,
		"active_quests": GameManager.active_quests,
		"completed_quests": GameManager.completed_quests,
		"current_level": GameManager.current_level,
		"enemies_defeated": GameManager.enemies_defeated,
		"total_play_time": GameManager.total_play_time,
		"covenant_fragments_collected": GameManager.covenant_fragments_collected,
		"dark_pacts_made": GameManager.dark_pacts_made,
		"lore_flags": GameManager.lore_flags
	}
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return false
	file.store_var(save_data)
	file.close()
	return true

func load_game() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return false
	var save_data = file.get_var()
	file.close()
	if save_data == null or not save_data is Dictionary:
		return false
	GameManager.stats = save_data.get("stats", GameManager.stats)
	GameManager.equipment = save_data.get("equipment", GameManager.equipment)
	GameManager.inventory = save_data.get("inventory", GameManager.inventory)
	GameManager.active_quests = save_data.get("active_quests", [])
	GameManager.completed_quests = save_data.get("completed_quests", [])
	GameManager.current_level = save_data.get("current_level", "Level1")
	GameManager.enemies_defeated = save_data.get("enemies_defeated", 0)
	GameManager.total_play_time = save_data.get("total_play_time", 0.0)
	GameManager.covenant_fragments_collected = save_data.get("covenant_fragments_collected", 0)
	GameManager.dark_pacts_made = save_data.get("dark_pacts_made", 0)
	GameManager.lore_flags = save_data.get("lore_flags", GameManager.lore_flags)
	return true

func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)

func delete_save() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.remove_absolute(SAVE_PATH)
