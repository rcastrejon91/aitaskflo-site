extends Node2D

var enemy_count: int = 0

func _ready() -> void:
	GameManager.current_level = "Level1"
	GameManager.player_died.connect(_on_player_died)
	_connect_enemy_signals()
	_setup_initial_dialogue()

func _connect_enemy_signals() -> void:
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if enemy.has_signal("enemy_died"):
			enemy.enemy_died.connect(_on_enemy_died)
			enemy_count += 1

func _setup_initial_dialogue() -> void:
	if not GameManager.lore_flags.met_elder:
		await get_tree().create_timer(1.5).timeout
		DialogueManager.start_dialogue("npc_villager")

func _on_enemy_died(_enemy: Node2D) -> void:
	enemy_count -= 1

func _on_player_died() -> void:
	await get_tree().create_timer(1.5).timeout
	get_tree().change_scene_to_file("res://scenes/ui/GameOver.tscn")
