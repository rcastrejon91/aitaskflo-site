extends Control

@onready var score_label: Label = $VBoxContainer/ScoreLabel
@onready var stats_label: Label = $VBoxContainer/StatsLabel
@onready var retry_button: Button = $VBoxContainer/ButtonContainer/RetryButton
@onready var menu_button: Button = $VBoxContainer/ButtonContainer/MenuButton

func _ready() -> void:
	retry_button.pressed.connect(_on_retry_pressed)
	menu_button.pressed.connect(_on_menu_pressed)
	
	score_label.text = "Score: " + str(GameManager.score)
	
	var total_seconds := int(GameManager.play_time)
	var minutes := total_seconds / 60
	var seconds := total_seconds % 60
	stats_label.text = "Level: %d | Enemies Slain: %d | Artifacts: %d | Time: %02d:%02d" % [
		GameManager.player_stats["level"],
		GameManager.killed_enemies_count,
		GameManager.collected_artifacts.size(),
		minutes, seconds
	]


func _on_retry_pressed() -> void:
	GameManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/world/Level1.tscn")


func _on_menu_pressed() -> void:
	GameManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/ui/MainMenu.tscn")
