extends Area2D
class_name HitboxComponent

signal hit_landed(target: Node)

@export var damage: int = 10
@export var knockback_force: float = 200.0
@export var is_active: bool = false

func _ready() -> void:
	collision_layer = 16  # layer 5 (hitboxes)
	collision_mask = 32   # layer 6 (hurtboxes)
	monitoring = true
	monitorable = false
	area_entered.connect(_on_area_entered)

func _on_area_entered(area: Area2D) -> void:
	if not is_active:
		return
	if area is HurtboxComponent:
		var hurtbox: HurtboxComponent = area as HurtboxComponent
		if hurtbox.is_invincible:
			return
		hurtbox.receive_hit(damage, knockback_force, global_position)
		hit_landed.emit(hurtbox.get_parent())

func activate() -> void:
	is_active = true

func deactivate() -> void:
	is_active = false
