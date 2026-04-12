extends Area2D

enum PickupType { HEALTH_POTION, MANA_POTION, GOLD, COVENANT_FRAGMENT, XP_ORB }

@export var pickup_type: PickupType = PickupType.HEALTH_POTION
@export var value: int = 30
@export var float_amplitude: float = 3.0
@export var float_speed: float = 2.0

var base_y: float = 0.0
var time_alive: float = 0.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var label: Label = $Label

func _ready() -> void:
	add_to_group("pickups")
	collision_layer = 8  # layer 4 pickups
	collision_mask = 2   # layer 2 player
	base_y = position.y
	body_entered.connect(_on_body_entered)
	_setup_visual()

func _process(delta: float) -> void:
	time_alive += delta
	position.y = base_y + sin(time_alive * float_speed) * float_amplitude

func _setup_visual() -> void:
	match pickup_type:
		PickupType.HEALTH_POTION:
			sprite.modulate = Color(0.9, 0.2, 0.2)
			label.text = "HP"
		PickupType.MANA_POTION:
			sprite.modulate = Color(0.2, 0.3, 0.9)
			label.text = "MP"
		PickupType.GOLD:
			sprite.modulate = Color(1.0, 0.85, 0.0)
			label.text = "$"
		PickupType.COVENANT_FRAGMENT:
			sprite.modulate = Color(0.8, 0.0, 1.0)
			label.text = "✦"
		PickupType.XP_ORB:
			sprite.modulate = Color(0.0, 1.0, 0.5)
			label.text = "XP"

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		_apply_pickup()
		_spawn_pickup_text()
		queue_free()

func _apply_pickup() -> void:
	match pickup_type:
		PickupType.HEALTH_POTION:
			GameManager.heal(value)
		PickupType.MANA_POTION:
			GameManager.restore_mp(value)
		PickupType.GOLD:
			GameManager.add_gold(value)
		PickupType.COVENANT_FRAGMENT:
			GameManager.collect_covenant_fragment()
			if not GameManager.lore_flags.found_first_fragment:
				GameManager.lore_flags.found_first_fragment = true
				DialogueManager.start_dialogue("fragment_found")
		PickupType.XP_ORB:
			GameManager.add_xp(value)

func _spawn_pickup_text() -> void:
	var popup = Label.new()
	popup.text = _get_pickup_text()
	popup.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	popup.global_position = global_position + Vector2(-20, -20)
	popup.add_theme_font_size_override("font_size", 12)
	match pickup_type:
		PickupType.HEALTH_POTION:
			popup.modulate = Color(0.2, 1.0, 0.2)
		PickupType.MANA_POTION:
			popup.modulate = Color(0.3, 0.5, 1.0)
		PickupType.GOLD:
			popup.modulate = Color(1.0, 0.9, 0.0)
		PickupType.COVENANT_FRAGMENT:
			popup.modulate = Color(0.9, 0.0, 1.0)
		PickupType.XP_ORB:
			popup.modulate = Color(0.0, 1.0, 0.5)
	get_parent().add_child(popup)
	var tween = popup.create_tween()
	tween.tween_property(popup, "position:y", popup.position.y - 30, 0.6)
	tween.parallel().tween_property(popup, "modulate:a", 0.0, 0.6)
	tween.tween_callback(popup.queue_free)

func _get_pickup_text() -> String:
	match pickup_type:
		PickupType.HEALTH_POTION:
			return "+%d HP" % value
		PickupType.MANA_POTION:
			return "+%d MP" % value
		PickupType.GOLD:
			return "+%d Gold" % value
		PickupType.COVENANT_FRAGMENT:
			return "Fragment Found!"
		PickupType.XP_ORB:
			return "+%d XP" % value
	return ""
