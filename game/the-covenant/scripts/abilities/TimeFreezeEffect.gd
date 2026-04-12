extends CanvasLayer
class_name TimeFreezeEffect
## Manages the time freeze ability visual effect and enemy/environment pausing.
## Creates a desaturation overlay and pauses all enemies for the duration.

signal time_freeze_started
signal time_freeze_ended

const FREEZE_DURATION: float = 5.0
const COOLDOWN_DURATION: float = 30.0
const MP_COST: int = 35
const FADE_IN_TIME: float = 0.3
const FADE_OUT_TIME: float = 0.5

var is_frozen: bool = false
var freeze_timer: float = 0.0
var cooldown_timer: float = 0.0
var frozen_enemies: Array = []  # Store references to frozen enemies
var original_enemy_states: Dictionary = {}  # Store original process modes

# Visual overlay
var overlay: ColorRect = null
var time_label: Label = null
var vignette_overlay: ColorRect = null

func _ready() -> void:
	layer = 9  # Below HUD (layer 10) but above game
	process_mode = Node.PROCESS_MODE_ALWAYS
	_create_visual_overlay()

func _process(delta: float) -> void:
	if cooldown_timer > 0:
		cooldown_timer = max(0, cooldown_timer - delta)

	if is_frozen:
		freeze_timer -= delta
		_update_freeze_visual()
		if freeze_timer <= 0:
			_end_freeze()

func _create_visual_overlay() -> void:
	# Main desaturation overlay
	overlay = ColorRect.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.color = Color(0.1, 0.05, 0.25, 0.0)  # Starts transparent
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay)

	# Vignette-like border darkening
	vignette_overlay = ColorRect.new()
	vignette_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	vignette_overlay.color = Color(0.0, 0.0, 0.1, 0.0)
	vignette_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(vignette_overlay)

	# Timer display
	time_label = Label.new()
	time_label.set_anchors_preset(Control.PRESET_CENTER_TOP)
	time_label.offset_top = 65.0
	time_label.offset_left = -80.0
	time_label.offset_right = 80.0
	time_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	time_label.add_theme_font_size_override("font_size", 18)
	time_label.add_theme_color_override("font_color", Color(0.6, 0.4, 1.0))
	time_label.text = ""
	time_label.visible = false
	time_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(time_label)

func can_activate() -> bool:
	return not is_frozen and cooldown_timer <= 0 and GameManager.stats.mp >= MP_COST

func get_cooldown_remaining() -> float:
	return cooldown_timer

func get_cooldown_total() -> float:
	return COOLDOWN_DURATION

func activate() -> bool:
	if not can_activate():
		return false

	if not GameManager.use_mp(MP_COST):
		return false

	is_frozen = true
	freeze_timer = FREEZE_DURATION
	cooldown_timer = COOLDOWN_DURATION

	_freeze_all_enemies()
	_start_freeze_visual()
	time_freeze_started.emit()
	AudioManager.play_sfx_named("time_freeze")
	return true

func _freeze_all_enemies() -> void:
	frozen_enemies.clear()
	original_enemy_states.clear()

	# Freeze all enemies
	var enemies = get_tree().get_nodes_in_group("enemies")
	for enemy in enemies:
		if is_instance_valid(enemy):
			frozen_enemies.append(enemy)
			# Store original process mode and disable processing
			original_enemy_states[enemy.get_instance_id()] = enemy.process_mode
			enemy.process_mode = Node.PROCESS_MODE_DISABLED
			# Visual freeze effect on each enemy
			if enemy.has_node("Sprite2D"):
				var spr = enemy.get_node("Sprite2D")
				spr.modulate = Color(0.4, 0.4, 0.8, 0.9)

	# Freeze telekinesis objects that are idle (not held)
	var tk_objects = get_tree().get_nodes_in_group("telekinesis_objects")
	for obj in tk_objects:
		if is_instance_valid(obj) and obj is TelekinesisObject:
			if obj.current_state == TelekinesisObject.TKState.IDLE:
				original_enemy_states[obj.get_instance_id()] = obj.process_mode
				obj.process_mode = Node.PROCESS_MODE_DISABLED

	# Freeze environmental projectiles
	var projectile_groups = ["enemy_projectiles"]
	for group_name in projectile_groups:
		var projectiles = get_tree().get_nodes_in_group(group_name)
		for proj in projectiles:
			if is_instance_valid(proj):
				original_enemy_states[proj.get_instance_id()] = proj.process_mode
				proj.process_mode = Node.PROCESS_MODE_DISABLED

