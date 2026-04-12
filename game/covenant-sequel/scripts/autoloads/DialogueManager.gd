extends Node

signal dialogue_started(npc_name: String)
signal dialogue_line(speaker: String, text: String)
signal dialogue_ended()
signal dialogue_choice(choices: Array)

var is_dialogue_active: bool = false
var current_dialogue: Array[Dictionary] = []
var current_index: int = 0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


func start_dialogue(npc_name: String, lines: Array[Dictionary]) -> void:
	if is_dialogue_active:
		return
	is_dialogue_active = true
	current_dialogue = lines
	current_index = 0
	dialogue_started.emit(npc_name)
	_show_current_line()


func advance() -> void:
	if not is_dialogue_active:
		return
	current_index += 1
	if current_index >= current_dialogue.size():
		end_dialogue()
	else:
		_show_current_line()


func _show_current_line() -> void:
	var line := current_dialogue[current_index]
	var speaker: String = line.get("speaker", "???")
	var text: String = line.get("text", "")
	dialogue_line.emit(speaker, text)


func end_dialogue() -> void:
	is_dialogue_active = false
	current_dialogue.clear()
	current_index = 0
	dialogue_ended.emit()
