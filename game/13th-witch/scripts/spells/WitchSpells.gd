extends Node

# WitchSpells.gd - Manages dark fantasy spells for The Covenant

signal spell_cast(spell_name)

var spells = {
    "HealingRitualPet": {
        description = "A mystical ritual to heal a familiar or pet, drawing from the coven\'s ancient lore.",
        effect = func(target):
            if target.health < target.max_health:
                var heal_amount = 20  # Base heal, modifiable by player level
                target.health += heal_amount
                print("Pet healed by " + str(heal_amount) + " points")
                emit_signal("spell_cast", "HealingRitualPet")
                # Add visual effects: particles and animation
                get_tree().create_timer(1.0).timeout.connect(func(): get_parent().add_child(Particles2D.new()))  # Simple particle burst
    },
    "DarkCovenantSpell": {
        description = "Summons shadows to bind enemies in the coven\'s mystery.",
        effect = func(target):
            target.is_stunned = true
            target.stun_timer.start(5.0)  # Stun for 5 seconds
            emit_signal("spell_cast", "DarkCovenantSpell")
    }
}

func cast_spell(spell_name, target):
    if spells.has(spell_name):
        spells[spell_name].effect.call_func(target)
    else:
        print("Spell not found")
