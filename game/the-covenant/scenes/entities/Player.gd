extends CharacterBody2D

signal attack_started
signal attack_ended
signal spell_cast(spell_name: String)

@export var move_speed: float = 120.0
@export var attack_damage: int = 15
@export var spell_damage: int = 25
@export var spell_cost: int = 15
@export var attack_duration: float = 0.35
@export var attack_cooldown: float = 0.2

enum State { IDLE, MOVE, ATTACK, CAST_SPELL, HIT, DEAD, TELEKINESIS }

var current_state: State = State.IDLE
var facing_direction: Vector2 = Vector2.DOWN
var attack_timer: float = 0.0
var cooldown_timer: float = 0.0
var hit_stun_timer: float = 0.0
var knockback_velocity: Vector2 = Vector2.ZERO
var flash_timer: float = 0.0
var is_flashing: bool = false

# Squash & stretch
var sprite_base_scale: Vector2 = Vector2(0.2, 0.2)
var squash_stretch_target: Vector2 = Vector2(1.0, 1.0)

# ─── Telekinesis ───
var tk_held_object: Node2D = null  # Currently grabbed TelekinesisObject
var tk_scan_timer: float = 0.0
var tk_scan_interval: float = 0.1
var tk_highlighted_object: Node2D = null  # Object under crosshair / in range
var tk_grab_range: float = 120.0

# ─── Time Freeze ───
var time_freeze_effect: Node = null  # TimeFreezeEffect instance

@onready var sprite: Sprite2D = $Sprite2D
@onready var health_component: HealthComponent = $HealthComponent
@onready var hitbox: HitboxComponent = $HitboxComponent
@onready var hurtbox: HurtboxComponent = $HurtboxComponent
@onready var hitbox_shape: CollisionShape2D = $HitboxComponent/CollisionShape2D
@onready var camera: Camera2D = $Camera2D
@onready var tk_raycast: RayCast2D = $TKRayCast

func _ready() -> void:
	add_to_group("player")
	health_component.max_hp = GameManager.stats.max_hp
	health_component.current_hp = GameManager.stats.hp
	hitbox.damage = attack_damage
	hitbox.deactivate()
	hurtbox.hurt.connect(_on_hurt)
	health_component.died.connect(_on_died)
	hitbox.hit_landed.connect(_on_hit_landed)
	sprite_base_scale = sprite.scale

	# Setup telekinesis raycast
	_setup_tk_raycast()

	# Setup time freeze effect (added as child CanvasLayer)
	_setup_time_freeze()

func _setup_tk_raycast() -> void:
	if tk_raycast:
		tk_raycast.enabled = true
		tk_raycast.target_position = facing_direction.normalized() * tk_grab_range
		tk_raycast.collision_mask = 64  # layer 7 telekinesis_objects
		tk_raycast.collide_with_areas = false
		tk_raycast.collide_with_bodies = true

func _setup_time_freeze() -> void:
	var TimeFreezeScene = load("res://scripts/abilities/TimeFreezeEffect.gd")
	time_freeze_effect = TimeFreezeScene.new()
	add_child(time_freeze_effect)

func _process(delta: float) -> void:
	# Flash effect
	if is_flashing:
		flash_timer -= delta
		sprite.modulate.a = 0.3 if fmod(flash_timer, 0.15) < 0.075 else 1.0
		if flash_timer <= 0:
			is_flashing = false
			sprite.modulate.a = 1.0

	# Smooth squash & stretch back to normal
	var current_factor = sprite.scale / sprite_base_scale
	var target_factor = current_factor.lerp(squash_stretch_target, delta * 12.0)
	sprite.scale = sprite_base_scale * target_factor

	# Telekinesis object scanning
	_update_tk_scan(delta)

	# Show telekinesis hold indicator
	if tk_held_object and is_instance_valid(tk_held_object):
		_update_tk_beam()

