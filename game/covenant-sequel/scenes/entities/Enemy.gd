extends CharacterBody2D

signal enemy_died(enemy: Node2D)

@export var move_speed: float = 80.0
@export var chase_speed: float = 120.0
@export var detection_range: float = 200.0
@export var attack_range: float = 35.0
@export var attack_damage: float = 12.0
@export var attack_cooldown: float = 1.0
@export var patrol_distance: float = 100.0
@export var xp_reward: int = 25
@export var gold_reward: int = 10
@export var enemy_name: String = "Shadow Guardian"

enum State { IDLE, PATROL, CHASE, ATTACK, HIT, DEAD }
var current_state: State = State.IDLE
var player: Node2D = null
var patrol_origin: Vector2 = Vector2.ZERO
var patrol_target: Vector2 = Vector2.ZERO
var facing_direction: Vector2 = Vector2.RIGHT
var attack_timer: float = 0.0
var idle_timer: float = 0.0
var hit_timer: float = 0.0
var knockback_velocity: Vector2 = Vector2.ZERO
var is_frozen: bool = false

@onready var sprite: Sprite2D = $Sprite2D
@onready var health_component: HealthComponent = $HealthComponent
@onready var hitbox: HitboxComponent = $HitboxArea
@onready var hurtbox: HurtboxComponent = $HurtboxArea
@onready var attack_shape: CollisionShape2D = $HitboxArea/AttackShape
@onready var detection_area: Area2D = $DetectionArea

func _ready() -> void:
	add_to_group("enemies")
	patrol_origin = global_position
	_pick_patrol_target()
	idle_timer = randf_range(1.0, 3.0)
	
	health_component.died.connect(_on_died)
	hurtbox.hurt.connect(_on_hurt)
	hurtbox.health_component = health_component
	
	hitbox.collision_layer = 32  # layer 6 enemy hitbox
	hitbox.collision_mask = 4    # layer 3 player hurtbox
	hitbox.monitoring = true
	
	hurtbox.collision_layer = 8  # layer 4 enemy hurtbox
	hurtbox.collision_mask = 0
	hurtbox.monitorable = true
	
	attack_shape.disabled = true
	
	GameManager.time_frozen.connect(_on_time_frozen)


func _physics_process(delta: float) -> void:
	if is_frozen:
		velocity = Vector2.ZERO
		move_and_slide()
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
		State.DEAD:
			_state_dead(delta)
	
	move_and_slide()


func _find_player() -> void:
	if player == null or not is_instance_valid(player):
		var players := get_tree().get_nodes_in_group("player")
		if players.size() > 0:
			player = players[0]


func _state_idle(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 400.0 * delta)
	idle_timer -= delta
	
	if _player_in_range(detection_range):
		current_state = State.CHASE
		return
	
	if idle_timer <= 0.0:
		_pick_patrol_target()
		current_state = State.PATROL


func _state_patrol(delta: float) -> void:
	var dir := (patrol_target - global_position).normalized()
	velocity = dir * move_speed
	facing_direction = dir
	sprite.flip_h = dir.x < 0
	
	if global_position.distance_to(patrol_target) < 10.0:
		current_state = State.IDLE
		idle_timer = randf_range(1.5, 3.5)
	
	if _player_in_range(detection_range):
		current_state = State.CHASE


func _state_chase(delta: float) -> void:
	if player == null or not is_instance_valid(player):
		current_state = State.IDLE
		idle_timer = 1.0
		return
	
	var dir := (player.global_position - global_position).normalized()
	velocity = dir * chase_speed
	facing_direction = dir
	sprite.flip_h = dir.x < 0
	
	if not _player_in_range(detection_range * 1.5):
		current_state = State.IDLE
		idle_timer = 1.0
		return
	
	if _player_in_range(attack_range) and attack_timer <= 0.0:
		current_state = State.ATTACK
		attack_timer = attack_cooldown
		_perform_attack()


func _state_attack(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 500.0 * delta)
	attack_timer -= delta
	
	if attack_timer <= attack_cooldown * 0.5:
		hitbox.deactivate()
		attack_shape.disabled = true
	
	if attack_timer <= 0.0:
		if _player_in_range(detection_range):
			current_state = State.CHASE
		else:
			current_state = State.IDLE
			idle_timer = 0.5


func _state_hit(delta: float) -> void:
	hit_timer -= delta
	velocity = knockback_velocity
	knockback_velocity = knockback_velocity.move_toward(Vector2.ZERO, 500.0 * delta)
	
	if hit_timer <= 0.0:
		if _player_in_range(detection_range):
			current_state = State.CHASE
		else:
			current_state = State.IDLE
			idle_timer = 0.5


func _state_dead(_delta: float) -> void:
	velocity = Vector2.ZERO


func _perform_attack() -> void:
	attack_shape.position = facing_direction.normalized() * 25.0
	attack_shape.disabled = false
	hitbox.damage = GameManager.calculate_damage(attack_damage)
	hitbox.activate()


func _pick_patrol_target() -> void:
	var angle := randf() * TAU
	patrol_target = patrol_origin + Vector2(cos(angle), sin(angle)) * randf_range(30.0, patrol_distance)


func _player_in_range(range_val: float) -> bool:
	if player == null or not is_instance_valid(player):
		return false
	return global_position.distance_to(player.global_position) < range_val


func _on_hurt(damage: float, knockback_force: float, hit_position: Vector2) -> void:
	if current_state == State.DEAD:
		return
	var kb_dir := (global_position - hit_position).normalized()
	knockback_velocity = kb_dir * knockback_force
	hit_timer = 0.25
	current_state = State.HIT
	sprite.modulate = Color(1.0, 0.3, 0.3, 1.0)
	var tween := create_tween()
	tween.tween_property(sprite, "modulate", Color(1.0, 0.4, 0.3, 1.0), 0.15)
	tween.tween_property(sprite, "modulate", Color(1.0, 1.0, 1.0, 1.0), 0.1)


func _on_died() -> void:
	current_state = State.DEAD
	hitbox.deactivate()
	attack_shape.disabled = true
	collision_layer = 0
	collision_mask = 0
	GameManager.add_xp(xp_reward)
	GameManager.add_gold(gold_reward)
	GameManager.add_score(100)
	GameManager.killed_enemies_count += 1
	GameManager.enemy_killed.emit(enemy_name)
	enemy_died.emit(self)
	
	var tween := create_tween()
	tween.tween_property(sprite, "modulate", Color(0.5, 0.0, 0.0, 0.0), 0.8)
	tween.tween_callback(queue_free)


func _on_time_frozen(frozen: bool) -> void:
	is_frozen = frozen
	if frozen:
		sprite.modulate = Color(0.5, 0.5, 0.8, 1.0)
	else:
		sprite.modulate = Color(1.0, 1.0, 1.0, 1.0)
