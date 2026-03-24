extends CharacterBody2D

## Player — top-down movement with sprint, interact, spells, and combat

const SPEED        := 160.0
const SPRINT_SPEED := 260.0
const FRICTION     := 0.82

# Health
@export var max_health: float = 100.0
var health: float = 100.0

# Wic Energy (mana)
@export var max_wic: float = 100.0
@export var wic_regen_rate: float = 8.0
var wic: float = 100.0

# Spells
var current_spell: int = 0  # 0=HexBlast, 1=SoulFreeze, 2=WorldCharm
var spell_costs: Array[float] = [20.0, 30.0, 50.0]
var spell_cooldowns: Array[float] = [0.5, 1.2, 4.0]
var cooldown_timers: Array[float] = [0.0, 0.0, 0.0]

# State
var in_dialogue: bool = false
var is_dead: bool = false
var invulnerable: bool = false
var invuln_timer: float = 0.0
var facing: Vector2 = Vector2.DOWN

# Dash
var can_dash: bool = true
var is_dashing: bool = false
var dash_speed: float = 500.0
var dash_duration: float = 0.15
var dash_timer: float = 0.0
var dash_cooldown: float = 0.8
var dash_cooldown_timer: float = 0.0

# Relics
var relics_collected: int = 0

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var collision: CollisionShape2D = $CollisionShape2D
@onready var interact_area: Area2D = $InteractArea

func _ready() -> void:
	health = max_health
	wic = max_wic
	EventBus.health_changed.emit(health, max_health)
	EventBus.wic_changed.emit(wic, max_wic)
	EventBus.player_hit.connect(_on_player_hit)
	EventBus.relic_collected.connect(_on_relic_collected)
	EventBus.dialogue_started.connect(func(): in_dialogue = true)
	EventBus.dialogue_ended.connect(func(): in_dialogue = false)

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	# Cooldown ticking
	for i in range(cooldown_timers.size()):
		if cooldown_timers[i] > 0.0:
			cooldown_timers[i] -= delta

	# Dash cooldown
	if dash_cooldown_timer > 0.0:
		dash_cooldown_timer -= delta
		if dash_cooldown_timer <= 0.0:
			can_dash = true

	# Invulnerability
	if invulnerable:
		invuln_timer -= delta
		# Flash effect
		modulate.a = 0.4 if fmod(invuln_timer, 0.15) > 0.075 else 1.0
		if invuln_timer <= 0.0:
			invulnerable = false
			modulate.a = 1.0

	# Wic regen
	if wic < max_wic:
		wic = min(wic + wic_regen_rate * delta, max_wic)
		EventBus.wic_changed.emit(wic, max_wic)

	if in_dialogue:
		velocity = Vector2.ZERO
		move_and_slide()
		return

	# Dashing
	if is_dashing:
		dash_timer -= delta
		if dash_timer <= 0.0:
			is_dashing = false
		else:
			move_and_slide()
			return

	# Movement
	var input_vec := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	var sprinting := Input.is_action_pressed("sprint")
	var speed := SPRINT_SPEED if sprinting else SPEED

	if input_vec != Vector2.ZERO:
		facing = input_vec.normalized()
		velocity = input_vec.normalized() * speed
		_update_animation(input_vec, sprinting)
	else:
		velocity *= FRICTION
		if velocity.length() < 5.0:
			velocity = Vector2.ZERO
		_play_idle()

	move_and_slide()

	# Dash input
	if Input.is_action_just_pressed("dash") and can_dash and input_vec != Vector2.ZERO:
		_start_dash(input_vec.normalized())

	# Spell switching
	if Input.is_action_just_pressed("spell_next"):
		current_spell = (current_spell + 1) % 3
		EventBus.spell_switched.emit(current_spell)
	if Input.is_action_just_pressed("spell_prev"):
		current_spell = (current_spell - 1) % 3
		if current_spell < 0:
			current_spell = 2
		EventBus.spell_switched.emit(current_spell)

	# Cast spell
	if Input.is_action_just_pressed("cast_spell"):
		_cast_current_spell()

	# Interact
	if Input.is_action_just_pressed("interact"):
		_try_interact()

