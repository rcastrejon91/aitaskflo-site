extends CharacterBody2D

signal enemy_died(enemy: Node2D)

# --- Tuning ---
@export var move_speed: float = 45.0
@export var chase_speed: float = 65.0
@export var attack_damage: int = 15
@export var detection_range: float = 200.0
@export var attack_range: float = 160.0
@export var patrol_range: float = 100.0
@export var xp_reward: int = 40
@export var gold_reward: int = 18
@export var enemy_name: String = "Shadow Wraith"
@export var phase_interval: float = 5.0
@export var phase_duration: float = 1.5
@export var attack_cooldown: float = 2.0
@export var magic_drop_chance: float = 0.10  # 10 %

# --- State machine ---
enum State { PATROL, CHASE, PHASE_OUT, PHASED, PHASE_IN, ATTACK, HIT, DEAD }
var current_state: State = State.PATROL

# --- Internal vars ---
var player_ref: Node2D = null
var spawn_position: Vector2
var patrol_target: Vector2
var facing_direction: Vector2 = Vector2.DOWN
var state_timer: float = 0.0
var phase_timer: float = 0.0          # counts UP toward phase_interval
var attack_cd_timer: float = 0.0
var hit_stun_timer: float = 0.0
var knockback_velocity: Vector2 = Vector2.ZERO
var is_invulnerable: bool = false

# --- Onready nodes ---
@onready var sprite: Sprite2D = $Sprite2D
@onready var health_component: HealthComponent = $HealthComponent
@onready var hurtbox: HurtboxComponent = $HurtboxComponent
@onready var health_bar: ProgressBar = $HealthBar
@onready var name_label: Label = $NameLabel
@onready var nav_agent: NavigationAgent2D = $NavigationAgent2D

# Preloads
var _ethereal_blast_scene: PackedScene = preload("res://scenes/entities/EtherealBlast.tscn")
var _pickup_scene: PackedScene = preload("res://scenes/entities/Pickup.tscn")

# ─────────────────────── Lifecycle ───────────────────────

func _ready() -> void:
	add_to_group("enemies")
	spawn_position = global_position
	patrol_target = spawn_position
	hurtbox.hurt.connect(_on_hurt)
	health_component.died.connect(_on_died)
	health_component.health_changed.connect(_on_health_changed)
	health_bar.max_value = health_component.max_hp
	health_bar.value = health_component.current_hp
	name_label.text = enemy_name

	# NavigationAgent2D setup
	nav_agent.path_desired_distance = 8.0
	nav_agent.target_desired_distance = 8.0
	nav_agent.avoidance_enabled = false

	_pick_new_patrol_target()

func _physics_process(delta: float) -> void:
	if current_state == State.DEAD:
		return

	_find_player()

	# Phase cycle timer (ticks in non-phased, non-dead states)
	if current_state not in [State.PHASE_OUT, State.PHASED, State.PHASE_IN, State.DEAD]:
		phase_timer += delta
		if phase_timer >= phase_interval:
			phase_timer = 0.0
			_begin_phase_out()
			return

	# Attack cooldown
	if attack_cd_timer > 0.0:
		attack_cd_timer -= delta

	match current_state:
		State.PATROL:
			_state_patrol(delta)
		State.CHASE:
			_state_chase(delta)
		State.PHASE_OUT:
			_state_phase_out(delta)
		State.PHASED:
			_state_phased(delta)
		State.PHASE_IN:
			_state_phase_in(delta)
		State.ATTACK:
			_state_attack(delta)
		State.HIT:
			_state_hit(delta)

	move_and_slide()

# ─────────────────────── States ───────────────────────

func _state_patrol(delta: float) -> void:
	nav_agent.target_position = patrol_target
	if nav_agent.is_navigation_finished():
		_pick_new_patrol_target()
		state_timer = randf_range(1.0, 2.5)
		velocity = velocity.move_toward(Vector2.ZERO, 200 * delta)
	else:
		var next_pos = nav_agent.get_next_path_position()
		var dir = (next_pos - global_position).normalized()
		velocity = dir * move_speed
		facing_direction = dir
		_update_sprite_direction()

	if state_timer > 0.0:
		state_timer -= delta
		velocity = Vector2.ZERO
		if state_timer <= 0.0:
			_pick_new_patrol_target()

	if _player_in_range(detection_range):
		current_state = State.CHASE

