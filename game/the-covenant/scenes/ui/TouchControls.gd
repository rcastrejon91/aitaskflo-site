extends CanvasLayer
## Mobile touch controls: virtual joystick (left) + action buttons (right).
## Emits standard Godot input actions so Player.gd needs no changes.

# --- Joystick state ---
var joystick_active: bool = false
var joystick_touch_index: int = -1
var joystick_center: Vector2 = Vector2.ZERO
var joystick_direction: Vector2 = Vector2.ZERO  # normalised direction
var joystick_strength: float = 0.0  # 0‑1

# Configuration
@export var joystick_radius: float = 64.0
@export var joystick_dead_zone: float = 0.15
@export var show_on_desktop: bool = false  # for testing

# Node refs (created in code)
var joystick_base: Control
var joystick_knob: Control
var btn_attack: TouchScreenButton
var btn_spell: TouchScreenButton
var btn_interact: TouchScreenButton
var btn_pause: TouchScreenButton

# Touch tracking for buttons (we handle multi-touch ourselves)
var _button_touches: Dictionary = {}  # touch_index -> button_name

func _ready() -> void:
	layer = 15
	process_mode = Node.PROCESS_MODE_ALWAYS

	# Only show on mobile / touchscreen devices (or if forced)
	var is_touch_device = _detect_touch_device()
	if not is_touch_device and not show_on_desktop:
		visible = false
		set_process(false)
		set_process_input(false)
		return

	_build_ui()

func _detect_touch_device() -> bool:
	if OS.has_feature("mobile"):
		return true
	if OS.has_feature("web"):
		return true  # show on web too; users can have touch screens
	if DisplayServer.is_touchscreen_available():
		return true
	return false

# ---------------------------------------------------------------------------
#  BUILD ALL UI ELEMENTS IN CODE (no .tscn dependency)
# ---------------------------------------------------------------------------
func _build_ui() -> void:
	# Root control that covers the full screen
	var root = Control.new()
	root.name = "TouchRoot"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	# ---- JOYSTICK (left side) ----
	joystick_base = _make_circle_control(joystick_radius * 2.0, Color(1, 1, 1, 0.12))
	joystick_base.position = Vector2(40 + joystick_radius, -40 - joystick_radius)  # will anchor bottom-left
	joystick_base.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	joystick_base.position = Vector2(40, -40 - joystick_radius * 2.0)
	joystick_base.pivot_offset = Vector2(joystick_radius, joystick_radius)
	root.add_child(joystick_base)
	# Re-position: anchored bottom-left with offset
	joystick_base.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	joystick_base.offset_left = 30
	joystick_base.offset_top = -30 - joystick_radius * 2.0
	joystick_base.offset_right = 30 + joystick_radius * 2.0
	joystick_base.offset_bottom = -30

	joystick_knob = _make_circle_control(joystick_radius * 0.7, Color(0.7, 0.4, 1.0, 0.45))
	joystick_knob.position = Vector2(joystick_radius - joystick_radius * 0.35, joystick_radius - joystick_radius * 0.35)
	joystick_base.add_child(joystick_knob)

	# Outer ring decoration
	var ring = _make_circle_control(joystick_radius * 2.0, Color(0.6, 0.3, 0.9, 0.08))
	ring.position = Vector2.ZERO
	ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	joystick_base.add_child(ring)

	# Direction arrows (subtle)
	_add_direction_hints(joystick_base)

	# ---- ACTION BUTTONS (right side) ----
	var btn_size = 56.0
	var btn_margin = 14.0
	var right_base_x = -30 - btn_size  # from right edge

	# Attack button (⚔) – bottom-right area
	btn_attack = _make_action_button("⚔", btn_size, Color(0.9, 0.2, 0.2, 0.5), "attack")
	btn_attack.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	btn_attack.offset_left = right_base_x - btn_size - btn_margin
	btn_attack.offset_top = -30 - btn_size
	btn_attack.offset_right = right_base_x - btn_margin
	btn_attack.offset_bottom = -30
	root.add_child(btn_attack)

	# Spell button (✦) – above-left of attack
	btn_spell = _make_action_button("✦", btn_size, Color(0.4, 0.2, 0.9, 0.5), "cast_spell")
	btn_spell.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	btn_spell.offset_left = right_base_x - (btn_size + btn_margin) * 2
	btn_spell.offset_top = -30 - btn_size - btn_margin - btn_size
	btn_spell.offset_right = right_base_x - (btn_size + btn_margin) * 2 + btn_size
	btn_spell.offset_bottom = -30 - btn_size - btn_margin
	root.add_child(btn_spell)

	# Interact button (💬) – above attack
	btn_interact = _make_action_button("E", btn_size, Color(0.2, 0.8, 0.4, 0.5), "interact")
	btn_interact.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	btn_interact.offset_left = right_base_x - btn_size - btn_margin
	btn_interact.offset_top = -30 - btn_size - btn_margin - btn_size
	btn_interact.offset_right = right_base_x - btn_margin
	btn_interact.offset_bottom = -30 - btn_size - btn_margin
	root.add_child(btn_interact)

	# Main attack area (larger invisible touch zone around attack button for comfort)
	# The buttons above already work via _input

	# Pause button (top-right)
	btn_pause = _make_action_button("☰", 42.0, Color(1, 1, 1, 0.35), "pause")
	btn_pause.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	btn_pause.offset_left = -72
	btn_pause.offset_top = 10
	btn_pause.offset_right = -30
	btn_pause.offset_bottom = 52
	root.add_child(btn_pause)

