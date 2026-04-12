extends CharacterBody2D

signal player_health_changed(current: float, max_val: float)
signal player_mp_changed(current: float, max_val: float)

@export var move_speed: float = 180.0
@export var dash_speed: float = 400.0
@export var dash_duration: float = 0.15
@export var dash_cooldown: float = 0.8
@export var attack_cooldown: float = 0.4
@export var telekinesis_range: float = 250.0
@export var telekinesis_force: float = 300.0

enum State { IDLE, RUN, ATTACK, DASH, HURT, DEAD, TELEKINESIS, TIME_FREEZE_CAST }
var current_state: State = State.IDLE
var facing_direction: Vector2 = Vector2.RIGHT
var attack_timer: float = 0.0
var dash_timer: float = 0.0
var dash_cooldown_timer: float = 0.0
var dash_direction: Vector2 = Vector2.ZERO
var hurt_timer: float = 0.0
var knockback_velocity: Vector2 = Vector2.ZERO
var telekinesis_target: Node2D = null
var blink_timer: float = 0.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var health_component: HealthComponent = $HealthComponent
@onready var hitbox: HitboxComponent = $HitboxArea
@onready var hurtbox: HurtboxComponent = $HurtboxArea
@onready var attack_shape: CollisionShape2D = $HitboxArea/AttackShape
@onready var camera: Camera2D = $Camera2D
@onready var tk_line: Line2D = $TKLine

func _ready() -> void:
	add_to_group("player")
	health_component.max_health = GameManager.player_stats["max_hp"]
	health_component.current_health = GameManager.player_stats["hp"]
	health_component.health_changed.connect(_on_health_changed)
	health_component.died.connect(_on_died)
	hurtbox.hurt.connect(_on_hurt)
	hurtbox.health_component = health_component
	
	hitbox.collision_layer = 16  # layer 5 - PlayerHitbox
	hitbox.collision_mask = 8    # layer 4 - but we target enemy hurtbox
	hitbox.monitoring = true
	
	hurtbox.collision_layer = 4  # layer 3 - but actually hurtbox for player
	hurtbox.collision_mask = 0
	hurtbox.monitorable = true
	
	attack_shape.disabled = true
	tk_line.visible = false
	
	GameManager.time_frozen.connect(_on_time_frozen)


func _physics_process(delta: float) -> void:
	match current_state:
		State.IDLE:
			_state_idle(delta)
		State.RUN:
			_state_run(delta)
		State.ATTACK:
			_state_attack(delta)
		State.DASH:
			_state_dash(delta)
		State.HURT:
			_state_hurt(delta)
		State.DEAD:
			_state_dead(delta)
		State.TELEKINESIS:
			_state_telekinesis(delta)
		State.TIME_FREEZE_CAST:
			_state_time_freeze_cast(delta)
	
	dash_cooldown_timer = max(dash_cooldown_timer - delta, 0.0)
	
	if hurtbox.is_invincible and current_state != State.DEAD:
		blink_timer += delta * 15.0
		sprite.modulate.a = 0.5 + 0.5 * sin(blink_timer)
	else:
		sprite.modulate.a = 1.0
		blink_timer = 0.0
	
	move_and_slide()


func _state_idle(_delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 800.0 * _delta)
	
	var input_dir := _get_input_direction()
	if input_dir != Vector2.ZERO:
		current_state = State.RUN
		return
	
	_check_ability_inputs()


func _state_run(_delta: float) -> void:
	var input_dir := _get_input_direction()
	if input_dir == Vector2.ZERO:
		current_state = State.IDLE
		return
	
	facing_direction = input_dir.normalized()
	velocity = input_dir.normalized() * move_speed
	sprite.flip_h = facing_direction.x < 0
	
	_update_attack_shape_position()
	_check_ability_inputs()


func _state_attack(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 600.0 * delta)
	attack_timer -= delta
	
	if attack_timer <= attack_cooldown * 0.5:
		hitbox.deactivate()
		attack_shape.disabled = true
	
	if attack_timer <= 0.0:
		current_state = State.IDLE


func _state_dash(delta: float) -> void:
	dash_timer -= delta
	velocity = dash_direction * dash_speed
	
	if dash_timer <= 0.0:
		current_state = State.IDLE


func _state_hurt(delta: float) -> void:
	hurt_timer -= delta
	velocity = knockback_velocity
	knockback_velocity = knockback_velocity.move_toward(Vector2.ZERO, 600.0 * delta)
	
	if hurt_timer <= 0.0:
		current_state = State.IDLE


func _state_dead(_delta: float) -> void:
	velocity = Vector2.ZERO


