extends Node

signal spell_cast(spell_name: String)

var spells := {
	"HealingRitualPet": {
		"description": "A mystical ritual to heal a familiar or pet, drawing from the coven's ancient lore.",
		"effect": _heal_target,
	},
	"DarkCovenantSpell": {
		"description": "Summons shadows to bind enemies in the coven's mystery.",
		"effect": _stun_target,
	},
}

func cast_spell(spell_name: String, target: Node) -> void:
	if not spells.has(spell_name):
		print("Spell not found")
		return
	var effect: Callable = spells[spell_name]["effect"]
	effect.call(target)
	spell_cast.emit(spell_name)

func _heal_target(target: Node) -> void:
	if target == null:
		return
	if "health" in target and "max_health" in target:
		target.health = min(target.max_health, target.health + 20)

func _stun_target(target: Node) -> void:
	if target == null:
		return
	if "is_stunned" in target:
		target.is_stunned = true
	if "stun_timer" in target and target.stun_timer:
		target.stun_timer.start(5.0)