# ---------------------------------------------------------------------------
#  HELPER: make a rounded-look Control (ColorRect with stylebox)
# ---------------------------------------------------------------------------
func _make_circle_control(diameter: float, color: Color) -> Control:
	var panel = Panel.new()
	panel.custom_minimum_size = Vector2(diameter, diameter)
	panel.size = Vector2(diameter, diameter)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var style = StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = int(diameter * 0.5)
	style.corner_radius_top_right = int(diameter * 0.5)
	style.corner_radius_bottom_left = int(diameter * 0.5)
	style.corner_radius_bottom_right = int(diameter * 0.5)
	panel.add_theme_stylebox_override("panel", style)
	return panel

func _add_direction_hints(parent: Control) -> void:
	# Small arrow-like dots at N/S/E/W
	var r = joystick_radius
	var dot_size = 6.0
	var positions = [
		Vector2(r - dot_size * 0.5, 4),            # up
		Vector2(r - dot_size * 0.5, r * 2 - 4 - dot_size),  # down
		Vector2(4, r - dot_size * 0.5),            # left
		Vector2(r * 2 - 4 - dot_size, r - dot_size * 0.5),  # right
	]
	for pos in positions:
		var dot = ColorRect.new()
		dot.size = Vector2(dot_size, dot_size)
		dot.position = pos
		dot.color = Color(0.7, 0.5, 1.0, 0.25)
		dot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		parent.add_child(dot)

# ---------------------------------------------------------------------------
#  HELPER: make an action button (Panel acting as touch area)
# ---------------------------------------------------------------------------
func _make_action_button(label_text: String, btn_size: float, color: Color, action_name: String) -> Panel:
	var panel = Panel.new()
	panel.custom_minimum_size = Vector2(btn_size, btn_size)
	panel.size = Vector2(btn_size, btn_size)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE  # we handle touches manually
	panel.set_meta("action_name", action_name)
	panel.set_meta("base_color", color)
	panel.set_meta("is_pressed", false)

	var style = StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = int(btn_size * 0.3)
	style.corner_radius_top_right = int(btn_size * 0.3)
	style.corner_radius_bottom_left = int(btn_size * 0.3)
	style.corner_radius_bottom_right = int(btn_size * 0.3)
	style.border_color = Color(color.r + 0.2, color.g + 0.2, color.b + 0.2, 0.5)
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	panel.add_theme_stylebox_override("panel", style)

	var lbl = Label.new()
	lbl.text = label_text
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.set_anchors_preset(Control.PRESET_FULL_RECT)
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Make label bigger
	lbl.add_theme_font_size_override("font_size", int(btn_size * 0.45))
	panel.add_child(lbl)

	return panel

# ---------------------------------------------------------------------------
#  INPUT HANDLING – multi-touch joystick + buttons
# ---------------------------------------------------------------------------
func _input(event: InputEvent) -> void:
	if not visible:
		return

	if event is InputEventScreenTouch:
		_handle_screen_touch(event)
	elif event is InputEventScreenDrag:
		_handle_screen_drag(event)

func _handle_screen_touch(event: InputEventScreenTouch) -> void:
	if event.pressed:
		# Check if touch is on joystick area
		var joy_global_rect = joystick_base.get_global_rect()
		# Expand the touch area a bit for easier gripping
		var expanded_joy = joy_global_rect.grow(20)
		if expanded_joy.has_point(event.position) and not joystick_active:
			_joystick_start(event.index, event.position)
			return

		# Check action buttons
		var buttons = [btn_attack, btn_spell, btn_interact, btn_pause]
		for btn in buttons:
			if btn == null:
				continue
			var btn_rect = btn.get_global_rect().grow(8)  # slight expand for touch comfort
			if btn_rect.has_point(event.position):
				var action_name = btn.get_meta("action_name")
				_press_action(action_name, event.index, btn)
				return

		# If touch is on the left half of screen and joystick not active, start joystick there
		var screen_size = get_viewport().get_visible_rect().size
		if event.position.x < screen_size.x * 0.4 and not joystick_active:
			_joystick_start(event.index, event.position)
			return
	else:
		# Touch released
		if event.index == joystick_touch_index:
			_joystick_end()

		# Release any button held by this touch
		if _button_touches.has(event.index):
			var action_name = _button_touches[event.index].action
			var btn = _button_touches[event.index].btn
			_release_action(action_name, event.index, btn)

func _handle_screen_drag(event: InputEventScreenDrag) -> void:
	if event.index == joystick_touch_index and joystick_active:
		_joystick_move(event.position)

