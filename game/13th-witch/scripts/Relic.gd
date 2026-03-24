extends Node2D

## Cursed relic - collect all 5 to escape the forest

@export var relic_name: String = "Cursed Relic"
@export var glow_color: Color = Color(0.8, 0.2, 0.2)

var is_collected: bool = false
var hover_offset: float = 0.0
var pulse_time: float = 0.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var glow: PointLight2D = $Glow
@onready var pickup_area: Area2D = $PickupArea
@onready var particles: GPUParticles2D = $Particles

func _ready() -> void:
	pickup_area.add_to_group("relics")
	glow.color = glow_color
	# Random phase so relics don't pulse in sync
	pulse_time = randf() * TAU

func _process(delta: float) -> void:
	if is_collected:
		return
	
	pulse_time += delta * 2.0
	hover_offset = sin(pulse_time) * 4.0
	sprite.position.y = hover_offset
	
	# Pulsing glow
	glow.energy = 0.5 + sin(pulse_time * 1.5) * 0.3
	
	# Flicker occasionally for creepy effect
	if randf() < 0.005:
		glow.energy = 0.0
		var tween = create_tween()
		tween.tween_property(glow, "energy", 0.5, 0.1)

func collect() -> void:
	if is_collected:
		return
	is_collected = true
	GameManager.collect_relic()
	
	# Collection effect
	var tween = create_tween()
	tween.tween_property(sprite, "scale", Vector2(2.0, 2.0), 0.3)
	tween.parallel().tween_property(sprite, "modulate:a", 0.0, 0.3)
	tween.parallel().tween_property(glow, "energy", 3.0, 0.15)
	tween.tween_property(glow, "energy", 0.0, 0.15)
	tween.tween_callback(queue_free)
