extends Area2D

@export var target_scene: String = "res://scenes/world/Level2.tscn"
@export var transition_text: String = "Entering the Shadow Realm..."

var player_nearby: bool = false
var transitioning: bool = false

@onready var label: Label = $Label
@onready var interact_label: Label = $InteractLabel

func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	interact_label.visible = false
	label.text = transition_text

func _process(_delta: float) -> void:
	if player_nearby and Input.is_action_just_pressed("interact") and not transitioning:
		_do_transition()

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_nearby = true
		interact_label.visible = true

func _on_body_exited(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_nearby = false
		interact_label.visible = false

func _do_transition() -> void:
	transitioning = true
	SaveManager.save_game()
	var overlay = ColorRect.new()
	overlay.color = Color(0, 0, 0, 0)
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	var canvas = CanvasLayer.new()
	canvas.layer = 100
	canvas.add_child(overlay)
	get_tree().root.add_child(canvas)
	var tween = create_tween()
	tween.tween_property(overlay, "color:a", 1.0, 0.5)
	tween.tween_callback(func(): GameManager.change_scene(target_scene))
