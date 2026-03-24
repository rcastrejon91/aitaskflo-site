extends Area2D
class_name HexBlast

## HEX BLAST — Explosive witch power
## Launches a volatile orb that detonates on impact
## Destroys destructible objects and sends enemies flying

@export var speed: float = 600.0
@export var explosion_radius: float = 150.0
@export var explosion_damage: float = 45.0
@export var knockback_force: float = 800.0
@export var lifetime: float = 3.0

var direction: Vector2 = Vector2.RIGHT
var has_detonated: bool = false

@onready var explosion_area: Area2D = $ExplosionArea
@onready var particles_trail: GPUParticles2D = $TrailParticles
@onready var particles_explosion: GPUParticles2D = $ExplosionParticles
@onready var sprite: Sprite2D = $Sprite2D
@onready var light: PointLight2D = $PointLight2D

func _ready() -> void:
	# Auto-destroy after lifetime
	get_tree().create_timer(lifetime).timeout.connect(detonate)
	
	# Connect body entered
	body_entered.connect(_on_body_entered)
	
	# Initial rotation
	rotation = direction.angle()

func _physics_process(delta: float) -> void:
	if has_detonated:
		return
	position += direction * speed * delta

func _on_body_entered(body: Node2D) -> void:
	if has_detonated:
		return
	if body.is_in_group("player"):
		return
	detonate()

func detonate() -> void:
	if has_detonated:
		return
	has_detonated = true
	
	# Stop movement visually
	speed = 0.0
	if sprite:
		sprite.visible = false
	if particles_trail:
		particles_trail.emitting = false
	
	# Flash the light
	if light:
		light.energy = 3.0
		var tween = create_tween()
		tween.tween_property(light, "energy", 0.0, 0.5)
	
	# Emit explosion particles
	if particles_explosion:
		particles_explosion.emitting = true
	
	# Screen shake signal
	# EventBus.screen_shake.emit(0.4, 15.0)  # Uncomment when EventBus exists
	
	# Damage and knockback everything in explosion radius
	var space = get_world_2d().direct_space_state
	var query = PhysicsShapeQueryParameters2D.new()
	var circle = CircleShape2D.new()
	circle.radius = explosion_radius
	query.shape = circle
	query.transform = global_transform
	query.collision_mask = 0b1111  # Check all layers
	
	var results = space.intersect_shape(query, 32)
	for result in results:
		var collider = result.collider
		if collider == self:
			continue
		
		var dir_to = (collider.global_position - global_position).normalized()
		var dist = global_position.distance_to(collider.global_position)
		var falloff = 1.0 - clamp(dist / explosion_radius, 0.0, 1.0)
		
		# Damage enemies
		if collider.is_in_group("enemies") and collider.has_method("take_damage"):
			collider.take_damage(explosion_damage * falloff)
		
		# Knockback
		if collider.has_method("apply_knockback"):
			collider.apply_knockback(dir_to * knockback_force * falloff)
		
		# Destroy destructibles
		if collider.is_in_group("destructible") and collider.has_method("destroy"):
			collider.destroy()
	
	# Cleanup after explosion animation
	get_tree().create_timer(1.0).timeout.connect(queue_free)
