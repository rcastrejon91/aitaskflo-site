extends Node2D
## BloodTitheExplosion — The ultimate dark sacrifice: sacrifice HP for a
## massive explosion of blood-dark energy. Biggest damage ability.
## CPU-based particles for web compatibility.

@export var damage: int = 60
@export var radius: float = 100.0
@export var charge_duration: float = 0.5
@export var explode_duration: float = 0.5
@export var fade_duration: float = 0.5

enum Phase { CHARGE, EXPLODE, FADE }
var phase: Phase = Phase.CHARGE
var phase_timer: float = 0.0
var current_radius: float = 0.0
var has_dealt_damage: bool = false
var hit_enemies: Array = []
var particle_timer: float = 0.0

# Blood tendrils (drawn to player center during charge)
var tendril_angles: Array = []
var tendril_lengths: Array = []

func _ready() -> void:
	# Generate random tendrils
	for i in range(8):
		tendril_angles.append(randf() * TAU)
		tendril_lengths.append(randf_range(20.0, 50.0))
	
	AudioManager.play_sfx_named("blood_tithe")
	# Dramatic screen shake
	_do_screen_shake(6.0, 0.5)

func _process(delta: float) -> void:
	phase_timer += delta
	particle_timer += delta
	
	match phase:
		Phase.CHARGE:
			_process_charge(delta)
		Phase.EXPLODE:
			_process_explode(delta)
		Phase.FADE:
			_process_fade(delta)
	
	queue_redraw()

func _process_charge(delta: float) -> void:
	var t = clamp(phase_timer / charge_duration, 0.0, 1.0)
	current_radius = 15.0 * (1.0 - t) + 5.0  # Contracts inward
	
	# Suck in particles from surroundings
	if particle_timer >= 0.02:
		particle_timer = 0.0
		_spawn_charge_particles(int(3 + t * 8))
	
	# Grow tendrils
	for i in range(tendril_angles.size()):
		tendril_lengths[i] = lerp(tendril_lengths[i], 60.0 * t, delta * 3.0)
		tendril_angles[i] += delta * (2.0 + randf() * 2.0)
	
	if phase_timer >= charge_duration:
		phase = Phase.EXPLODE
		phase_timer = 0.0
		_do_screen_flash()
		_do_screen_shake(10.0, 0.3)

func _process_explode(delta: float) -> void:
	var t = clamp(phase_timer / explode_duration, 0.0, 1.0)
	# Explosive expansion
	var ease_t = 1.0 - pow(1.0 - t, 5.0)
	current_radius = radius * ease_t
	
	if particle_timer >= 0.015:
		particle_timer = 0.0
		_spawn_explosion_particles(int(8 + t * 12))
	
	# Deal damage at 50% expansion
	if t > 0.5 and not has_dealt_damage:
		has_dealt_damage = true
		_deal_area_damage()
	
	if phase_timer >= explode_duration:
		phase = Phase.FADE
		phase_timer = 0.0

func _process_fade(delta: float) -> void:
	# Spawn lingering dark motes
	if particle_timer >= 0.06:
		particle_timer = 0.0
		_spawn_fade_particles(2)
	
	if phase_timer >= fade_duration:
		queue_free()

func _draw() -> void:
	match phase:
		Phase.CHARGE:
			_draw_charge()
		Phase.EXPLODE:
			_draw_explode()
		Phase.FADE:
			_draw_fade()

func _draw_charge() -> void:
	var t = clamp(phase_timer / charge_duration, 0.0, 1.0)
	
	# Pulsing dark core
	var pulse = 0.5 + sin(phase_timer * 15.0) * 0.3
	draw_circle(Vector2.ZERO, current_radius, 
		Color(0.5, 0.0, 0.1, 0.5 + pulse * 0.3))
	draw_circle(Vector2.ZERO, current_radius * 0.5,
		Color(0.8, 0.0, 0.2, 0.7))
	
	# Blood tendrils radiating inward
	for i in range(tendril_angles.size()):
		var end_pos = Vector2(cos(tendril_angles[i]), sin(tendril_angles[i])) * tendril_lengths[i]
		var mid_pos = end_pos * 0.5 + Vector2(sin(phase_timer * 5 + i), cos(phase_timer * 7 + i)) * 5.0
		
		# Draw tendril as line segments
		var color = Color(0.8, 0.0, 0.15, 0.5 + t * 0.4)
		draw_line(Vector2.ZERO, mid_pos, color, 2.0)
		draw_line(mid_pos, end_pos, color * Color(1, 1, 1, 0.6), 1.5)
	
	# Rune circle
	var rune_radius = 30.0 + t * 20.0
	draw_arc(Vector2.ZERO, rune_radius, 0, TAU * t, 24,
		Color(0.9, 0.1, 0.2, 0.6 * t), 1.5)

