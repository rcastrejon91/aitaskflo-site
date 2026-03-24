extends Camera2D

## PlayerCamera — Smooth follow with screen shake and zone transitions

@export var follow_speed: float = 5.0
@export var shake_decay: float = 5.0
@export var max_shake_offset: float = 16.0

var shake_intensity: float = 0.0
var target: Node2D = null

func _ready() -> void:
	EventBus.screen_shake.connect(_on_screen_shake)
	make_current()
	position_smoothing_enabled = true
	position_smoothing_speed = follow_speed

func _process(delta: float) -> void:
	if shake_intensity > 0.0:
		offset = Vector2(
			randf_range(-1.0, 1.0) * shake_intensity * max_shake_offset,
			randf_range(-1.0, 1.0) * shake_intensity * max_shake_offset
		)
		shake_intensity = max(shake_intensity - shake_decay * delta, 0.0)
	else:
		offset = Vector2.ZERO

func _on_screen_shake(intensity: float, _duration: float) -> void:
	shake_intensity = max(shake_intensity, intensity)