func _state_chase(delta: float) -> void:
	if player_ref == null or not is_instance_valid(player_ref):
		current_state = State.PATROL
		return
	if not _player_in_range(detection_range * 2.5):
		current_state = State.PATROL
		return

	# Navigate toward player
	nav_agent.target_position = player_ref.global_position
	if not nav_agent.is_navigation_finished():
		var next_pos = nav_agent.get_next_path_position()
		var dir = (next_pos - global_position).normalized()
		velocity = dir * chase_speed
		facing_direction = dir
		_update_sprite_direction()
	else:
		velocity = velocity.move_toward(Vector2.ZERO, 200 * delta)

	# Attempt ranged attack
	if _player_in_range(attack_range) and attack_cd_timer <= 0.0:
		_start_attack()

# ─── Phase Out (fade to invisible) ───

func _begin_phase_out() -> void:
	current_state = State.PHASE_OUT
	state_timer = 0.4  # fade-out duration
	is_invulnerable = true
	hurtbox.start_invincibility(phase_duration + 1.0)
	AudioManager.play_sfx_named("wraith_phase")

func _state_phase_out(delta: float) -> void:
	state_timer -= delta
	velocity = velocity.move_toward(Vector2.ZERO, 300 * delta)
	# Fade sprite
	var ratio = clamp(state_timer / 0.4, 0.0, 1.0)
	sprite.modulate.a = ratio
	if state_timer <= 0.0:
		sprite.modulate.a = 0.0
		current_state = State.PHASED
		state_timer = phase_duration
		# Disable collision while phased
		set_collision_layer_value(3, false)

# ─── Phased (invisible, invulnerable, drifts) ───

func _state_phased(delta: float) -> void:
	state_timer -= delta
	# Drift slowly toward a random offset near player or spawn
	if player_ref and is_instance_valid(player_ref) and _player_in_range(detection_range * 2.0):
		var target = player_ref.global_position + Vector2(randf_range(-60, 60), randf_range(-60, 60))
		var dir = (target - global_position).normalized()
		velocity = dir * move_speed * 0.5
	else:
		velocity = velocity.move_toward(Vector2.ZERO, 100 * delta)
	if state_timer <= 0.0:
		_begin_phase_in()

# ─── Phase In (fade back to visible) ───

func _begin_phase_in() -> void:
	current_state = State.PHASE_IN
	state_timer = 0.4
	set_collision_layer_value(3, true)

func _state_phase_in(delta: float) -> void:
	state_timer -= delta
	velocity = velocity.move_toward(Vector2.ZERO, 300 * delta)
	var ratio = 1.0 - clamp(state_timer / 0.4, 0.0, 1.0)
	sprite.modulate.a = ratio
	if state_timer <= 0.0:
		sprite.modulate.a = 1.0
		is_invulnerable = false
		hurtbox.is_invincible = false
		# Resume appropriate state
		if _player_in_range(detection_range):
			current_state = State.CHASE
		else:
			current_state = State.PATROL
			_pick_new_patrol_target()

# ─── Attack (fire ethereal blast) ───

func _start_attack() -> void:
	current_state = State.ATTACK
	state_timer = 0.5  # wind-up + recovery
	attack_cd_timer = attack_cooldown
	velocity = Vector2.ZERO
	# Visual telegraph
	sprite.modulate = Color(0.6, 0.2, 1.0, 1.0)
	# Spawn homing projectile after short wind-up
	await get_tree().create_timer(0.2).timeout
	if not is_instance_valid(self) or current_state == State.DEAD:
		return
	_fire_ethereal_blast()
	# Hitstop + screen shake for feel
	_do_hitstop(0.15, 0.08)
	_do_screen_shake(3.0, 0.15)
	AudioManager.play_sfx_named("wraith_attack")

func _state_attack(delta: float) -> void:
	state_timer -= delta
	velocity = velocity.move_toward(Vector2.ZERO, 300 * delta)
	if state_timer <= 0.0:
		sprite.modulate = Color(0.3, 0.15, 0.6, 1.0)
		if _player_in_range(detection_range):
			current_state = State.CHASE
		else:
			current_state = State.PATROL
			_pick_new_patrol_target()

func _fire_ethereal_blast() -> void:
	if player_ref == null or not is_instance_valid(player_ref):
		return
	var blast = _ethereal_blast_scene.instantiate()
	blast.damage = attack_damage
	blast.target = player_ref
	blast.global_position = global_position + facing_direction.normalized() * 16
	get_parent().add_child(blast)

