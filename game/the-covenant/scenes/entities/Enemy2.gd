extends CharacterBody2D

signal enemy_died(enemy: Node2D)

@export var move_speed: float = 52.5
@export var charge_speed: float = 270.0
@export var attack_damage: int = 20
@export var attack_range: float = 120.0
@export var detection_range: float = 216.0
@export var xp_reward: int = 45
@export var gold_reward: int = 20
@export var enemy_name: String = "Covenant Guardian"

enum State { IDLE, WANDER, ALERT, CHARGE, ATTACK, RECOVER, HIT, DEAD }

var current_state: State = State.IDLE
var player_ref: Node2D = null
var spawn_position: Vector2
var facing_direction: Vector2 = Vector2.DOWN
var state_timer: float = 0.0
var charge_direction: Vector2 = Vector2.ZERO
var hit_stun_timer: float = 0.0
var knockback_velocity: Vector2 = Vector2.ZERO
var wander_target: Vector2 = Vector2.ZERO
var charge_duration: float = 0.6
var recover_duration: float = 0.5
var alert_duration: float = 0.5
var has_charged: bool = false

@onready var sprite: Sprite2D = $Sprite2D
@onready var health_component: HealthComponent = $HealthComponent
@onready var hitbox: HitboxComponent = $HitboxComponent
@onready var hurtbox: HurtboxComponent = $HurtboxComponent
@onready var health_bar: ProgressBar = $HealthBar
@onready var name_label: Label = $NameLabel

func _ready() -> void:
	add_to_group("enemies")
	spawn_position = global_position
	wander_target = spawn_position
	hitbox.damage = attack_damage
	hitbox.deactivate()
	hurtbox.hurt.connect(_on_hurt)
	health_component.died.connect(_on_died)
	health_component.health_changed.connect(_on_health_changed)
	health_bar.max_value = health_component.max_hp
	health_bar.value = health_component.current_hp
	name_label.text = enemy_name

func _physics_process(delta: float) -> void:
	if current_state == State.DEAD:
		return

	_find_player()

	match current_state:
		State.IDLE:
			_state_idle(delta)
		State.WANDER:
			_state_wander(delta)
		State.ALERT:
			_state_alert(delta)
		State.CHARGE:
			_state_charge(delta)
		State.RECOVER:
			_state_recover(delta)
		State.HIT:
			_state_hit(delta)

	move_and_slide()

func _state_idle(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 200 * delta)
	state_timer -= delta
	if _player_in_range(detection_range):
		current_state = State.ALERT
		state_timer = alert_duration
		sprite.modulate = Color(1.5, 0.5, 0.0)
		return
	if state_timer <= 0:
		_pick_wander_target()
		current_state = State.WANDER

func _state_wander(delta: float) -> void:
	var dir = (wander_target - global_position).normalized()
	velocity = dir * move_speed
	facing_direction = dir
	_update_sprite_direction()
	if global_position.distance_to(wander_target) < 10.0:
		current_state = State.IDLE
		state_timer = randf_range(0.5, 1.5)
	if _player_in_range(detection_range):
		current_state = State.ALERT
		state_timer = alert_duration
		sprite.modulate = Color(1.5, 0.5, 0.0)

func _state_alert(delta: float) -> void:
	velocity = Vector2.ZERO
	state_timer -= delta
	if player_ref and is_instance_valid(player_ref):
		facing_direction = (player_ref.global_position - global_position).normalized()
		_update_sprite_direction()
	if state_timer <= 0:
		_start_charge()

func _state_charge(delta: float) -> void:
	state_timer -= delta
	velocity = charge_direction * charge_speed
	hitbox.position = charge_direction * 16
	if state_timer <= 0:
		hitbox.deactivate()
		current_state = State.RECOVER
		state_timer = recover_duration
		sprite.modulate = Color(0.6, 0.6, 0.8)

func _state_recover(delta: float) -> void:
	state_timer -= delta
	velocity = velocity.move_toward(Vector2.ZERO, 300 * delta)
	if state_timer <= 0:
		sprite.modulate = Color(1, 1, 1)
		if _player_in_range(detection_range):
			current_state = State.ALERT
			state_timer = alert_duration * 0.6
			sprite.modulate = Color(1.5, 0.5, 0.0)
		else:
			current_state = State.IDLE
			state_timer = 0.5

func _state_hit(delta: float) -> void:
	hit_stun_timer -= delta
	velocity = knockback_velocity
	knockback_velocity = knockback_velocity.move_toward(Vector2.ZERO, 400 * delta)
	if hit_stun_timer <= 0:
		sprite.modulate = Color(1, 1, 1)
		if _player_in_range(detection_range):
			current_state = State.ALERT
			state_timer = alert_duration * 0.4
			sprite.modulate = Color(1.5, 0.5, 0.0)
		else:
			current_state = State.IDLE
			state_timer = 0.5

func _start_charge() -> void:
	if player_ref and is_instance_valid(player_ref):
		charge_direction = (player_ref.global_position - global_position).normalized()
	else:
		charge_direction = facing_direction
	current_state = State.CHARGE
	state_timer = charge_duration
	hitbox.damage = attack_damage
	hitbox.activate()
	sprite.modulate = Color(1.8, 0.2, 0.2)

func _on_hurt(damage: int, knockback_force: float, from_position: Vector2) -> void:
	if current_state == State.DEAD:
		return
	health_component.take_damage(damage)
	var kb_dir = (global_position - from_position).normalized()
	knockback_velocity = kb_dir * knockback_force * 0.7
	hit_stun_timer = 0.4
	current_state = State.HIT
	hitbox.deactivate()
	sprite.modulate = Color(3, 3, 3)

func _on_died() -> void:
	current_state = State.DEAD
	velocity = Vector2.ZERO
	hitbox.deactivate()
	GameManager.add_xp(xp_reward)
	GameManager.add_gold(gold_reward)
	GameManager.enemies_defeated += 1
	enemy_died.emit(self)
	sprite.modulate = Color(0.3, 0.0, 0.3, 0.8)
	var tween = create_tween()
	tween.tween_property(sprite, "modulate:a", 0.0, 1.0)
	tween.tween_callback(queue_free)

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

func _pick_wander_target() -> void:
	var offset = Vector2(randf_range(-60, 60), randf_range(-60, 60))
	wander_target = spawn_position + offset

func _update_sprite_direction() -> void:
	if facing_direction.x < 0:
		sprite.flip_h = true
	elif facing_direction.x > 0:
		sprite.flip_h = false
