extends CharacterBody2D
## Wraith Guardian - Ranged enemy that teleports and shoots dark projectiles

signal enemy_died(enemy: Node2D)

@export var move_speed: float = 60.0
@export var detection_range: float = 280.0
@export var preferred_distance: float = 150.0
@export var attack_range: float = 250.0
@export var attack_damage: float = 15.0
@export var attack_cooldown: float = 2.0
@export var teleport_cooldown: float = 5.0
@export var teleport_range: float = 120.0
@export var xp_reward: int = 40
@export var gold_reward: int = 15
@export var enemy_name: String = "Wraith Guardian"

enum State { IDLE, PATROL, CHASE, ATTACK, HIT, DEAD, TELEPORT }
var current_state: State = State.IDLE
var player: Node2D = null
var patrol_origin: Vector2 = Vector2.ZERO
var patrol_target: Vector2 = Vector2.ZERO
var facing_direction: Vector2 = Vector2.RIGHT
var attack_timer: float = 0.0
var idle_timer: float = 0.0
var hit_timer: float = 0.0
var teleport_timer: float = 0.0
var knockback_velocity: Vector2 = Vector2.ZERO
var is_frozen: bool = false
var projectile_spawned: bool = false

@onready var sprite: Sprite2D = $Sprite2D
@onready var health_component: HealthComponent = $HealthComponent
@onready var hurtbox: HurtboxComponent = $HurtboxArea

func _ready() -> void:
	add_to_group("enemies")
	patrol_origin = global_position
	_pick_patrol_target()
	idle_timer = randf_range(1.0, 3.0)
	teleport_timer = teleport_cooldown
	
	health_component.died.connect(_on_died)
	hurtbox.hurt.connect(_on_hurt)
	hurtbox.health_component = health_component
	
	hurtbox.collision_layer = 8
	hurtbox.collision_mask = 0
	hurtbox.monitorable = true
	
	GameManager.time_frozen.connect(_on_time_frozen)


func _physics_process(delta: float) -> void:
	if is_frozen:
		velocity = Vector2.ZERO
		move_and_slide()
		return
	
	_find_player()
	teleport_timer -= delta
	
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
			velocity = Vector2.ZERO
		State.TELEPORT:
			_state_teleport(delta)
	
	move_and_slide()


func _find_player() -> void:
	if player == null or not is_instance_valid(player):
		var players := get_tree().get_nodes_in_group("player")
		if players.size() > 0:
			player = players[0]


func _state_idle(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 300.0 * delta)
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
		idle_timer = randf_range(2.0, 4.0)
	
	if _player_in_range(detection_range):
		current_state = State.CHASE


func _state_chase(delta: float) -> void:
	if player == null or not is_instance_valid(player):
		current_state = State.IDLE
		idle_timer = 1.0
		return
	
	var dist_to_player := global_position.distance_to(player.global_position)
	var dir := (player.global_position - global_position).normalized()
	facing_direction = dir
	sprite.flip_h = dir.x < 0
	
	# Try to keep preferred distance
	if dist_to_player > preferred_distance + 20.0:
		velocity = dir * move_speed
	elif dist_to_player < preferred_distance - 20.0:
		velocity = -dir * move_speed
	else:
		velocity = velocity.move_toward(Vector2.ZERO, 200.0 * delta)
	
	if not _player_in_range(detection_range * 1.5):
		current_state = State.IDLE
		idle_timer = 1.0
		return
	
	# Teleport away if player gets too close
	if dist_to_player < 60.0 and teleport_timer <= 0.0:
		current_state = State.TELEPORT
		return
	
	if _player_in_range(attack_range) and attack_timer <= 0.0:
		current_state = State.ATTACK
		attack_timer = attack_cooldown
		projectile_spawned = false


func _state_attack(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 300.0 * delta)
	attack_timer -= delta
	
	if not projectile_spawned and attack_timer < attack_cooldown * 0.7:
		_spawn_projectile()
		projectile_spawned = true
	
	if attack_timer <= 0.0:
		if _player_in_range(detection_range):
			current_state = State.CHASE
		else:
			current_state = State.IDLE
			idle_timer = 0.5


func _state_hit(delta: float) -> void:
	hit_timer -= delta
	velocity = knockback_velocity
	knockback_velocity = knockback_velocity.move_toward(Vector2.ZERO, 400.0 * delta)
	
	if hit_timer <= 0.0:
		if _player_in_range(detection_range):
			current_state = State.CHASE
		else:
			current_state = State.IDLE
			idle_timer = 0.5


