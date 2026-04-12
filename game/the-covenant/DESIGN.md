# The Covenant — Dark Fantasy RPG — Game Design Document

---

## 1. CONCEPT

A dark fantasy RPG where the player takes on the role of a young Seeker who discovers an ancient, forbidden Covenant — a pact between mortals and eldritch powers. The player must explore cursed lands, unravel mysteries of long-dead sorcerers, master a dangerous magic system fueled by pact-bonds, and decide whether to uphold, rewrite, or shatter The Covenant. Every choice carries weight; every spell demands a price.

---

## 2. CORE GAME LOOP

1. **Explore** — Navigate dark, hand-crafted 2D maps (ruined temples, haunted forests, cursed villages, an underground sanctum).
2. **Discover** — Find lore fragments, NPC dialogue, and hidden passages that reveal the mystery of The Covenant.
3. **Fight** — Engage in turn-based combat against corrupted creatures, cultists, and covenant-bound entities.
4. **Grow** — Earn XP, level up stats, learn new Pact Spells, acquire equipment and items.
5. **Decide** — Make dialogue choices and quest decisions that shift the player's Covenant Alignment (Upholder / Breaker / Rewriter), affecting the ending.
6. **Return** — Use the Hub (Thornhaven village) to rest, shop, manage quests, and prepare for the next expedition.

---

## 3. PLAYER CHARACTER — "The Seeker"

### Controls (Overworld)
| Input | Action |
|---|---|
| WASD / Arrow Keys | Move (8-directional) |
| E / Enter | Interact / Talk |
| I | Open Inventory |
| Escape | Pause Menu |
| Tab | Quest Journal |

### Base Stats (Level 1)
```
var stats = {
    "str": 10,    # Physical attack power
    "dex": 10,    # Speed / evasion / crit chance
    "int": 14,    # Magic power & MP pool scaling
    "vit": 10,    # HP scaling & defense
    "wil": 12,    # Resistance to corruption & status effects
    "hp": 120,
    "max_hp": 120,
    "mp": 80,
    "max_mp": 80,
    "level": 1,
    "xp": 0,
    "gold": 50
}
```

### XP Curve
```
func xp_for_level(lvl): return int(100 * pow(lvl, 1.5))
```
Max level: 20

### Equipment Slots
```
var equipment = {
    "weapon": null,    # Staves, Daggers, Ritual Blades
    "armor": null,     # Robes, Cloaks, Runed Vestments
    "accessory": null  # Rings, Amulets, Sigil Stones
}
```

### Inventory
- Max 20 slots
- Items: Potions (HP/MP restore), Antidotes, Lore Scrolls, Key Items, Equipment

### Pact Spells (Magic System)
Spells are learned by discovering Pact Sigils in the world. Each spell costs MP and may inflict Corruption (a secondary cost).

| Spell | MP Cost | Corruption | Effect |
|---|---|---|---|
| Shadow Bolt | 8 | 0 | Dark damage (INT * 1.5) to one enemy |
| Binding Chain | 12 | 1 | Stun one enemy for 1 turn |
| Blood Tithe | 15 | 2 | Sacrifice 20 HP, deal heavy dark damage to all |
| Covenant Ward | 10 | 0 | Raise DEF for 3 turns |
| Soul Drain | 20 | 3 | Drain HP from enemy, heal self |
| Eldritch Flame | 25 | 4 | Massive AoE fire/dark damage |

**Corruption**: Accumulates during combat. At 10+ Corruption, spells become stronger but the Seeker takes damage each turn. Corruption resets after combat.

---

## 4. ENEMY TYPES

### 4.1 Hollow Thrall
- **Location**: Cursed Forest, Ruined Temple
- **HP**: 40 | **ATK**: 8 | **DEF**: 3 | **SPD**: 5
- **Behavior**: Basic melee attack. 20% chance to use "Wail" (reduces player DEF for 2 turns).
- **XP**: 15 | **Gold**: 5

### 4.2 Covenant Cultist
- **Location**: Ruined Temple, Underground Sanctum
- **HP**: 65 | **ATK**: 10 | **DEF**: 5 | **SPD**: 7
- **Behavior**: Alternates between melee strike and "Dark Invocation" (magic damage, INT-based). Heals self at <30% HP once per fight.
- **XP**: 30 | **Gold**: 12

### 4.3 Blighted Wolf
- **Location**: Cursed Forest
- **HP**: 50 | **ATK**: 14 | **DEF**: 4 | **SPD**: 12
- **Behavior**: Fast. Always attacks first. 30% chance of "Ravage" (double hit). Flees at <15% HP.
- **XP**: 22 | **Gold**: 8

