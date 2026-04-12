extends Node2D
## VoidVortex — Creates a dark gravity well that pulls enemies inward,
## dealing continuous damage and trapping them. A powerful AoE control spell.
## CPU-based visuals for web compatibility.

@export var damage_per_tick: int = 12
@export var tick_interval: float = 0.4
@export var radius: float = 100.0
@export var pull_force: float = 80.0
@export var duration: float = 3.5
@export var expand_duration: float = 0.25

var vortex_timer: float = 0.0
var expand_timer: float = 0.0
var current_radius: float = 0.0
var tick_timer: float = 0.0
var rotation_angle: float = 0.0
var particle_timer: float = 0.0
var hit_enemies_tick: Array = []  # Reset each tick for damage tracking

func _ready() -> void:
	AudioManager.play_sfx_named("void_vortex")
	_do_screen_flash()
	_do_screen_shake(4.0, 0.3)

func _process(delta: float) -> void:
	vortex_timer += delta
	rotation_angle += delta * 3.0
	
	# Expand phase
	if expand_timer < expand_duration:
		expand_timer += delta
		var t = clamp(expand_timer / expand_duration, 0.0, 1.0)
		t = 1.0 - pow(1.0 - t, 4.0)
		current_radius = radius * t
	else:
		current_radius = radius
	
	if vortex_timer < duration:
		# Pull enemies toward center
		_pull_enemies(delta)
		
		# Damage ticks
		tick_timer += delta
		if tick_timer >= tick_interval:
			tick_timer -= tick_interval
			hit_enemies_tick.clear()
			_deal_tick_damage()
		
		# Vortex particles
		particle_timer += delta
		if particle_timer >= 0.025:
			particle_timer = 0.0
			_spawn_vortex_particles(4)
	else:
		# Implosion finish
		_spawn_implosion_particles()
		queue_free()
		return
	
	queue_redraw()

func _draw() -> void:
	if current_radius <= 0:
		return
	
	var life_ratio = 1.0 - (vortex_timer / duration)
	var alpha = min(1.0, life_ratio * 4.0)
	if life_ratio < 0.15:
		alpha = life_ratio / 0.15
	
	# Dark void center
	draw_circle(Vector2.ZERO, current_radius * 0.2,
		Color(0.05, 0.0, 0.1, 0.7 * alpha))
	
	# Void fill (very dark, semi-transparent)
	draw_circle(Vector2.ZERO, current_radius * 0.8,
		Color(0.08, 0.0, 0.15, 0.15 * alpha))
	
	# Spinning spiral arms
	var arm_count = 4
	for arm in range(arm_count):
		var base_angle = (float(arm) / arm_count) * TAU + rotation_angle
		var points = PackedVector2Array()
		var colors = PackedColorArray()
		var spiral_segments = 20
		
		for i in range(spiral_segments + 1):
			var t = float(i) / spiral_segments
			var angle = base_angle + t * TAU * 1.5
			var r = current_radius * t * 0.9
			var pos = Vector2(cos(angle), sin(angle)) * r
			points.append(pos)
			var col = Color(0.4, 0.0, 0.6, (1.0 - t) * 0.5 * alpha)
			colors.append(col)
		
		if points.size() >= 2:
			draw_polyline_colors(points, colors, 2.0)
	
	# Outer ring
	var ring_pulse = 0.95 + sin(vortex_timer * 6.0) * 0.05
	draw_arc(Vector2.ZERO, current_radius * ring_pulse, 0, TAU, 48,
		Color(0.3, 0.0, 0.5, 0.4 * alpha), 3.0)
	
	# Inner ring
	draw_arc(Vector2.ZERO, current_radius * 0.4, 0, TAU, 32,
		Color(0.2, 0.0, 0.4, 0.5 * alpha), 2.0)
	
	# Event horizon glow
	var eh_pulse = 0.5 + sin(vortex_timer * 10.0) * 0.3
	draw_circle(Vector2.ZERO, 6.0,
		Color(0.5, 0.0, 0.8, eh_pulse * alpha))
	draw_circle(Vector2.ZERO, 3.0,
		Color(0.8, 0.3, 1.0, 0.8 * alpha))

func _pull_enemies(delta: float) -> void:
	var enemies = get_tree().get_nodes_in_group("enemies")
	for enemy in enemies:
		if not is_instance_valid(enemy):
			continue
		var dist = global_position.distance_to(enemy.global_position)
		if dist <= current_radius and dist > 10.0:
			var dir = (global_position - enemy.global_position).normalized()
			# Pull strength increases closer to center
			var pull_strength = pull_force * (1.0 - (dist / current_radius) * 0.5)
			if "velocity" in enemy:
				enemy.velocity += dir * pull_strength * delta

