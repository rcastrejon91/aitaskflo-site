extends Control

@onready var title_label: Label = $VBoxContainer/TitleLabel
@onready var subtitle_label: Label = $VBoxContainer/SubtitleLabel
@onready var play_button: Button = $VBoxContainer/ButtonContainer/PlayButton
@onready var continue_button: Button = $VBoxContainer/ButtonContainer/ContinueButton
@onready var credits_button: Button = $VBoxContainer/ButtonContainer/CreditsButton
@onready var quit_button: Button = $VBoxContainer/ButtonContainer/QuitButton
@onready var credits_panel: PanelContainer = $CreditsPanel
@onready var back_button: Button = $CreditsPanel/VBox/BackButton
@onready var bg_rect: ColorRect = $BGRect
@onready var particles_container: Node2D = $ParticlesContainer

var title_glow_time: float = 0.0

# CPU-based particle system for web compatibility
var menu_particles: Array = []
const MAX_MENU_PARTICLES: int = 40

class MenuParticle:
	var node: ColorRect
	var velocity: Vector2
	var lifetime: float
	var max_lifetime: float
	var base_alpha: float

func _ready() -> void:
	play_button.pressed.connect(_on_play_pressed)
	continue_button.pressed.connect(_on_continue_pressed)
	credits_button.pressed.connect(_on_credits_pressed)
	quit_button.pressed.connect(_on_quit_pressed)
	back_button.pressed.connect(_on_back_pressed)
	credits_panel.visible = false
	continue_button.visible = SaveManager.has_save()
	# Hide quit button on web since it doesn't work
	if OS.has_feature("web"):
		quit_button.visible = false
	GameManager.reset_game()
	_init_particles()

func _init_particles() -> void:
	for i in range(MAX_MENU_PARTICLES):
		_spawn_particle()

func _spawn_particle() -> void:
	var p = MenuParticle.new()
	var rect = ColorRect.new()
	rect.size = Vector2(randf_range(2, 5), randf_range(2, 5))
	rect.color = Color(0.5, 0.2, 0.8, randf_range(0.2, 0.6))
	rect.position = Vector2(randf_range(-640, 640), randf_range(-360, 360))
	p.node = rect
	p.velocity = Vector2(randf_range(-15, 15), randf_range(-30, -5))
	p.max_lifetime = randf_range(2.0, 5.0)
	p.lifetime = randf_range(0.0, p.max_lifetime) # stagger initial spawn
	p.base_alpha = rect.color.a
	particles_container.add_child(rect)
	menu_particles.append(p)

func _process(delta: float) -> void:
	# Title glow effect
	title_glow_time += delta
	var glow = (sin(title_glow_time * 2.0) + 1.0) * 0.5
	title_label.modulate = Color(0.8 + glow * 0.2, 0.5 + glow * 0.1, 0.9 + glow * 0.1)

	# Update CPU particles
	for p in menu_particles:
		p.lifetime -= delta
		if p.lifetime <= 0:
			# Reset particle
			p.node.position = Vector2(randf_range(-640, 640), randf_range(200, 400))
			p.velocity = Vector2(randf_range(-15, 15), randf_range(-30, -5))
			p.max_lifetime = randf_range(2.0, 5.0)
			p.lifetime = p.max_lifetime
			p.base_alpha = randf_range(0.2, 0.6)
		else:
			p.node.position += p.velocity * delta
			# Fade out near end of life
			var life_ratio = p.lifetime / p.max_lifetime
			p.node.color.a = p.base_alpha * life_ratio

func _on_play_pressed() -> void:
	GameManager.reset_game()
	GameManager.add_quest("investigate_ruins", {"name": "Investigate the Ancient Ruins", "description": "Explore the ruins and find covenant fragments."})
	get_tree().change_scene_to_file("res://scenes/world/Level1.tscn")

func _on_continue_pressed() -> void:
	if SaveManager.load_game():
		var level_path = "res://scenes/world/%s.tscn" % GameManager.current_level
		get_tree().change_scene_to_file(level_path)

func _on_credits_pressed() -> void:
	credits_panel.visible = true

func _on_back_pressed() -> void:
	credits_panel.visible = false

func _on_quit_pressed() -> void:
	get_tree().quit()