### 4.4 Sigil Wraith (Mini-boss)
- **Location**: Ruined Temple (end)
- **HP**: 200 | **ATK**: 18 | **DEF**: 8 | **SPD**: 9
- **Behavior**: Phase 1 — single-target dark magic. Phase 2 (<50% HP) — AoE "Sigil Burst" every 2 turns. Immune to stun.
- **XP**: 120 | **Gold**: 60

### 4.5 The Arbiter (Final Boss)
- **Location**: Underground Sanctum (depths)
- **HP**: 500 | **ATK**: 25 | **DEF**: 12 | **SPD**: 10
- **Behavior**: 3 phases.
  - Phase 1 (100-60% HP): Heavy single attacks + "Covenant Decree" (applies Corruption +3 to player).
  - Phase 2 (60-30% HP): Summons 2 Hollow Thralls. Uses "Chains of the Pact" (stun 1 turn).
  - Phase 3 (<30% HP): "Unraveling" — massive AoE each turn, but DEF drops to 4. Race to finish.
- **XP**: 500 | **Gold**: 200

---

## 5. AREAS / MAPS

1. **Thornhaven Village** (Hub) — Inn (rest/save), Shop, Quest Board, NPCs with lore.
2. **Cursed Forest** — Exploration map with random encounters (Hollow Thralls, Blighted Wolves). Hidden Pact Sigil.
3. **Ruined Temple** — Dungeon with puzzles (sigil doors), fixed encounters, Sigil Wraith mini-boss at end.
4. **Underground Sanctum** — Final dungeon. Cultist enemies, lore reveals, The Arbiter boss fight.

---

## 6. QUEST SYSTEM

### Main Quests
1. **"The Awakening"** — Discover The Covenant in the village library. Unlocks Cursed Forest.
2. **"Echoes in the Dark"** — Explore the Cursed Forest, find the Temple entrance.
3. **"The Wraith's Sigil"** — Clear the Ruined Temple, defeat the Sigil Wraith, obtain the Sanctum Key.
4. **"The Arbiter's Judgment"** — Descend into the Underground Sanctum, confront The Arbiter, choose the ending.

### Side Quests
- **"Lost Souls"** — Find 3 spirit fragments in the Cursed Forest. Reward: Soul Drain spell.
- **"The Herbalist's Request"** — Gather 5 Moonshade Herbs. Reward: 3 Greater HP Potions.
- **"Forgotten Lore"** — Collect 4 Lore Scrolls across all areas. Reward: stat boost + backstory reveal.

---

## 7. WIN / LOSE CONDITIONS

### Win Conditions (3 Endings)
- **Uphold the Covenant**: Side with the ancient pact. The Arbiter is appeased. The world remains bound but stable. Bittersweet ending.
- **Break the Covenant**: Destroy the pact. The Arbiter must be defeated at full power (harder fight). Freedom, but chaos looms. Bold ending.
- **Rewrite the Covenant**: Use collected Lore Scrolls (requires "Forgotten Lore" quest complete) to rewrite the pact on your terms. True ending — balance is restored.

### Lose Condition
- Player HP reaches 0 in combat → Game Over screen → Option to reload last save or return to title.

---

## 8. DIALOGUE & ALIGNMENT

- NPCs use a resource-based dialogue tree system (DialogueManager autoload).
- Key dialogue choices add +1 to an alignment axis: `covenant_alignment` can be `"upholder"`, `"breaker"`, or `"rewriter"`.
- Alignment is tracked as two values: `upholder_points` and `breaker_points`. If the Lore quest is complete and points are balanced, rewriter path unlocks.

---

## 9. SAVE SYSTEM

- SaveManager autoload handles save/load to `user://save_data.json`.
- Saves: player stats, inventory, equipment, quest progress, current map, alignment points, position.
- Auto-save on area transition. Manual save at Inn.

---

## 10. AUDIO

- AudioManager autoload with functions: `play_bgm(track)`, `play_sfx(name)`.
- BGM: title_theme, village_theme, forest_theme, temple_theme, sanctum_theme, boss_theme, victory_fanfare.
- SFX: menu_select, attack_hit, magic_cast, item_use, door_open, enemy_death, level_up.
- (Procedural/placeholder audio generated at runtime using AudioStreamGenerator or simple tones.)

---

## 11. COMPLETE FILE LIST

### Project Configuration
- `project.godot` — Project settings, autoloads, input map

