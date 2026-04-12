extends Node

# ConsciousnessProbe.gd: Allows player to scan NPCs for thoughts, memories, or secrets.

class_name ConsciousnessProbe

signal probe_result(text: String)

var player: Node  # Reference to the player node
var npcs: Array = []  # Array to hold detectable NPCs

func _ready():
    # Assume this script is attached to a player item or spell
    player = get_parent()  # Or link via signal
    # Scan for NPCs in the scene (e.g., using groups)
    npcs = get_tree().get_nodes_in_group("npcs")

func activate_probe(target_npc: Node):
    if target_npc and target_npc in npcs:
        var thoughts = generate_thoughts(target_npc)  # Procedural generation of thoughts
        emit_signal("probe_result", thoughts)
        # Influence AI: e.g., reveal weaknesses or change state
        if target_npc.has_method("update_state"):
            target_npc.update_state("probed")  # Example: Make enemy more aggressive or reveal lore

func generate_thoughts(npc: Node) -> String:
    # Simple procedural lore generation based on NPC type
    var npc_type = npc.get_meta("type", "generic")
    var secrets = [
        "This NPC harbors a dark secret about the ancient covenant.",
        "Memories of a betrayal flicker in their mind.",
        "They know the location of a hidden artifact."
    ]
    return secrets[randi() % secrets.size()] + " More details: " + npc.get_meta("lore", "Unknown lore")
