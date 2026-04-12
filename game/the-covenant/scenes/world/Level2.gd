extends Node2D

@onready var player: CharacterBody2D = $Player
@onready var hud: CanvasLayer = $HUD
@onready var pause_menu: CanvasLayer = $PauseMenu

var enemy_count: int = 0
var boss_spawned: bool = false

func _ready() -> void:
	GameManager.current_level = "Level2"
	GameManager.player_died.connect(_on_player_died)
	GameManager.lore_flags.entered_shadow_realm = true
	_connect_enemy_signals()
	await get_tree().create_timer(0.5).timeout
	DialogueManager.start_dialogue("level2_intro")

func _connect_enemy_signals() -> void:
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if enemy.has_signal("enemy_died"):
			enemy.enemy_died.connect(_on_enemy_died)
			enemy_count += 1

func _on_enemy_died(_enemy: Node2D) -> void:
	enemy_count -= 1
	if enemy_count <= 0 and not boss_spawned:
		_spawn_boss_area_reward()

func _spawn_boss_area_reward() -> void:
	boss_spawned = true
	var fragment = preload("res://scenes/entities/Pickup.tscn").instantiate()
	fragment.pickup_type = 3  # COVENANT_FRAGMENT
	fragment.value = 1
	fragment.position = Vector2(0, -400)
	$Pickups.add_child(fragment)

func _on_player_died() -> void:
	await get_tree().create_timer(1.0).timeout
	get_tree().change_scene_to_file("res://scenes/ui/GameOver.tscn")
