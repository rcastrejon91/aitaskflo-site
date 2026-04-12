extends CharacterBody2D
## SummonedWraith — A shadow entity summoned by the player to fight alongside them.
## Seeks out enemies, attacks them, and expires after a duration.
## CPU-based particles for web compatibility.

@export var move_speed: float = 90.0
@export var attack_damage: int = 18
@export var attack_range: float = 35.0
@export var detection_range: float = 200.0
@export var lifetime: float = 8.0
@export var attack_cooldown: float = 1.2

enum State { SPAWN, IDLE, CHASE, ATTACK, EXPIRE }

var current_state: State = State.SPAWN
var target_enemy: Node2D = null
var player_ref: Node2D = null
var state_timer: float = 0.0
var lifetime_timer: float = 0.0
var attack_cd_timer: float = 0.0
var facing_direction: Vector2 = Vector2.DOWN
var particle_timer: float = 0.0
var spawn_timer: float = 0.0
var spawn_duration: float = 0.5
var wraith_alpha: float = 0.0

func _ready() -> void:
	# DON'T add to enemies group - this is a friendly summon
	add_to_group("summons")
	collision_layer = 2  # player layer
	collision_mask = 1   # world
	
	# Find player reference
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		player_ref = players[0]
	
	AudioManager.play_sfx_named("summon_wraith")
	_spawn_summon_particles()

func _physics_process(delta: float) -> void:
	lifetime_timer += delta
	particle_timer += delta
	
	# Ambient shadow particles
	if particle_timer >= 0.08:
		particle_timer = 0.0
		_spawn_ambient_particles()
	
	if attack_cd_timer > 0:
		attack_cd_timer -= delta
	
	match current_state:
		State.SPAWN:
			_state_spawn(delta)
		State.IDLE:
			_state_idle(delta)
		State.CHASE:
			_state_chase(delta)
		State.ATTACK:
			_state_attack(delta)
		State.EXPIRE:
			_state_expire(delta)
	
	# Check lifetime
	if lifetime_timer >= lifetime and current_state != State.EXPIRE:
		current_state = State.EXPIRE
		state_timer = 0.6
	
	move_and_slide()
	queue_redraw()

func _state_spawn(delta: float) -> void:
	spawn_timer += delta
	wraith_alpha = clamp(spawn_timer / spawn_duration, 0.0, 1.0)
	velocity = Vector2.ZERO
	if spawn_timer >= spawn_duration:
		wraith_alpha = 1.0
		current_state = State.IDLE

func _state_idle(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 200 * delta)
	
	# Find nearest enemy
	_find_target()
	if target_enemy != null:
		current_state = State.CHASE
		return
	
	# If no enemies, drift near player
	if player_ref and is_instance_valid(player_ref):
		var dist_to_player = global_position.distance_to(player_ref.global_position)
		if dist_to_player > 80.0:
			var dir = (player_ref.global_position - global_position).normalized()
			velocity = dir * move_speed * 0.5
			facing_direction = dir

func _state_chase(delta: float) -> void:
	if target_enemy == null or not is_instance_valid(target_enemy):
		var health = target_enemy.get_node_or_null("HealthComponent") if is_instance_valid(target_enemy) else null
		target_enemy = null
		current_state = State.IDLE
		return
	
	# Check if target is still alive
	var health = target_enemy.get_node_or_null("HealthComponent")
	if health and health is HealthComponent and not health.is_alive():
		target_enemy = null
		current_state = State.IDLE
		return
	
	var dir = (target_enemy.global_position - global_position).normalized()
	var dist = global_position.distance_to(target_enemy.global_position)
	
	if dist <= attack_range and attack_cd_timer <= 0:
		_start_attack()
		return
	
	velocity = dir * move_speed
	facing_direction = dir

func _state_attack(delta: float) -> void:
	state_timer -= delta
	velocity = velocity.move_toward(Vector2.ZERO, 300 * delta)
	
	if state_timer <= 0:
		current_state = State.CHASE

func _state_expire(delta: float) -> void:
	state_timer -= delta
	wraith_alpha = clamp(state_timer / 0.6, 0.0, 1.0)
	velocity = velocity.move_toward(Vector2.ZERO, 200 * delta)
	
	if state_timer <= 0:
		_spawn_expire_particles()
		queue_free()

func _start_attack() -> void:
	current_state = State.ATTACK
	state_timer = 0.3
	attack_cd_timer = attack_cooldown
	
	if target_enemy and is_instance_valid(target_enemy):
		var hurtbox = target_enemy.get_node_or_null("HurtboxComponent")
		if hurtbox and hurtbox is HurtboxComponent:
			hurtbox.receive_hit(attack_damage, 100.0, global_position)
			_spawn_attack_particles(target_enemy.global_position)
		AudioManager.play_sfx_named("wraith_attack")

