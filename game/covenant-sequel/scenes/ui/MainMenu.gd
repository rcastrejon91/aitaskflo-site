extends Control

@onready var title_label: Label = $VBoxContainer/TitleLabel
@onready var subtitle_label: Label = $VBoxContainer/SubtitleLabel
@onready var play_button: Button = $VBoxContainer/ButtonContainer/PlayButton
@onready var continue_button: Button = $VBoxContainer/ButtonContainer/ContinueButton
@onready var credits_button: Button = $VBoxContainer/ButtonContainer/CreditsButton
@onready var quit_button: Button = $VBoxContainer/ButtonContainer/QuitButton
@onready var credits_panel: PanelContainer = $CreditsPanel
@onready var back_button: Button = $CreditsPanel/VBox/BackButton

var title_time: float = 0.0

func _ready() -> void:
	credits_panel.visible = false
	play_button.pressed.connect(_on_play_pressed)
	continue_button.pressed.connect(_on_continue_pressed)
	credits_button.pressed.connect(_on_credits_pressed)
	quit_button.pressed.connect(_on_quit_pressed)
	back_button.pressed.connect(_on_back_pressed)
	
	continue_button.visible = SaveManager.has_save()
	
	# Animate title
	title_label.modulate = Color(0.7, 0.3, 0.9, 1.0)


func _process(delta: float) -> void:
	title_time += delta
	var pulse := 0.7 + 0.3 * sin(title_time * 2.0)
	title_label.modulate = Color(pulse * 0.8, pulse * 0.3, pulse, 1.0)


func _on_play_pressed() -> void:
	GameManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/world/Level1.tscn")


func _on_continue_pressed() -> void:
	if SaveManager.load_game():
		var level_path := GameManager.current_level_path
		if level_path == "" or level_path == null:
			level_path = "res://scenes/world/Level1.tscn"
		get_tree().change_scene_to_file(level_path)


func _on_credits_pressed() -> void:
	credits_panel.visible = true


func _on_quit_pressed() -> void:
	get_tree().quit()


func _on_back_pressed() -> void:
	credits_panel.visible = false
