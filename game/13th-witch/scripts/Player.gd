extends CharacterBody2D
class_name Player

@export var move_speed: float = 190.0
@export var sprint_multiplier: float = 1.55
@export var max_health: float = 100.0

var health: float = max_health
var consciousness_probe: ConsciousnessProbe

@onready var sprite: Sprite2D = $Sprite2D
@onready var interact_area: Area2D = $InteractArea

func _ready() -> void:
	add_to_group("player")
	health = max_health
	consciousness_probe = get_node_or_null("ConsciousnessProbe") as ConsciousnessProbe
	if consciousness_probe == null:
		consciousness_probe = ConsciousnessProbe.new()
		consciousness_probe.name = "ConsciousnessProbe"
		add_child(consciousness_probe)
	consciousness_probe.probe_result.connect(_on_probe_result)
	if Engine.has_singleton("EventBus"):
		EventBus.health_changed.emit(health, max_health)

func _physics_process(_delta: float) -> void:
	var input_vector := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	var speed := move_speed
	if Input.is_action_pressed("sprint"):
		speed *= sprint_multiplier
	velocity = input_vector * speed
	move_and_slide()

	if sprite and input_vector.x != 0.0:
		sprite.flip_h = input_vector.x < 0.0

func _process(_delta: float) -> void:
	if Input.is_action_just_pressed("interact"):
		var target := get_nearest_interactable()
		if target and target.has_method("interact"):
			target.interact(self)

	if Input.is_action_just_pressed("use_probe"):
		var target := get_nearest_npc()
		if target:
			use_probe(target)

func take_damage(amount: float) -> void:
	health = max(0.0, health - amount)
	EventBus.health_changed.emit(health, max_health)
	if health <= 0.0:
		EventBus.game_over.emit()

func heal(amount: float) -> void:
	health = min(max_health, health + amount)
	EventBus.health_changed.emit(health, max_health)

func use_probe(target: Node) -> void:
	if consciousness_probe:
		consciousness_probe.activate_probe(target)

func get_nearest_interactable() -> Node:
	for body in interact_area.get_overlapping_bodies():
		if body.has_method("interact"):
			return body
	for area in interact_area.get_overlapping_areas():
		var parent := area.get_parent()
		if parent and parent.has_method("interact"):
			return parent
	return null

func get_nearest_npc() -> Node:
	var npcs := get_tree().get_nodes_in_group("npcs")
	if npcs.size() > 0:
		return npcs[0]
	return null

func _on_probe_result(text: String) -> void:
	print("Probe result: " + text)
