extends Area2D

@export var npc_name: String = "Villager"
@export var dialogue_id: String = "npc_villager"
@export var npc_color: Color = Color(0.3, 0.7, 0.3)

var player_nearby: bool = false

@onready var sprite: Sprite2D = $Sprite2D
@onready var name_label: Label = $NameLabel
@onready var interact_label: Label = $InteractLabel

func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	name_label.text = npc_name
	interact_label.visible = false
	sprite.modulate = npc_color

func _process(_delta: float) -> void:
	if player_nearby and Input.is_action_just_pressed("interact"):
		DialogueManager.start_dialogue(dialogue_id)

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_nearby = true
		interact_label.visible = true

func _on_body_exited(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_nearby = false
		interact_label.visible = false
