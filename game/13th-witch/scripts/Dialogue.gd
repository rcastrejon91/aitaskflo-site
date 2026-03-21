extends CanvasLayer

## Dialogue system — shows NPC speech panel, sends player input to /api/lyra/game,
## streams the AI reply back, and emits signals for game flow.

signal dialogue_started(npc_name: String)
signal dialogue_ended

@onready var panel:         Panel          = $Panel
@onready var speaker_label: Label          = $Panel/VBox/SpeakerLabel
@onready var text_label:    RichTextLabel  = $Panel/VBox/TextLabel
@onready var input_field:   LineEdit       = $Panel/VBox/InputField
@onready var close_btn:     Button         = $Panel/CloseButton
@onready var http:          HTTPRequest    = $HTTPRequest

var is_open        := false
var _history:        Array  = []
var _npc_system:     String = ""
var _npc_name:       String = ""
var _server_url:     String = ""

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	panel.visible    = false
	_server_url      = GameManager.server_url

	input_field.text_submitted.connect(_on_player_input)
	close_btn.pressed.connect(close)
	http.request_completed.connect(_on_http_complete)

	# Make globally accessible
	get_tree().get_root().set_meta("Dialogue", self)

func _input(event: InputEvent) -> void:
	if is_open and event.is_action_pressed("pause"):
		close()

# ── Public API ────────────────────────────────────────────────────────────────

func open(npc_name: String, npc_system: String = "") -> void:
	if is_open:
		return
	_npc_name   = npc_name
	_npc_system = npc_system
	_history.clear()

	speaker_label.text = npc_name
	text_label.text    = ""
	panel.visible      = true
	is_open            = true

	input_field.editable    = false
	input_field.placeholder_text = "Waiting..."

	dialogue_started.emit(npc_name)
	GameManager.dialogue_started.emit(npc_name)

	# Greeting from NPC
	_send_to_api("[The player approaches]")

func close() -> void:
	if not is_open:
		return
	is_open        = false
	panel.visible  = false
	_history.clear()
	dialogue_ended.emit()
	GameManager.dialogue_ended.emit()

# ── Interaction flow ──────────────────────────────────────────────────────────

func _on_player_input(text: String) -> void:
	var trimmed := text.strip_edges()
	if trimmed.is_empty():
		return

	input_field.clear()
	input_field.editable = false
	input_field.placeholder_text = "..."

	text_label.append_text("[color=#88ccff]You:[/color] " + trimmed + "\n")
	_history.append({"role": "user", "content": trimmed})

	_send_to_api(trimmed)

func _send_to_api(message: String) -> void:
	var url     := _server_url + "/api/lyra/game"
	var headers := PackedStringArray(["Content-Type: application/json"])

	# Trim history to last 8 messages (4 exchanges) to stay within token limits
	var ctx := _history.slice(max(0, _history.size() - 8))

	var payload := JSON.stringify({
		"message": message,
		"npc": {
			"name": _npc_name,
			"system": _npc_system
		},
		"context": ctx
	})

	var err := http.request(url, headers, HTTPClient.METHOD_POST, payload)
	if err != OK:
		_show_error("Connection failed (code %d)" % err)

func _on_http_complete(result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	input_field.editable          = true
	input_field.placeholder_text  = "Say something... (Esc to leave)"

	if result != HTTPRequest.RESULT_SUCCESS or code != 200:
		_show_error("The spirit is unreachable (HTTP %d)" % code)
		input_field.grab_focus()
		return

	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		_show_error("Unintelligible whispers...")
		input_field.grab_focus()
		return

	var reply: String = json.get_data().get("reply", "...")
	_history.append({"role": "assistant", "content": reply})

	text_label.append_text("[color=#ffd080]" + _npc_name + ":[/color] " + reply + "\n\n")
	input_field.grab_focus()

func _show_error(msg: String) -> void:
	text_label.append_text("[color=#ff6666]*" + msg + "*[/color]\n")