# ---------------------------------------------------------------------------
#  JOYSTICK LOGIC
# ---------------------------------------------------------------------------
func _joystick_start(touch_index: int, pos: Vector2) -> void:
	joystick_active = true
	joystick_touch_index = touch_index
	joystick_center = joystick_base.get_global_rect().get_center()
	_joystick_move(pos)
	# Visual feedback
	joystick_base.modulate.a = 1.0

func _joystick_move(pos: Vector2) -> void:
	var delta_vec = pos - joystick_center
	var dist = delta_vec.length()
	var max_dist = joystick_radius

	if dist > max_dist:
		delta_vec = delta_vec.normalized() * max_dist
		dist = max_dist

	joystick_strength = dist / max_dist
	if joystick_strength < joystick_dead_zone:
		joystick_direction = Vector2.ZERO
		joystick_strength = 0.0
	else:
		joystick_direction = delta_vec.normalized()
		# Remap strength past dead zone to 0-1
		joystick_strength = (joystick_strength - joystick_dead_zone) / (1.0 - joystick_dead_zone)

	# Move knob visual
	var knob_size = joystick_knob.size
	joystick_knob.position = Vector2(joystick_radius, joystick_radius) + delta_vec - knob_size * 0.5

	# Emit input actions for the input system
	_emit_joystick_actions()

func _joystick_end() -> void:
	joystick_active = false
	joystick_touch_index = -1
	joystick_direction = Vector2.ZERO
	joystick_strength = 0.0

	# Reset knob to center
	var knob_size = joystick_knob.size
	joystick_knob.position = Vector2(joystick_radius - knob_size.x * 0.5, joystick_radius - knob_size.y * 0.5)

	# Visual feedback
	joystick_base.modulate.a = 0.7

	# Release all movement actions
	for action in ["move_up", "move_down", "move_left", "move_right"]:
		if Input.is_action_pressed(action):
			Input.action_release(action)

func _emit_joystick_actions() -> void:
	# Release all first, then press the active ones
	for action in ["move_up", "move_down", "move_left", "move_right"]:
		Input.action_release(action)

	if joystick_strength <= 0.0:
		return

	var dir = joystick_direction
	# Use thresholds to allow 8-directional movement
	if dir.x < -0.3:
		Input.action_press("move_left", abs(dir.x) * joystick_strength)
	elif dir.x > 0.3:
		Input.action_press("move_right", dir.x * joystick_strength)

	if dir.y < -0.3:
		Input.action_press("move_up", abs(dir.y) * joystick_strength)
	elif dir.y > 0.3:
		Input.action_press("move_down", dir.y * joystick_strength)

# ---------------------------------------------------------------------------
#  BUTTON ACTIONS
# ---------------------------------------------------------------------------
func _press_action(action_name: String, touch_index: int, btn: Panel) -> void:
	Input.action_press(action_name)
	_button_touches[touch_index] = {"action": action_name, "btn": btn}
	# Visual press feedback
	btn.set_meta("is_pressed", true)
	_set_button_pressed_style(btn, true)

func _release_action(action_name: String, touch_index: int, btn: Panel) -> void:
	Input.action_release(action_name)
	_button_touches.erase(touch_index)
	btn.set_meta("is_pressed", false)
	_set_button_pressed_style(btn, false)

func _set_button_pressed_style(btn: Panel, pressed: bool) -> void:
	var base_color: Color = btn.get_meta("base_color")
	var style = btn.get_theme_stylebox("panel") as StyleBoxFlat
	if style == null:
		return
	if pressed:
		style.bg_color = Color(base_color.r + 0.25, base_color.g + 0.25, base_color.b + 0.25, min(base_color.a + 0.3, 0.95))
		btn.scale = Vector2(0.9, 0.9)
	else:
		style.bg_color = base_color
		btn.scale = Vector2(1.0, 1.0)

# ---------------------------------------------------------------------------
#  PROCESS – smooth knob return, visual pulse on buttons
# ---------------------------------------------------------------------------
func _process(delta: float) -> void:
	if not visible:
		return

	# Fade joystick base when not active
	if not joystick_active:
		joystick_base.modulate.a = lerp(joystick_base.modulate.a, 0.55, delta * 5.0)
	else:
		joystick_base.modulate.a = lerp(joystick_base.modulate.a, 1.0, delta * 8.0)

	# Smooth button scale return
	var buttons = [btn_attack, btn_spell, btn_interact, btn_pause]
	for btn in buttons:
		if btn == null:
			continue
		if not btn.get_meta("is_pressed"):
			btn.scale = btn.scale.lerp(Vector2.ONE, delta * 12.0)

# ---------------------------------------------------------------------------
#  PUBLIC API
# ---------------------------------------------------------------------------
## Returns the current joystick direction vector (for direct reading if needed)
func get_joystick_direction() -> Vector2:
	return joystick_direction * joystick_strength

## Force show/hide (e.g. from settings)
func set_touch_visible(vis: bool) -> void:
	visible = vis
	set_process(vis)
	set_process_input(vis)