func _deal_tick_damage() -> void:
	var enemies = get_tree().get_nodes_in_group("enemies")
	for enemy in enemies:
		if not is_instance_valid(enemy):
			continue
		if enemy in hit_enemies_tick:
			continue
		var dist = global_position.distance_to(enemy.global_position)
		if dist <= current_radius:
			hit_enemies_tick.append(enemy)
			var hurtbox = enemy.get_node_or_null("HurtboxComponent")
			if hurtbox and hurtbox is HurtboxComponent:
				# More damage closer to center
				var dist_factor = 1.0 + (1.0 - dist / current_radius) * 0.5
				var final_damage = int(damage_per_tick * dist_factor)
				hurtbox.receive_hit(final_damage, 10.0, global_position)

func _spawn_vortex_particles(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var angle = randf() * TAU
		var dist = randf_range(current_radius * 0.6, current_radius * 1.1)
		var start_pos = global_position + Vector2(cos(angle), sin(angle)) * dist
		
		var p = ColorRect.new()
		p.size = Vector2(randf_range(1, 4), randf_range(1, 4))
		var colors = [
			Color(0.3, 0.0, 0.5, 0.8),
			Color(0.5, 0.0, 0.7, 0.7),
			Color(0.2, 0.0, 0.3, 0.9),
			Color(0.1, 0.0, 0.2, 0.8)
		]
		p.color = colors[randi() % colors.size()]
		p.global_position = start_pos
		get_parent().add_child(p)
		
		# Spiral inward
		var spiral_angle = angle + randf_range(1.5, 3.0)
		var end_dist = dist * randf_range(0.05, 0.3)
		var end_pos = global_position + Vector2(cos(spiral_angle), sin(spiral_angle)) * end_dist
		
		var tw = p.create_tween()
		tw.tween_property(p, "global_position", end_pos, randf_range(0.3, 0.6)).set_ease(Tween.EASE_IN)
		tw.parallel().tween_property(p, "scale", Vector2(0.2, 0.2), 0.5)
		tw.tween_callback(p.queue_free)

func _spawn_implosion_particles() -> void:
	if not get_parent():
		return
	# First: implosion (suck in)
	for i in range(16):
		var angle = randf() * TAU
		var dist = randf_range(radius * 0.5, radius)
		var start_pos = global_position + Vector2(cos(angle), sin(angle)) * dist
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 5), randf_range(2, 5))
		p.color = Color(0.4, 0.0, 0.6, 0.9)
		p.global_position = start_pos
		get_parent().add_child(p)
		var tw = p.create_tween()
		tw.tween_property(p, "global_position", global_position, 0.2).set_ease(Tween.EASE_IN)
		tw.tween_callback(p.queue_free)
	
	# Then: small explosion burst
	for i in range(10):
		var p = ColorRect.new()
		p.size = Vector2(3, 3)
		p.color = Color(0.5, 0.0, 0.8, 1.0)
		p.global_position = global_position
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(60, 120)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.3, 0.3)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.3)
		tw.tween_callback(p.queue_free)

func _do_screen_flash() -> void:
	var flash_layer = CanvasLayer.new()
	flash_layer.layer = 50
	var flash = ColorRect.new()
	flash.color = Color(0.2, 0.0, 0.3, 0.15)
	flash.anchors_preset = Control.PRESET_FULL_RECT
	flash.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	flash_layer.add_child(flash)
	get_tree().root.add_child(flash_layer)
	var tw = flash.create_tween()
	tw.tween_property(flash, "color:a", 0.0, 0.2)
	tw.tween_callback(flash_layer.queue_free)

func _do_screen_shake(intensity: float, duration: float) -> void:
	var cameras = get_tree().get_nodes_in_group("player")
	for p in cameras:
		var cam = p.get_node_or_null("Camera2D")
		if cam and cam is Camera2D:
			var tw = cam.create_tween()
			var steps = int(duration / 0.05)
			for i in range(steps):
				var offset = Vector2(randf_range(-intensity, intensity), randf_range(-intensity, intensity))
				tw.tween_property(cam, "offset", offset, 0.05)
			tw.tween_property(cam, "offset", Vector2.ZERO, 0.05)