func _find_target() -> void:
	var enemies = get_tree().get_nodes_in_group("enemies")
	var nearest_dist = detection_range
	target_enemy = null
	
	for enemy in enemies:
		if not is_instance_valid(enemy):
			continue
		var health = enemy.get_node_or_null("HealthComponent")
		if health and health is HealthComponent and not health.is_alive():
			continue
		var dist = global_position.distance_to(enemy.global_position)
		if dist < nearest_dist:
			nearest_dist = dist
			target_enemy = enemy

func _draw() -> void:
	# Draw the wraith as a shadowy floating form
	var pulse = sin(lifetime_timer * 3.0) * 0.1
	var body_alpha = wraith_alpha * (0.7 + pulse)
	
	# Lifetime fade warning (flash when about to expire)
	var life_remaining = lifetime - lifetime_timer
	if life_remaining < 2.0 and life_remaining > 0:
		body_alpha *= 0.5 + sin(lifetime_timer * 8.0) * 0.5
	
	# Shadow body (dark oval)
	draw_circle(Vector2.ZERO, 10.0,
		Color(0.15, 0.0, 0.3, body_alpha * 0.8))
	
	# Inner glow
	draw_circle(Vector2.ZERO, 6.0,
		Color(0.3, 0.1, 0.5, body_alpha * 0.6))
	
	# Eyes (two small bright dots)
	var eye_offset = facing_direction.normalized() * 3.0
	var eye_perp = facing_direction.normalized().rotated(PI / 2) * 2.5
	draw_circle(eye_offset + eye_perp, 1.5,
		Color(0.6, 0.0, 1.0, body_alpha))
	draw_circle(eye_offset - eye_perp, 1.5,
		Color(0.6, 0.0, 1.0, body_alpha))
	
	# Wispy tail
	var tail_dir = -facing_direction.normalized()
	for i in range(3):
		var t = float(i + 1) / 4.0
		var tail_pos = tail_dir * (8.0 + i * 5.0)
		tail_pos += Vector2(sin(lifetime_timer * 4.0 + i * 1.5) * 3.0, 0)
		var tail_size = 4.0 * (1.0 - t * 0.5)
		draw_circle(tail_pos, tail_size,
			Color(0.2, 0.0, 0.35, body_alpha * (1.0 - t) * 0.6))
	
	# Attack flash
	if current_state == State.ATTACK and state_timer > 0.15:
		draw_circle(Vector2.ZERO, 14.0,
			Color(0.5, 0.0, 0.8, 0.3 * wraith_alpha))

func _spawn_summon_particles() -> void:
	if not get_parent():
		return
	for i in range(16):
		var angle = randf() * TAU
		var dist = randf_range(20, 50)
		var start_pos = global_position + Vector2(cos(angle), sin(angle)) * dist
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 5), randf_range(2, 5))
		p.color = Color(0.4, 0.0, 0.7, 0.9)
		p.global_position = start_pos
		get_parent().add_child(p)
		var tw = p.create_tween()
		tw.tween_property(p, "global_position", global_position, 0.4).set_ease(Tween.EASE_IN)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.5)
		tw.tween_callback(p.queue_free)

func _spawn_ambient_particles() -> void:
	if not get_parent() or wraith_alpha < 0.3:
		return
	var p = ColorRect.new()
	p.size = Vector2(2, 2)
	p.color = Color(0.3, 0.0, 0.5, 0.5 * wraith_alpha)
	p.global_position = global_position + Vector2(randf_range(-8, 8), randf_range(-8, 8))
	get_parent().add_child(p)
	var tw = p.create_tween()
	tw.tween_property(p, "position:y", p.position.y - randf_range(10, 25), 0.4)
	tw.parallel().tween_property(p, "modulate:a", 0.0, 0.4)
	tw.tween_callback(p.queue_free)

func _spawn_attack_particles(at_pos: Vector2) -> void:
	if not get_parent():
		return
	for i in range(6):
		var p = ColorRect.new()
		p.size = Vector2(3, 3)
		p.color = Color(0.5, 0.0, 0.8, 1.0)
		p.global_position = at_pos
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(30, 60)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.25, 0.25)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.25)
		tw.tween_callback(p.queue_free)

func _spawn_expire_particles() -> void:
	if not get_parent():
		return
	for i in range(12):
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 4), randf_range(2, 4))
		p.color = Color(0.3, 0.0, 0.5, 0.8)
		p.global_position = global_position
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(20, 60)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.5, 0.5)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.5)
		tw.tween_callback(p.queue_free)