func _state_teleport(delta: float) -> void:
	velocity = Vector2.ZERO
	var angle := randf() * TAU
	var teleport_pos := global_position + Vector2(cos(angle), sin(angle)) * teleport_range
	global_position = teleport_pos
	teleport_timer = teleport_cooldown
	
	# Flash effect
	sprite.modulate = Color(0.5, 0.0, 1.0, 0.5)
	var tween := create_tween()
	tween.tween_property(sprite, "modulate", Color(0.5, 0.1, 0.8, 1.0), 0.3)
	
	current_state = State.CHASE


func _spawn_projectile() -> void:
	if player == null or not is_instance_valid(player):
		return
	var projectile := _create_projectile()
	get_parent().add_child(projectile)
	projectile.global_position = global_position
	var dir := (player.global_position - global_position).normalized()
	projectile.set_meta("direction", dir)
	projectile.set_meta("damage", GameManager.calculate_damage(attack_damage))


func _create_projectile() -> Area2D:
	var proj := Area2D.new()
	proj.collision_layer = 32
	proj.collision_mask = 4
	proj.monitoring = true
	proj.monitorable = false
	
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 6.0
	shape.shape = circle
	proj.add_child(shape)
	
	var visual := Sprite2D.new()
	visual.modulate = Color(0.6, 0.0, 0.8, 0.9)
	proj.add_child(visual)
	
	# Use a ColorRect as fallback visual
	var rect := ColorRect.new()
	rect.size = Vector2(10, 10)
	rect.position = Vector2(-5, -5)
	rect.color = Color(0.6, 0.1, 0.9, 0.9)
	proj.add_child(rect)
	
	var script_text := """
extends Area2D
var speed: float = 180.0
var lifetime: float = 3.0
var direction: Vector2 = Vector2.ZERO
var damage_amount: float = 15.0

func _ready():
	direction = get_meta("direction", Vector2.RIGHT)
	damage_amount = get_meta("damage", 15.0)
	area_entered.connect(_on_area_entered)

func _process(delta):
	position += direction * speed * delta
	lifetime -= delta
	if lifetime <= 0:
		queue_free()

func _on_area_entered(area):
	if area is HurtboxComponent:
		var hurtbox = area as HurtboxComponent
		if not hurtbox.is_invincible:
			hurtbox.receive_hit(damage_amount, 100.0, global_position)
		queue_free()
"""
	var script := GDScript.new()
	script.source_code = script_text
	script.reload()
	proj.set_script(script)
	
	return proj


func _pick_patrol_target() -> void:
	var angle := randf() * TAU
	patrol_target = patrol_origin + Vector2(cos(angle), sin(angle)) * randf_range(30.0, 80.0)


func _player_in_range(range_val: float) -> bool:
	if player == null or not is_instance_valid(player):
		return false
	return global_position.distance_to(player.global_position) < range_val


func _on_hurt(damage: float, knockback_force: float, hit_position: Vector2) -> void:
	if current_state == State.DEAD:
		return
	var kb_dir := (global_position - hit_position).normalized()
	knockback_velocity = kb_dir * knockback_force
	hit_timer = 0.3
	current_state = State.HIT
	sprite.modulate = Color(1.0, 0.3, 0.3, 1.0)
	var tween := create_tween()
	tween.tween_property(sprite, "modulate", Color(0.5, 0.1, 0.8, 1.0), 0.2)


func _on_died() -> void:
	current_state = State.DEAD
	collision_layer = 0
	collision_mask = 0
	GameManager.add_xp(xp_reward)
	GameManager.add_gold(gold_reward)
	GameManager.add_score(150)
	GameManager.killed_enemies_count += 1
	GameManager.enemy_killed.emit(enemy_name)
	enemy_died.emit(self)
	
	var tween := create_tween()
	tween.tween_property(sprite, "modulate", Color(0.5, 0.0, 0.5, 0.0), 1.0)
	tween.tween_callback(queue_free)


func _on_time_frozen(frozen: bool) -> void:
	is_frozen = frozen
	if frozen:
		sprite.modulate = Color(0.4, 0.4, 0.7, 1.0)
	else:
		sprite.modulate = Color(0.5, 0.1, 0.8, 1.0)
