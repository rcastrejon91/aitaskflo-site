# The Covenant II: Shattered Realm — Game Design Document

## Overview
A dark fantasy 2D RPG set in a fractured world torn apart by the events of The Covenant. The player is a Voidwalker — a cursed survivor gifted with enhanced telekinesis and the ability to freeze time. They must traverse the shattered realm, recover six ancient Seal Artifacts, and defeat the Guardian of each shard to restore reality before the Void consumes everything.

---

## Core Game Loop

1. **Explore** — Navigate interconnected zones of the shattered realm (overworld, dungeons, ruins).
2. **Fight** — Engage enemies in turn-based combat using physical attacks, telekinesis abilities, and time-freeze powers.
3. **Loot & Upgrade** — Collect items, equipment, gold, and XP from battles and exploration.
4. **Discover Artifacts** — Find hidden Seal Artifacts in each zone, guarded by powerful bosses.
5. **Progress** — Level up stats, unlock new abilities, complete quests, and push deeper into the realm.
6. **Return & Restore** — Bring Seal Artifacts back to the Nexus hub to unlock new zones and story progression.

Loop repeats across 6 zones, culminating in the final confrontation at the Void Core.

---

## Player Stats & Controls

### Stats
```
var stats = {
    "str": 10,      # Physical damage modifier
    "dex": 10,      # Speed/evasion, turn order
    "int": 14,      # Telekinesis & time-freeze power
    "vit": 10,      # HP scaling
    "hp": 120,      # Current health
    "max_hp": 120,  # Maximum health
    "mp": 80,       # Mana for abilities
    "max_mp": 80,   # Maximum mana
    "level": 1,
    "xp": 0,
    "gold": 0
}
```

### Controls (Overworld)
| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| E | Interact (NPC, chest, door) |
| Space | Telekinesis Push (overworld puzzle solver) |
| Shift | Time Freeze (slows overworld enemies for 3 seconds) |
| I | Open Inventory |
| Q | Open Quest Log |
| ESC | Pause / Menu |

### Controls (Battle — Turn-Based)
| Key / Click | Action |
|-------------|--------|
| Mouse Click | Select menu option |
| 1 | Attack |
| 2 | Telekinesis (MP cost) |
| 3 | Time Freeze (MP cost) |
| 4 | Item |
| 5 | Defend |

### Abilities
- **Telekinesis Strike** — 15 MP. Deals INT-based damage, ignores 30% armor. Can hit back row.
- **Telekinetic Crush** — 30 MP. AOE INT-based damage to all enemies. Unlocked at level 5.
- **Time Freeze** — 25 MP. Freezes one enemy for 2 turns (skip their turn). Unlocked at level 3.
- **Temporal Shatter** — 50 MP. Freezes all enemies 1 turn + deals massive INT damage. Unlocked at level 10.
- **Void Shield** — 20 MP. Absorbs next hit up to INT×3 damage. Unlocked at level 7.

### XP & Leveling
```
func xp_for_level(lvl): return int(100 * pow(lvl, 1.5))
```
Each level grants: +12 HP, +6 MP, +2 to distribute among STR/DEX/INT/VIT.

---

## Enemy Types & Behaviors

### Zone 1 — Ashen Wastes
| Enemy | HP | Behavior |
|-------|----|----------|
| **Hollow Shade** | 40 | Basic melee. Attacks each turn. Low damage. |
| **Cinder Wraith** | 55 | Ranged fire attack. 20% chance to inflict burn (3 dmg/turn for 3 turns). |
| **Ashen Guardian** (Boss) | 300 | Phase 1: Melee + fire AOE. Phase 2 (<50% HP): Enrages, double attack speed. Drops Seal Artifact #1. |

### Zone 2 — Drowned Cathedral
| Enemy | HP | Behavior |
|-------|----|----------|
| **Bloated Revenant** | 70 | Slow but hits hard. Poisons on hit (4 dmg/turn, 2 turns). |
| **Siren Phantom** | 50 | Casts confusion (50% chance target attacks self). Fragile. |
| **Tide Warden** (Boss) | 450 | Summons 2 Revenants. Heals 30 HP/turn if minions alive. Tidal wave AOE every 3 turns. Drops Seal Artifact #2. |

