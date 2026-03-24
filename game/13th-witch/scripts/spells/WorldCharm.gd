extends Node2D
class_name WorldCharm

## WORLD CHARM — Reality-bending witch power
## The most powerful spell: bends the entire world to your will
## Enemies become allies, the environment shifts, colors change
## Trees bow, fog parts, the forest itself obeys you

@export var charm_radius: float = 800.0  # Massive radius
@export var charm_duration: float = 8.0
@export var pulse_speed: float = 600.0

var active: bool = false
var charm_timer: float = 0.0
var charmed_enemies: Array[Node2D] = []
var original_states: Dictionary = {}
var pulse_radius: float = 0.0

# World transformation
var original_environment_color: Color
var charmed_environment_color: Color = Color(0.85, 0.6, 1.0, 1.0)  # Purple dream haze

signal world_charmed()
signal world_restored()

func activate() -> void:
	active = true
	charm_timer = charm_duration
	pulse_radius = 0.0
	
	# Begin the reality warp
	world_charmed.emit()
	
	# Slow down time slightly for dramatic effect
	Engine.time_scale = 0.7
	
	# Start the charm pulse
	_begin_charm_pulse()

func _process(delta: float) -> void:
	if not active:
		return
	
	charm_timer -= delta
	
	# Pulse expansion phase
	if pulse_radius < charm_radius:
		pulse_radius += pulse_speed * delta
		_charm_entities_in_radius()
	
	# World visual effects while charmed
	_update_charm_visuals(delta)
	
	# End charm
	if charm_timer <= 0.0:
		deactivate()

func _begin_charm_pulse() -> void:
	# Create expanding visual ring
	var ring = Sprite2D.new()
	ring.name = "CharmPulse"
	ring.modulate = Color(0.8, 0.4, 1.0, 0.6)
	add_child(ring)
	
	# Tween expand and fade
	var tween = create_tween()
	tween.tween_property(ring, "scale", Vector2(20, 20), charm_radius / pulse_speed)
	tween.parallel().tween_property(ring, "modulate:a", 0.0, charm_radius / pulse_speed)
	tween.tween_callback(ring.queue_free)

func _charm_entities_in_radius() -> void:
	# Find all enemies within current pulse radius
	var enemies = get_tree().get_nodes_in_group("enemies")
	for enemy in enemies:
		if enemy in charmed_enemies:
			continue
		var dist = global_position.distance_to(enemy.global_position)
		if dist <= pulse_radius:
			charm_enemy(enemy)

func charm_enemy(enemy: Node2D) -> void:
	charmed_enemies.append(enemy)
	
	# Store original state
	original_states[enemy] = {
		"modulate": enemy.modulate,
		"group": "enemies",
	}
	
	# Transform: enemy becomes ally
	enemy.remove_from_group("enemies")
	enemy.add_to_group("charmed_allies")
	
	# Visual: purple glow, dreamy
	enemy.modulate = Color(0.8, 0.5, 1.0, 1.0)
	
	# Behavior: if enemy has charm method, use it
	if enemy.has_method("become_charmed"):
		enemy.become_charmed(charm_timer, global_position)
	else:
		_fallback_charm_behavior(enemy)
	
	# Spawn charm particles on the enemy
	_add_charm_particles(enemy)

func _fallback_charm_behavior(enemy: Node2D) -> void:
	# Make enemy fight for us — reverse their target
	if enemy.has_method("set_target"):
		# Find nearest non-charmed enemy to attack
		var nearest = _find_nearest_uncharmed_enemy(enemy)
		if nearest:
			enemy.set_target(nearest)

func _find_nearest_uncharmed_enemy(from: Node2D) -> Node2D:
	var enemies = get_tree().get_nodes_in_group("enemies")
	var nearest: Node2D = null
	var nearest_dist: float = INF
	for e in enemies:
		if e in charmed_enemies:
			continue
		var dist = from.global_position.distance_to(e.global_position)
		if dist < nearest_dist:
			nearest_dist = dist
			nearest = e
	return nearest

func _add_charm_particles(target: Node2D) -> void:
	var particles = GPUParticles2D.new()
	particles.name = "CharmAura"
	particles.emitting = true
	particles.amount = 20
	particles.lifetime = 2.0
	# Particles will be purple/pink hearts and sparkles
	target.add_child(particles)

func _update_charm_visuals(_delta: float) -> void:
	# Pulsing world tint
	var intensity = (sin(charm_timer * 3.0) + 1.0) / 2.0
	var canvas = get_tree().root
	if canvas:
		canvas.get_viewport().canvas_transform = canvas.get_viewport().canvas_transform
		# Modulate the world layer if available
		# This would connect to a WorldEnvironment node in a full implementation

func deactivate() -> void:
	active = false
	
	# Restore time
	Engine.time_scale = 1.0
	
	# Restore all charmed enemies
	for enemy in charmed_enemies:
		if not is_instance_valid(enemy):
			continue
		
		if enemy in original_states:
			var state = original_states[enemy]
			enemy.modulate = state.modulate
			enemy.remove_from_group("charmed_allies")
			enemy.add_to_group("enemies")
		
		# Remove charm particles
		if enemy.has_node("CharmAura"):
			enemy.get_node("CharmAura").queue_free()
		
		# Restore behavior
		if enemy.has_method("end_charm"):
			enemy.end_charm()
		else:
			enemy.set_physics_process(true)
			enemy.set_process(true)
	
	charmed_enemies.clear()
	original_states.clear()
	
	world_restored.emit()
	
	# Cleanup
	get_tree().create_timer(0.5).timeout.connect(queue_free)
