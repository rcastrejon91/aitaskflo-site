extends Area2D
class_name HurtboxComponent

signal hurt(damage: int, knockback_force: float, from_position: Vector2)

@export var invincibility_duration: float = 0.5
var is_invincible: bool = false
var invincibility_timer: float = 0.0

func _ready() -> void:
	collision_layer = 32  # layer 6 (hurtboxes)
	collision_mask = 16   # layer 5 (hitboxes)
	monitoring = false
	monitorable = true

func _process(delta: float) -> void:
	if is_invincible:
		invincibility_timer -= delta
		if invincibility_timer <= 0:
			is_invincible = false

func receive_hit(damage: int, knockback_force: float, from_position: Vector2) -> void:
	if is_invincible:
		return
	is_invincible = true
	invincibility_timer = invincibility_duration
	hurt.emit(damage, knockback_force, from_position)

func start_invincibility(duration: float = -1.0) -> void:
	is_invincible = true
	if duration > 0:
		invincibility_timer = duration
	else:
		invincibility_timer = invincibility_duration
