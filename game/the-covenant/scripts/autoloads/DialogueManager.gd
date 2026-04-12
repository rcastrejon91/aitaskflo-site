extends Node

signal dialogue_started
signal dialogue_line_shown(speaker: String, text: String)
signal dialogue_choice_shown(choices: Array)
signal dialogue_ended

var is_active: bool = false
var current_dialogue: Array = []
var current_index: int = 0

var dialogues: Dictionary = {
	"elder_intro": [
		{"speaker": "Elder Morath", "text": "You dare enter the sanctum of The Covenant? Few have walked these halls and lived."},
		{"speaker": "Elder Morath", "text": "The ancient pacts bind all who seek power. The question is... what are you willing to sacrifice?"},
		{"speaker": "Player", "text": "I seek the truth about the covenant fragments."},
		{"speaker": "Elder Morath", "text": "Truth? Truth is a blade that cuts both ways. Gather the five fragments, and you shall see."}
	],
	"dark_pact_offer": [
		{"speaker": "Shadow Voice", "text": "I sense great potential in you, wanderer..."},
		{"speaker": "Shadow Voice", "text": "I offer you power beyond mortal comprehension. But every gift demands a price."},
		{"speaker": "Shadow Voice", "text": "Your life force for dark magic. Do you accept the pact?"}
	],
	"fragment_found": [
		{"speaker": "Narrator", "text": "The covenant fragment pulses with ancient energy. Memories of forgotten rituals flood your mind."},
		{"speaker": "Narrator", "text": "You sense that this is but one piece of a greater mystery..."}
	],
	"npc_villager": [
		{"speaker": "Villager", "text": "The shadow creatures grow bolder each night. Please, help us!"},
		{"speaker": "Villager", "text": "They say an ancient covenant once protected these lands, but it was broken long ago."}
	],
	"level2_intro": [
		{"speaker": "Narrator", "text": "You descend deeper into the Shadow Realm. The air grows thick with dark energy."},
		{"speaker": "Narrator", "text": "Ancient runes glow on the walls, remnants of the covenant's binding magic."}
	]
}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func start_dialogue(dialogue_id: String) -> void:
	if dialogue_id in dialogues:
		current_dialogue = dialogues[dialogue_id]
		current_index = 0
		is_active = true
		dialogue_started.emit()
		_show_current_line()

func advance_dialogue() -> void:
	if not is_active:
		return
	current_index += 1
	if current_index >= current_dialogue.size():
		end_dialogue()
	else:
		_show_current_line()

func end_dialogue() -> void:
	is_active = false
	current_dialogue = []
	current_index = 0
	dialogue_ended.emit()

func _show_current_line() -> void:
	var line = current_dialogue[current_index]
	dialogue_line_shown.emit(line.speaker, line.text)
