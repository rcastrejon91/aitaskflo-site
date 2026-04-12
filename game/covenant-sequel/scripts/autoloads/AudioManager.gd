extends Node

var music_player: AudioStreamPlayer
var sfx_players: Array[AudioStreamPlayer] = []
var max_sfx_players: int = 8
var music_volume: float = 0.8
var sfx_volume: float = 1.0
var music_bus: String = "Master"
var sfx_bus: String = "Master"

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	music_player = AudioStreamPlayer.new()
	music_player.bus = music_bus
	music_player.volume_db = linear_to_db(music_volume)
	add_child(music_player)
	
	for i in max_sfx_players:
		var player := AudioStreamPlayer.new()
		player.bus = sfx_bus
		player.volume_db = linear_to_db(sfx_volume)
		add_child(player)
		sfx_players.append(player)


func play_music(stream: AudioStream, fade_in: float = 0.5) -> void:
	if music_player.stream == stream and music_player.playing:
		return
	music_player.stop()
	music_player.stream = stream
	music_player.volume_db = linear_to_db(0.01)
	music_player.play()
	var tween := create_tween()
	tween.tween_property(music_player, "volume_db", linear_to_db(music_volume), fade_in)


func stop_music(fade_out: float = 0.5) -> void:
	if music_player.playing:
		var tween := create_tween()
		tween.tween_property(music_player, "volume_db", linear_to_db(0.01), fade_out)
		tween.tween_callback(music_player.stop)


func play_sfx(stream: AudioStream, volume_scale: float = 1.0) -> void:
	if stream == null:
		return
	for player in sfx_players:
		if not player.playing:
			player.stream = stream
			player.volume_db = linear_to_db(sfx_volume * volume_scale)
			player.play()
			return
	sfx_players[0].stop()
	sfx_players[0].stream = stream
	sfx_players[0].volume_db = linear_to_db(sfx_volume * volume_scale)
	sfx_players[0].play()


func set_music_volume(vol: float) -> void:
	music_volume = clamp(vol, 0.0, 1.0)
	music_player.volume_db = linear_to_db(max(music_volume, 0.01))


func set_sfx_volume(vol: float) -> void:
	sfx_volume = clamp(vol, 0.0, 1.0)
	for player in sfx_players:
		player.volume_db = linear_to_db(max(sfx_volume, 0.01))