func _state_telekinesis(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, 400.0 * delta)
	
	if telekinesis_target and is_instance_valid(telekinesis_target):
		var dir_to_mouse := (get_global_mouse_position() - telekinesis_target.global_position).normalized()
		if telekinesis_target is CharacterBody2D:
			telekinesis_target.velocity = dir_to_mouse * telekinesis_force
			telekinesis_target.move_and_slide()
		elif telekinesis_target is RigidBody2D:
			telekinesis_target.apply_central_force(dir_to_mouse * telekinesis_force)
		
		tk_line.visible = true
		tk_line.clear_points()
		tk_line.add_point(Vector2.ZERO)
		tk_line.add_point(telekinesis_target.global_position - global_position)
	
	if not Input.is_action_pressed("telekinesis"):
		telekinesis_target = null
		tk_line.visible = false
		current_state = State.IDLE


func _state_time_freeze_cast(delta: float) -> void:
	velocity = Vector2.ZERO
	attack_timer -= delta
	if attack_timer <= 0.0:
		current_state = State.IDLE


func _get_input_direction() -> Vector2:
	return Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up", "move_down")
	)


func _check_ability_inputs() -> void:
	if Input.is_action_just_pressed("attack"):
		_start_attack()
	elif Input.is_action_just_pressed("dash") and dash_cooldown_timer <= 0.0:
		_start_dash()
	elif Input.is_action_just_pressed("telekinesis"):
		_start_telekinesis()
	elif Input.is_action_just_pressed("time_freeze"):
		_start_time_freeze()


func _start_attack() -> void:
	current_state = State.ATTACK
	attack_timer = attack_cooldown
	_update_attack_shape_position()
	attack_shape.disabled = false
	var base_dmg := 15.0
	if GameManager.equipment["weapon"] != null:
		base_dmg += GameManager.equipment["weapon"].get("damage", 0)
	hitbox.damage = GameManager.calculate_damage(base_dmg, GameManager.player_stats["str"])
	hitbox.activate()
	_do_screen_shake(2.0, 0.1)


func _start_dash() -> void:
	var input_dir := _get_input_direction()
	if input_dir == Vector2.ZERO:
		dash_direction = facing_direction
	else:
		dash_direction = input_dir.normalized()
	current_state = State.DASH
	dash_timer = dash_duration
	dash_cooldown_timer = dash_cooldown
	hurtbox.is_invincible = true
	hurtbox.invincibility_timer = dash_duration + 0.1


func _start_telekinesis() -> void:
	if GameManager.player_stats["mp"] < 5:
		return
	var nearest_enemy: Node2D = null
	var nearest_dist := telekinesis_range
	for enemy in get_tree().get_nodes_in_group("enemies"):
		var dist := global_position.distance_to(enemy.global_position)
		if dist < nearest_dist:
			nearest_dist = dist
			nearest_enemy = enemy
	if nearest_enemy:
		telekinesis_target = nearest_enemy
		current_state = State.TELEKINESIS
		GameManager.player_stats["mp"] -= 5
		GameManager.player_stats_changed.emit(GameManager.player_stats)


func _start_time_freeze() -> void:
	GameManager.freeze_time()
	if GameManager.is_time_frozen:
		current_state = State.TIME_FREEZE_CAST
		attack_timer = 0.3


func _update_attack_shape_position() -> void:
	attack_shape.position = facing_direction.normalized() * 30.0


func _on_health_changed(current_hp: float, max_hp: float) -> void:
	GameManager.player_stats["hp"] = current_hp
	player_health_changed.emit(current_hp, max_hp)


func _on_died() -> void:
	current_state = State.DEAD
	sprite.modulate = Color(0.5, 0.0, 0.0, 0.7)
	GameManager.player_died.emit()
	var timer := get_tree().create_timer(2.0)
	timer.timeout.connect(func(): GameManager.change_scene("res://scenes/ui/GameOver.tscn"))


func _on_hurt(damage: float, knockback_force: float, hit_position: Vector2) -> void:
	if current_state == State.DEAD or current_state == State.DASH:
		return
	var kb_dir := (global_position - hit_position).normalized()
	knockback_velocity = kb_dir * knockback_force
	hurt_timer = 0.3
	current_state = State.HURT
	_do_screen_shake(4.0, 0.15)
	_do_hitstop(0.05)


func _do_screen_shake(strength: float, duration: float) -> void:
	if camera:
		var tween := create_tween()
		for i in 5:
			tween.tween_property(camera, "offset", Vector2(randf_range(-strength, strength), randf_range(-strength, strength)), duration / 5.0)
		tween.tween_property(camera, "offset", Vector2.ZERO, duration / 5.0)


func _do_hitstop(duration: float) -> void:
	Engine.time_scale = 0.05
	await get_tree().create_timer(duration, true, false, true).timeout
	Engine.time_scale = 1.0


func _on_time_frozen(frozen: bool) -> void:
	if frozen:
		sprite.modulate = Color(0.7, 0.8, 1.0, 1.0)
	else:
		sprite.modulate = Color(1.0, 1.0, 1.0, 1.0)


func heal(amount: float) -> void:
	health_component.heal(amount)


func restore_mp(amount: float) -> void:
	GameManager.player_stats["mp"] = min(GameManager.player_stats["mp"] + amount, GameManager.player_stats["max_mp"])
	GameManager.player_stats_changed.emit(GameManager.player_stats)
