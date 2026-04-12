extends Node2D
## FrostNova — Expanding ring of ice that damages and slows all nearby enemies.
## CPU-based particles for web compatibility. Dark fantasy ice magic.

@export var damage: int = 20
@export var radius: float = 85.0
@export var slow_duration: float = 3.0
@export var expand_duration: float = 0.35
@export var linger_duration: float = 0.8

var expand_timer: float = 0.0
var linger_timer: float = 0.0
var current_radius: float = 0.0
var has_dealt_damage: bool = false
var hit_enemies: Array = []
var particle_timer: float = 0.0
var ice_shard_timer: float = 0.0
var frozen_ground_alpha: float = 0.0

func _ready() -> void:
	# Screen flash
	_do_screen_flash()
	# Initial burst
	_spawn_ice_burst(12)
	AudioManager.play_sfx_named("frost_nova")

func _process(delta: float) -> void:
	if expand_timer < expand_duration:
		expand_timer += delta
		var t = clamp(expand_timer / expand_duration, 0.0, 1.0)
		# Sharp expand with slight bounce
		var ease_t = 1.0 - pow(1.0 - t, 4.0)
		current_radius = radius * ease_t
		frozen_ground_alpha = min(0.3, t * 0.3)
		
		# Ice crystal particles along the ring edge
		particle_timer += delta
		if particle_timer >= 0.015:
			particle_timer = 0.0
			_spawn_ring_ice_particles(int(4 + t * 8))
		
		# Deal damage at 60% expansion
		if t > 0.6 and not has_dealt_damage:
			has_dealt_damage = true
			_deal_area_damage()
		
		queue_redraw()
	else:
		linger_timer += delta
		frozen_ground_alpha = 0.3 * (1.0 - linger_timer / linger_duration)
		
		# Occasional ice shard particles during linger
		ice_shard_timer += delta
		if ice_shard_timer >= 0.1:
			ice_shard_timer = 0.0
			_spawn_ice_shard_particles(2)
		
		queue_redraw()
		
		if linger_timer >= linger_duration:
			queue_free()

func _draw() -> void:
	if current_radius > 0:
		var alpha = 1.0
		if linger_timer > 0:
			alpha = 1.0 - (linger_timer / linger_duration)
		
		# Frozen ground circle
		draw_circle(Vector2.ZERO, current_radius, 
			Color(0.2, 0.5, 0.9, frozen_ground_alpha))
		
		# Ice ring - outer edge
		draw_arc(Vector2.ZERO, current_radius, 0, TAU, 48,
			Color(0.5, 0.8, 1.0, 0.5 * alpha), 3.0)
		# Inner shimmer
		draw_arc(Vector2.ZERO, current_radius * 0.6, 0, TAU, 36,
			Color(0.7, 0.9, 1.0, 0.25 * alpha), 2.0)
		# White frost center
		if expand_timer < expand_duration * 0.6:
			var flash_a = (1.0 - expand_timer / (expand_duration * 0.6)) * 0.4
			draw_circle(Vector2.ZERO, current_radius * 0.3,
				Color(0.9, 0.95, 1.0, flash_a))
		
		# Draw ice crystal shapes around the ring
		if alpha > 0.3:
			var crystal_count = 8
			for i in range(crystal_count):
				var angle = (float(i) / crystal_count) * TAU + expand_timer * 2.0
				var pos = Vector2(cos(angle), sin(angle)) * current_radius * 0.85
				_draw_ice_crystal(pos, 4.0 * alpha, angle)

func _draw_ice_crystal(pos: Vector2, size: float, angle: float) -> void:
	var points = PackedVector2Array()
	points.append(pos + Vector2(0, -size).rotated(angle))
	points.append(pos + Vector2(size * 0.5, 0).rotated(angle))
	points.append(pos + Vector2(0, size).rotated(angle))
	points.append(pos + Vector2(-size * 0.5, 0).rotated(angle))
	draw_colored_polygon(points, Color(0.7, 0.9, 1.0, 0.6))

func _deal_area_damage() -> void:
	var enemies = get_tree().get_nodes_in_group("enemies")
	for enemy in enemies:
		if not is_instance_valid(enemy):
			continue
		var dist = global_position.distance_to(enemy.global_position)
		if dist <= radius and enemy not in hit_enemies:
			hit_enemies.append(enemy)
			var hurtbox = enemy.get_node_or_null("HurtboxComponent")
			if hurtbox and hurtbox is HurtboxComponent:
				var dist_factor = 1.0 - (dist / radius) * 0.2
				var final_damage = int(damage * dist_factor)
				hurtbox.receive_hit(final_damage, 100.0, global_position)
				_spawn_freeze_hit(enemy.global_position)
			# Apply slow effect (visual tint + speed reduction)
			_apply_frost_slow(enemy)

