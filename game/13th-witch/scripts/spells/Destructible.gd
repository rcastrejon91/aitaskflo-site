extends StaticBody2D
class_name Destructible

## Destructible world objects — trees, walls, crates, tombstones
## Hex Blast blows them apart. Soul Freeze shatters them. World Charm bends them.

@export var max_health: float = 30.0
@export var debris_count: int = 5
@export var is_explosive: bool = false  # Chain reaction when destroyed
@export var explosion_damage: float = 20.0
@export var explosion_radius: float = 100.0

var health: float
var is_frozen: bool = false
var is_charmed: bool = false
var shatter_multiplier: float = 1.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var collision: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	health = max_health
	add_to_group("destructible")

func take_damage(amount: float) -> void:
	# Frozen objects take bonus shatter damage
	if is_frozen:
		amount *= shatter_multiplier
		_shatter_effect()
	
	health -= amount
	
	# Hit flash
	_hit_flash()
	
	if health <= 0.0:
		destroy()

func destroy() -> void:
	# Spawn debris
	_spawn_debris()
	
	# Chain explosion if explosive
	if is_explosive:
		_chain_explode()
	
	# Screen shake
	# EventBus.screen_shake.emit(0.2, 8.0)
	
	queue_free()

func apply_freeze(duration: float, multiplier: float) -> void:
	is_frozen = true
	shatter_multiplier = multiplier
	
	# Ice visual
	if sprite:
		sprite.modulate = Color(0.6, 0.8, 1.0, 1.0)
	
	get_tree().create_timer(duration).timeout.connect(func():
		is_frozen = false
		shatter_multiplier = 1.0
		if sprite:
			sprite.modulate = Color.WHITE
	)

func become_charmed(_duration: float, _charm_origin: Vector2) -> void:
	is_charmed = true
	
	# Objects bow/lean toward charm origin
	var dir = (_charm_origin - global_position).normalized()
	var tween = create_tween()
	tween.tween_property(sprite, "rotation", dir.angle() * 0.3, 0.5)
	tween.set_ease(Tween.EASE_OUT)
	
	# Purple tint
	if sprite:
		sprite.modulate = Color(0.85, 0.6, 1.0, 1.0)

func _hit_flash() -> void:
	if sprite:
		sprite.modulate = Color.WHITE * 3.0
		var tween = create_tween()
		tween.tween_property(sprite, "modulate", Color.WHITE, 0.15)

func _shatter_effect() -> void:
	# Ice shard burst — visual only
	var shards = GPUParticles2D.new()
	shards.name = "ShatterShards"
	shards.emitting = true
	shards.amount = 15
	shards.lifetime = 0.8
	shards.one_shot = true
	add_child(shards)

func _spawn_debris() -> void:
	for i in debris_count:
		var debris = RigidBody2D.new()
		var debris_sprite = Sprite2D.new()
		debris_sprite.modulate = sprite.modulate if sprite else Color.WHITE
		debris_sprite.scale = Vector2(0.3, 0.3)
		debris.add_child(debris_sprite)
		
		var debris_shape = CollisionShape2D.new()
		var shape = CircleShape2D.new()
		shape.radius = 5.0
		debris_shape.shape = shape
		debris.add_child(debris_shape)
		
		get_parent().add_child(debris)
		debris.global_position = global_position
		
		# Fling debris outward
		var angle = randf() * TAU
		var force = randf_range(200.0, 500.0)
		debris.apply_impulse(Vector2(cos(angle), sin(angle)) * force)
		
		# Auto cleanup
		get_tree().create_timer(3.0).timeout.connect(debris.queue_free)

func _chain_explode() -> void:
	# Damage nearby enemies and destructibles
	var space = get_world_2d().direct_space_state
	var query = PhysicsShapeQueryParameters2D.new()
	var circle = CircleShape2D.new()
	circle.radius = explosion_radius
	query.shape = circle
	query.transform = global_transform
	
	var results = space.intersect_shape(query, 16)
	for result in results:
		var collider = result.collider
		if collider == self:
			continue
		if collider.has_method("take_damage"):
			collider.take_damage(explosion_damage)