func _start_dash(dir: Vector2) -> void:
	is_dashing = true
	can_dash = false
	invulnerable = true
	invuln_timer = dash_duration + 0.1
	dash_timer = dash_duration
	dash_cooldown_timer = dash_cooldown
	velocity = dir * dash_speed
	EventBus.screen_shake.emit(0.15, 0.1)

func _cast_current_spell() -> void:
	if cooldown_timers[current_spell] > 0.0:
		return
	if wic < spell_costs[current_spell]:
		return

	wic -= spell_costs[current_spell]
	EventBus.wic_changed.emit(wic, max_wic)
	cooldown_timers[current_spell] = spell_cooldowns[current_spell]

	match current_spell:
		0:
			_cast_hex_blast()
		1:
			_cast_soul_freeze()
		2:
			_cast_world_charm()

func _cast_hex_blast() -> void:
	var blast = preload("res://scenes/spells/HexBlast.tscn").instantiate()
	blast.global_position = global_position
	blast.direction = facing
	get_tree().current_scene.add_child(blast)
	EventBus.spell_cast.emit("hex_blast")
	EventBus.screen_shake.emit(0.3, 0.2)

func _cast_soul_freeze() -> void:
	var freeze = preload("res://scenes/spells/SoulFreeze.tscn").instantiate()
	freeze.global_position = global_position
	get_tree().current_scene.add_child(freeze)
	EventBus.spell_cast.emit("soul_freeze")
	EventBus.screen_shake.emit(0.2, 0.3)

func _cast_world_charm() -> void:
	var charm = preload("res://scenes/spells/WorldCharm.tscn").instantiate()
	charm.global_position = global_position
	get_tree().current_scene.add_child(charm)
	EventBus.spell_cast.emit("world_charm")
	EventBus.screen_shake.emit(0.5, 0.5)

func _on_player_hit(damage: float) -> void:
	if invulnerable or is_dead:
		return
	health -= damage
	health = max(health, 0.0)
	EventBus.health_changed.emit(health, max_health)
	EventBus.screen_shake.emit(0.4, 0.2)

	# Brief invulnerability
	invulnerable = true
	invuln_timer = 0.8

	if health <= 0.0:
		_die()

func _die() -> void:
	is_dead = true
	velocity = Vector2.ZERO
	# Death animation flash
	var tween = create_tween()
	tween.tween_property(self, "modulate", Color(1, 0, 0, 0), 1.0)
	tween.tween_callback(func(): EventBus.game_over.emit())

func heal(amount: float) -> void:
	health = min(health + amount, max_health)
	EventBus.health_changed.emit(health, max_health)

func restore_wic(amount: float) -> void:
	wic = min(wic + amount, max_wic)
	EventBus.wic_changed.emit(wic, max_wic)

func _on_relic_collected(_name: String, total: int) -> void:
	relics_collected = total
	if total >= 5:
		EventBus.all_relics_collected.emit()

func _try_interact() -> void:
	if not interact_area:
		return
	for body in interact_area.get_overlapping_bodies():
		if body.has_method("interact"):
			body.interact()
			return
	for area in interact_area.get_overlapping_areas():
		if area.has_method("interact"):
			area.interact()
			return

func _update_animation(dir: Vector2, sprinting: bool) -> void:
	if not sprite:
		return
	var prefix = "sprint_" if sprinting else "walk_"
	if abs(dir.x) > abs(dir.y):
		sprite.play(prefix + ("right" if dir.x > 0 else "left"))
	else:
		sprite.play(prefix + ("down" if dir.y > 0 else "up"))

func _play_idle() -> void:
	if not sprite:
		return
	if facing.x > 0.5:
		sprite.play("idle_right")
	elif facing.x < -0.5:
		sprite.play("idle_left")
	elif facing.y > 0:
		sprite.play("idle_down")
	else:
		sprite.play("idle_up")
