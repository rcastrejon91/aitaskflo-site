extends CanvasLayer

## HUD — Health bar, Wic energy bar, relic counter, spell indicator, and boss health

@onready var health_bar: ProgressBar = %HealthBar
@onready var wic_bar: ProgressBar = %WicBar
@onready var relic_label: Label = %RelicLabel
@onready var spell_label: Label = %SpellLabel
@onready var damage_vignette: ColorRect = %DamageVignette
@onready var boss_bar: ProgressBar = %BossHealthBar
@onready var boss_name_label: Label = %BossNameLabel

var spell_names: Array[String] = ["Hex Blast", "Soul Freeze", "World Charm"]
var current_spell_index: int = 0
var vignette_alpha: float = 0.0

func _ready() -> void:
	EventBus.health_changed.connect(_on_health_changed)
	EventBus.relic_collected.connect(_on_relic_collected)
	EventBus.wic_changed.connect(_on_wic_changed)
	EventBus.enemy_killed.connect(_on_enemy_killed)
	EventBus.spell_switched.connect(_on_spell_switched)

	health_bar.max_value = 100
	health_bar.value = 100
	wic_bar.max_value = 100
	wic_bar.value = 100
	relic_label.text = "Relics: 0 / 5"
	spell_label.text = "[ Hex Blast ]"
	boss_bar.visible = false
	boss_name_label.visible = false
	damage_vignette.modulate.a = 0.0

func _process(delta: float) -> void:
	if vignette_alpha > 0.0:
		vignette_alpha = max(vignette_alpha - delta * 2.0, 0.0)
		damage_vignette.modulate.a = vignette_alpha

func _on_health_changed(current: float, maximum: float) -> void:
	health_bar.max_value = maximum
	health_bar.value = current
	if current < health_bar.value:
		vignette_alpha = 0.6
		damage_vignette.modulate.a = vignette_alpha

func _on_wic_changed(current: float, maximum: float) -> void:
	wic_bar.max_value = maximum
	wic_bar.value = current

func _on_relic_collected(relic_name: String, total: int) -> void:
	relic_label.text = "Relics: %d / 5" % total

func _on_enemy_killed() -> void:
	pass

func _on_spell_switched(index: int) -> void:
	current_spell_index = index
	if index >= 0 and index < spell_names.size():
		spell_label.text = "[ %s ]" % spell_names[index]

func show_boss_bar(boss_name: String, max_hp: float) -> void:
	boss_bar.visible = true
	boss_name_label.visible = true
	boss_name_label.text = boss_name
	boss_bar.max_value = max_hp
	boss_bar.value = max_hp

func update_boss_bar(current_hp: float) -> void:
	boss_bar.value = current_hp
	if current_hp <= 0.0:
		boss_bar.visible = false
		boss_name_label.visible = false
