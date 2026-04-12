extends KinematicBody2D  # Assuming your player is a KinematicBody2D

# Player.gd: Updated to include the Consciousness Probe mechanic.

var consciousness_probe: ConsciousnessProbe

func _ready():
    consciousness_probe = $ConsciousnessProbe  # Assuming the node is added as a child
    if not consciousness_probe:
        consciousness_probe = ConsciousnessProbe.new()
        add_child(consciousness_probe)
    consciousness_probe.connect("probe_result", self, "_on_probe_result")

func _on_probe_result(text: String):
    print("Probe result: " + text)  # Display via UI in a real game
    # Example: Show text on screen or trigger event
    
func use_probe(target: Node):
    if consciousness_probe:
        consciousness_probe.activate_probe(target)

# Add input handling, e.g., for a key press
func _process(delta):
    if Input.is_action_just_pressed("use_probe"):  # Define this action in project settings
        var target = get_nearest_npc()  # Implement a function to detect nearest NPC
        if target:
            use_probe(target)

func get_nearest_npc():
    # Simple implementation to find the closest NPC
    var npcs = get_tree().get_nodes_in_group("npcs")
    if npcs.size() > 0:
        return npcs[0]  # For now, just return the first one; improve with distance checks
    return null