func _physics_process(delta: float) -> void:
	if current_state == State.DEAD:
		return

	cooldown_timer = max(0, cooldown_timer - delta)

	# Update raycast direction
	if tk_raycast:
		tk_raycast.target_position = facing_direction.normalized() * AbilityManager.get_telekinesis_range()
		tk_raycast.force_raycast_update()

	match current_state:
		State.IDLE:
			_state_idle(delta)
		State.MOVE:
			_state_move(delta)
		State.ATTACK:
			_state_attack(delta)
		State.CAST_SPELL:
			_state_cast_spell(delta)
		State.HIT:
			_state_hit(delta)
		State.TELEKINESIS:
			_state_telekinesis(delta)

	# Telekinesis input (can be used in IDLE, MOVE, or TELEKINESIS states)
	if current_state in [State.IDLE, State.MOVE, State.TELEKINESIS]:
		_handle_telekinesis_input()

	# Time freeze input (can be used anytime when not dead)
	if current_state != State.DEAD:
		_handle_time_freeze_input()

	move_and_slide()

func _state_idle(_delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 600 * _delta)
	squash_stretch_target = Vector2(1.0, 1.0)
	var input_dir = _get_input_direction()
	if input_dir != Vector2.ZERO:
		current_state = State.MOVE
		return
	if Input.is_action_just_pressed("attack") and cooldown_timer <= 0:
		_start_attack()
		return
	if Input.is_action_just_pressed("cast_spell") and cooldown_timer <= 0:
		_start_spell()
		return

func _state_move(_delta: float) -> void:
	var input_dir = _get_input_direction()
	if input_dir == Vector2.ZERO:
		current_state = State.IDLE
		return
	facing_direction = input_dir
	velocity = input_dir * move_speed
	_update_sprite_direction()
	# Subtle bob while moving
	var bob = sin(Time.get_ticks_msec() * 0.012) * 0.05
	squash_stretch_target = Vector2(1.0 - bob, 1.0 + bob)
	if Input.is_action_just_pressed("attack") and cooldown_timer <= 0:
		_start_attack()
		return
	if Input.is_action_just_pressed("cast_spell") and cooldown_timer <= 0:
		_start_spell()
		return

func _state_attack(delta: float) -> void:
	attack_timer -= delta
	velocity = velocity.move_toward(Vector2.ZERO, 400 * delta)
	if attack_timer <= 0:
		hitbox.deactivate()
		cooldown_timer = attack_cooldown
		current_state = State.IDLE
		attack_ended.emit()

func _state_cast_spell(delta: float) -> void:
	attack_timer -= delta
	velocity = Vector2.ZERO
	if attack_timer <= 0:
		cooldown_timer = attack_cooldown * 1.5
		current_state = State.IDLE

func _state_hit(delta: float) -> void:
	hit_stun_timer -= delta
	velocity = knockback_velocity
	knockback_velocity = knockback_velocity.move_toward(Vector2.ZERO, 600 * delta)
	if hit_stun_timer <= 0:
		current_state = State.IDLE

func _state_telekinesis(delta: float) -> void:
	# Player can still move while holding an object, but slower
	var input_dir = _get_input_direction()
	if input_dir != Vector2.ZERO:
		facing_direction = input_dir
		velocity = input_dir * move_speed * 0.7  # Slower while holding
		_update_sprite_direction()
	else:
		velocity = velocity.move_toward(Vector2.ZERO, 400 * delta)

	# Pulsing visual on player while holding
	var pulse = 0.8 + sin(Time.get_ticks_msec() * 0.005) * 0.2
	squash_stretch_target = Vector2(1.0 + pulse * 0.05, 1.0 - pulse * 0.05)

	# If the held object is gone, exit state
	if not tk_held_object or not is_instance_valid(tk_held_object):
		tk_held_object = null
		current_state = State.IDLE

func _start_attack() -> void:
	# Drop held object if attacking
	if tk_held_object and is_instance_valid(tk_held_object):
		tk_held_object.do_release()
		tk_held_object = null

	current_state = State.ATTACK
	attack_timer = attack_duration
	hitbox.damage = GameManager.calculate_physical_damage(attack_damage)
	hitbox.activate()
	_position_hitbox()
	attack_started.emit()
	AudioManager.play_sfx_named("attack")
	# Squash on attack swing
	squash_stretch_target = Vector2(1.3, 0.7)
	_do_screen_shake(2.0, 0.1)

