extends Node2D
## SoulDrainBeam — Rips life force from the nearest enemy, healing the player.
## Visual: green/purple energy tendrils connecting player to target.
## CPU-based particles for web compatibility.

@export var damage: int = 40
@export var heal_ratio: float = 0.5  # heals this % of damage dealt
@export var range_radius: float = 120.0
@export var drain_duration: float = 1.0

var target_enemy: Node2D = null
var player_ref: Node2D = null
var drain_timer: float = 0.0
var particle_timer: float = 0.0
var damage_tick_timer: float = 0.0
var total_damage_dealt: int = 0
var ticks_done: int = 0
var max_ticks: int = 4
var beam_alpha: float = 0.0

func _ready() -> void:
	# Find nearest enemy
	_find_target()
	# Find player
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		player_ref = players[0]
	
	if target_enemy == null or player_ref == null:
		# No valid target, refund and cancel
		queue_free()
		return
	
	# Initial flash
	_do_screen_flash()
	_spawn_initial_burst()
	AudioManager.play_sfx_named("soul_drain")

func _process(delta: float) -> void:
	if target_enemy == null or not is_instance_valid(target_enemy) or player_ref == null:
		_finish_drain()
		return
	
	drain_timer += delta
	beam_alpha = min(1.0, drain_timer * 4.0)
	
	# Damage ticks
	damage_tick_timer += delta
	var tick_interval = drain_duration / max_ticks
	if damage_tick_timer >= tick_interval and ticks_done < max_ticks:
		damage_tick_timer -= tick_interval
		ticks_done += 1
		_deal_damage_tick()
	
	# Beam particles flowing from enemy to player
	particle_timer += delta
	if particle_timer >= 0.03:
		particle_timer = 0.0
		_spawn_drain_particles(3)
	
	# Follow player position
	global_position = player_ref.global_position
	
	queue_redraw()
	
	if drain_timer >= drain_duration:
		_finish_drain()

func _draw() -> void:
	if target_enemy == null or not is_instance_valid(target_enemy):
		return
	
	var target_local = target_enemy.global_position - global_position
	
	# Draw soul drain beam (multiple sinusoidal lines)
	for i in range(3):
		var points = PackedVector2Array()
		var colors = PackedColorArray()
		var segments = 16
		for s in range(segments + 1):
			var t = float(s) / segments
			var base_pos = Vector2.ZERO.lerp(target_local, t)
			# Sinusoidal wave offset
			var perp = target_local.normalized().rotated(PI / 2)
			var wave = sin(t * PI * 4.0 + drain_timer * 8.0 + i * 2.1) * (8.0 - i * 2.0)
			base_pos += perp * wave
			points.append(base_pos)
			
			# Color gradient: green near player, purple near enemy
			var color = Color(0.0, 0.9, 0.3, beam_alpha * 0.6).lerp(
				Color(0.6, 0.0, 0.8, beam_alpha * 0.6), t)
			colors.append(color)
		
		if points.size() >= 2:
			draw_polyline_colors(points, colors, 2.0 - i * 0.5)
	
	# Glow at target
	var glow_pulse = 0.5 + sin(drain_timer * 10.0) * 0.3
	draw_circle(target_local, 8.0, Color(0.0, 0.8, 0.3, beam_alpha * glow_pulse * 0.4))
	draw_circle(target_local, 4.0, Color(0.5, 1.0, 0.5, beam_alpha * glow_pulse * 0.6))
	
	# Glow at player (self)
	draw_circle(Vector2.ZERO, 6.0, Color(0.0, 1.0, 0.4, beam_alpha * glow_pulse * 0.3))

func _deal_damage_tick() -> void:
	if not is_instance_valid(target_enemy):
		return
	var hurtbox = target_enemy.get_node_or_null("HurtboxComponent")
	if hurtbox and hurtbox is HurtboxComponent:
		var tick_damage = int(damage / max_ticks)
		hurtbox.receive_hit(tick_damage, 30.0, global_position)
		total_damage_dealt += tick_damage
		
		# Heal player
		var heal_amount = int(tick_damage * heal_ratio)
		GameManager.heal(heal_amount)
		
		# Spawn heal particles at player
		_spawn_heal_particles()
		
		# Hit feedback
		_spawn_drain_hit(target_enemy.global_position)