### Zone 3 — Clockwork Ruins
| Enemy | HP | Behavior |
|-------|----|----------|
| **Rusted Automaton** | 90 | High armor, low speed. Charges for 1 turn, then heavy slam. |
| **Chrono Tick** | 35 | Fast. Steals 5 MP on hit. Attacks twice per turn. |
| **The Timekeeper** (Boss) | 600 | Reverses time (heals to previous turn HP) every 4 turns. Time-freeze immune. Spawns Chrono Ticks. Drops Seal Artifact #3. |

### Zone 4 — Crimson Hollow
| Enemy | HP | Behavior |
|-------|----|----------|
| **Blood Stalker** | 80 | Lifesteal melee (heals 50% of damage dealt). |
| **Gore Mage** | 60 | Buffs allies (+25% damage). Casts blood bolt. |
| **The Scarlet Matriarch** (Boss) | 750 | Drains HP from party each turn. Spawns Blood Stalkers. Immune to time-freeze until spawns are killed. Drops Seal Artifact #4. |

### Zone 5 — The Void Margins
| Enemy | HP | Behavior |
|-------|----|----------|
| **Void Tendril** | 100 | Grapples (stun 1 turn) then deals damage. |
| **Null Specter** | 70 | Reduces target's MP by 15 on hit. Teleports (50% evasion). |
| **Oblivion Sentinel** (Boss) | 900 | Nullifies one ability type per phase. 3 phases. Massive single-target attacks. Drops Seal Artifact #5. |

### Zone 6 — The Nexus Core (Final)
| Enemy | HP | Behavior |
|-------|----|----------|
| **Covenant Fragment** | 120 | Copies one of the player's abilities. |
| **The Shattered One** (Final Boss) | 1200 | 4 phases. Uses all previous boss mechanics. Time-freeze only works in phase 3. Must use all 5 Seal Artifacts to break shield in phase 4. Drops Seal Artifact #6 (ending trigger). |

---

## Items & Equipment

### Consumables
- **Health Potion** — Restores 50 HP. Cost: 25 gold.
- **Mana Elixir** — Restores 30 MP. Cost: 30 gold.
- **Antidote** — Cures poison/burn. Cost: 15 gold.
- **Void Shard** — Restores 100 HP + 50 MP. Rare drop.
- **Phoenix Dust** — Revives from KO with 50% HP. Cost: 200 gold.

### Equipment Slots: Weapon, Armor, Accessory
- **Weapons**: Void Blade (+8 STR), Mindlash Staff (+10 INT), Shadow Dagger (+6 STR, +4 DEX)
- **Armor**: Leather Cloak (+10 HP), Warden Plate (+25 HP, -2 DEX), Chrono Vest (+15 HP, +5 MP)
- **Accessories**: Focus Ring (+5 INT), Speed Charm (+5 DEX), Vitality Pendant (+20 HP)

---

## Quest System

### Main Quests
1. "Awaken in the Wastes" — Tutorial, reach the Nexus hub.
2. "The Six Seals" — Recover all 6 Seal Artifacts from each zone.
3. "Confront the Shattered One" — Final boss after all seals collected.

### Side Quests (examples)
- "Lost Souls" — Find 5 wandering spirits across zones. Reward: Void Shard ×3.
- "The Merchant's Plea" — Clear enemies from trade route. Reward: 500 gold.
- "Chrono Anomaly" — Solve time puzzle in Clockwork Ruins. Reward: Chrono Vest.
- "Blood Tithe" — Defeat 10 Blood Stalkers. Reward: Lifesteal Ring accessory.

---

## Win/Lose Conditions

### Win Condition
- Collect all 6 Seal Artifacts and defeat The Shattered One in the Void Core.
- Ending cinematic plays, save file marked as "completed," New Game+ unlocked (enemies +50% HP, player keeps level/equipment).

### Lose Condition
- Player HP reaches 0 in combat → "You have fallen" screen.
- Options: "Load Last Save" or "Return to Title."
- No permadeath; player can retry from last save point (auto-save at zone transitions and Nexus hub).

### Game Over Prevention
- Auto-save at every zone transition and when interacting with Nexus Obelisk.
- 3 save slots available from the save menu.

---

## Complete File List

### Project Configuration
- `project.godot` — Project settings, autoloads, input map

### Autoloads (Singletons)
- `scripts/autoloads/game_manager.gd` — Global game state, zone tracking, artifact count, scene transitions
- `scripts/autoloads/audio_manager.gd` — Music and SFX playback, crossfade between zones
- `scripts/autoloads/save_manager.gd` — Save/load to 3 slots, auto-save logic
- `scripts/autoloads/dialogue_manager.gd` — Dialogue tree processing, signal-driven UI updates
- `scripts/autoloads/quest_manager.gd` — Active/completed quest tracking, quest signals