func _unfreeze_all_enemies() -> void:
	for enemy in frozen_enemies:
		if is_instance_valid(enemy):
			var id = enemy.get_instance_id()
			if id in original_enemy_states:
				enemy.process_mode = original_enemy_states[id]
			else:
				enemy.process_mode = Node.PROCESS_MODE_INHERIT
			# Restore visual
			if enemy.has_node("Sprite2D"):
				var spr = enemy.get_node("Sprite2D")
				spr.modulate = Color(1, 1, 1, 1)

	# Unfreeze telekinesis objects
	var tk_objects = get_tree().get_nodes_in_group("telekinesis_objects")
	for obj in tk_objects:
		if is_instance_valid(obj):
			var id = obj.get_instance_id()
			if id in original_enemy_states:
				obj.process_mode = original_enemy_states[id]

	# Unfreeze projectiles
	var projectile_groups = ["enemy_projectiles"]
	for group_name in projectile_groups:
		var projectiles = get_tree().get_nodes_in_group(group_name)
		for proj in projectiles:
			if is_instance_valid(proj):
				var id = proj.get_instance_id()
				if id in original_enemy_states:
					proj.process_mode = original_enemy_states[id]

	frozen_enemies.clear()
	original_enemy_states.clear()

func _start_freeze_visual() -> void:
	time_label.visible = true

	# Fade in the desaturation overlay
	var tween = create_tween()
	tween.tween_property(overlay, "color", Color(0.1, 0.05, 0.25, 0.35), FADE_IN_TIME)
	tween.parallel().tween_property(vignette_overlay, "color", Color(0.0, 0.0, 0.1, 0.2), FADE_IN_TIME)

	# Screen flash effect
	var flash = ColorRect.new()
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash.color = Color(0.6, 0.4, 1.0, 0.5)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(flash)
	var flash_tween = flash.create_tween()
	flash_tween.tween_property(flash, "color:a", 0.0, 0.4)
	flash_tween.tween_callback(flash.queue_free)

func _update_freeze_visual() -> void:
	if time_label:
		time_label.text = "⏱ TIME FROZEN: %.1fs" % freeze_timer

	# Pulsing overlay effect
	var pulse = 0.3 + sin(Time.get_ticks_msec() * 0.003) * 0.05
	overlay.color.a = pulse

	# Frozen enemies shimmer
	for enemy in frozen_enemies:
		if is_instance_valid(enemy) and enemy.has_node("Sprite2D"):
			var shimmer = 0.4 + sin(Time.get_ticks_msec() * 0.005 + enemy.global_position.x) * 0.1
			enemy.get_node("Sprite2D").modulate = Color(shimmer, shimmer, 0.8, 0.9)

func _end_freeze() -> void:
	is_frozen = false
	freeze_timer = 0.0
	_unfreeze_all_enemies()
	time_freeze_ended.emit()
	AudioManager.play_sfx_named("time_unfreeze")

	# Fade out overlay
	var tween = create_tween()
	tween.tween_property(overlay, "color", Color(0.1, 0.05, 0.25, 0.0), FADE_OUT_TIME)
	tween.parallel().tween_property(vignette_overlay, "color", Color(0.0, 0.0, 0.1, 0.0), FADE_OUT_TIME)

	time_label.visible = false

	# End flash
	var flash = ColorRect.new()
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash.color = Color(0.4, 0.3, 0.8, 0.3)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(flash)
	var flash_tween = flash.create_tween()
	flash_tween.tween_property(flash, "color:a", 0.0, 0.3)
	flash_tween.tween_callback(flash.queue_free)
