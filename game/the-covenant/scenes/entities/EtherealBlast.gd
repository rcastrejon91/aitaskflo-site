extends Area2D
## Homing ethereal projectile fired by the Shadow Wraith.
## Uses simple steering physics: each frame it turns toward the target.

@export var speed: float = 160.0
@export var homing_strength: float = 3.0   # radians/sec turn rate
@export var damage: int = 15
@export var lifetime: float = 3.0

var target: Node2D = null          # set by spawner
var direction: Vector2 = Vector2.RIGHT
var timer: float = 0.0
var trail_timer: float = 0.0
const TRAIL_INTERVAL: float = 0.04

func _ready() -> void:
	collision_layer = 16   # hitboxes
	collision_mask = 34    # player hurtbox (32) + world (2)
	area_entered.connect(_on_area_entered)
	body_entered.connect(_on_body_entered)
	# Initial direction toward target
	if target and is_instance_valid(target):
		direction = (target.global_position - global_position).normalized()

func _physics_process(delta: float) -> void:
	timer += delta
	if timer >= lifetime:
		queue_free()
		return

	# --- Homing steering ---
	if target and is_instance_valid(target):
		var desired = (target.global_position - global_position).normalized()
		var angle_diff = direction.angle_to(desired)
		var max_turn = homing_strength * delta
		angle_diff = clamp(angle_diff, -max_turn, max_turn)
		direction = direction.rotated(angle_diff).normalized()

	position += direction * speed * delta
	rotation = direction.angle()

	# --- Trail particles (CPU, web-safe) ---
	trail_timer += delta
	if trail_timer >= TRAIL_INTERVAL:
		trail_timer = 0.0
		_spawn_trail_particle()

func _spawn_trail_particle() -> void:
	if not get_parent():
		return
	var p = ColorRect.new()
	p.size = Vector2(randf_range(2, 4), randf_range(2, 4))
	p.color = Color(0.3, 0.7, 1.0, 0.7)
	p.global_position = global_position + Vector2(randf_range(-3, 3), randf_range(-3, 3))
	get_parent().add_child(p)
	var tw = p.create_tween()
	tw.tween_property(p, "modulate:a", 0.0, 0.3)
	tw.parallel().tween_property(p, "scale", Vector2(0.1, 0.1), 0.3)
	tw.tween_callback(p.queue_free)

func _on_area_entered(area: Area2D) -> void:
	if area is HurtboxComponent:
		var hurtbox := area as HurtboxComponent
		# Only damage the player, not fellow enemies
		if hurtbox.get_parent().is_in_group("player"):
			hurtbox.receive_hit(damage, 120.0, global_position)
			_spawn_impact()
			queue_free()

func _on_body_entered(body: Node2D) -> void:
	if body is StaticBody2D or body.is_in_group("walls"):
		_spawn_impact()
		queue_free()

func _spawn_impact() -> void:
	if not get_parent():
		return
	for i in range(8):
		var p = ColorRect.new()
		p.size = Vector2(3, 3)
		p.color = Color(0.2, 0.5, 1.0, 1.0)
		p.global_position = global_position
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(25.0, 55.0)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.35, 0.35)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.35)
		tw.tween_callback(p.queue_free)
