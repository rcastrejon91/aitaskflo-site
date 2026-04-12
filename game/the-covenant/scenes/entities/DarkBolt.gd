extends Area2D

@export var speed: float = 250.0
@export var damage: int = 25
@export var lifetime: float = 2.0

var direction: Vector2 = Vector2.RIGHT
var timer: float = 0.0
var trail_timer: float = 0.0
const TRAIL_INTERVAL: float = 0.03

@onready var trail_container: Node2D = $TrailContainer

func _ready() -> void:
	collision_layer = 16
	collision_mask = 32
	area_entered.connect(_on_area_entered)
	body_entered.connect(_on_body_entered)

func _physics_process(delta: float) -> void:
	position += direction * speed * delta
	timer += delta
	if timer >= lifetime:
		queue_free()
		return

	# CPU-based trail particles
	trail_timer += delta
	if trail_timer >= TRAIL_INTERVAL:
		trail_timer = 0.0
		_spawn_trail_particle()

func _spawn_trail_particle() -> void:
	var particle = ColorRect.new()
	particle.size = Vector2(randf_range(2, 4), randf_range(2, 4))
	particle.color = Color(0.5, 0.0, 0.9, 0.8)
	particle.position = Vector2(-particle.size.x * 0.5, -particle.size.y * 0.5)
	# Add trail to parent so it stays in world space at bolt's current position
	if get_parent():
		particle.global_position = global_position + Vector2(randf_range(-3, 3), randf_range(-3, 3))
		get_parent().add_child(particle)
		var tween = particle.create_tween()
		tween.tween_property(particle, "modulate:a", 0.0, 0.3)
		tween.parallel().tween_property(particle, "scale", Vector2(0.1, 0.1), 0.3)
		tween.tween_callback(particle.queue_free)

func _on_area_entered(area: Area2D) -> void:
	if area is HurtboxComponent:
		var hurtbox = area as HurtboxComponent
		if hurtbox.get_parent().is_in_group("enemies"):
			hurtbox.receive_hit(damage, 150.0, global_position)
			_spawn_impact()
			queue_free()

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("walls") or body is StaticBody2D:
		_spawn_impact()
		queue_free()

func _spawn_impact() -> void:
	# CPU-based impact particles (web compatible)
	if not get_parent():
		return
	for i in range(8):
		var particle = ColorRect.new()
		particle.size = Vector2(3, 3)
		particle.color = Color(0.5, 0.0, 0.8, 1.0)
		particle.global_position = global_position
		get_parent().add_child(particle)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(30.0, 60.0)
		var tween = particle.create_tween()
		tween.tween_property(particle, "position", particle.position + vel * 0.4, 0.4)
		tween.parallel().tween_property(particle, "modulate:a", 0.0, 0.4)
		tween.tween_callback(particle.queue_free)
