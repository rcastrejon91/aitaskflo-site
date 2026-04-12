extends Control

@onready var resume_button: Button = $PanelContainer/VBoxContainer/ResumeButton
@onready var save_button: Button = $PanelContainer/VBoxContainer/SaveButton
@onready var menu_button: Button = $PanelContainer/VBoxContainer/MenuButton
@onready var stats_label: Label = $PanelContainer/VBoxContainer/StatsLabel
@onready var save_status: Label = $PanelContainer/VBoxContainer/SaveStatus

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	resume_button.pressed.connect(_on_resume_pressed)
	save_button.pressed.connect(_on_save_pressed)
	menu_button.pressed.connect(_on_menu_pressed)
	visible = false
	save_status.text = ""


func _input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		if visible:
			_resume()
		else:
			_pause()


func _pause() -> void:
	visible = true
	get_tree().paused = true
	_update_stats()


func _resume() -> void:
	visible = false
	get_tree().paused = false


func _update_stats() -> void:
	var s := GameManager.player_stats
	stats_label.text = "Level: %d | STR: %d | DEX: %d | INT: %d\nHP: %d/%d | MP: %d/%d\nGold: %d | Artifacts: %d" % [
		s["level"], s["str"], s["dex"], s["int"],
		int(s["hp"]), int(s["max_hp"]), int(s["mp"]), int(s["max_mp"]),
		GameManager.gold, GameManager.collected_artifacts.size()
	]


func _on_resume_pressed() -> void:
	_resume()


func _on_save_pressed() -> void:
	if SaveManager.save_game():
		save_status.text = "Game saved!"
	else:
		save_status.text = "Save failed!"


func _on_menu_pressed() -> void:
	get_tree().paused = false
	GameManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/ui/MainMenu.tscn")
