extends Node

var master_volume: float = 1.0
var music_volume: float = 0.7
var sfx_volume: float = 0.8

var music_player: AudioStreamPlayer
var sfx_players: Array[AudioStreamPlayer] = []
var max_sfx_players: int = 8

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	music_player = AudioStreamPlayer.new()
	music_player.bus = "Master"
	add_child(music_player)
	for i in range(max_sfx_players):
		var player = AudioStreamPlayer.new()
		player.bus = "Master"
		add_child(player)
		sfx_players.append(player)

func play_music(stream: AudioStream, fade_in: float = 0.5) -> void:
	if stream == null:
		return
	music_player.stream = stream
	music_player.volume_db = linear_to_db(music_volume * master_volume)
	music_player.play()

func stop_music(fade_out: float = 0.5) -> void:
	music_player.stop()

func play_sfx(stream: AudioStream, volume_scale: float = 1.0) -> void:
	if stream == null:
		return
	for player in sfx_players:
		if not player.playing:
			player.stream = stream
			player.volume_db = linear_to_db(sfx_volume * master_volume * volume_scale)
			player.play()
			return
	# If all players busy, use the first one
	sfx_players[0].stream = stream
	sfx_players[0].volume_db = linear_to_db(sfx_volume * master_volume * volume_scale)
	sfx_players[0].play()

func play_sfx_named(sfx_name: String, volume_scale: float = 1.0) -> void:
	# Stub method for named SFX - prevents runtime errors when audio files
	# are not yet loaded. In a full build, this would load and play sounds
	# by name from a sound library. For now, it gracefully does nothing
	# to prevent crashes on web export.
	pass

func set_master_volume(vol: float) -> void:
	master_volume = clamp(vol, 0.0, 1.0)

func set_music_volume(vol: float) -> void:
	music_volume = clamp(vol, 0.0, 1.0)
	if music_player.playing:
		music_player.volume_db = linear_to_db(music_volume * master_volume)

func set_sfx_volume(vol: float) -> void:
	sfx_volume = clamp(vol, 0.0, 1.0)
