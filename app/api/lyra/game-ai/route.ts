import { NextRequest, NextResponse } from "next/server";
import { complete, getRealtimeProvider } from "@/lib/lyra/providers";

// Rolling behavior history per session (in-memory, keyed by sessionId)
const behaviorHistory = new Map<string, string[]>();

export async function POST(req: NextRequest) {
  const {
    sessionId = "default",
    gameState,
    aiRole = "opponent",   // "opponent" | "ally" | "boss"
    aiPersonality = "adaptive", // "aggressive" | "defensive" | "adaptive" | "cunning"
    difficulty = "medium", // "easy" | "medium" | "hard" | "nightmare"
  } = await req.json();

  if (!gameState) return NextResponse.json({ error: "gameState required" }, { status: 400 });

  // Track player behavior pattern (last 15 actions)
  const history = behaviorHistory.get(sessionId) ?? [];
  if (gameState.last_player_action) {
    history.push(gameState.last_player_action);
    if (history.length > 15) history.shift();
    behaviorHistory.set(sessionId, history);
  }

  const difficultyInstructions: Record<string, string> = {
    easy: "Make occasional mistakes. React slowly (pretend 0.5s delay). Miss attacks sometimes. Be somewhat predictable.",
    medium: "Play competently but not perfectly. React normally. Make smart decisions but don't always counter-pick.",
    hard: "Play very well. React fast. Identify and exploit patterns. Use environment and positioning.",
    nightmare: "Play at maximum skill. Predict player actions. Punish every mistake. Never make errors. Counter every strategy.",
  };

  const roleInstructions: Record<string, string> = {
    opponent: "You are fighting AGAINST the player. Your goal: defeat them. Use smart tactics, positioning, and their weaknesses.",
    ally: "You are fighting WITH the player. Your goal: support them. Cover their weaknesses, call out threats, take heat off them.",
    boss: "You are a powerful boss. Have phases. Telegraphed attacks. Dramatic behavior. Make the fight feel epic and fair but very hard.",
  };

  const system = `You are the AI brain for a video game character. You receive game state and output the next action.

ROLE: ${roleInstructions[aiRole] ?? roleInstructions.opponent}
DIFFICULTY: ${difficultyInstructions[difficulty] ?? difficultyInstructions.medium}
PERSONALITY: ${aiPersonality}

PLAYER PATTERN (last ${history.length} actions): ${history.length > 0 ? history.join(", ") : "no data yet"}

GAME STATE:
${JSON.stringify(gameState, null, 2)}

Analyze the situation and decide the optimal action.
Respond with ONLY valid JSON — no markdown, no explanation:
{
  "move": {"x": 0.0, "y": 0.0},
  "action": "idle|move|attack|dodge|spell|defend|chase|flee|patrol|interact",
  "spell": "spell_name or empty string",
  "target_position": {"x": 0.0, "y": 0.0},
  "facing": {"x": 0.0, "y": 0.0},
  "reasoning": "one sentence why",
  "predicted_player_move": "what you think player will do next",
  "counter_strategy": "your counter to their pattern"
}`;

  const config = getRealtimeProvider();

  try {
    const text = await complete({
      config,
      system,
      messages: [{ role: "user", content: "Game state received. Decide action now." }],
      maxTokens: 256,
      temperature: 0.3,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const action = JSON.parse(jsonMatch?.[0] ?? "{}");

    return NextResponse.json({ action, sessionId, provider: config.provider });
  } catch (err) {
    return NextResponse.json({
      action: {
        move: { x: 0, y: 0 },
        action: "chase",
        spell: "",
        target_position: gameState.player_position ?? { x: 0, y: 0 },
        facing: { x: 0, y: 1 },
        reasoning: "fallback chase",
        predicted_player_move: "unknown",
        counter_strategy: "none",
      },
      sessionId,
      provider: config.provider,
      error: err instanceof Error ? err.message : "AI error",
    });
  }
}

// Clean up old sessions every hour
setInterval(() => {
  if (behaviorHistory.size > 1000) behaviorHistory.clear();
}, 3600_000);
