extends CharacterBody2D
class_name TelekinesisObject
## An object that can be grabbed, held, and thrown with telekinesis.
## When thrown, it damages enemies on impact based on player level.

signal grabbed
signal released
signal thrown(direction: Vector2)
signal hit_enemy(enemy: Node2D, damage: int)

enum TKState { IDLE, GRABBED, THROWN, RETURNING }

@export var object_name: String = "Dark Relic"
@export var base_weight: float = 1.0  # Affects throw speed scaling
@export var base_damage: int = 20
@export var throw_speed: float = 350.0
@export var grab_float_height: float = 20.0

var current_state: TKState = TKState.IDLE
var throw_direction: Vector2 = Vector2.ZERO
var throw_velocity: Vector2 = Vector2.ZERO
var holder: Node2D = null  # Reference to the player holding this
var grab_offset: Vector2 = Vector2(0, -grab_float_height)
var throw_lifetime: float = 0.0
var max_throw_lifetime: float = 1.5
var original_position: Vector2 = Vector2.ZERO
var float_time: float = 0.0
var highlight_active: bool = false

# Visual
@onready var sprite: Sprite2D = $Sprite2D
@onready var label: Label = $Label
@onready var hitbox_area: Area2D = $HitArea

var original_modulate: Color = Color.WHITE

func _ready() -> void:
	add_to_group("telekinesis_objects")
	collision_layer = 64  # layer 7 telekinesis_objects
	collision_mask = 1    # collide with world
	original_position = global_position
	original_modulate = sprite.modulate
	label.text = object_name
	label.visible = false
	hitbox_area.monitoring = false

func _physics_process(delta: float) -> void:
	match current_state:
		TKState.IDLE:
			_state_idle(delta)
		TKState.GRABBED:
			_state_grabbed(delta)
		TKState.THROWN:
			_state_thrown(delta)

	move_and_slide()

func _state_idle(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 200 * delta)
	# Gentle idle float
	float_time += delta
	if sprite:
		sprite.position.y = sin(float_time * 1.5) * 2.0

func _state_grabbed(delta: float) -> void:
	if holder and is_instance_valid(holder):
		# Float above the player in facing direction
		var target_pos = holder.global_position + holder.facing_direction.normalized() * 30.0 + Vector2(0, -grab_float_height)
		global_position = global_position.lerp(target_pos, delta * 12.0)
		velocity = Vector2.ZERO
		# Pulsing glow effect while held
		float_time += delta
		var pulse = 0.7 + sin(float_time * 4.0) * 0.3
		sprite.modulate = Color(0.5 * pulse, 0.0, 1.0 * pulse, 1.0)
		# Subtle rotation-like scale wobble
		sprite.scale = Vector2(1.0 + sin(float_time * 6.0) * 0.05, 1.0 + cos(float_time * 6.0) * 0.05) * 1.2
	else:
		# Holder gone, drop
		do_release()

func _state_thrown(delta: float) -> void:
	velocity = throw_velocity
	throw_lifetime -= delta
	throw_velocity = throw_velocity * 0.98  # Slight drag

	# Check for enemy collisions via the hit area
	if hitbox_area.monitoring:
		var overlapping = hitbox_area.get_overlapping_areas()
		for area in overlapping:
			if area is HurtboxComponent:
				var parent = area.get_parent()
				if parent.is_in_group("enemies"):
					_deal_damage_to(area, parent)
					_stop_throw()
					return

		# Also check overlapping bodies for enemies
		var overlapping_bodies = hitbox_area.get_overlapping_bodies()
		for body in overlapping_bodies:
			if body.is_in_group("enemies"):
				if body.has_node("HurtboxComponent"):
					var hurtbox = body.get_node("HurtboxComponent")
					_deal_damage_to(hurtbox, body)
				_stop_throw()
				return

	if throw_lifetime <= 0 or velocity.length() < 20.0:
		_stop_throw()

