extends Node2D
## TemporalRift — Time distortion spell. Creates a zone that warps time,
## slowing enemies drastically and dealing damage over time as temporal
## energy tears at their forms. CPU-based visuals for web compatibility.

@export var damage_per_tick: int = 8
@export var tick_interval: float = 0.5
@export var radius: float = 90.0
@export var duration: float = 4.0
@export var slow_factor: float = 0.2  # enemies move at 20% speed
@export var expand_duration: float = 0.3

var rift_timer: float = 0.0
var expand_timer: float = 0.0
var current_radius: float = 0.0
var tick_timer: float = 0.0
var affected_enemies: Dictionary = {}  # enemy -> {original_speeds}
var rotation_angle: float = 0.0
var particle_timer: float = 0.0
var pulse_time: float = 0.0

func _ready() -> void:
	AudioManager.play_sfx_named("temporal_rift")
	_do_screen_flash()
	_spawn_rift_open_particles()

func _process(delta: float) -> void:
	rift_timer += delta
	rotation_angle += delta * 1.5
	pulse_time += delta
	
	# Expand phase
	if expand_timer < expand_duration:
		expand_timer += delta
		var t = clamp(expand_timer / expand_duration, 0.0, 1.0)
		t = 1.0 - pow(1.0 - t, 3.0)
		current_radius = radius * t
	else:
		current_radius = radius
	
	# Active rift phase
	if rift_timer < duration:
		# Damage ticks
		tick_timer += delta
		if tick_timer >= tick_interval:
			tick_timer -= tick_interval
			_deal_tick_damage()
		
		# Track enemies entering/leaving
		_update_affected_enemies()
		
		# Spawn time distortion particles
		particle_timer += delta
		if particle_timer >= 0.04:
			particle_timer = 0.0
			_spawn_time_particles(3)
	else:
		# Closing phase - restore enemies
		_restore_all_enemies()
		_spawn_rift_close_particles()
		queue_free()
		return
	
	queue_redraw()

func _draw() -> void:
	if current_radius <= 0:
		return
	
	var life_ratio = 1.0 - (rift_timer / duration)
	var alpha = min(1.0, life_ratio * 3.0)  # Fade in first third
	if life_ratio < 0.2:
		alpha = life_ratio / 0.2  # Fade out last fifth
	
	# Outer distortion ring
	var ring_pulse = 0.9 + sin(pulse_time * 4.0) * 0.1
	draw_arc(Vector2.ZERO, current_radius * ring_pulse, 0, TAU, 48,
		Color(0.4, 0.2, 0.8, 0.3 * alpha), 4.0)
	
	# Inner time zone fill
	draw_circle(Vector2.ZERO, current_radius * 0.95,
		Color(0.2, 0.1, 0.4, 0.12 * alpha))
	
	# Rotating clock-like markers
	var marker_count = 12
	for i in range(marker_count):
		var angle = (float(i) / marker_count) * TAU + rotation_angle
		var inner_r = current_radius * 0.7
		var outer_r = current_radius * 0.9
		var from_pos = Vector2(cos(angle), sin(angle)) * inner_r
		var to_pos = Vector2(cos(angle), sin(angle)) * outer_r
		var marker_alpha = 0.3 + sin(pulse_time * 6.0 + i * 0.5) * 0.2
		draw_line(from_pos, to_pos, Color(0.6, 0.3, 1.0, marker_alpha * alpha), 1.5)
	
	# Spinning "clock hands"
	var hand1_angle = rotation_angle * 2.0
	var hand2_angle = rotation_angle * -0.7
	draw_line(Vector2.ZERO, Vector2(cos(hand1_angle), sin(hand1_angle)) * current_radius * 0.5,
		Color(0.8, 0.5, 1.0, 0.5 * alpha), 2.0)
	draw_line(Vector2.ZERO, Vector2(cos(hand2_angle), sin(hand2_angle)) * current_radius * 0.35,
		Color(0.9, 0.6, 1.0, 0.4 * alpha), 1.5)
	
	# Center temporal core
	var core_pulse = 0.5 + sin(pulse_time * 8.0) * 0.3
	draw_circle(Vector2.ZERO, 8.0 * core_pulse,
		Color(0.7, 0.4, 1.0, 0.5 * alpha))
	draw_circle(Vector2.ZERO, 4.0,
		Color(1.0, 0.8, 1.0, 0.7 * alpha))
	
	# Concentric ripples (time waves)
	for i in range(3):
		var ripple_r = fmod(pulse_time * 30.0 + i * 30.0, current_radius)
		var ripple_alpha = (1.0 - ripple_r / current_radius) * 0.2 * alpha
		draw_arc(Vector2.ZERO, ripple_r, 0, TAU, 32,
			Color(0.5, 0.3, 0.9, ripple_alpha), 1.0)

func _update_affected_enemies() -> void:
	var enemies = get_tree().get_nodes_in_group("enemies")
	
	for enemy in enemies:
		if not is_instance_valid(enemy):
			continue
		var dist = global_position.distance_to(enemy.global_position)
		
		if dist <= current_radius:
			if enemy not in affected_enemies:
				_apply_time_slow(enemy)
		else:
			if enemy in affected_enemies:
				_restore_enemy(enemy)
	
	# Clean up invalid enemies
	var to_remove = []
	for enemy in affected_enemies:
		if not is_instance_valid(enemy):
			to_remove.append(enemy)
	for enemy in to_remove:
		affected_enemies.erase(enemy)

