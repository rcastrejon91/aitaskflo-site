extends Area2D
class_name HurtboxComponent

signal hurt(damage: float, knockback_force: float, hit_position: Vector2)

@export var health_component: HealthComponent
@export var invincibility_duration: float = 0.5
var is_invincible: bool = false
var invincibility_timer: float = 0.0

func _ready() -> void:
	collision_layer = 0
	collision_mask = 0
	monitoring = false
	monitorable = true


func _process(delta: float) -> void:
	if is_invincible:
		invincibility_timer -= delta
		if invincibility_timer <= 0.0:
			is_invincible = false


func receive_hit(damage: float, knockback_force: float, hit_position: Vector2) -> void:
	if is_invincible:
		return
	
	is_invincible = true
	invincibility_timer = invincibility_duration
	
	if health_component:
		health_component.take_damage(damage)
	
	hurt.emit(damage, knockback_force, hit_position)
