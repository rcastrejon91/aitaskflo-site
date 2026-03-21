extends CharacterBody2D

## Player — top-down movement with sprint, interact, and animation state.

const SPEED        := 180.0
const SPRINT_MULT  := 1.8
const FRICTION     := 0.15

@export var interact_radius: float = 48.0

@onready var sprite:        Sprite2D          = $Sprite2D
@onready var anim:          AnimationPlayer   = $AnimationPlayer if has_node("AnimationPlayer") else null
@onready var interact_area: Area2D            = $InteractArea
@onready var shadow:        Sprite2D          = $Shadow if has_node("Shadow") else null

var _facing := Vector2.DOWN
var _in_dialogue := false

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	GameManager.dialogue_started.connect(_on_dialogue_started)
	GameManager.dialogue_ended.connect(_on_dialogue_ended)

func _physics_process(_delta: float) -> void:
	if _in_dialogue:
		velocity = velocity.lerp(Vector2.ZERO, 0.3)
		move_and_slide()
		return

	var dir := _read_input()
	var spd  := SPEED * (SPRINT_MULT if Input.is_action_pressed("sprint") else 1.0)

	if dir.length_squared() > 0.01:
		_facing = dir.normalized()
		velocity = _facing * spd
	else:
		velocity = velocity.lerp(Vector2.ZERO, FRICTION)

	move_and_slide()
	_update_animation(dir)

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		_try_interact()

# ── Input ─────────────────────────────────────────────────────────────────────

func _read_input() -> Vector2:
	return Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up",   "move_down")
	)

# ── Interaction ───────────────────────────────────────────────────────────────

func _try_interact() -> void:
	# Check Area2D overlaps first (NPCs, items)
	for area in interact_area.get_overlapping_areas():
		if area.has_method("interact"):
			area.interact(self)
			return
	# Then check bodies (doors, triggers)
	for body in interact_area.get_overlapping_bodies():
		if body != self and body.has_method("interact"):
			body.interact(self)
			return

# ── Animation ─────────────────────────────────────────────────────────────────

func _update_animation(dir: Vector2) -> void:
	if not anim:
		return
	if dir.length_squared() < 0.01:
		anim.play("idle")
		return
	# Pick directional animation based on facing
	if abs(_facing.x) > abs(_facing.y):
		anim.play("walk_side")
		sprite.flip_h = _facing.x < 0
	elif _facing.y < 0:
		anim.play("walk_up")
	else:
		anim.play("walk_down")

# ── Dialogue state ────────────────────────────────────────────────────────────

func _on_dialogue_started(_npc_name: String) -> void:
	_in_dialogue = true

func _on_dialogue_ended() -> void:
	_in_dialogue = false
