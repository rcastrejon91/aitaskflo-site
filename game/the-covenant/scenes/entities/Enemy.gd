extends CharacterBody2D

signal enemy_died(enemy: Node2D)

@export var move_speed: float = 75.0
@export var chase_speed: float = 112.5
@export var attack_damage: int = 12
@export var attack_range: float = 28.0
@export var detection_range: float = 180.0
@export var patrol_range: float = 80.0
@export var xp_reward: int = 25
@export var gold_reward: int = 10
@export var enemy_name: String = "Shadow Wraith"

enum State { IDLE, PATROL, CHASE, ATTACK, HIT, DEAD }

var current_state: State = State.IDLE
var player_ref: Node2D = null
var spawn_position: Vector2
var patrol_target: Vector2
var facing_direction: Vector2 = Vector2.DOWN
var state_timer: float = 0.0
var attack_timer: float = 0.0
var hit_stun_timer: float = 0.0
var knockback_velocity: Vector2 = Vector2.ZERO
var idle_duration: float = 0.5
var attack_cooldown: float = 0.4
var can_attack: bool = true

@onready var sprite: Sprite2D = $Sprite2D
@onready var health_component: HealthComponent = $HealthComponent
@onready var hitbox: HitboxComponent = $HitboxComponent
@onready var hurtbox: HurtboxComponent = $HurtboxComponent
@onready var health_bar: ProgressBar = $HealthBar
@onready var name_label: Label = $NameLabel

func _ready() -> void:
	add_to_group("enemies")
	spawn_position = global_position
	patrol_target = spawn_position
	hitbox.damage = attack_damage
	hitbox.deactivate()
	hurtbox.hurt.connect(_on_hurt)
	health_component.died.connect(_on_died)
	health_component.health_changed.connect(_on_health_changed)
	health_bar.max_value = health_component.max_hp
	health_bar.value = health_component.current_hp
	name_label.text = enemy_name
	_pick_new_patrol_target()

func _physics_process(delta: float) -> void:
	if current_state == State.DEAD:
		return

	_find_player()

	match current_state:
		State.IDLE:
			_state_idle(delta)
		State.PATROL:
			_state_patrol(delta)
		State.CHASE:
			_state_chase(delta)
		State.ATTACK:
			_state_attack(delta)
		State.HIT:
			_state_hit(delta)

	if not can_attack:
		attack_timer -= delta
		if attack_timer <= 0:
			can_attack = true

	move_and_slide()

func _state_idle(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 200 * delta)
	state_timer -= delta
	if _player_in_range(detection_range):
		current_state = State.CHASE
		return
	if state_timer <= 0:
		_pick_new_patrol_target()
		current_state = State.PATROL

func _state_patrol(delta: float) -> void:
	var dir = (patrol_target - global_position).normalized()
	velocity = dir * move_speed
	facing_direction = dir
	_update_sprite_direction()
	if global_position.distance_to(patrol_target) < 8.0:
		current_state = State.IDLE
		state_timer = idle_duration
		velocity = Vector2.ZERO
	if _player_in_range(detection_range):
		current_state = State.CHASE

func _state_chase(delta: float) -> void:
	if player_ref == null or not _player_in_range(detection_range * 2.4):
		current_state = State.IDLE
		state_timer = 0.5
		return
	var dir = (player_ref.global_position - global_position).normalized()
	velocity = dir * chase_speed
	facing_direction = dir
	_update_sprite_direction()
	if _player_in_range(attack_range) and can_attack:
		_start_attack()

func _state_attack(delta: float) -> void:
	state_timer -= delta
	velocity = velocity.move_toward(Vector2.ZERO, 300 * delta)
	if state_timer <= attack_cooldown * 0.5 and hitbox.is_active:
		hitbox.deactivate()
	if state_timer <= 0:
		hitbox.deactivate()
		current_state = State.CHASE

func _state_hit(delta: float) -> void:
	hit_stun_timer -= delta
	velocity = knockback_velocity
	knockback_velocity = knockback_velocity.move_toward(Vector2.ZERO, 500 * delta)
	if hit_stun_timer <= 0:
		if _player_in_range(detection_range):
			current_state = State.CHASE
		else:
			current_state = State.IDLE
			state_timer = 0.5

func _start_attack() -> void:
	current_state = State.ATTACK
	state_timer = attack_cooldown
	hitbox.position = facing_direction.normalized() * 20
	hitbox.damage = attack_damage
	hitbox.activate()
	can_attack = false
	attack_timer = attack_cooldown
	AudioManager.play_sfx_named("enemy_attack")
	sprite.modulate = Color(1.3, 0.6, 0.6)
	await get_tree().create_timer(0.15).timeout
	if is_instance_valid(self) and current_state != State.DEAD:
		sprite.modulate = Color(1, 1, 1)

func _on_hurt(damage: int, knockback_force: float, from_position: Vector2) -> void:
	if current_state == State.DEAD:
		return
	health_component.take_damage(damage)
	var kb_dir = (global_position - from_position).normalized()
	knockback_velocity = kb_dir * knockback_force
	hit_stun_timer = 0.3
	current_state = State.HIT
	hitbox.deactivate()
	AudioManager.play_sfx_named("enemy_hurt")
	sprite.modulate = Color(2, 2, 2)
	await get_tree().create_timer(0.1).timeout
	if is_instance_valid(self) and current_state != State.DEAD:
		sprite.modulate = Color(1, 1, 1)

func _on_died() -> void:
	current_state = State.DEAD
	velocity = Vector2.ZERO
	hitbox.deactivate()
	GameManager.add_xp(xp_reward)
	GameManager.add_gold(gold_reward)
	GameManager.enemies_defeated += 1
	enemy_died.emit(self)
	AudioManager.play_sfx_named("enemy_death")
	_spawn_death_particles()
	sprite.modulate = Color(0.5, 0.0, 0.0, 0.8)
	var tween = create_tween()
	tween.tween_property(sprite, "modulate:a", 0.0, 0.8)
	tween.tween_callback(queue_free)

func _spawn_death_particles() -> void:
	var particles = GPUParticles2D.new()
	particles.emitting = true
	particles.one_shot = true
	particles.amount = 20
	particles.lifetime = 0.7
	particles.global_position = global_position
	var mat = ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	mat.emission_sphere_radius = 10.0
	mat.direction = Vector3(0, -1, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = 30.0
	mat.initial_velocity_max = 80.0
	mat.gravity = Vector3(0, 60, 0)
	mat.color = Color(0.7, 0.1, 0.2, 1.0)
	mat.scale_min = 2.0
	mat.scale_max = 5.0
	particles.process_material = mat
	get_parent().add_child(particles)
	var cleanup = particles.create_tween()
	cleanup.tween_callback(particles.queue_free).set_delay(1.2)

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
