/**
 * lib/lyra/gamemulti.ts
 * Multiplayer scaffolding and AI player GDScript patterns.
 * Injected into game builds that need multiplayer or AI opponents.
 */

export const MULTIPLAYER_PATTERNS = `
════════════ GODOT 4 MULTIPLAYER PATTERNS ════════════

────────── LOBBY + CONNECTION ──────────
# NetworkManager autoload:
extends Node

signal player_connected(peer_id: int, info: Dictionary)
signal player_disconnected(peer_id: int)
signal server_disconnected()
signal lobby_ready()

const DEFAULT_PORT = 7777
const MAX_PLAYERS = 4
var players: Dictionary = {}  # peer_id → {name, character, ready}
var local_player_id: int = 1

func host_game(port: int = DEFAULT_PORT) -> void:
  var peer = ENetMultiplayerPeer.new()
  peer.create_server(port, MAX_PLAYERS)
  multiplayer.multiplayer_peer = peer
  multiplayer.peer_connected.connect(_on_peer_connected)
  multiplayer.peer_disconnected.connect(_on_peer_disconnected)
  local_player_id = 1
  players[1] = { "name": "Host", "ready": false }

func join_game(address: String, port: int = DEFAULT_PORT) -> Error:
  var peer = ENetMultiplayerPeer.new()
  var err = peer.create_client(address, port)
  if err != OK: return err
  multiplayer.multiplayer_peer = peer
  multiplayer.server_disconnected.connect(_on_server_disconnected)
  local_player_id = multiplayer.get_unique_id()
  return OK

func _on_peer_connected(id: int) -> void:
  # Tell the new peer about all existing players
  for existing_id in players:
    _sync_player_info.rpc_id(id, existing_id, players[existing_id])
  player_connected.emit(id, {})

func _on_peer_disconnected(id: int) -> void:
  players.erase(id)
  player_disconnected.emit(id)

func _on_server_disconnected() -> void:
  multiplayer.multiplayer_peer = null
  players.clear()
  server_disconnected.emit()

@rpc("authority", "call_local", "reliable")
func _sync_player_info(id: int, info: Dictionary) -> void:
  players[id] = info

────────── PLAYER SYNC ──────────
# On each player character — use MultiplayerSynchronizer:
# In Player.tscn: add MultiplayerSynchronizer node, configure these properties:
#   global_position, velocity, health, current_animation, facing_direction

# In Player.gd:
func _ready() -> void:
  # Only process input for the local player
  set_process(multiplayer.get_unique_id() == name.to_int())
  set_physics_process(multiplayer.get_unique_id() == name.to_int())

@rpc("any_peer", "call_local", "unreliable_ordered")
func sync_state(pos: Vector2, vel: Vector2, anim: String) -> void:
  if not is_multiplayer_authority():
    global_position = pos
    velocity = vel
    # Play animation without re-triggering
    if $AnimatedSprite2D.animation != anim:
      $AnimatedSprite2D.play(anim)

func _physics_process(delta: float) -> void:
  if not is_multiplayer_authority(): return
  # ... normal movement code ...
  # Broadcast state to all peers every frame
  sync_state.rpc(global_position, velocity, $AnimatedSprite2D.animation)

────────── SPAWNING PLAYERS ──────────
# In GameManager or Main scene — use MultiplayerSpawner:
# Add MultiplayerSpawner node, set spawn_path to the players node
# Add Player scene to its spawnable scenes list

func spawn_player(peer_id: int) -> void:
  if not multiplayer.is_server(): return
  var player = PLAYER_SCENE.instantiate()
  player.name = str(peer_id)
  player.global_position = get_spawn_position(peer_id)
  $Players.add_child(player, true)  # true = sync to all clients

func get_spawn_position(peer_id: int) -> Vector2:
  var spawn_points = $SpawnPoints.get_children()
  var idx = (peer_id % spawn_points.size())
  return spawn_points[idx].global_position

────────── RPC COMBAT ──────────
# Damage must be server-authoritative:
@rpc("any_peer", "call_local", "reliable")
func take_damage_rpc(amount: float, from_peer: int) -> void:
  if not multiplayer.is_server(): return  # Only server applies damage
  health -= amount
  _broadcast_health.rpc(health)

@rpc("authority", "call_local", "reliable")
func _broadcast_health(new_health: float) -> void:
  health = new_health
  health_changed.emit(health, max_health)

────────── CHAT ──────────
@rpc("any_peer", "call_local", "reliable")
func send_chat(msg: String) -> void:
  var sender_id = multiplayer.get_remote_sender_id()
  var sender_name = NetworkManager.players.get(sender_id, {}).get("name", "Unknown")
  chat_received.emit(sender_name, msg)
`;

