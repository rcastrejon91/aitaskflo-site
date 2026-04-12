extends Control

@onready var title_label: Label = $VBox/TitleLabel
@onready var stats_label: Label = $VBox/StatsLabel
@onready var retry_button: Button = $VBox/ButtonContainer/RetryButton
@onready var menu_button: Button = $VBox/ButtonContainer/MenuButton

func _ready() -> void:
	retry_button.pressed.connect(_on_retry_pressed)
	menu_button.pressed.connect(_on_menu_pressed)
	_display_stats()

func _display_stats() -> void:
	var minutes = int(GameManager.total_play_time) / 60
	var seconds = int(GameManager.total_play_time) % 60
	stats_label.text = "Level Reached: %d\nEnemies Defeated: %d\nGold Collected: %d\nFragments Found: %d/%d\nDark Pacts Made: %d\nTime: %02d:%02d" % [
		GameManager.stats.level,
		GameManager.enemies_defeated,
		GameManager.stats.gold,
		GameManager.covenant_fragments_collected,
		GameManager.max_covenant_fragments,
		GameManager.dark_pacts_made,
		minutes, seconds
	]

func _on_retry_pressed() -> void:
	GameManager.reset_game()
	GameManager.add_quest("investigate_ruins", {"name": "Investigate the Ancient Ruins", "description": "Explore the ruins and find covenant fragments."})
	get_tree().change_scene_to_file("res://scenes/world/Level1.tscn")

func _on_menu_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/ui/MainMenu.tscn")
