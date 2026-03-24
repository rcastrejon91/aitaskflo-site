extends Area2D
class_name FlameRing

@export var damage: float = 35.0
@export var expand_speed: float = 300.0
@export var max_radius: float = 120.0
@export var duration: float = 0.6

var current_radius: float = 10.0
var timer: float = 0.0
var damaged_bodies: Array = []

@onready var collision_shape: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	var shape := CircleShape2D.new()
	shape.radius = current_radius
	collision_shape.shape = shape
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	timer += delta
	
	# Expand ring
	if current_radius < max_radius:
		current_radius += expand_speed * delta
		current_radius = min(current_radius, max_radius)
		collision_shape.shape.radius = current_radius
	
	# Visual - draw ring
	queue_redraw()
	
	if timer >= duration:
		queue_free()

func _draw() -> void:
	var alpha := 1.0 - (timer / duration)
	var ring_color := Color(1.0, 0.4, 0.05, alpha * 0.8)
	var inner_color := Color(1.0, 0.8, 0.2, alpha * 0.4)
	
	draw_circle(Vector2.ZERO, current_radius, inner_color)
	draw_arc(Vector2.ZERO, current_radius, 0, TAU, 64, ring_color, 3.0)
	draw_arc(Vector2.ZERO, current_radius * 0.7, 0, TAU, 48, ring_color * 0.6, 2.0)

func _on_body_entered(body: Node2D) -> void:
	if body is Player:
		return
	if body in damaged_bodies:
		return
	if body.has_method("take_damage"):
		body.take_damage(damage)
		damaged_bodies.append(body)