export const AI_PLAYER_GDSCRIPT = `
════════════ AI PLAYER (SERVER-CONTROLLED) ════════════

# AIPlayer.gd — a character controlled by Lyra's AI endpoint
# Attach to the AI character scene. Runs only on server.
extends CharacterBody2D

@export var ai_role: String = "opponent"      # opponent / ally / boss
@export var ai_personality: String = "adaptive"
@export var difficulty: String = "medium"
@export var decision_interval: float = 0.15   # seconds between AI decisions
@export var server_url: String = "http://localhost:3000"

var session_id: String = ""
var current_action: Dictionary = {}
var decision_timer: float = 0.0
var http: HTTPRequest

# Stats
var health: float = 100.0
var max_health: float = 100.0
var speed: float = 140.0
var is_dead: bool = false

# What the AI is currently doing
var current_move: Vector2 = Vector2.ZERO
var current_facing: Vector2 = Vector2.DOWN
var action_state: String = "idle"

func _ready() -> void:
  # AI only runs on server
  if not multiplayer.is_server():
    set_physics_process(false)
    set_process(false)
    return

  session_id = "ai_%d_%s" % [Time.get_ticks_msec(), name]

  http = HTTPRequest.new()
  add_child(http)
  http.request_completed.connect(_on_ai_response)

  add_to_group("ai_players")

func _physics_process(delta: float) -> void:
  if is_dead: return

  decision_timer -= delta
  if decision_timer <= 0.0:
    decision_timer = decision_interval
    _request_ai_decision()

  # Apply current movement decision
  velocity = current_move * speed
  move_and_slide()

  # Sync position to all clients
  _sync_ai_state.rpc(global_position, velocity, action_state, current_facing)

func _request_ai_decision() -> void:
  if http.get_http_client_status() != 0: return  # Request already in flight

  var game_state = _build_game_state()
  var body = JSON.stringify({
    "sessionId": session_id,
    "gameState": game_state,
    "aiRole": ai_role,
    "aiPersonality": ai_personality,
    "difficulty": difficulty,
  })

  var headers = ["Content-Type: application/json"]
  http.request(server_url + "/api/lyra/game-ai", headers, HTTPClient.METHOD_POST, body)

func _on_ai_response(_result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
  if response_code != 200: return

  var json = JSON.new()
  if json.parse(body.get_string_from_utf8()) != OK: return

  var response = json.get_data()
  var action = response.get("action", {})

  # Apply the AI's decision
  var move = action.get("move", {"x": 0, "y": 0})
  current_move = Vector2(move.get("x", 0.0), move.get("y", 0.0)).normalized()

  action_state = action.get("action", "idle")

  var facing = action.get("facing", {"x": 0, "y": 1})
  current_facing = Vector2(facing.get("x", 0.0), facing.get("y", 1.0))

  # Execute special actions
  match action_state:
    "attack": _execute_attack(action)
    "spell": _execute_spell(action.get("spell", ""), action)
    "dodge": _execute_dodge()

func _execute_attack(action: Dictionary) -> void:
  var target_pos = action.get("target_position", {})
  var target = Vector2(target_pos.get("x", 0.0), target_pos.get("y", 0.0))
  # Attack logic — subclass this for specific game attack types
  attack_toward.rpc(target)

func _execute_spell(spell_name: String, action: Dictionary) -> void:
  if spell_name.is_empty(): return
  var target_pos = action.get("target_position", {})
  var target = Vector2(target_pos.get("x", 0.0), target_pos.get("y", 0.0))
  cast_spell.rpc(spell_name, target)

func _execute_dodge() -> void:
  # Dodge away from nearest threat
  var threats = get_tree().get_nodes_in_group("player")
  if threats.size() > 0:
    var away = (global_position - threats[0].global_position).normalized()
    current_move = away

func _build_game_state() -> Dictionary:
  var players = []
  for p in get_tree().get_nodes_in_group("player"):
    players.append({
      "position": {"x": p.global_position.x, "y": p.global_position.y},
      "health": p.get("health") if p.get("health") else 100,
      "velocity": {"x": p.velocity.x, "y": p.velocity.y} if p.get("velocity") else {"x":0,"y":0},
      "is_attacking": p.get("is_attacking") if p.get("is_attacking") != null else false,
    })

  var enemies = []
  for e in get_tree().get_nodes_in_group("enemies"):
    if e == self: continue
    enemies.append({
      "position": {"x": e.global_position.x, "y": e.global_position.y},
      "health": e.get("health") if e.get("health") else 100,
    })

  return {
    "ai_position": {"x": global_position.x, "y": global_position.y},
    "ai_health": health,
    "ai_action_state": action_state,
    "players": players,
    "enemies": enemies,
    "player_position": players[0].get("position") if players.size() > 0 else {"x": 0, "y": 0},
    "distance_to_player": global_position.distance_to(
      Vector2(players[0].position.x, players[0].position.y) if players.size() > 0 else Vector2.ZERO
    ),
    "nearby_cover": _find_cover_positions(),
    "timestamp": Time.get_ticks_msec(),
  }

func _find_cover_positions() -> Array:
  # Return positions of walls/obstacles near the AI for tactical positioning
  var covers = []
  var space = get_world_2d().direct_space_state
  for angle in range(0, 360, 45):
    var dir = Vector2.from_angle(deg_to_rad(angle))
    var query = PhysicsRayQueryParameters2D.create(global_position, global_position + dir * 150)
    var result = space.intersect_ray(query)
    if result:
      covers.append({"x": result.position.x, "y": result.position.y})
  return covers

func take_damage(amount: float) -> void:
  health -= amount
  health = max(0.0, health)
  if health <= 0.0 and not is_dead:
    _die()

func _die() -> void:
  is_dead = true
  _die_rpc.rpc()

@rpc("authority", "call_local", "reliable")
func _die_rpc() -> void:
  # Play death animation on all clients
  set_physics_process(false)
  modulate = Color(1, 0.3, 0.3, 0.5)
  create_tween().tween_property(self, "modulate:a", 0.0, 1.0).finished.connect(queue_free)

@rpc("authority", "call_local", "unreliable_ordered")
func _sync_ai_state(pos: Vector2, vel: Vector2, state: String, facing: Vector2) -> void:
  if multiplayer.is_server(): return  # Server already has this
  global_position = pos
  velocity = vel
  action_state = state
  current_facing = facing

@rpc("authority", "call_local", "reliable")
func attack_toward(_target: Vector2) -> void:
  pass  # Override in subclass

@rpc("authority", "call_local", "reliable")
func cast_spell(_spell_name: String, _target: Vector2) -> void:
  pass  # Override in subclass
`;

