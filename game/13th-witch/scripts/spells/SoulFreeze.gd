extends Area2D
class_name SoulFreeze

## SOUL FREEZE — Cryogenic witch power
## Sends out a wave that freezes all enemies in radius
## Frozen enemies can't move, attack, or act — shatter them with Hex Blast for bonus damage

@export var freeze_radius: float = 200.0
@export var freeze_duration: float = 4.0
@export var freeze_damage: float = 10.0
@export var shatter_bonus_multiplier: float = 2.5
@export var expansion_speed: float = 400.0

var current_radius: float = 0.0
var expanding: bool = true
var frozen_targets: Array[Node2D] = []

@onready var freeze_ring: Sprite2D = $FreezeRing
@onready var particles: GPUParticles2D = $IceParticles
@onready var light: PointLight2D = $PointLight2D

func _ready() -> void:
	# Start expanding ring
	current_radius = 0.0
	expanding = true
	
	if freeze_ring:
		freeze_ring.scale = Vector2.ZERO
	
	if light:
		light.color = Color(0.4, 0.7, 1.0, 1.0)
		light.energy = 2.0

func _physics_process(delta: float) -> void:
	if not expanding:
		return
	
	current_radius += expansion_speed * delta
	
	# Scale the visual ring
	if freeze_ring:
		var scale_factor = current_radius / 100.0
		freeze_ring.scale = Vector2(scale_factor, scale_factor)
	
	# Check for targets in range
	var space = get_world_2d().direct_space_state
	var query = PhysicsShapeQueryParameters2D.new()
	var circle = CircleShape2D.new()
	circle.radius = current_radius
	query.shape = circle
	query.transform = global_transform
	query.collision_mask = 0b0010  # Enemy layer
	
	var results = space.intersect_shape(query, 32)
	for result in results:
		var collider = result.collider
		if collider.is_in_group("enemies") and collider not in frozen_targets:
			freeze_target(collider)
	
	# Stop expanding at max radius
	if current_radius >= freeze_radius:
		expanding = false
		# Fade out the ring
		if freeze_ring:
			var tween = create_tween()
			tween.tween_property(freeze_ring, "modulate:a", 0.0, 0.5)
		
		# Schedule cleanup
		get_tree().create_timer(freeze_duration + 0.5).timeout.connect(queue_free)

func freeze_target(target: Node2D) -> void:
	frozen_targets.append(target)
	
	# Apply freeze damage
	if target.has_method("take_damage"):
		target.take_damage(freeze_damage)
	
	# Apply frozen state
	if target.has_method("apply_freeze"):
		target.apply_freeze(freeze_duration, shatter_bonus_multiplier)
	else:
		# Fallback: manually stop the enemy
		_fallback_freeze(target)

func _fallback_freeze(target: Node2D) -> void:
	# Visual freeze effect — turn blue
	var original_modulate = target.modulate
	target.modulate = Color(0.5, 0.7, 1.0, 1.0)
	
	# Stop processing if possible
	target.set_physics_process(false)
	target.set_process(false)
	
	# Add ice crystal particles to target
	var ice = GPUParticles2D.new()
	ice.name = "FreezeEffect"
	ice.emitting = true
	ice.amount = 12
	ice.lifetime = freeze_duration
	ice.one_shot = true
	target.add_child(ice)
	
	# Unfreeze after duration
	get_tree().create_timer(freeze_duration).timeout.connect(func():
		if is_instance_valid(target):
			target.modulate = original_modulate
			target.set_physics_process(true)
			target.set_process(true)
			if target.has_node("FreezeEffect"):
				target.get_node("FreezeEffect").queue_free()
	)