### Resources
- `resources/items/health_potion.tres` — Item resource: Health Potion
- `resources/items/mana_elixir.tres` — Item resource: Mana Elixir
- `resources/items/antidote.tres` — Item resource: Antidote
- `resources/items/void_shard.tres` — Item resource: Void Shard
- `resources/items/phoenix_dust.tres` — Item resource: Phoenix Dust
- `resources/equipment/void_blade.tres` — Weapon resource
- `resources/equipment/mindlash_staff.tres` — Weapon resource
- `resources/equipment/shadow_dagger.tres` — Weapon resource
- `resources/equipment/leather_cloak.tres` — Armor resource
- `resources/equipment/warden_plate.tres` — Armor resource
- `resources/equipment/chrono_vest.tres` — Armor resource
- `resources/equipment/focus_ring.tres` — Accessory resource
- `resources/equipment/speed_charm.tres` — Accessory resource
- `resources/equipment/vitality_pendant.tres` — Accessory resource
- `resources/quests/awaken_in_wastes.tres` — Quest resource
- `resources/quests/the_six_seals.tres` — Quest resource
- `resources/quests/confront_shattered.tres` — Quest resource
- `resources/quests/lost_souls.tres` — Side quest resource
- `resources/quests/merchants_plea.tres` — Side quest resource
- `scripts/resources/item_resource.gd` — Custom Resource script for items
- `scripts/resources/equipment_resource.gd` — Custom Resource script for equipment
- `scripts/resources/quest_resource.gd` — Custom Resource script for quests
- `scripts/resources/enemy_resource.gd` — Custom Resource script for enemy data
- `scripts/resources/ability_resource.gd` — Custom Resource script for abilities

### Scenes — Menus & UI
- `scenes/ui/title_screen.tscn` — Main menu scene
- `scenes/ui/title_screen.gd` — Title menu logic (New Game, Continue, Quit)
- `scenes/ui/hud.tscn` — In-game HUD (HP/MP bars, minimap, ability cooldowns)
- `scenes/ui/hud.gd` — HUD update logic
- `scenes/ui/pause_menu.tscn` — Pause menu overlay
- `scenes/ui/pause_menu.gd` — Pause/resume, save, quit to title
- `scenes/ui/inventory_screen.tscn` — Inventory and equipment UI
- `scenes/ui/inventory_screen.gd` — Item use, equip/unequip logic
- `scenes/ui/quest_log.tscn` — Quest log display
- `scenes/ui/quest_log.gd` — Quest list rendering
- `scenes/ui/dialogue_box.tscn` — Dialogue popup box
- `scenes/ui/dialogue_box.gd` — Text display, choice selection
- `scenes/ui/shop_screen.tscn` — Shop UI
- `scenes/ui/shop_screen.gd` — Buy/sell logic
- `scenes/ui/game_over_screen.tscn` — Game over / death screen
- `scenes/ui/game_over_screen.gd` — Load save or return to title
- `scenes/ui/level_up_screen.tscn` — Level up stat allocation
- `scenes/ui/level_up_screen.gd` — Stat point distribution
- `scenes/ui/victory_screen.tscn` — End game victory cinematic
- `scenes/ui/victory_screen.gd` — Credits and New Game+ option

### Scenes — Battle System
- `scenes/battle/battle_scene.tscn` — Turn-based battle arena
- `scenes/battle/battle_scene.gd` — Battle flow controller (turn queue, win/lose checks)
- `scenes/battle/battle_hud.tscn` — Battle-specific UI (action menu, enemy HP, turn order)
- `scenes/battle/battle_hud.gd` — Battle UI updates
- `scenes/battle/battle_action_menu.tscn` — Action selection (Attack, Telekinesis, Time Freeze, Item, Defend)
- `scenes/battle/battle_action_menu.gd` — Menu input handling
- `scenes/battle/player_battle_sprite.tscn` — Player representation in battle
- `scenes/battle/player_battle_sprite.gd` — Player battle animations
- `scenes/battle/enemy_battle_sprite.tscn` — Enemy representation in battle
- `scenes/battle/enemy_battle_sprite.gd` — Enemy battle animations and AI