# ─── Hit ───

func _on_hurt(damage: int, knockback_force: float, from_position: Vector2) -> void:
	if current_state == State.DEAD:
		return
	if is_invulnerable:
		return
	health_component.take_damage(damage)
	var kb_dir = (global_position - from_position).normalized()
	knockback_velocity = kb_dir * knockback_force
	hit_stun_timer = 0.3
	current_state = State.HIT
	AudioManager.play_sfx_named("enemy_hurt")
	sprite.modulate = Color(2, 2, 2, 1)
	await get_tree().create_timer(0.1).timeout
	if is_instance_valid(self) and current_state != State.DEAD:
		sprite.modulate = Color(0.3, 0.15, 0.6, 1.0)

func _state_hit(delta: float) -> void:
	hit_stun_timer -= delta
	velocity = knockback_velocity
	knockback_velocity = knockback_velocity.move_toward(Vector2.ZERO, 500 * delta)
	if hit_stun_timer <= 0.0:
		if _player_in_range(detection_range):
			current_state = State.CHASE
		else:
			current_state = State.PATROL
			state_timer = 0.5

# ─── Death ───

func _on_died() -> void:
	current_state = State.DEAD
	velocity = Vector2.ZERO
	is_invulnerable = false
	GameManager.add_xp(xp_reward)
	GameManager.add_gold(gold_reward)
	GameManager.enemies_defeated += 1
	enemy_died.emit(self)
	AudioManager.play_sfx_named("enemy_death")
	_spawn_death_particles()
	_try_drop_magic_item()
	sprite.modulate = Color(0.2, 0.0, 0.4, 0.8)
	var tween = create_tween()
	tween.tween_property(sprite, "modulate:a", 0.0, 0.9)
	tween.tween_callback(queue_free)

func _try_drop_magic_item() -> void:
	if randf() <= magic_drop_chance:
		var pickup = _pickup_scene.instantiate()
		pickup.pickup_type = 1  # MANA_POTION as magic item stand-in
		pickup.value = 40
		pickup.global_position = global_position + Vector2(randf_range(-10, 10), randf_range(-10, 10))
		# Defer adding so it survives our queue_free
		get_parent().call_deferred("add_child", pickup)

func _spawn_death_particles() -> void:
	# Purple ethereal death burst
	for i in range(14):
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 5), randf_range(2, 5))
		p.color = Color(0.4, 0.1, 0.8, 0.9)
		p.global_position = global_position + Vector2(randf_range(-6, 6), randf_range(-6, 6))
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(30.0, 80.0)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.5, 0.5)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.5)
		tw.tween_callback(p.queue_free)

# ─────────────────────── Helpers ───────────────────────

func _on_health_changed(current_hp: int, max_hp: int) -> void:
	health_bar.value = current_hp
	health_bar.visible = current_hp < max_hp

func _find_player() -> void:
	if player_ref == null or not is_instance_valid(player_ref):
		var players = get_tree().get_nodes_in_group("player")
		if players.size() > 0:
			player_ref = players[0]

func _player_in_range(range_dist: float) -> bool:
	if player_ref == null or not is_instance_valid(player_ref):
		return false
	return global_position.distance_to(player_ref.global_position) <= range_dist

func _pick_new_patrol_target() -> void:
	var offset = Vector2(randf_range(-patrol_range, patrol_range), randf_range(-patrol_range, patrol_range))
	patrol_target = spawn_position + offset

func _update_sprite_direction() -> void:
	if facing_direction.x < 0:
		sprite.flip_h = true
	elif facing_direction.x > 0:
		sprite.flip_h = false

func _do_screen_shake(intensity: float, duration: float) -> void:
	# Find player camera to shake
	var players = get_tree().get_nodes_in_group("player")
	if players.size() == 0:
		return
	var cam = players[0].get_node_or_null("Camera2D")
	if cam == null:
		return
	var tween = create_tween()
	var steps = int(duration / 0.02)
	for i in range(steps):
		var offset = Vector2(randf_range(-intensity, intensity), randf_range(-intensity, intensity))
		tween.tween_property(cam, "offset", offset, 0.02)
	tween.tween_property(cam, "offset", Vector2.ZERO, 0.05)

func _do_hitstop(scale_val: float, duration: float) -> void:
	Engine.time_scale = scale_val
	await get_tree().create_timer(duration * scale_val).timeout
	Engine.time_scale = 1.0
