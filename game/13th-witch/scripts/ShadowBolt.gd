extends Area2D
class_name ShadowBolt

@export var speed: float = 450.0
@export var damage: float = 15.0
@export var lifetime: float = 3.0
var direction: Vector2 = Vector2.RIGHT
var timer: float = 0.0

func _ready() -> void:
	rotation = direction.angle()
	body_entered.connect(_on_body_entered)

func _physics_process(delta: float) -> void:
	position += direction * speed * delta
	timer += delta
	if timer >= lifetime:
		_destroy()

func _on_body_entered(body: Node2D) -> void:
	if body.has_method("take_damage"):
		body.take_damage(damage)
	_destroy()

func _destroy() -> void:
	# Spawn hit particles
	var particles := GPUParticles2D.new()
	particles.amount = 12
	particles.one_shot = true
	particles.emitting = true
	particles.lifetime = 0.4
	
	var mat := ParticleProcessMaterial.new()
	mat.direction = Vector3(-direction.x, -direction.y, 0)
	mat.spread = 45.0
	mat.initial_velocity_min = 80.0
	mat.initial_velocity_max = 150.0
	mat.gravity = Vector3.ZERO
	mat.color = Color(0.5, 0.1, 0.8, 1.0)
	mat.scale_min = 2.0
	mat.scale_max = 4.0
	particles.process_material = mat
	
	particles.global_position = global_position
	get_tree().current_scene.add_child(particles)
	
	# Auto-cleanup particles
	var cleanup_timer := Timer.new()
	cleanup_timer.wait_time = 1.0
	cleanup_timer.one_shot = true
	particles.add_child(cleanup_timer)
	cleanup_timer.timeout.connect(particles.queue_free)
	cleanup_timer.start()
	
	queue_free()
