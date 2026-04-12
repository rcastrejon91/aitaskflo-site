extends Area2D

@export var item_type: String = "artifact"  # artifact, health, mana, gold
@export var item_id: String = "artifact_01"
@export var item_value: float = 25.0
@export var bob_speed: float = 2.0
@export var bob_height: float = 5.0

var base_y: float = 0.0
var time_elapsed: float = 0.0
var collected: bool = false

@onready var sprite: Sprite2D = $Sprite2D

func _ready() -> void:
	add_to_group("pickups")
	base_y = position.y
	collision_layer = 64  # layer 7 pickups
	collision_mask = 2    # layer 2 player
	monitoring = true
	monitorable = false
	body_entered.connect(_on_body_entered)
	
	# Check if already collected
	if item_type == "artifact" and item_id in GameManager.collected_artifacts:
		queue_free()


func _process(delta: float) -> void:
	time_elapsed += delta
	position.y = base_y + sin(time_elapsed * bob_speed) * bob_height
	
	# Glow effect
	var glow := 0.8 + 0.2 * sin(time_elapsed * 3.0)
	match item_type:
		"artifact":
			sprite.modulate = Color(1.0, 0.8, 0.2, glow)
		"health":
			sprite.modulate = Color(0.2, 1.0, 0.3, glow)
		"mana":
			sprite.modulate = Color(0.3, 0.3, 1.0, glow)
		"gold":
			sprite.modulate = Color(1.0, 0.9, 0.1, glow)


func _on_body_entered(body: Node2D) -> void:
	if collected:
		return
	if body.is_in_group("player"):
		collected = true
		_apply_effect(body)
		_collect_animation()


func _apply_effect(player_node: Node2D) -> void:
	match item_type:
		"artifact":
			GameManager.collect_artifact(item_id)
		"health":
			if player_node.has_method("heal"):
				player_node.heal(item_value)
		"mana":
			if player_node.has_method("restore_mp"):
				player_node.restore_mp(item_value)
		"gold":
			GameManager.add_gold(int(item_value))
			GameManager.add_score(int(item_value))


func _collect_animation() -> void:
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(sprite, "scale", Vector2(3, 3), 0.3)
	tween.tween_property(sprite, "modulate:a", 0.0, 0.3)
	tween.set_parallel(false)
	tween.tween_callback(queue_free)