### Autoloads (Singletons)
- `scripts/autoloads/game_manager.gd` — Global game state, alignment, transitions
- `scripts/autoloads/audio_manager.gd` — BGM and SFX playback
- `scripts/autoloads/save_manager.gd` — Save/load to JSON
- `scripts/autoloads/dialogue_manager.gd` — Dialogue tree runner

### Player
- `scenes/player/player.tscn` — Player scene (CharacterBody2D, Sprite2D, CollisionShape2D)
- `scripts/player/player.gd` — Movement, interaction, stats, input
- `scripts/player/player_stats.gd` — Stats resource / leveling logic
- `scripts/player/spell_system.gd` — Pact spell definitions and casting

### Combat (Turn-Based)
- `scenes/combat/combat_arena.tscn` — Combat scene layout (player side, enemy side, UI)
- `scripts/combat/combat_manager.gd` — Turn queue, action resolution, win/lose
- `scripts/combat/combat_action.gd` — Action data class (attack, spell, item, flee)
- `scripts/combat/enemy_ai.gd` — AI behavior per enemy type
- `scenes/combat/combat_hud.tscn` — HP/MP bars, action menu, enemy display
- `scripts/combat/combat_hud.gd` — Combat UI logic

### Enemies
- `scenes/enemies/enemy_base.tscn` — Base enemy scene
- `scripts/enemies/enemy_base.gd` — Base enemy class with stats, signals
- `scripts/enemies/enemy_data.gd` — Enemy stat definitions (all types)

### Components
- `scripts/components/health_component.gd` — HP management, signals: health_changed, died
- `scripts/components/hitbox_component.gd` — Damage dealing (Area2D)
- `scripts/components/hurtbox_component.gd` — Damage receiving, i-frames

### UI
- `scenes/ui/main_menu.tscn` — Title screen
- `scripts/ui/main_menu.gd` — Title screen logic
- `scenes/ui/hud.tscn` — Overworld HUD (minimap hint, HP bar)
- `scripts/ui/hud.gd` — HUD logic
- `scenes/ui/inventory_screen.tscn` — Inventory + equipment UI
- `scripts/ui/inventory_screen.gd` — Inventory logic
- `scenes/ui/dialogue_box.tscn` — Dialogue display box with choices
- `scripts/ui/dialogue_box.gd` — Dialogue box logic
- `scenes/ui/quest_journal.tscn` — Quest log screen
- `scripts/ui/quest_journal.gd` — Quest journal logic
- `scenes/ui/shop_screen.tscn` — Shop buy/sell UI
- `scripts/ui/shop_screen.gd` — Shop logic
- `scenes/ui/game_over.tscn` — Game over screen
- `scripts/ui/game_over.gd` — Game over logic
- `scenes/ui/pause_menu.tscn` — Pause menu overlay
- `scripts/ui/pause_menu.gd` — Pause logic
- `scenes/ui/ending_screen.tscn` — Ending text display
- `scripts/ui/ending_screen.gd` — Ending logic per alignment

### Maps / Levels
- `scenes/maps/thornhaven.tscn` — Village hub map
- `scripts/maps/thornhaven.gd` — Village logic (NPC triggers, shop, inn)
- `scenes/maps/cursed_forest.tscn` — Forest exploration map
- `scripts/maps/cursed_forest.gd` — Random encounter logic, hidden items
- `scenes/maps/ruined_temple.tscn` — Temple dungeon map
- `scripts/maps/ruined_temple.gd` — Puzzle doors, fixed encounters, boss trigger
- `scenes/maps/underground_sanctum.tscn` — Final dungeon map
- `scripts/maps/underground_sanctum.gd` — Final dungeon logic, boss trigger

### NPCs
- `scenes/npc/npc_base.tscn` — Base NPC scene (Sprite2D, interaction area)
- `scripts/npc/npc_base.gd` — NPC interaction, dialogue trigger
- `scripts/npc/npc_data.gd` — NPC definitions (name, dialogue ID, role)

### Resources / Data
- `resources/items/item_resource.gd` — Item resource script (name, type, effect, value, icon)
- `resources/items/items_database.gd` — All item definitions
- `resources/quests/quest_resource.gd` — Quest resource (id, title, description, objectives, rewards)
- `resources/quests/quest_database.gd` — All quest definitions
- `resources/dialogues/dialogue_resource.gd` — Dialogue node structure
- `resources/dialogues/npc_dialogues.gd` — All NPC dialogue trees

### Assets
- `assets/sprites/player_idle.png` — Player sprite (provided)
- `assets/sprites/` — (Additional generated sprites via code where needed)

---