func _draw_explode() -> void:
	var t = clamp(phase_timer / explode_duration, 0.0, 1.0)
	var alpha = 1.0 - t * 0.5
	
	# Massive dark explosion ring
	draw_circle(Vector2.ZERO, current_radius,
		Color(0.3, 0.0, 0.05, 0.2 * alpha))
	
	# Blood-red ring edge
	draw_arc(Vector2.ZERO, current_radius, 0, TAU, 48,
		Color(0.9, 0.0, 0.15, 0.7 * alpha), 5.0)
	
	# Inner rings
	draw_arc(Vector2.ZERO, current_radius * 0.6, 0, TAU, 36,
		Color(0.6, 0.0, 0.1, 0.4 * alpha), 3.0)
	draw_arc(Vector2.ZERO, current_radius * 0.3, 0, TAU, 24,
		Color(0.8, 0.1, 0.2, 0.5 * alpha), 2.0)
	
	# White-hot center flash
	if t < 0.3:
		var flash_a = (1.0 - t / 0.3) * 0.5
		draw_circle(Vector2.ZERO, current_radius * 0.15,
			Color(1.0, 0.8, 0.8, flash_a))

func _draw_fade() -> void:
	var t = clamp(phase_timer / fade_duration, 0.0, 1.0)
	var alpha = 1.0 - t
	
	# Fading rings
	draw_arc(Vector2.ZERO, radius * (1.0 + t * 0.2), 0, TAU, 36,
		Color(0.5, 0.0, 0.1, 0.2 * alpha), 2.0)
	draw_arc(Vector2.ZERO, radius * 0.5, 0, TAU, 24,
		Color(0.3, 0.0, 0.05, 0.1 * alpha), 1.5)

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
				# Full damage in inner half, falloff in outer half
				var dist_factor = 1.0
				if dist > radius * 0.5:
					dist_factor = 1.0 - ((dist - radius * 0.5) / (radius * 0.5)) * 0.4
				var final_damage = int(damage * dist_factor)
				hurtbox.receive_hit(final_damage, 350.0, global_position)
				_spawn_blood_hit(enemy.global_position)

func _spawn_charge_particles(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var angle = randf() * TAU
		var dist = randf_range(30, 70)
		var start_pos = global_position + Vector2(cos(angle), sin(angle)) * dist
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 4), randf_range(2, 4))
		p.color = Color(0.8, 0.0, 0.1, 0.8)
		p.global_position = start_pos
		get_parent().add_child(p)
		# Suck toward center
		var tw = p.create_tween()
		tw.tween_property(p, "global_position", global_position, randf_range(0.15, 0.35)).set_ease(Tween.EASE_IN)
		tw.parallel().tween_property(p, "scale", Vector2(0.2, 0.2), 0.3)
		tw.tween_callback(p.queue_free)

func _spawn_explosion_particles(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var p = ColorRect.new()
		p.size = Vector2(randf_range(3, 7), randf_range(3, 7))
		var blood_colors = [
			Color(0.8, 0.0, 0.15, 1.0),
			Color(0.6, 0.0, 0.1, 1.0),
			Color(0.4, 0.0, 0.05, 0.9),
			Color(0.9, 0.2, 0.2, 1.0),
			Color(0.2, 0.0, 0.05, 0.8)
		]
		p.color = blood_colors[randi() % blood_colors.size()]
		p.global_position = global_position
		get_parent().add_child(p)
		var angle = randf() * TAU
		var speed = randf_range(80, 200)
		var vel = Vector2(cos(angle), sin(angle)) * speed
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.5, 0.5).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.5)
		tw.tween_callback(p.queue_free)

func _spawn_fade_particles(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var angle = randf() * TAU
		var dist = randf_range(0, radius)
		var pos = global_position + Vector2(cos(angle), sin(angle)) * dist
		var p = ColorRect.new()
		p.size = Vector2(2, 2)
		p.color = Color(0.5, 0.0, 0.1, 0.5)
		p.global_position = pos
		get_parent().add_child(p)
		var tw = p.create_tween()
		tw.tween_property(p, "position:y", p.position.y - randf_range(10, 30), 0.5)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.5)
		tw.tween_callback(p.queue_free)

func _spawn_blood_hit(at_pos: Vector2) -> void:
	if not get_parent():
		return
	for i in range(10):
		var p = ColorRect.new()
		p.size = Vector2(3, 3)
		p.color = Color(0.9, 0.1, 0.15, 1.0)
		p.global_position = at_pos
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(40, 100)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.35, 0.35)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.35)
		tw.tween_callback(p.queue_free)

func _do_screen_flash() -> void:
	var flash_layer = CanvasLayer.new()
	flash_layer.layer = 50
	var flash = ColorRect.new()
	flash.color = Color(0.8, 0.0, 0.1, 0.45)
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash_layer.add_child(flash)
	get_tree().root.add_child(flash_layer)
	var tw = flash.create_tween()
	tw.tween_property(flash, "color:a", 0.0, 0.35)
	tw.tween_callback(flash_layer.queue_free)

func _do_screen_shake(intensity: float, duration: float) -> void:
	var players = get_tree().get_nodes_in_group("player")
	if players.size() == 0:
		return
	var cam = players[0].get_node_or_null("Camera2D")
	if cam == null:
		return
	var original_offset = cam.offset
	var shake_tween = cam.create_tween()
	var steps = int(duration / 0.03)
	for i in range(steps):
		var offset = Vector2(randf_range(-intensity, intensity), randf_range(-intensity, intensity))
		shake_tween.tween_property(cam, "offset", original_offset + offset, 0.03)
	shake_tween.tween_property(cam, "offset", original_offset, 0.05)
