extends Node

## GameManager — autoloaded singleton
## Registers input actions at runtime so project.godot stays clean.
## Also tracks global game state: current level, player data, flags.

signal level_changed(level_name: String)
signal player_died
signal dialogue_started(npc_name: String)
signal dialogue_ended

# ── Game state ──────────────────────────────────────────────────────────────

var current_level: String = "main"
var player_health: int = 100
var player_max_health: int = 100
var collected_items: Array[String] = []
var story_flags: Dictionary = {}

# Server URL for AI dialogue.
# Web export: empty string → same-origin requests (browser handles the host).
# Desktop/headless: reads LYRA_SERVER_URL env var, falls back to port 80.
var server_url: String = ""

# ── Init ─────────────────────────────────────────────────────────────────────

func _ready() -> void:
	_setup_input_actions()
	server_url = _resolve_server_url()
	print("[GameManager] Initialised — The 13th Witch | server: ", server_url if server_url else "(same-origin)")

func _resolve_server_url() -> String:
	if OS.has_feature("web"):
		return ""  # Browser handles origin — no prefix needed
	var env := OS.get_environment("LYRA_SERVER_URL")
	if env:
		return env
	return "http://localhost:80"

func _setup_input_actions() -> void:
	_bind("move_left",  KEY_A, KEY_LEFT)
	_bind("move_right", KEY_D, KEY_RIGHT)
	_bind("move_up",    KEY_W, KEY_UP)
	_bind("move_down",  KEY_S, KEY_DOWN)
	_bind("interact",   KEY_E)
	_bind("sprint",     KEY_SHIFT)
	_bind("inventory",  KEY_TAB)
	_bind("pause",      KEY_ESCAPE)

func _bind(action: String, primary: Key, secondary: Key = KEY_NONE) -> void:
	if InputMap.has_action(action):
		return
	InputMap.add_action(action)
	var ev := InputEventKey.new()
	ev.physical_keycode = primary
	InputMap.action_add_event(action, ev)
	if secondary != KEY_NONE:
		var ev2 := InputEventKey.new()
		ev2.physical_keycode = secondary
		InputMap.action_add_event(action, ev2)

# ── Story flags ───────────────────────────────────────────────────────────────

func set_flag(key: String, value: Variant = true) -> void:
	story_flags[key] = value

func get_flag(key: String, default: Variant = false) -> Variant:
	return story_flags.get(key, default)

# ── Level loading ─────────────────────────────────────────────────────────────

func load_level(scene_path: String, level_name: String = "") -> void:
	current_level = level_name if level_name else scene_path
	get_tree().change_scene_to_file(scene_path)
	level_changed.emit(current_level)

# ── Player state ──────────────────────────────────────────────────────────────

func hurt_player(amount: int) -> void:
	player_health = max(0, player_health - amount)
	if player_health == 0:
		player_died.emit()

func heal_player(amount: int) -> void:
	player_health = min(player_max_health, player_health + amount)
