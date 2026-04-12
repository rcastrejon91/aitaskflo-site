extends Area2D
class_name HitboxComponent

signal hit_landed(target: Node)

@export var damage: float = 10.0
@export var knockback_force: float = 200.0
@export var is_active: bool = false

func _ready() -> void:
	collision_layer = 0
	collision_mask = 0
	monitoring = true
	monitorable = false
	area_entered.connect(_on_area_entered)


func activate() -> void:
	is_active = true


func deactivate() -> void:
	is_active = false


func _on_area_entered(area: Area2D) -> void:
	if not is_active:
		return
	if area is HurtboxComponent:
		var hurtbox: HurtboxComponent = area as HurtboxComponent
		if not hurtbox.is_invincible:
			hurtbox.receive_hit(damage, knockback_force, global_position)
			hit_landed.emit(hurtbox.get_parent())
