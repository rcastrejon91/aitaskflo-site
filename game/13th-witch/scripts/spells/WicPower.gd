extends Node
class_name WicPower

## WicPower System — The 13th Witch
## Three core powers: Hex Blast (explosion), Soul Freeze, World Charm

enum SpellType { HEX_BLAST, SOUL_FREEZE, WORLD_CHARM }

# Mana / Wic Energy
var max_wic_energy: float = 100.0
var wic_energy: float = 100.0
var wic_regen_rate: float = 8.0  # per second

# Cooldowns
var hex_blast_cooldown: float = 0.0
var soul_freeze_cooldown: float = 0.0
var world_charm_cooldown: float = 0.0

const HEX_BLAST_CD: float = 2.0
const SOUL_FREEZE_CD: float = 5.0
const WORLD_CHARM_CD: float = 12.0

const HEX_BLAST_COST: float = 20.0
const SOUL_FREEZE_COST: float = 30.0
const WORLD_CHARM_COST: float = 50.0

signal wic_energy_changed(current: float, maximum: float)
signal spell_cast(spell_type: SpellType)
signal charm_activated()
signal charm_ended()

var charmed_world: bool = false
var charm_duration: float = 8.0
var charm_timer: float = 0.0

func _process(delta: float) -> void:
	# Regen wic energy
	if wic_energy < max_wic_energy:
		wic_energy = min(wic_energy + wic_regen_rate * delta, max_wic_energy)
		wic_energy_changed.emit(wic_energy, max_wic_energy)
	
	# Tick cooldowns
	hex_blast_cooldown = max(hex_blast_cooldown - delta, 0.0)
	soul_freeze_cooldown = max(soul_freeze_cooldown - delta, 0.0)
	world_charm_cooldown = max(world_charm_cooldown - delta, 0.0)
	
	# Charm timer
	if charmed_world:
		charm_timer -= delta
		if charm_timer <= 0.0:
			end_world_charm()

func can_cast(spell: SpellType) -> bool:
	match spell:
		SpellType.HEX_BLAST:
			return wic_energy >= HEX_BLAST_COST and hex_blast_cooldown <= 0.0
		SpellType.SOUL_FREEZE:
			return wic_energy >= SOUL_FREEZE_COST and soul_freeze_cooldown <= 0.0
		SpellType.WORLD_CHARM:
			return wic_energy >= WORLD_CHARM_COST and world_charm_cooldown <= 0.0
	return false

func cast_hex_blast(origin: Vector2, direction: Vector2) -> void:
	if not can_cast(SpellType.HEX_BLAST):
		return
	wic_energy -= HEX_BLAST_COST
	hex_blast_cooldown = HEX_BLAST_CD
	wic_energy_changed.emit(wic_energy, max_wic_energy)
	spell_cast.emit(SpellType.HEX_BLAST)

func cast_soul_freeze(origin: Vector2, radius: float) -> void:
	if not can_cast(SpellType.SOUL_FREEZE):
		return
	wic_energy -= SOUL_FREEZE_COST
	soul_freeze_cooldown = SOUL_FREEZE_CD
	wic_energy_changed.emit(wic_energy, max_wic_energy)
	spell_cast.emit(SpellType.SOUL_FREEZE)

func cast_world_charm() -> void:
	if not can_cast(SpellType.WORLD_CHARM):
		return
	wic_energy -= WORLD_CHARM_COST
	world_charm_cooldown = WORLD_CHARM_CD
	charmed_world = true
	charm_timer = charm_duration
	wic_energy_changed.emit(wic_energy, max_wic_energy)
	spell_cast.emit(SpellType.WORLD_CHARM)
	charm_activated.emit()

func end_world_charm() -> void:
	charmed_world = false
	charm_timer = 0.0
	charm_ended.emit()