export const GAME_GUIDE_GDSCRIPT = `
════════════ LYRA GAME GUIDE (IN-GAME AI COMPANION) ════════════

# GameGuide.gd — attach to any scene, Lyra watches and advises in real time
extends Node

@export var server_url: String = "http://localhost:3000"
@export var guide_style: String = "tactical"  # tactical / narrative / hint / coach
@export var check_interval: float = 3.0       # seconds between guide checks
@export var enabled: bool = true

signal guide_spoke(message: String, urgency: String, type: String)

var timer: float = 0.0
var http: HTTPRequest
var last_message: String = ""

func _ready() -> void:
  http = HTTPRequest.new()
  add_child(http)
  http.request_completed.connect(_on_guide_response)

func _process(delta: float) -> void:
  if not enabled: return
  timer -= delta
  if timer <= 0.0:
    timer = check_interval
    _ask_guide()

func _ask_guide() -> void:
  if http.get_http_client_status() != 0: return

  var game_state = _build_state()
  var body = JSON.stringify({
    "gameState": game_state,
    "guideStyle": guide_style,
  })

  http.request(server_url + "/api/lyra/game-guide",
    ["Content-Type: application/json"], HTTPClient.METHOD_POST, body)

func _on_guide_response(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
  if code != 200: return
  var json = JSON.new()
  if json.parse(body.get_string_from_utf8()) != OK: return
  var data = json.get_data()

  if data.get("speak", false):
    var msg = data.get("message", "")
    var urgency = data.get("urgency", "low")
    var type = data.get("type", "hint")
    if msg != last_message:  # Don't repeat the same message
      last_message = msg
      guide_spoke.emit(msg, urgency, type)

func _build_state() -> Dictionary:
  var player = get_tree().get_first_node_in_group("player")
  var enemies = get_tree().get_nodes_in_group("enemies")

  return {
    "player_health": player.get("health") if player else 100,
    "player_max_health": player.get("max_health") if player else 100,
    "player_position": {"x": player.global_position.x, "y": player.global_position.y} if player else {},
    "player_mana": player.get("wic") if player else 0,
    "enemy_count": enemies.size(),
    "nearest_enemy_distance": _nearest_enemy_dist(player, enemies),
    "player_in_danger": player.get("health", 100) < 30 if player else false,
    "low_mana": player.get("wic", 100) < 20 if player else false,
    "current_area": get_tree().current_scene.name,
    "time_elapsed": Time.get_ticks_msec() / 1000.0,
  }

func _nearest_enemy_dist(player: Node, enemies: Array) -> float:
  if not player or enemies.is_empty(): return 9999.0
  var min_dist = 9999.0
  for e in enemies:
    min_dist = min(min_dist, player.global_position.distance_to(e.global_position))
  return min_dist
`;

/**
 * Returns the multiplayer + AI player patterns as context for the game builder.
 */
export function buildMultiplayerContext(needsMultiplayer: boolean, needsAI: boolean): string {
  let ctx = "";
  if (needsMultiplayer) ctx += MULTIPLAYER_PATTERNS;
  if (needsAI) ctx += AI_PLAYER_GDSCRIPT + GAME_GUIDE_GDSCRIPT;
  return ctx;
}