func _finish_drain() -> void:
	# Final heal pulse
	if total_damage_dealt > 0:
		_spawn_final_heal_burst()
	queue_free()

func _find_target() -> void:
	var enemies = get_tree().get_nodes_in_group("enemies")
	var nearest_dist = range_radius
	for enemy in enemies:
		if not is_instance_valid(enemy):
			continue
		# Check if enemy is alive
		var health = enemy.get_node_or_null("HealthComponent")
		if health and health is HealthComponent and not health.is_alive():
			continue
		var dist = global_position.distance_to(enemy.global_position)
		if dist < nearest_dist:
			nearest_dist = dist
			target_enemy = enemy

func _spawn_drain_particles(count: int) -> void:
	if not get_parent() or not is_instance_valid(target_enemy):
		return
	for i in range(count):
		var p = ColorRect.new()
		p.size = Vector2(3, 3)
		# Start near enemy, travel to player
		var t_start = randf_range(0.6, 1.0)
		var start_pos = global_position.lerp(target_enemy.global_position, t_start)
		start_pos += Vector2(randf_range(-8, 8), randf_range(-8, 8))
		p.global_position = start_pos
		p.color = Color(0.0, randf_range(0.6, 1.0), randf_range(0.2, 0.5), 0.9)
		get_parent().add_child(p)
		
		# Animate toward player
		var tw = p.create_tween()
		var end_pos = global_position + Vector2(randf_range(-5, 5), randf_range(-5, 5))
		tw.tween_property(p, "global_position", end_pos, randf_range(0.2, 0.5)).set_ease(Tween.EASE_IN)
		tw.parallel().tween_property(p, "scale", Vector2(0.3, 0.3), 0.4)
		tw.tween_callback(p.queue_free)

func _spawn_heal_particles() -> void:
	if not get_parent():
		return
	for i in range(5):
		var p = ColorRect.new()
		p.size = Vector2(2, 2)
		p.color = Color(0.0, 1.0, 0.4, 0.9)
		p.global_position = global_position + Vector2(randf_range(-6, 6), randf_range(-6, 6))
		get_parent().add_child(p)
		var tw = p.create_tween()
		tw.tween_property(p, "position:y", p.position.y - randf_range(15, 30), 0.5)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.5)
		tw.tween_callback(p.queue_free)

func _spawn_drain_hit(at_pos: Vector2) -> void:
	if not get_parent():
		return
	for i in range(4):
		var p = ColorRect.new()
		p.size = Vector2(2, 2)
		p.color = Color(0.5, 0.0, 0.8, 1.0)
		p.global_position = at_pos
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(20, 50)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.25, 0.25)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.25)
		tw.tween_callback(p.queue_free)

func _spawn_initial_burst() -> void:
	if not get_parent():
		return
	for i in range(8):
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 5), randf_range(2, 5))
		p.color = Color(0.0, 0.8, 0.3, 0.9)
		p.global_position = global_position
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(30, 70)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.3, 0.3)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.3)
		tw.tween_callback(p.queue_free)

func _spawn_final_heal_burst() -> void:
	if not get_parent():
		return
	for i in range(12):
		var p = ColorRect.new()
		p.size = Vector2(3, 3)
		p.color = Color(0.0, 1.0, 0.5, 1.0)
		p.global_position = global_position
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(40, 90)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.4, 0.4).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.4)
		tw.tween_callback(p.queue_free)

func _do_screen_flash() -> void:
	var flash_layer = CanvasLayer.new()
	flash_layer.layer = 50
	var flash = ColorRect.new()
	flash.color = Color(0.0, 0.8, 0.3, 0.2)
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash_layer.add_child(flash)
	get_tree().root.add_child(flash_layer)
	var tw = flash.create_tween()
	tw.tween_property(flash, "color:a", 0.0, 0.4)
	tw.tween_callback(flash_layer.queue_free)
