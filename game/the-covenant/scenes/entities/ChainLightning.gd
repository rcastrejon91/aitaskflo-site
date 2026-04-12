extends Node2D
## ChainLightning — Elemental manipulation spell. Fires a lightning bolt
## that chains between up to N enemies, dealing decreasing damage per chain.
## CPU-based visuals for web compatibility.

@export var damage: int = 30
@export var chain_count: int = 4
@export var chain_range: float = 120.0
@export var chain_damage_falloff: float = 0.75  # each chain does 75% of previous
@export var bolt_duration: float = 0.6

var hit_enemies: Array = []
var chain_positions: Array = []  # Array of Vector2 pairs
var bolt_timer: float = 0.0
var chain_index: int = 0
var chain_delay_timer: float = 0.0
var chain_delay: float = 0.08  # delay between chain jumps
var all_chains_done: bool = false
var fade_timer: float = 0.0
var current_damage: float = 0.0
var origin_pos: Vector2 = Vector2.ZERO

# Visual: jagged bolt segments per chain
var bolt_segments: Array = []  # Array of Arrays of Vector2

func _ready() -> void:
	origin_pos = global_position
	current_damage = float(damage)
	_find_first_target()
	AudioManager.play_sfx_named("chain_lightning")
	_do_screen_flash()

func _process(delta: float) -> void:
	bolt_timer += delta
	
	if not all_chains_done:
		chain_delay_timer += delta
		if chain_delay_timer >= chain_delay and chain_index < chain_count:
			chain_delay_timer = 0.0
			_chain_to_next()
	
	# Spawn electric particles along bolt paths
	if bolt_timer < bolt_duration:
		if fmod(bolt_timer, 0.04) < delta:
			_spawn_electric_particles()
	
	queue_redraw()
	
	if bolt_timer >= bolt_duration:
		fade_timer += delta
		if fade_timer >= 0.3:
			queue_free()

func _draw() -> void:
	var alpha = 1.0
	if fade_timer > 0:
		alpha = 1.0 - (fade_timer / 0.3)
	
	# Draw lightning bolts between chain positions
	for i in range(bolt_segments.size()):
		var segments = bolt_segments[i]
		if segments.size() < 2:
			continue
		
		var chain_alpha = alpha * (1.0 - float(i) * 0.15)
		
		# Outer glow (wide, faint)
		for j in range(segments.size() - 1):
			var from = segments[j] - global_position
			var to = segments[j + 1] - global_position
			draw_line(from, to, Color(0.3, 0.5, 1.0, 0.2 * chain_alpha), 6.0)
		
		# Core bolt (bright)
		for j in range(segments.size() - 1):
			var from = segments[j] - global_position
			var to = segments[j + 1] - global_position
			draw_line(from, to, Color(0.6, 0.8, 1.0, 0.8 * chain_alpha), 2.5)
		
		# Hot center
		for j in range(segments.size() - 1):
			var from = segments[j] - global_position
			var to = segments[j + 1] - global_position
			draw_line(from, to, Color(1.0, 1.0, 1.0, 0.9 * chain_alpha), 1.0)
		
		# Draw impact circles at chain endpoints
		if segments.size() > 0:
			var end_pos = segments[segments.size() - 1] - global_position
			var pulse = 0.5 + sin(bolt_timer * 20.0 + i * 2.0) * 0.3
			draw_circle(end_pos, 6.0 * pulse, Color(0.5, 0.7, 1.0, 0.4 * chain_alpha))
			draw_circle(end_pos, 3.0 * pulse, Color(0.8, 0.9, 1.0, 0.6 * chain_alpha))

func _find_first_target() -> void:
	var enemies = get_tree().get_nodes_in_group("enemies")
	var nearest: Node2D = null
	var nearest_dist: float = chain_range * 1.5  # slightly larger range for first target
	
	for enemy in enemies:
		if not is_instance_valid(enemy):
			continue
		var health = enemy.get_node_or_null("HealthComponent")
		if health and health is HealthComponent and not health.is_alive():
			continue
		var dist = origin_pos.distance_to(enemy.global_position)
		if dist < nearest_dist:
			nearest_dist = dist
			nearest = enemy
	
	if nearest:
		_deal_chain_damage(nearest, origin_pos)
	else:
		# No target, create a short bolt into empty space
		var end_pos = origin_pos + Vector2(randf_range(-40, 40), randf_range(-40, 40))
		bolt_segments.append(_generate_bolt_path(origin_pos, end_pos))
		all_chains_done = true

