extends CanvasLayer

@onready var health_bar: ProgressBar = $MarginContainer/VBoxContainer/TopBar/HealthBar
@onready var mp_bar: ProgressBar = $MarginContainer/VBoxContainer/TopBar/MPBar
@onready var health_label: Label = $MarginContainer/VBoxContainer/TopBar/HealthBar/HealthLabel
@onready var mp_label: Label = $MarginContainer/VBoxContainer/TopBar/MPBar/MPLabel
@onready var level_label: Label = $MarginContainer/VBoxContainer/TopBar/LevelLabel
@onready var xp_bar: ProgressBar = $MarginContainer/VBoxContainer/TopBar/XPBar
@onready var gold_label: Label = $MarginContainer/VBoxContainer/TopBar/GoldLabel
@onready var score_label: Label = $MarginContainer/VBoxContainer/BottomBar/ScoreLabel
@onready var time_label: Label = $MarginContainer/VBoxContainer/BottomBar/TimeLabel
@onready var artifact_label: Label = $MarginContainer/VBoxContainer/BottomBar/ArtifactLabel
@onready var time_freeze_bar: ProgressBar = $MarginContainer/VBoxContainer/TopBar/TimeFreezeBar
@onready var ability_hints: Label = $MarginContainer/VBoxContainer/BottomBar/AbilityHints
@onready var notification_label: Label = $NotificationLabel
@onready var dialogue_panel: PanelContainer = $DialoguePanel
@onready var dialogue_speaker: Label = $DialoguePanel/VBox/SpeakerLabel
@onready var dialogue_text: Label = $DialoguePanel/VBox/DialogueText

var notification_timer: float = 0.0

func _ready() -> void:
	GameManager.player_stats_changed.connect(_on_stats_changed)
	GameManager.gold_changed.connect(_on_gold_changed)
	GameManager.xp_changed.connect(_on_xp_changed)
	GameManager.level_up.connect(_on_level_up)
	GameManager.artifact_collected.connect(_on_artifact_collected)
	GameManager.time_frozen.connect(_on_time_frozen)
	GameManager.enemy_killed.connect(_on_enemy_killed)
	DialogueManager.dialogue_line.connect(_on_dialogue_line)
	DialogueManager.dialogue_ended.connect(_on_dialogue_ended)
	
	dialogue_panel.visible = false
	notification_label.visible = false
	_update_all()


func _process(_delta: float) -> void:
	_update_time()
	_update_time_freeze()
	
	if notification_timer > 0.0:
		notification_timer -= _delta
		if notification_timer <= 0.0:
			notification_label.visible = false


func _update_all() -> void:
	var stats := GameManager.player_stats
	health_bar.max_value = stats["max_hp"]
	health_bar.value = stats["hp"]
	health_label.text = str(int(stats["hp"])) + "/" + str(int(stats["max_hp"]))
	
	mp_bar.max_value = stats["max_mp"]
	mp_bar.value = stats["mp"]
	mp_label.text = str(int(stats["mp"])) + "/" + str(int(stats["max_mp"]))
	
	level_label.text = "Lv." + str(stats["level"])
	
	xp_bar.max_value = GameManager.xp_for_level(stats["level"])
	xp_bar.value = stats["xp"]
	
	gold_label.text = "Gold: " + str(GameManager.gold)
	score_label.text = "Score: " + str(GameManager.score)
	artifact_label.text = "Artifacts: " + str(GameManager.collected_artifacts.size())
	ability_hints.text = "[J] Attack  [K] Telekinesis  [L] Time Freeze  [Shift] Dash  [E] Interact"


func _update_time() -> void:
	var total_seconds := int(GameManager.play_time)
	var minutes := total_seconds / 60
	var seconds := total_seconds % 60
	time_label.text = "%02d:%02d" % [minutes, seconds]


func _update_time_freeze() -> void:
	if GameManager.is_time_frozen:
		time_freeze_bar.visible = true
		time_freeze_bar.max_value = GameManager.time_freeze_duration
		time_freeze_bar.value = GameManager.time_freeze_timer
	elif not GameManager.can_time_freeze:
		time_freeze_bar.visible = true
		time_freeze_bar.max_value = GameManager.time_freeze_cooldown
		time_freeze_bar.value = GameManager.time_freeze_cooldown - GameManager.time_freeze_cooldown_timer
	else:
		time_freeze_bar.visible = true
		time_freeze_bar.max_value = 1.0
		time_freeze_bar.value = 1.0


func _on_stats_changed(stats: Dictionary) -> void:
	health_bar.max_value = stats["max_hp"]
	health_bar.value = stats["hp"]
	health_label.text = str(int(stats["hp"])) + "/" + str(int(stats["max_hp"]))
	mp_bar.max_value = stats["max_mp"]
	mp_bar.value = stats["mp"]
	mp_label.text = str(int(stats["mp"])) + "/" + str(int(stats["max_mp"]))


func _on_gold_changed(amount: int) -> void:
	gold_label.text = "Gold: " + str(amount)


func _on_xp_changed(xp: int, xp_needed: int) -> void:
	xp_bar.max_value = xp_needed
	xp_bar.value = xp


func _on_level_up(new_level: int) -> void:
	level_label.text = "Lv." + str(new_level)
	_show_notification("LEVEL UP! Now level " + str(new_level))


func _on_artifact_collected(artifact_id: String) -> void:
	artifact_label.text = "Artifacts: " + str(GameManager.collected_artifacts.size())
	_show_notification("Artifact Found: " + artifact_id)


func _on_time_frozen(is_frozen: bool) -> void:
	if is_frozen:
		_show_notification("TIME FROZEN")


func _on_enemy_killed(enemy_name: String) -> void:
	score_label.text = "Score: " + str(GameManager.score)


func _on_dialogue_line(speaker: String, text: String) -> void:
	dialogue_panel.visible = true
	dialogue_speaker.text = speaker
	dialogue_text.text = text


func _on_dialogue_ended() -> void:
	dialogue_panel.visible = false


func _show_notification(text: String) -> void:
	notification_label.text = text
	notification_label.visible = true
	notification_timer = 3.0
	var tween := create_tween()
	tween.tween_property(notification_label, "modulate:a", 1.0, 0.2)
	tween.tween_interval(2.0)
	tween.tween_property(notification_label, "modulate:a", 0.0, 0.8)