func _apply_frost_slow(enemy: Node2D) -> void:
	if not is_instance_valid(enemy):
		return
	# Tint enemy blue
	var sprite = enemy.get_node_or_null("Sprite2D")
	if sprite:
		sprite.modulate = Color(0.5, 0.7, 1.5, 1.0)
	
	# Slow their speed
	var original_speed = 0.0
	if "chase_speed" in enemy:
		original_speed = enemy.chase_speed
		enemy.chase_speed *= 0.3
	if "move_speed" in enemy:
		enemy.move_speed *= 0.3
	if "charge_speed" in enemy:
		enemy.charge_speed *= 0.3
	
	# Create frost particles on enemy
	_spawn_enemy_frost_aura(enemy)
	
	# Restore speed after duration
	get_tree().create_timer(slow_duration).timeout.connect(func():
		if is_instance_valid(enemy):
			if sprite and is_instance_valid(sprite):
				sprite.modulate = Color(1, 1, 1, 1)
			if "chase_speed" in enemy and original_speed > 0:
				enemy.chase_speed = original_speed
			if "move_speed" in enemy:
				enemy.move_speed = enemy.move_speed / 0.3 if enemy.move_speed > 0 else 75.0
			if "charge_speed" in enemy:
				enemy.charge_speed = enemy.charge_speed / 0.3 if enemy.charge_speed > 0 else 270.0
	)

func _spawn_enemy_frost_aura(enemy: Node2D) -> void:
	if not get_parent():
		return
	# Spawn a few ice particles around the frozen enemy periodically
	for i in range(5):
		var delay = randf_range(0.0, slow_duration * 0.8)
		get_tree().create_timer(delay).timeout.connect(func():
			if is_instance_valid(enemy) and get_parent():
				var p = ColorRect.new()
				p.size = Vector2(2, 2)
				p.color = Color(0.6, 0.85, 1.0, 0.8)
				var offset = Vector2(randf_range(-12, 12), randf_range(-12, 12))
				p.global_position = enemy.global_position + offset
				get_parent().add_child(p)
				var tw = p.create_tween()
				tw.tween_property(p, "position:y", p.position.y - 15, 0.5)
				tw.parallel().tween_property(p, "modulate:a", 0.0, 0.5)
				tw.tween_callback(p.queue_free)
		)

func _spawn_ice_burst(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 6), randf_range(4, 10))
		var ice_colors = [
			Color(0.5, 0.8, 1.0, 1.0),
			Color(0.7, 0.9, 1.0, 1.0),
			Color(0.3, 0.6, 1.0, 1.0),
			Color(0.9, 0.95, 1.0, 0.9)
		]
		p.color = ice_colors[randi() % ice_colors.size()]
		p.global_position = global_position
		p.rotation = randf() * TAU
		get_parent().add_child(p)
		var angle = randf() * TAU
		var speed = randf_range(80.0, 160.0)
		var vel = Vector2(cos(angle), sin(angle)) * speed
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.4, 0.4).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.4)
		tw.tween_callback(p.queue_free)

func _spawn_ring_ice_particles(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var angle = randf() * TAU
		var pos = global_position + Vector2(cos(angle), sin(angle)) * current_radius
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 4), randf_range(2, 4))
		p.color = Color(0.6, 0.85, 1.0, 0.8)
		p.global_position = pos
		get_parent().add_child(p)
		var tw = p.create_tween()
		tw.tween_property(p, "position:y", p.position.y - randf_range(8, 20), 0.35)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.35)
		tw.tween_callback(p.queue_free)

func _spawn_ice_shard_particles(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var angle = randf() * TAU
		var dist = randf_range(0, radius)
		var pos = global_position + Vector2(cos(angle), sin(angle)) * dist
		var p = ColorRect.new()
		p.size = Vector2(2, 3)
		p.color = Color(0.7, 0.9, 1.0, 0.5)
		p.global_position = pos
		p.rotation = randf() * TAU
		get_parent().add_child(p)
		var tw = p.create_tween()
		tw.tween_property(p, "position:y", p.position.y - 12, 0.3)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.3)
		tw.tween_callback(p.queue_free)

func _spawn_freeze_hit(at_pos: Vector2) -> void:
	if not get_parent():
		return
	for i in range(8):
		var p = ColorRect.new()
		p.size = Vector2(3, 5)
		p.color = Color(0.8, 0.9, 1.0, 1.0)
		p.global_position = at_pos
		p.rotation = randf() * TAU
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(30, 70)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.3, 0.3)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.3)
		tw.tween_callback(p.queue_free)

func _do_screen_flash() -> void:
	var flash_layer = CanvasLayer.new()
	flash_layer.layer = 50
	var flash = ColorRect.new()
	flash.color = Color(0.5, 0.8, 1.0, 0.3)
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash_layer.add_child(flash)
	get_tree().root.add_child(flash_layer)
	var tw = flash.create_tween()
	tw.tween_property(flash, "color:a", 0.0, 0.35)
	tw.tween_callback(flash_layer.queue_free)