func _chain_to_next() -> void:
	if hit_enemies.is_empty():
		all_chains_done = true
		return
	
	var last_enemy = hit_enemies[hit_enemies.size() - 1]
	if not is_instance_valid(last_enemy):
		all_chains_done = true
		return
	
	var last_pos = last_enemy.global_position
	var enemies = get_tree().get_nodes_in_group("enemies")
	var nearest: Node2D = null
	var nearest_dist: float = chain_range
	
	for enemy in enemies:
		if not is_instance_valid(enemy):
			continue
		if enemy in hit_enemies:
			continue
		var health = enemy.get_node_or_null("HealthComponent")
		if health and health is HealthComponent and not health.is_alive():
			continue
		var dist = last_pos.distance_to(enemy.global_position)
		if dist < nearest_dist:
			nearest_dist = dist
			nearest = enemy
	
	if nearest:
		current_damage *= chain_damage_falloff
		_deal_chain_damage(nearest, last_pos)
		chain_index += 1
	else:
		all_chains_done = true

func _deal_chain_damage(enemy: Node2D, from_pos: Vector2) -> void:
	hit_enemies.append(enemy)
	
	# Generate visual bolt path
	bolt_segments.append(_generate_bolt_path(from_pos, enemy.global_position))
	
	# Deal damage
	var hurtbox = enemy.get_node_or_null("HurtboxComponent")
	if hurtbox and hurtbox is HurtboxComponent:
		hurtbox.receive_hit(int(current_damage), 80.0, from_pos)
	
	# Spawn impact particles
	_spawn_impact_particles(enemy.global_position)
	
	# Brief electric tint on enemy
	var enemy_sprite = enemy.get_node_or_null("Sprite2D")
	if enemy_sprite:
		enemy_sprite.modulate = Color(0.5, 0.7, 2.0, 1.0)
		get_tree().create_timer(0.3).timeout.connect(func():
			if is_instance_valid(enemy) and is_instance_valid(enemy_sprite):
				enemy_sprite.modulate = Color(1, 1, 1, 1)
		)

func _generate_bolt_path(from: Vector2, to: Vector2) -> Array:
	var path: Array = [from]
	var segments = randi_range(5, 9)
	var dir = to - from
	
	for i in range(1, segments):
		var t = float(i) / segments
		var base_pos = from.lerp(to, t)
		# Perpendicular jitter for jagged bolt look
		var perp = dir.normalized().rotated(PI / 2)
		var jitter = perp * randf_range(-15, 15) * (1.0 - abs(t - 0.5) * 2.0)
		path.append(base_pos + jitter)
	
	path.append(to)
	return path

func _spawn_impact_particles(at_pos: Vector2) -> void:
	if not get_parent():
		return
	for i in range(8):
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 4), randf_range(2, 4))
		var colors = [
			Color(0.5, 0.7, 1.0, 1.0),
			Color(0.7, 0.9, 1.0, 1.0),
			Color(1.0, 1.0, 1.0, 1.0),
			Color(0.3, 0.5, 1.0, 1.0)
		]
		p.color = colors[randi() % colors.size()]
		p.global_position = at_pos
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(40, 90)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.3, 0.3)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.3)
		tw.tween_callback(p.queue_free)

func _spawn_electric_particles() -> void:
	if not get_parent() or bolt_segments.is_empty():
		return
	# Pick a random point on a random bolt segment
	var seg_idx = randi() % bolt_segments.size()
	var segments = bolt_segments[seg_idx]
	if segments.size() < 2:
		return
	var point_idx = randi() % (segments.size() - 1)
	var t = randf()
	var pos = segments[point_idx].lerp(segments[point_idx + 1], t)
	
	var p = ColorRect.new()
	p.size = Vector2(2, 2)
	p.color = Color(0.6, 0.8, 1.0, 0.8)
	p.global_position = pos + Vector2(randf_range(-4, 4), randf_range(-4, 4))
	get_parent().add_child(p)
	var tw = p.create_tween()
	tw.tween_property(p, "position:y", p.position.y - randf_range(8, 20), 0.25)
	tw.parallel().tween_property(p, "modulate:a", 0.0, 0.25)
	tw.tween_callback(p.queue_free)

func _do_screen_flash() -> void:
	var flash_layer = CanvasLayer.new()
	flash_layer.layer = 50
	var flash = ColorRect.new()
	flash.color = Color(0.5, 0.7, 1.0, 0.15)
	flash.anchors_preset = Control.PRESET_FULL_RECT
	flash.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	flash_layer.add_child(flash)
	get_tree().root.add_child(flash_layer)
	var tw = flash.create_tween()
	tw.tween_property(flash, "color:a", 0.0, 0.2)
	tw.tween_callback(flash_layer.queue_free)
