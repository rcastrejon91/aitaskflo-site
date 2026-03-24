extends CharacterBody2D

## The Witch - stalks the player through the dark forest

enum State { IDLE, PATROL, STALK, CHASE, ATTACK, VANISH }

@export var patrol_speed: float = 40.0
@export var stalk_speed: float = 60.0
@export var chase_speed: float = 160.0
@export var detection_range: float = 300.0
@export var attack_range: float = 50.0
@export var attack_damage: float = 25.0
@export var vanish_chance: float = 0.3

var current_state: State = State.PATROL
var player: CharacterBody2D = null
var patrol_points: Array[Vector2] = []
var current_patrol_index: int = 0
var state_timer: float = 0.0
var attack_cooldown: float = 0.0
var visible_to_player: bool = false
var teleport_cooldown: float = 0.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var detection_area: Area2D = $DetectionArea
@onready var attack_area: Area2D = $AttackArea
@onready var whisper_player: AudioStreamPlayer2D = $WhisperPlayer
@onready var nav_agent: NavigationAgent2D = $NavigationAgent2D

func _ready() -> void:
	player = get_tree().get_first_node_in_group("player")
	# Generate random patrol points around spawn
	for i in range(4):
		patrol_points.append(global_position + Vector2(
			randf_range(-400, 400),
			randf_range(-400, 400)
		))
	modulate = Color(0.6, 0.2, 0.8, 0.8)

func _physics_process(delta: float) -> void:
	if GameManager.is_game_over or GameManager.is_game_won:
		return
	
	if not player:
		return
	
	attack_cooldown = max(attack_cooldown - delta, 0.0)
	teleport_cooldown = max(teleport_cooldown - delta, 0.0)
	state_timer += delta
	
	var dist_to_player = global_position.distance_to(player.global_position)
	var anger = GameManager.witch_anger
	
	match current_state:
		State.PATROL:
			_do_patrol(delta)
			if dist_to_player < detection_range * (1.0 + anger):
				_change_state(State.STALK)
		
		State.STALK:
			_do_stalk(delta, dist_to_player)
			if dist_to_player < detection_range * 0.5:
				_change_state(State.CHASE)
			elif dist_to_player > detection_range * 1.5:
				_change_state(State.PATROL)
		
		State.CHASE:
			_do_chase(delta, dist_to_player)
			if dist_to_player < attack_range:
				_change_state(State.ATTACK)
			elif dist_to_player > detection_range * 2.0 and state_timer > 5.0:
				if randf() < vanish_chance:
					_change_state(State.VANISH)
				else:
					_change_state(State.STALK)
		
		State.ATTACK:
			_do_attack(delta, dist_to_player)
			if dist_to_player > attack_range * 2:
				_change_state(State.CHASE)
		
		State.VANISH:
			_do_vanish(delta)
	
	# Flicker effect when close
	if dist_to_player < 200:
		modulate.a = randf_range(0.5, 0.9)
		GameManager.add_fear(delta * 0.3)
	else:
		modulate.a = lerp(modulate.a, 0.8, delta)
	
	# Whisper when stalking
	if current_state == State.STALK and whisper_player and not whisper_player.playing:
		if randf() < 0.01:
			whisper_player.play()
	
	move_and_slide()

func _do_patrol(delta: float) -> void:
	if patrol_points.is_empty():
		return
	var target = patrol_points[current_patrol_index]
	var dir = global_position.direction_to(target)
	velocity = dir * patrol_speed
	
	if global_position.distance_to(target) < 20:
		current_patrol_index = (current_patrol_index + 1) % patrol_points.size()
		# Random pause
		velocity = Vector2.ZERO

func _do_stalk(delta: float, dist: float) -> void:
	var dir = global_position.direction_to(player.global_position)
	velocity = dir * stalk_speed
	
	# Occasionally stop to be creepy
	if fmod(state_timer, 3.0) < 0.5:
		velocity = Vector2.ZERO

func _do_chase(delta: float, dist: float) -> void:
	var speed_mult = 1.0 + GameManager.witch_anger * 0.5
	var dir = global_position.direction_to(player.global_position)
	velocity = dir * chase_speed * speed_mult
	GameManager.add_fear(delta * 0.5)

func _do_attack(delta: float, dist: float) -> void:
	velocity = Vector2.ZERO
	if attack_cooldown <= 0:
		if player.has_method("take_damage"):
			player.take_damage(attack_damage)
		attack_cooldown = 1.5
		# Lunge effect
		var dir = global_position.direction_to(player.global_position)
		velocity = dir * 300

func _do_vanish(delta: float) -> void:
	velocity = Vector2.ZERO
	modulate.a = max(modulate.a - delta * 2.0, 0.0)
	
	if modulate.a <= 0 and teleport_cooldown <= 0:
		# Teleport to a random position near the player
		var angle = randf() * TAU
		var dist = randf_range(400, 700)
		global_position = player.global_position + Vector2(cos(angle), sin(angle)) * dist
		teleport_cooldown = 10.0
		modulate.a = 0.0
		_change_state(State.STALK)
		# Fade back in
		var tween = create_tween()
		tween.tween_property(self, "modulate:a", 0.8, 2.0)

func _change_state(new_state: State) -> void:
	current_state = new_state
	state_timer = 0.0

func _on_flashlight_hit() -> void:
	# Witch recoils from flashlight
	if current_state == State.CHASE or current_state == State.ATTACK:
		var dir = player.global_position.direction_to(global_position)
		velocity = dir * 200
		_change_state(State.VANISH)
