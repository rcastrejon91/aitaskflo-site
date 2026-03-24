extends Node

## EventBus — global signal hub for The 13th Witch
## Autoloaded singleton. Any node can emit or listen.

# Combat
signal player_hit(damage: float)
signal enemy_hit(enemy: Node, damage: float)
signal enemy_killed()
signal enemy_frozen(enemy: Node, duration: float)
signal enemy_charmed(enemy: Node, duration: float)
signal combo_triggered(combo_name: String, bonus_damage: float)

# Health & Resources
signal health_changed(current: float, maximum: float)
signal wic_changed(current: float, maximum: float)

# Spells
signal spell_cast(spell_name: String)
signal spell_switched(index: int)
signal hex_blast_detonated(position: Vector2, radius: float)
signal soul_freeze_pulse(position: Vector2, radius: float)
signal world_charm_activated()
signal world_charm_ended()

# Relics & Progression
signal relic_collected(relic_name: String, total: int)
signal all_relics_collected()
signal wave_started(wave_number: int)
signal wave_cleared(wave_number: int)

# Atmosphere
signal screen_shake(intensity: float, duration: float)
signal witch_nearby(distance: float)
signal witch_vanished()
signal whisper(text: String)
signal darkness_pulse()
signal fog_shift(intensity: float)
signal lightning_flash()

# Game State
signal game_over()
signal game_won()
signal dialogue_started()
signal dialogue_ended()
signal pause_requested()
signal unpause_requested()

# Environment
signal destructible_broken(position: Vector2)
signal torch_lit(position: Vector2)
signal trap_triggered(position: Vector2, trap_type: String)
