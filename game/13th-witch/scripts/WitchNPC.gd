extends Node2D

## The 13th Witch — the only NPC in the starting area.
## Approach and press E to speak. Her replies come from /api/lyra/game.

@export var npc_name: String = "The 13th Witch"
@export_multiline var npc_system: String = \
"""You are the 13th Witch — an ancient forest spirit who has dwelt in this dark wood for a thousand years.
You speak in cryptic, poetic riddles laced with genuine menace.
You test all who enter. Some you help. Some you curse. Most you simply… observe.
Keep every response under 3 sentences. Never break character.
The player has wandered into your domain uninvited. Decide their fate."""

@onready var sprite:        Sprite2D = $Sprite2D
@onready var name_label:    Label    = $NameLabel
@onready var interact_area: Area2D   = $InteractArea
@onready var prompt_label:  Label    = $PromptLabel if has_node("PromptLabel") else null

var _player_nearby := false

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	name_label.text = npc_name
	interact_area.body_entered.connect(_on_body_entered)
	interact_area.body_exited.connect(_on_body_exited)
	if prompt_label:
		prompt_label.visible = false

func _process(_delta: float) -> void:
	# Gentle float animation
	sprite.position.y = sin(Time.get_ticks_msec() * 0.001) * 4.0

# ── Interaction ───────────────────────────────────────────────────────────────

func interact(_player: Node = null) -> void:
	var dialogue = _get_dialogue()
	if dialogue and not dialogue.is_open:
		dialogue.open(npc_name, npc_system)

func _on_body_entered(body: Node) -> void:
	if body.is_in_group("player"):
		_player_nearby = true
		name_label.modulate = Color(1, 0.84, 0.31, 1)
		if prompt_label:
			prompt_label.visible = true

func _on_body_exited(body: Node) -> void:
	if body.is_in_group("player"):
		_player_nearby = false
		name_label.modulate = Color(1, 1, 1, 0.6)
		if prompt_label:
			prompt_label.visible = false

# ── Helpers ───────────────────────────────────────────────────────────────────

func _get_dialogue() -> Node:
	return get_tree().get_root().get_meta("Dialogue", null)
