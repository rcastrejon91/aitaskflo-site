extends Node2D
## InfernoBlast — Expanding ring of cursed fire that damages all nearby enemies.
## CPU-based particles for web compatibility.

@export var damage: int = 35
@export var radius: float = 80.0
@export var expand_duration: float = 0.4
@export var linger_duration: float = 0.3

var expand_timer: float = 0.0
var linger_timer: float = 0.0
var current_radius: float = 0.0
var has_dealt_damage: bool = false
var hit_enemies: Array = []

# Visual nodes
var ring_visual: Node2D
var flash_rect: ColorRect
var particle_timer: float = 0.0

func _ready() -> void:
	# Create visual ring container
	ring_visual = Node2D.new()
	add_child(ring_visual)
	
	# Screen flash effect
	_do_screen_flash()
	
	# Initial burst of fire particles
	_spawn_burst_particles(16)
	
	AudioManager.play_sfx_named("inferno_blast")

func _process(delta: float) -> void:
	if expand_timer < expand_duration:
		expand_timer += delta
		var t = clamp(expand_timer / expand_duration, 0.0, 1.0)
		# Ease out for satisfying expansion
		t = 1.0 - pow(1.0 - t, 3.0)
		current_radius = radius * t
		
		# Spawn fire ring particles
		particle_timer += delta
		if particle_timer >= 0.02:
			particle_timer = 0.0
			_spawn_ring_particles(int(6 + t * 10))
		
		# Deal damage once ring reaches 70% expansion
		if t > 0.7 and not has_dealt_damage:
			has_dealt_damage = true
			_deal_area_damage()
		
		queue_redraw()
	else:
		linger_timer += delta
		# Fade out
		particle_timer += delta
		if particle_timer >= 0.05:
			particle_timer = 0.0
			_spawn_ember_particles(3)
		
		if linger_timer >= linger_duration:
			queue_free()

func _draw() -> void:
	if current_radius > 0:
		var alpha = 1.0
		if linger_timer > 0:
			alpha = 1.0 - (linger_timer / linger_duration)
		
		# Outer glow ring
		draw_arc(Vector2.ZERO, current_radius, 0, TAU, 48, 
			Color(1.0, 0.2, 0.0, 0.15 * alpha), current_radius * 0.6)
		# Bright fire ring
		draw_arc(Vector2.ZERO, current_radius * 0.8, 0, TAU, 36, 
			Color(1.0, 0.5, 0.0, 0.6 * alpha), 4.0)
		# Inner hot core
		draw_arc(Vector2.ZERO, current_radius * 0.4, 0, TAU, 24, 
			Color(1.0, 0.9, 0.3, 0.3 * alpha), current_radius * 0.3)
		# Center flash
		if expand_timer < expand_duration * 0.5:
			var flash_alpha = (1.0 - expand_timer / (expand_duration * 0.5)) * 0.5
			draw_circle(Vector2.ZERO, current_radius * 0.2, 
				Color(1.0, 1.0, 0.8, flash_alpha))

func _deal_area_damage() -> void:
	var enemies = get_tree().get_nodes_in_group("enemies")
	for enemy in enemies:
		if not is_instance_valid(enemy):
			continue
		var dist = global_position.distance_to(enemy.global_position)
		if dist <= radius and enemy not in hit_enemies:
			hit_enemies.append(enemy)
			# Find hurtbox
			var hurtbox = enemy.get_node_or_null("HurtboxComponent")
			if hurtbox and hurtbox is HurtboxComponent:
				# Damage falls off slightly with distance
				var dist_factor = 1.0 - (dist / radius) * 0.3
				var final_damage = int(damage * dist_factor)
				hurtbox.receive_hit(final_damage, 250.0, global_position)
				# Spawn hit sparks on enemy
				_spawn_hit_sparks(enemy.global_position)
			# Apply burn status (visual)
			if enemy.has_method("_apply_burn"):
				enemy._apply_burn(3.0)

func _spawn_burst_particles(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var p = ColorRect.new()
		p.size = Vector2(randf_range(3, 7), randf_range(3, 7))
		var fire_colors = [
			Color(1.0, 0.3, 0.0, 1.0),
			Color(1.0, 0.6, 0.0, 1.0),
			Color(1.0, 0.9, 0.2, 1.0),
			Color(0.8, 0.1, 0.0, 1.0)
		]
		p.color = fire_colors[randi() % fire_colors.size()]
		p.global_position = global_position
		get_parent().add_child(p)
		var angle = randf() * TAU
		var speed = randf_range(60.0, 150.0)
		var vel = Vector2(cos(angle), sin(angle)) * speed
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.5, 0.5).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.5)
		tw.parallel().tween_property(p, "scale", Vector2(0.1, 0.1), 0.5)
		tw.tween_callback(p.queue_free)

func _spawn_ring_particles(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var angle = randf() * TAU
		var pos = global_position + Vector2(cos(angle), sin(angle)) * current_radius
		var p = ColorRect.new()
		p.size = Vector2(randf_range(2, 5), randf_range(2, 5))
		p.color = Color(1.0, randf_range(0.2, 0.7), 0.0, 0.9)
		p.global_position = pos
		get_parent().add_child(p)
		# Rise upward like fire
		var tw = p.create_tween()
		tw.tween_property(p, "position:y", p.position.y - randf_range(15, 35), 0.4)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.4)
		tw.parallel().tween_property(p, "scale", Vector2(0.2, 0.2), 0.4)
		tw.tween_callback(p.queue_free)

func _spawn_ember_particles(count: int) -> void:
	if not get_parent():
		return
	for i in range(count):
		var angle = randf() * TAU
		var dist = randf_range(0, radius)
		var pos = global_position + Vector2(cos(angle), sin(angle)) * dist
		var p = ColorRect.new()
		p.size = Vector2(2, 2)
		p.color = Color(1.0, 0.4, 0.0, 0.7)
		p.global_position = pos
		get_parent().add_child(p)
		var tw = p.create_tween()
		tw.tween_property(p, "position:y", p.position.y - randf_range(20, 50), 0.6)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.6)
		tw.tween_callback(p.queue_free)

func _spawn_hit_sparks(at_pos: Vector2) -> void:
	if not get_parent():
		return
	for i in range(6):
		var p = ColorRect.new()
		p.size = Vector2(3, 3)
		p.color = Color(1.0, 0.8, 0.0, 1.0)
		p.global_position = at_pos
		get_parent().add_child(p)
		var angle = randf() * TAU
		var vel = Vector2(cos(angle), sin(angle)) * randf_range(40, 80)
		var tw = p.create_tween()
		tw.tween_property(p, "position", p.position + vel * 0.3, 0.3)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.3)
		tw.tween_callback(p.queue_free)

func _do_screen_flash() -> void:
	# Find the camera / create a CanvasLayer flash
	var flash_layer = CanvasLayer.new()
	flash_layer.layer = 50
	var flash = ColorRect.new()
	flash.color = Color(1.0, 0.4, 0.0, 0.35)
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash_layer.add_child(flash)
	get_tree().root.add_child(flash_layer)
	var tw = flash.create_tween()
	tw.tween_property(flash, "color:a", 0.0, 0.3)
	tw.tween_callback(flash_layer.queue_free)