## 12. ARCHITECTURE DIAGRAM

```
GameManager (autoload)
├── Tracks: current_map, game_phase, alignment_points
├── Signals: scene_change_requested, quest_updated, alignment_shifted
│
AudioManager (autoload)
├── play_bgm(track_name), play_sfx(sfx_name)
│
SaveManager (autoload)
├── save_game(), load_game(), has_save() → user://save_data.json
│
DialogueManager (autoload)
├── start_dialogue(dialogue_id), advance(), choose(index)
├── Signals: dialogue_started, dialogue_ended, choice_made

Main Scene Tree (per map):
├── TileMap / Sprite2D backgrounds
├── Player (CharacterBody2D)
│   ├── Sprite2D (player_idle.png)
│   ├── CollisionShape2D
│   └── InteractionArea (Area2D)
├── NPCs (Area2D + Sprite2D each)
├── Enemies (overworld triggers → launch CombatArena)
├── CanvasLayer → HUD
└── CanvasLayer → DialogueBox (hidden until triggered)

Combat Scene:
├── CombatManager (Node)
│   ├── Turn queue sorted by SPD
│   ├── Player actions: Attack, Magic, Item, Flee
│   └── Enemy AI per type
├── CombatHUD (CanvasLayer)
│   ├── Player HP/MP bars
│   ├── Enemy HP bars
│   ├── Action menu (VBoxContainer of buttons)
│   └── Combat log (RichTextLabel)
└── Positions: PlayerSlot, EnemySlot1, EnemySlot2, EnemySlot3
```

---

## 13. DAMAGE FORMULAS

### Physical Attack
```gdscript
var dmg = int(base_damage * (1 + (stats.str - 10) * 0.05) * randf_range(0.9, 1.1))
var final_dmg = max(1, dmg - target.stats.def)
```

### Magic Attack
```gdscript
var spell_power = spell.base_damage
var dmg = int(spell_power * (1 + (stats.int - 10) * 0.08) * randf_range(0.9, 1.1))
var final_dmg = max(1, dmg - target.stats.wil * 0.5)
```

### Corruption Bonus (if player corruption >= 10)
```gdscript
dmg = int(dmg * 1.5)  # 50% bonus but player takes 5 damage per turn
```

### Critical Hit
```gdscript
var crit_chance = 0.05 + (stats.dex - 10) * 0.01
if randf() < crit_chance:
    dmg = int(dmg * 1.8)
```

---

## 14. STATUS EFFECTS

```gdscript
var status_effects: Dictionary = {}
# Possible effects:
# "stun": { "duration": 1, "strength": 0 }    — skip turn
# "def_down": { "duration": 2, "strength": 3 } — reduce DEF by strength
# "regen": { "duration": 3, "strength": 8 }    — heal strength HP per turn
# "corruption": { "duration": -1, "strength": N } — accumulates, resets after combat
```

---

## 15. SHOP ITEMS & PRICES

| Item | Type | Effect | Buy Price | Sell Price |
|---|---|---|---|---|
| HP Potion | Consumable | Restore 40 HP | 20 | 10 |
| Greater HP Potion | Consumable | Restore 100 HP | 50 | 25 |
| MP Potion | Consumable | Restore 30 MP | 25 | 12 |
| Antidote | Consumable | Clear status effects | 15 | 7 |
| Iron Dagger | Weapon | +5 ATK | 60 | 30 |
| Ritual Blade | Weapon | +10 ATK, +3 INT | 150 | 75 |
| Leather Cloak | Armor | +4 DEF | 50 | 25 |
| Runed Vestment | Armor | +7 DEF, +5 WIL | 180 | 90 |
| Sigil Ring | Accessory | +5 INT | 100 | 50 |
| Amulet of Warding | Accessory | +5 WIL, +10 Max HP | 120 | 60 |

---

## 16. TECHNICAL NOTES

- **Engine**: Godot 4.x (2D)
- **Resolution**: 640×360, scaled 2x → 1280×720 window
- **Pixel-art aesthetic**: Nearest-neighbor filtering on all sprites
- **Scene transitions**: Fade-to-black via GameManager + AnimationPlayer
- **All cross-node communication via signals** — no direct node references where avoidable
- **@export on all tunable values** (speeds, damage, durations)
- **Groups used**: `"player"`, `"enemies"`, `"npcs"`, `"pickups"`, `"interactable"`
- **Player sprite**: `res://assets/sprites/player_idle.png` — used for overworld and combat
- **Enemy sprites**: Generated as colored rectangles with distinctive shapes via code (no external assets needed)