func _start_spell() -> void:
	# Drop held object if casting
	if tk_held_object and is_instance_valid(tk_held_object):
		tk_held_object.do_release()
		tk_held_object = null

	if GameManager.use_mp(spell_cost):
		current_state = State.CAST_SPELL
		attack_timer = 0.5
		_cast_dark_bolt()
		spell_cast.emit("dark_bolt")
		AudioManager.play_sfx_named("cast")
		# Stretch on spell cast
		squash_stretch_target = Vector2(0.8, 1.3)

func _cast_dark_bolt() -> void:
	var bolt = preload("res://scenes/entities/DarkBolt.tscn").instantiate()
	bolt.damage = GameManager.calculate_magic_damage(spell_damage)
	bolt.direction = facing_direction.normalized()
	bolt.global_position = global_position + facing_direction.normalized() * 20
	get_parent().add_child(bolt)

func _position_hitbox() -> void:
	hitbox.position = facing_direction.normalized() * 24

func _get_input_direction() -> Vector2:
	var dir = Vector2.ZERO
	dir.x = Input.get_axis("move_left", "move_right")
	dir.y = Input.get_axis("move_up", "move_down")
	if dir.length() > 1.0:
		dir = dir.normalized()
	return dir

func _update_sprite_direction() -> void:
	if facing_direction.x < 0:
		sprite.flip_h = true
	elif facing_direction.x > 0:
		sprite.flip_h = false

# ─────────────────── Telekinesis System ───────────────────

func _update_tk_scan(delta: float) -> void:
	tk_scan_timer -= delta
	if tk_scan_timer > 0:
		return
	tk_scan_timer = tk_scan_interval

	# Clear old highlight
	if tk_highlighted_object and is_instance_valid(tk_highlighted_object):
		if tk_highlighted_object != tk_held_object:
			tk_highlighted_object.set_highlight(false)
	tk_highlighted_object = null

	# Don't scan if already holding something
	if tk_held_object and is_instance_valid(tk_held_object):
		return

	# Use raycast to find telekinesis objects in facing direction
	var best_obj: Node2D = null
	var best_dist: float = INF
	var grab_range = AbilityManager.get_telekinesis_range()

	# Method 1: Raycast hit
	if tk_raycast and tk_raycast.is_colliding():
		var collider = tk_raycast.get_collider()
		if collider is TelekinesisObject and collider.current_state == TelekinesisObject.TKState.IDLE:
			best_obj = collider
			best_dist = global_position.distance_to(collider.global_position)

	# Method 2: Area scan for nearby objects (cone-like, in facing direction)
	var tk_objects = get_tree().get_nodes_in_group("telekinesis_objects")
	for obj in tk_objects:
		if not is_instance_valid(obj) or not (obj is TelekinesisObject):
			continue
		if obj.current_state != TelekinesisObject.TKState.IDLE:
			continue
		var dist = global_position.distance_to(obj.global_position)
		if dist > grab_range:
			continue
		# Check if object is roughly in our facing direction (120 degree cone)
		var to_obj = (obj.global_position - global_position).normalized()
		var dot = facing_direction.normalized().dot(to_obj)
		if dot < 0.3:  # ~72 degree half-angle
			continue
		if dist < best_dist:
			best_dist = dist
			best_obj = obj

	if best_obj:
		tk_highlighted_object = best_obj
		best_obj.set_highlight(true)

func _handle_telekinesis_input() -> void:
	if not Input.is_action_just_pressed("telekinesis"):
		return

	if not AbilityManager.is_unlocked("telekinesis"):
		return

	# If already holding an object, throw it
	if tk_held_object and is_instance_valid(tk_held_object):
		_throw_tk_object()
		return

	# Try to grab highlighted object
	if tk_highlighted_object and is_instance_valid(tk_highlighted_object):
		_grab_tk_object(tk_highlighted_object)

func _grab_tk_object(obj: Node2D) -> void:
	if not AbilityManager.can_use_ability("telekinesis"):
		return

	# Use MP for grab
	if not AbilityManager.use_ability("telekinesis"):
		return

	tk_held_object = obj
	obj.grab(self)
	current_state = State.TELEKINESIS

	# Visual feedback on player
	squash_stretch_target = Vector2(0.9, 1.15)
	_do_screen_shake(1.5, 0.1)

	# Spawn grab beam particles
	_spawn_tk_grab_beam()