func _apply_time_slow(enemy: Node2D) -> void:
	var original_speeds: Dictionary = {}
	if "chase_speed" in enemy:
		original_speeds["chase_speed"] = enemy.chase_speed
		enemy.chase_speed *= slow_factor
	if "move_speed" in enemy:
		original_speeds["move_speed"] = enemy.move_speed
		enemy.move_speed *= slow_factor
	if "charge_speed" in enemy:
		original_speeds["charge_speed"] = enemy.charge_speed
		enemy.charge_speed *= slow_factor
	
	affected_enemies[enemy] = original_speeds
	
	# Purple time distortion tint
	var enemy_sprite = enemy.get_node_or_null("Sprite2D")
	if enemy_sprite:
		enemy_sprite.modulate = Color(0.7, 0.5, 1.5, 1.0)

func _restore_enemy(enemy: Node2D) -> void:
	if enemy not in affected_enemies:
		return
	var original = affected_enemies[enemy]
	if "chase_speed" in original and "chase_speed" in enemy:
		enemy.chase_speed = original["chase_speed"]
	if "move_speed" in original and "move_speed" in enemy:
		enemy.move_speed = original["move_speed"]
	if "charge_speed" in original and "charge_speed" in enemy:
		enemy.charge_speed = original["charge_speed"]
	
	var enemy_sprite = enemy.get_node_or_null("Sprite2D")
	if enemy_sprite:
		enemy_sprite.modulate = Color(1, 1, 1, 1)
	
	affected_enemies.erase(enemy)

func _restore_all_enemies() -> void:
	for enemy in affected_enemies:
		if is_instance_valid(enemy):
			_restore_enemy(enemy)
	affected_enemies.clear()

func _deal_tick_damage() -> void:
	for enemy in affected_enemies:
		if not is_instance_valid(enemy):
			continue
		var hurtbox = enemy.get_node_or_null("HurtboxComponent")
		if hurtbox and hurtbox is HurtboxComponent:
			hurtbox.receive_hit(damage_per_tick, 20.0, global_position)
			_spawn_damage_number(enemy.global_position)

func _spawn_time_particles(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var angle = randf() * TAU
		var dist = randf_range(0, current_radius)
		var pos = global_position + Vector2(cos(angle), sin(angle)) * dist
		
		var p = ColorRect.new()
		p.size = Vector2(randf_range(1, 3), randf_range(1, 3))
		var colors = [
			Color(0.5, 0.3, 0.9, 0.7),
			Color(0.7, 0.5, 1.0, 0.6),
			Color(0.3, 0.2, 0.7, 0.8),
			Color(0.9, 0.7, 1.0, 0.5)
		]
		p.color = colors[randi() % colors.size()]
		p.global_position = pos
		get_parent().add_child(p)
		
		# Spiral motion (time vortex effect)
		var target_angle = angle + randf_range(0.5, 1.5)
		var target_dist = dist * randf_range(0.3, 0.7)
		var target_pos = global_position + Vector2(cos(target_angle), sin(target_angle)) * target_dist
		
		var tw = p.create_tween()
		tw.tween_property(p, "global_position", target_pos, randf_range(0.3, 0.6))
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.5)
		tw.tween_callback(p.queue_free)

func _spawn_damage_number(at_pos: Vector2) -> void:
	if not get_parent():
		return
	var label = Label.new()
	label.text = str(damage_per_tick)
	label.add_theme_font_size_override("font_size", 10)
	label.modulate = Color(0.7, 0.4, 1.0, 1.0)
	label.global_position = at_pos + Vector2(randf_range(-10, 10), -10)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	get_parent().add_child(label)
	var tw = label.create_tween()
	tw.tween_property(label, "position:y", label.position.y - 20, 0.4)
	tw.parallel().tween_property(label, "modulate:a", 0.0, 0.4)
	tw.tween_callback(label.queue_free)

func _spawn_rift_open_particles() -> void:
	if not get_parent():
		return
	for i in range(16):
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 5), randf_range(2, 5))
		p.color = Color(0.5, 0.3, 0.9, 0.9)
		p.global_position = global_position
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(50, 120)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.4, 0.4).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.4)
		tw.tween_callback(p.queue_free)

func _spawn_rift_close_particles() -> void:
	if not get_parent():
		return
	for i in range(12):
		var angle = randf() * TAU
		var start_dist = randf_range(radius * 0.5, radius)
		var start_pos = global_position + Vector2(cos(angle), sin(angle)) * start_dist
		var p = ColorRect.new()
		p.size = Vector2(3, 3)
		p.color = Color(0.6, 0.4, 1.0, 0.8)
		p.global_position = start_pos
		get_parent().add_child(p)
		var tw = p.create_tween()
		tw.tween_property(p, "global_position", global_position, 0.3).set_ease(Tween.EASE_IN)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.3)
		tw.tween_callback(p.queue_free)

func _do_screen_flash() -> void:
	var flash_layer = CanvasLayer.new()
	flash_layer.layer = 50
	var flash = ColorRect.new()
	flash.color = Color(0.4, 0.2, 0.8, 0.12)
	flash.anchors_preset = Control.PRESET_FULL_RECT
	flash.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	flash_layer.add_child(flash)
	get_tree().root.add_child(flash_layer)
	var tw = flash.create_tween()
	tw.tween_property(flash, "color:a", 0.0, 0.25)
	tw.tween_callback(flash_layer.queue_free)