func _deal_damage_to(hurtbox: Node, enemy: Node2D) -> void:
	var level_multiplier = 1.0 + (GameManager.stats.level - 1) * 0.15
	var int_bonus = 1.0 + (GameManager.stats["int"] - 10) * 0.05
	var final_damage = int(base_damage * level_multiplier * int_bonus * (1.0 / max(base_weight, 0.5)))
	final_damage = int(final_damage * randf_range(0.9, 1.15))

	if hurtbox is HurtboxComponent:
		hurtbox.receive_hit(final_damage, 250.0, global_position)
	hit_enemy.emit(enemy, final_damage)

	# Impact particles
	_spawn_impact_particles()
	AudioManager.play_sfx_named("telekinesis_impact")

func _stop_throw() -> void:
	current_state = TKState.IDLE
	throw_velocity = Vector2.ZERO
	velocity = Vector2.ZERO
	hitbox_area.monitoring = false
	sprite.modulate = original_modulate
	sprite.scale = Vector2(1.0, 1.0)
	label.visible = false

func grab(by: Node2D) -> void:
	if current_state != TKState.IDLE:
		return
	current_state = TKState.GRABBED
	holder = by
	float_time = 0.0
	grabbed.emit()
	AudioManager.play_sfx_named("telekinesis_grab")
	# Visual feedback
	_spawn_grab_particles()

func do_release() -> void:
	current_state = TKState.IDLE
	holder = null
	sprite.modulate = original_modulate
	sprite.scale = Vector2(1.0, 1.0)
	label.visible = false
	released.emit()

func throw_object(direction: Vector2, power_scale: float = 1.0) -> void:
	if current_state != TKState.GRABBED:
		return
	current_state = TKState.THROWN
	throw_direction = direction.normalized()
	var speed = throw_speed * power_scale / max(base_weight, 0.5)
	throw_velocity = throw_direction * speed
	throw_lifetime = max_throw_lifetime
	holder = null
	hitbox_area.monitoring = true
	thrown.emit(direction)
	AudioManager.play_sfx_named("telekinesis_throw")

	# Throw visual - stretch in direction
	sprite.modulate = Color(0.8, 0.2, 1.0, 1.0)
	sprite.scale = Vector2(1.3, 0.7)

func set_highlight(active: bool) -> void:
	highlight_active = active
	if active and current_state == TKState.IDLE:
		sprite.modulate = Color(0.6, 0.3, 1.0, 1.0)
		label.visible = true
	elif not active and current_state == TKState.IDLE:
		sprite.modulate = original_modulate
		label.visible = false

func _spawn_grab_particles() -> void:
	var particles = GPUParticles2D.new()
	particles.emitting = true
	particles.one_shot = true
	particles.amount = 12
	particles.lifetime = 0.5
	particles.global_position = global_position
	var mat = ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	mat.emission_sphere_radius = 12.0
	mat.direction = Vector3(0, -1, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = 20.0
	mat.initial_velocity_max = 50.0
	mat.gravity = Vector3(0, -20, 0)
	mat.color = Color(0.5, 0.0, 1.0, 0.8)
	mat.scale_min = 1.5
	mat.scale_max = 3.0
	particles.process_material = mat
	get_parent().add_child(particles)
	var cleanup = particles.create_tween()
	cleanup.tween_callback(particles.queue_free).set_delay(1.0)

func _spawn_impact_particles() -> void:
	var particles = GPUParticles2D.new()
	particles.emitting = true
	particles.one_shot = true
	particles.amount = 16
	particles.lifetime = 0.4
	particles.global_position = global_position
	var mat = ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	mat.emission_sphere_radius = 8.0
	mat.direction = Vector3(0, 0, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = 40.0
	mat.initial_velocity_max = 100.0
	mat.gravity = Vector3(0, 80, 0)
	mat.color = Color(0.8, 0.2, 1.0, 1.0)
	mat.scale_min = 2.0
	mat.scale_max = 4.0
	particles.process_material = mat
	get_parent().add_child(particles)
	var cleanup = particles.create_tween()
	cleanup.tween_callback(particles.queue_free).set_delay(0.8)
