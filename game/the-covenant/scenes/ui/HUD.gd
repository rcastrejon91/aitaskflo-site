extends CanvasLayer

@onready var hp_bar: ProgressBar = $Control/TopBar/HPBar
@onready var mp_bar: ProgressBar = $Control/TopBar/MPBar
@onready var hp_label: Label = $Control/TopBar/HPLabel
@onready var mp_label: Label = $Control/TopBar/MPLabel
@onready var level_label: Label = $Control/TopBar/LevelLabel
@onready var xp_bar: ProgressBar = $Control/TopBar/XPBar
@onready var gold_label: Label = $Control/BottomBar/GoldLabel
@onready var fragment_label: Label = $Control/BottomBar/FragmentLabel
@onready var quest_label: Label = $Control/QuestPanel/QuestLabel
@onready var dialogue_panel: PanelContainer = $Control/DialoguePanel
@onready var dialogue_speaker: Label = $Control/DialoguePanel/VBox/SpeakerLabel
@onready var dialogue_text: Label = $Control/DialoguePanel/VBox/TextLabel
@onready var notification_label: Label = $Control/NotificationLabel

var notification_timer: float = 0.0

func _ready() -> void:
	layer = 10
	GameManager.player_stats_changed.connect(_update_stats)
	GameManager.gold_changed.connect(_on_gold_changed)
	GameManager.xp_gained.connect(_on_xp_gained)
	GameManager.level_up.connect(_on_level_up)
	GameManager.quest_updated.connect(_on_quest_updated)
	DialogueManager.dialogue_started.connect(_on_dialogue_started)
	DialogueManager.dialogue_line_shown.connect(_on_dialogue_line_shown)
	DialogueManager.dialogue_ended.connect(_on_dialogue_ended)
	dialogue_panel.visible = false
	notification_label.visible = false
	_update_stats()
	_update_quests()

func _process(delta: float) -> void:
	if notification_timer > 0:
		notification_timer -= delta
		if notification_timer <= 0:
			notification_label.visible = false

func _unhandled_input(event: InputEvent) -> void:
	if DialogueManager.is_active:
		if event.is_action_pressed("interact") or event.is_action_pressed("attack"):
			DialogueManager.advance_dialogue()
			get_viewport().set_input_as_handled()

func _update_stats() -> void:
	var s = GameManager.stats
	hp_bar.max_value = s.max_hp
	hp_bar.value = s.hp
	mp_bar.max_value = s.max_mp
	mp_bar.value = s.mp
	hp_label.text = "HP: %d/%d" % [s.hp, s.max_hp]
	mp_label.text = "MP: %d/%d" % [s.mp, s.max_mp]
	level_label.text = "Lv.%d" % s.level
	xp_bar.max_value = GameManager.xp_for_level(s.level)
	xp_bar.value = s.xp
	gold_label.text = "Gold: %d" % s.gold
	fragment_label.text = "Fragments: %d/%d" % [GameManager.covenant_fragments_collected, GameManager.max_covenant_fragments]

func _on_gold_changed(_amount: int) -> void:
	_update_stats()

func _on_xp_gained(_amount: int) -> void:
	_update_stats()

func _on_level_up(new_level: int) -> void:
	_show_notification("Level Up! Now Level %d" % new_level)
	_update_stats()

func _on_quest_updated(_quest_id: String) -> void:
	_update_quests()

func _update_quests() -> void:
	if GameManager.active_quests.size() > 0:
		var text = "Active Quests:\n"
		for quest in GameManager.active_quests:
			text += "• " + quest.get("name", "Unknown") + "\n"
		quest_label.text = text
	else:
		quest_label.text = "No active quests"

func _on_dialogue_started() -> void:
	dialogue_panel.visible = true

func _on_dialogue_line_shown(speaker: String, text: String) -> void:
	dialogue_speaker.text = speaker
	dialogue_text.text = text

func _on_dialogue_ended() -> void:
	dialogue_panel.visible = false

func _show_notification(text: String, duration: float = 2.5) -> void:
	notification_label.text = text
	notification_label.visible = true
	notification_timer = duration
