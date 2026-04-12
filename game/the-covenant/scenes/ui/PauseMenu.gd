extends CanvasLayer

@onready var panel: PanelContainer = $Panel
@onready var resume_button: Button = $Panel/VBox/ResumeButton
@onready var save_button: Button = $Panel/VBox/SaveButton
@onready var menu_button: Button = $Panel/VBox/MenuButton
@onready var stats_label: Label = $Panel/VBox/StatsLabel

var is_open: bool = false

func _ready() -> void:
	layer = 20
	process_mode = Node.PROCESS_MODE_ALWAYS
	resume_button.pressed.connect(_on_resume)
	save_button.pressed.connect(_on_save)
	menu_button.pressed.connect(_on_menu)
	panel.visible = false

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		if is_open:
			_close_menu()
		else:
			_open_menu()
		get_viewport().set_input_as_handled()

func _open_menu() -> void:
	is_open = true
	panel.visible = true
	get_tree().paused = true
	GameManager.is_paused = true
	_update_stats_display()

func _close_menu() -> void:
	is_open = false
	panel.visible = false
	get_tree().paused = false
	GameManager.is_paused = false

func _update_stats_display() -> void:
	var s = GameManager.stats
	var minutes = int(GameManager.total_play_time) / 60
	var seconds = int(GameManager.total_play_time) % 60
	stats_label.text = "Level: %d | STR: %d | DEX: %d | INT: %d | VIT: %d\nATK: %d | DEF: %d | MATK: %d\nHP: %d/%d | MP: %d/%d\nGold: %d | Fragments: %d/%d | Time: %02d:%02d" % [
		s.level, s.str, s.dex, s["int"], s.vit,
		s.attack, s.defense, s.magic_attack,
		s.hp, s.max_hp, s.mp, s.max_mp,
		s.gold, GameManager.covenant_fragments_collected, GameManager.max_covenant_fragments,
		minutes, seconds
	]

func _on_resume() -> void:
	_close_menu()

func _on_save() -> void:
	if SaveManager.save_game():
		save_button.text = "Saved!"
		await get_tree().create_timer(1.0).timeout
		save_button.text = "Save Game"

func _on_menu() -> void:
	_close_menu()
	get_tree().change_scene_to_file("res://scenes/ui/MainMenu.tscn")
