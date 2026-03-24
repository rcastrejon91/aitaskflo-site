extends CharacterBody2D
class_name Enemy

@export var move_speed: float = 100.0
@export var max_health: float = 40.0
@export var damage: float = 10.0
@export var attack_range: float = 35.0
@export var attack_cooldown: float = 1.2
@export var detection_range: float = 300.0

var health: float
var attack_timer: float = 0.0
var target: Player = null
var state: String = "idle"  # idle, chase, attack, stagger

# Stagger
var stagger_timer: float = 0.0
var stagger_duration: float = 0.25

@onready var sprite: Sprite2D = $Sprite2D

signal died(enemy: Enemy)

func _ready() -> void:
	health = max_health
	add_to_group("enemies")
	# Find player
	await get_tree().process_frame
	var players := get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		target = players[0]

func _physics_process(delta: float) -> void:
	attack_timer = max(0.0, attack_timer - delta)
	
	match state:
		"idle":
			_state_idle(delta)
		"chase":
			_state_chase(delta)
		"attack":
			_state_attack(delta)
		"stagger":
			_state_stagger(delta)
	
	move_and_slide()

func _state_idle(delta: float) -> void:
	velocity = velocity.move_toward(Vector2.ZERO, move_speed * 4.0 * delta)
	if target and global_position.distance_to(target.global_position) < detection_range:
		state = "chase"

func _state_chase(delta: float) -> void:
	if not target or not is_instance_valid(target):
		state = "idle"
		return
	
	var dir := (target.global_position - global_position).normalized()
	velocity = dir * move_speed
	
	# Flip sprite
	if dir.x != 0:
		sprite.flip_h = dir.x < 0
	
	var dist := global_position.distance_to(target.global_position)
	if dist < attack_range:
		state = "attack"
	elif dist > detection_range * 1.5:
		state = "idle"

func _state_attack(delta: float) -> void:
	velocity = Vector2.ZERO
	
	if not target or not is_instance_valid(target):
		state = "idle"
		return
	
	if attack_timer <= 0.0:
		# Deal damage
		if global_position.distance_to(target.global_position) < attack_range * 1.5:
			target.take_damage(damage)
			attack_timer = attack_cooldown
			
			# Hit flash
			modulate = Color(1.5, 0.5, 0.5, 1)
			var tween := create_tween()
			tween.tween_property(self, "modulate", Color(1, 1, 1, 1), 0.1)
	
	if global_position.distance_to(target.global_position) > attack_range * 2:
		state = "chase"

func _state_stagger(delta: float) -> void:
	stagger_timer -= delta
	velocity = velocity.move_toward(Vector2.ZERO, 800.0 * delta)
	if stagger_timer <= 0.0:
		state = "chase"

func take_damage(amount: float) -> void:
	health -= amount
	
	# Stagger
	state = "stagger"
	stagger_timer = stagger_duration
	if target and is_instance_valid(target):
		var knockback_dir := (global_position - target.global_position).normalized()
		velocity = knockback_dir * 200.0
	
	# Hit flash
	modulate = Color(3, 3, 3, 1)
	var tween := create_tween()
	tween.tween_property(self, "modulate", Color(1, 1, 1, 1), 0.15)
	
	if health <= 0.0:
		_die()

func _die() -> void:
	emit_signal("died", self)
	
	# Death particles
	var particles := GPUParticles2D.new()
	particles.amount = 20
	particles.one_shot = true
	particles.emitting = true
	particles.lifetime = 0.6
	
	var mat := ParticleProcessMaterial.new()
	mat.spread = 180.0
	mat.initial_velocity_min = 40.0
	mat.initial_velocity_max = 100.0
	mat.gravity = Vector3(0, 50, 0)
	mat.color = Color(0.8, 0.1, 0.1, 1.0)
	mat.scale_min = 2.0
	mat.scale_max = 5.0
	particles.process_material = mat
	
	particles.global_position = global_position
	get_tree().current_scene.add_child(particles)
	
	var cleanup := Timer.new()
	cleanup.wait_time = 1.5
	cleanup.one_shot = true
	particles.add_child(cleanup)
	cleanup.timeout.connect(particles.queue_free)
	cleanup.start()
	
	queue_free()
