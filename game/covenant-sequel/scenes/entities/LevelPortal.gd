extends Area2D

@export var target_scene: String = "res://scenes/world/Level2.tscn"
@export var portal_label: String = "Enter the Void"
@export var requires_artifacts: int = 0

var player_nearby: bool = false

@onready var label: Label = $Label

func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	monitoring = true
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	label.text = portal_label
	label.visible = false
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.position = Vector2(-60, -50)


func _process(_delta: float) -> void:
	if player_nearby and Input.is_action_just_pressed("interact"):
		if GameManager.collected_artifacts.size() >= requires_artifacts:
			GameManager.change_scene(target_scene)
		else:
			label.text = "Need " + str(requires_artifacts) + " artifacts!"


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_nearby = true
		label.visible = true
		label.text = portal_label + "\n[E] to enter"


func _on_body_exited(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_nearby = false
		label.visible = false