### Scenes — Player
- `scenes/player/player.tscn` — Player CharacterBody2D scene
- `scenes/player/player.gd` — Movement, interaction, overworld abilities
- `scenes/player/player_camera.gd` — Camera follow, screen shake, zone bounds

### Scenes — Components (Reusable)
- `scenes/components/health_component.tscn` — Health tracking node
- `scenes/components/health_component.gd` — HP logic, signals: health_changed, died
- `scenes/components/hitbox_component.tscn` — Damage-dealing Area2D
- `scenes/components/hitbox_component.gd` — Damage application on area_entered
- `scenes/components/hurtbox_component.tscn` — Damage-receiving Area2D
- `scenes/components/hurtbox_component.gd` — Invincibility frames, hit registration
- `scenes/components/interaction_area.tscn` — Interaction detection Area2D
- `scenes/components/interaction_area.gd` — Nearest interactable tracking

### Scenes — Enemies (Overworld)
- `scenes/enemies/base_enemy.tscn` — Base enemy CharacterBody2D
- `scenes/enemies/base_enemy.gd` — Patrol, chase, battle trigger
- `scenes/enemies/hollow_shade.tscn` — Zone 1 enemy variant
- `scenes/enemies/cinder_wraith.tscn` — Zone 1 ranged enemy variant
- `scenes/enemies/bloated_revenant.tscn` — Zone 2 enemy variant
- `scenes/enemies/siren_phantom.tscn` — Zone 2 enemy variant
- `scenes/enemies/rusted_automaton.tscn` — Zone 3 enemy variant
- `scenes/enemies/chrono_tick.tscn` — Zone 3 enemy variant

### Scenes — NPCs
- `scenes/npcs/base_npc.tscn` — Base NPC scene
- `scenes/npcs/base_npc.gd` — Dialogue trigger, quest giver logic
- `scenes/npcs/shop_keeper.tscn` — Shop NPC
- `scenes/npcs/shop_keeper.gd` — Opens shop UI with item list
- `scenes/npcs/nexus_obelisk.tscn` — Save point / hub interactable
- `scenes/npcs/nexus_obelisk.gd` — Save + heal on interaction

### Scenes — Zones (Maps)
- `scenes/zones/nexus_hub.tscn` — Central hub zone (safe area, shops, save, quest NPCs)
- `scenes/zones/nexus_hub.gd` — Hub logic, portal activation based on artifacts
- `scenes/zones/ashen_wastes.tscn` — Zone 1 map
- `scenes/zones/ashen_wastes.gd` — Zone 1 enemy spawns, chest placements, boss trigger
- `scenes/zones/drowned_cathedral.tscn` — Zone 2 map
- `scenes/zones/drowned_cathedral.gd` — Zone 2 logic
- `scenes/zones/clockwork_ruins.tscn` — Zone 3 map
- `scenes/zones/clockwork_ruins.gd` — Zone 3 time-puzzle logic
- `scenes/zones/boss_arena.tscn` — Generic boss arena (reused per zone)
- `scenes/zones/boss_arena.gd` — Boss intro, lock doors, victory unlock

### Scenes — Interactables
- `scenes/interactables/chest.tscn` — Lootable chest
- `scenes/interactables/chest.gd` — Open animation, grant item, mark opened in save
- `scenes/interactables/door.tscn` — Zone transition door
- `scenes/interactables/door.gd` — Scene change trigger
- `scenes/interactables/collectible_pickup.tscn` — Overworld item pickup (uses collectible.png)
- `scenes/interactables/collectible_pickup.gd` — Add to inventory on interact
- `scenes/interactables/seal_artifact.tscn` — Seal Artifact pickup (special collectible)
- `scenes/interactables/seal_artifact.gd` — Artifact collection, quest update, visual effect

### Scripts — Battle Logic
- `scripts/battle/battle_manager.gd` — Turn queue, action resolution, damage formulas
- `scripts/battle/enemy_ai.gd` — Enemy decision-making per enemy type
- `scripts/battle/status_effect_handler.gd` — Apply/tick/remove status effects (burn, poison, stun, confusion)
- `scripts/battle/ability_handler.gd` — Execute player abilities (telekinesis, time-freeze, etc.)
- `scripts/battle/damage_calculator.gd` — Centralized damage formula with armor, buffs, variance