func _throw_tk_object() -> void:
	if not tk_held_object or not is_instance_valid(tk_held_object):
		tk_held_object = null
		current_state = State.IDLE
		return

	var power = AbilityManager.get_telekinesis_power_scale()
	tk_held_object.throw_object(facing_direction, power)
	tk_held_object = null
	current_state = State.IDLE

	# Visual feedback
	squash_stretch_target = Vector2(1.2, 0.8)
	_do_screen_shake(3.0, 0.15)
	AudioManager.play_sfx_named("telekinesis_throw")

func _update_tk_beam() -> void:
	# Visual indicator line is handled via _draw or particles
	# For now, the TelekinesisObject handles its own glow while held
	pass

func _spawn_tk_grab_beam() -> void:
	# Spawn a brief particle trail from player to object
	if not tk_held_object or not is_instance_valid(tk_held_object):
		return
	var particles = GPUParticles2D.new()
	particles.emitting = true
	particles.one_shot = true
	particles.amount = 8
	particles.lifetime = 0.4
	particles.global_position = global_position
	var mat = ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_POINT
	mat.direction = Vector3(facing_direction.x, facing_direction.y, 0).normalized()
	mat.spread = 15.0
	mat.initial_velocity_min = 60.0
	mat.initial_velocity_max = 120.0
	mat.gravity = Vector3.ZERO
	mat.color = Color(0.5, 0.2, 1.0, 0.7)
	mat.scale_min = 1.5
	mat.scale_max = 3.0
	particles.process_material = mat
	get_parent().add_child(particles)
	var cleanup = particles.create_tween()
	cleanup.tween_callback(particles.queue_free).set_delay(0.8)

# ─────────────────── Time Freeze System ───────────────────

func _handle_time_freeze_input() -> void:
	if not Input.is_action_just_pressed("time_freeze"):
		return

	if not AbilityManager.is_unlocked("time_freeze"):
		return

	if time_freeze_effect and time_freeze_effect.can_activate():
		time_freeze_effect.activate()
		# Player visual feedback for casting
		squash_stretch_target = Vector2(0.7, 1.4)
		_do_screen_shake(4.0, 0.2)

# ─────────────────── Damage & Death ───────────────────

func _on_hurt(damage: int, knockback_force: float, from_position: Vector2) -> void:
	if current_state == State.DEAD:
		return

	# Drop held TK object on hit
	if tk_held_object and is_instance_valid(tk_held_object):
		tk_held_object.do_release()
		tk_held_object = null

	var actual_damage = GameManager.take_damage(damage)
	health_component.current_hp = GameManager.stats.hp
	health_component.health_changed.emit(GameManager.stats.hp, GameManager.stats.max_hp)
	var kb_dir = (global_position - from_position).normalized()
	knockback_velocity = kb_dir * knockback_force
	hit_stun_timer = 0.3
	current_state = State.HIT
	_start_flash(0.5)
	AudioManager.play_sfx_named("hurt")
	# Squash on hit
	squash_stretch_target = Vector2(1.4, 0.6)
	_do_screen_shake(4.0, 0.15)

func _on_died() -> void:
	current_state = State.DEAD
	velocity = Vector2.ZERO
	hitbox.deactivate()
	# Drop held object
	if tk_held_object and is_instance_valid(tk_held_object):
		tk_held_object.do_release()
		tk_held_object = null
	GameManager.player_died.emit()
	sprite.modulate = Color(0.5, 0.0, 0.0, 0.8)

func _on_hit_landed(target: Node) -> void:
	_do_screen_shake(3.0, 0.1)
	squash_stretch_target = Vector2(0.85, 1.15)

func _start_flash(duration: float) -> void:
	is_flashing = true
	flash_timer = duration

func _do_screen_shake(intensity: float, duration: float) -> void:
	if camera:
		var tween = create_tween()
		var shake_offset = Vector2(randf_range(-intensity, intensity), randf_range(-intensity, intensity))
		tween.tween_property(camera, "offset", shake_offset, duration * 0.5)
		tween.tween_property(camera, "offset", Vector2.ZERO, duration * 0.5)
