extends Node
class_name HealthComponent

signal health_changed(current_hp: int, max_hp: int)
signal died
signal damage_taken(amount: int)
signal healed(amount: int)

@export var max_hp: int = 100
var current_hp: int

func _ready() -> void:
	current_hp = max_hp

func take_damage(amount: int) -> int:
	var actual = min(amount, current_hp)
	current_hp = max(0, current_hp - amount)
	health_changed.emit(current_hp, max_hp)
	damage_taken.emit(actual)
	if current_hp <= 0:
		died.emit()
	return actual

func heal(amount: int) -> int:
	var actual = min(amount, max_hp - current_hp)
	current_hp = min(max_hp, current_hp + amount)
	health_changed.emit(current_hp, max_hp)
	healed.emit(actual)
	return actual

func get_hp_ratio() -> float:
	if max_hp <= 0:
		return 0.0
	return float(current_hp) / float(max_hp)

func is_alive() -> bool:
	return current_hp > 0

func set_max_hp(new_max: int) -> void:
	max_hp = new_max
	current_hp = min(current_hp, max_hp)
	health_changed.emit(current_hp, max_hp)