### Scripts — Utility
- `scripts/utils/scene_transition.gd` — Fade-in/fade-out scene changes
- `scripts/utils/floating_text.gd` — Damage numbers, healing numbers popup
- `scripts/utils/floating_text.tscn` — Floating text scene

### Assets (Sprites — using available)
- `assets/sprites/collectible.png` — Used for pickups, artifacts, chest sparkle

---

## Architecture Diagram

```
GameManager (autoload)
├── Tracks: current_zone, artifacts_collected, player_stats, inventory, equipment
├── Signals: zone_changed, artifact_collected, game_saved, game_loaded
│
AudioManager (autoload)
├── play_music(stream), play_sfx(stream), crossfade(new_stream)
│
SaveManager (autoload)
├── save_game(slot), load_game(slot), auto_save()
├── Serializes: player stats, inventory, equipment, quest state, opened chests, zone
│
DialogueManager (autoload)
├── start_dialogue(dialogue_resource), advance(), select_choice(idx)
├── Signals: dialogue_started, dialogue_line(text, speaker), dialogue_ended, choice_presented
│
QuestManager (autoload)
├── active_quests, completed_quests
├── start_quest(id), update_quest(id, progress), complete_quest(id)
├── Signals: quest_started, quest_updated, quest_completed
```

---

## Turn-Based Battle Flow

1. **Encounter Trigger** — Player touches enemy on overworld → transition to `battle_scene.tscn`.
2. **Initiative** — Build turn queue sorted by DEX stat (highest first). Ties broken randomly.
3. **Player Turn** — Show action menu: Attack, Telekinesis, Time Freeze, Item, Defend.
4. **Action Resolution** — Execute chosen action, apply damage/effects, show floating text.
5. **Enemy Turn** — AI selects action based on `enemy_ai.gd` behavior patterns.
6. **Status Effects** — Tick all active effects (burn damage, poison, frozen skip, etc.).
7. **Win Check** — All enemies HP ≤ 0 → Victory: grant XP, gold, item drops. Check level up.
8. **Lose Check** — Player HP ≤ 0 → Game Over screen.
9. **Repeat** from step 3 until win or lose.

---

## Damage Formula

```gdscript
# Physical attack
var dmg = int(base_damage * (1 + (stats.str - 10) * 0.05) * randf_range(0.9, 1.1))
dmg = max(1, dmg - target_armor)

# Telekinesis attack (ignores 30% armor)
var tk_dmg = int(base_power * (1 + (stats.int - 10) * 0.07) * randf_range(0.9, 1.1))
tk_dmg = max(1, tk_dmg - int(target_armor * 0.7))

# Time Freeze
# No damage, applies "frozen" status: duration = 2 turns, target skips turns
```

---

## Status Effects

| Effect | Damage/Turn | Duration | Source |
|--------|-------------|----------|--------|
| Burn | 3 | 3 turns | Cinder Wraith |
| Poison | 4 | 2 turns | Bloated Revenant |
| Frozen | Skip turn | 2 turns | Player Time Freeze |
| Confusion | 50% self-hit | 2 turns | Siren Phantom |
| Enraged | +50% dmg dealt | Until battle end | Boss phase 2 |
| Void Shield | Absorb next hit | 1 hit | Player ability |
| MP Drain | -5 MP/turn | 2 turns | Chrono Tick |

---

## Zones & Progression

```
Title Screen → Nexus Hub (tutorial) → Ashen Wastes → Nexus Hub
                                     → Drowned Cathedral → Nexus Hub  
                                     → Clockwork Ruins → Nexus Hub
                                     → Crimson Hollow → Nexus Hub
                                     → Void Margins → Nexus Hub
                                     → Nexus Core (Final) → Victory
```

Zones unlock sequentially: each Seal Artifact opens the next portal in the Nexus Hub.

---

## Save System

- 3 manual save slots + 1 auto-save slot
- Auto-save triggers: zone transition, obelisk interaction, after boss defeat
- Saved data: player stats, level, XP, gold, inventory, equipment, quest progress, artifacts collected, opened chests (by ID), current zone
- Format: JSON dictionary written via FileAccess

---

## Audio Design (Placeholder Approach)

- Procedurally generated beeps/tones for SFX using AudioStreamGenerator or minimal .wav files
- Background ambience per zone (dark drone for Wastes, water echo for Cathedral, mechanical clicks for Ruins)
- Battle music: faster tempo loop
- Boss music: intensified variant
- All managed through AudioManager autoload with crossfade support
