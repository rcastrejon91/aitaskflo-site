extends Node
class_name HealthComponent

signal health_changed(current_hp: float, max_hp: float)
signal died()
signal damage_taken(amount: float)
signal healed(amount: float)

@export var max_health: float = 100.0
var current_health: float
var is_dead: bool = false

func _ready() -> void:
	current_health = max_health
	health_changed.emit(current_health, max_health)


func take_damage(amount: float) -> void:
	if is_dead:
		return
	var actual_damage := max(amount, 0.0)
	current_health = max(current_health - actual_damage, 0.0)
	damage_taken.emit(actual_damage)
	health_changed.emit(current_health, max_health)
	if current_health <= 0.0:
		is_dead = true
		died.emit()


func heal(amount: float) -> void:
	if is_dead:
		return
	var actual_heal := min(amount, max_health - current_health)
	current_health = min(current_health + actual_heal, max_health)
	healed.emit(actual_heal)
	health_changed.emit(current_health, max_health)


func set_max_health(new_max: float) -> void:
	max_health = new_max
	current_health = min(current_health, max_health)
	health_changed.emit(current_health, max_health)


func get_health_percent() -> float:
	if max_health <= 0:
		return 0.0
	return current_health / max_health
