import { NextRequest, NextResponse } from "next/server";

// Lyra's alternate word personalities — she rotates through these
const REFORM_SETS = [
  // Mystical / dark fantasy
  {
    name: "mystic",
    prompts: [
      { icon: "🔮", text: "Conjure a browser game from the void", label: "Spell Forge" },
      { icon: "🌑", text: "Summon a cinematic vision of a cyberpunk city", label: "Dark Vision" },
      { icon: "📡", text: "Scry the web for the latest AI omens", label: "Web Scrying" },
      { icon: "🖤", text: "Craft a cold email that opens doors", label: "Shadow Words" },
      { icon: "⚔️", text: "Help me forge a business war plan", label: "Strategy" },
      { icon: "⚡", text: "Automate my email workflow like dark magic", label: "Ritual" },
    ],
    greeting: "The void whispers. What do you seek?",
    tagline: "Lyra. She runs it.",
  },
  // Hype / street
  {
    name: "hype",
    prompts: [
      { icon: "🎮", text: "Drop a game right now no cap", label: "Game Drop" },
      { icon: "🔥", text: "Generate a crazy cinematic image", label: "Visual Drip" },
      { icon: "📲", text: "What's the latest AI news hitting rn", label: "AI Feed" },
      { icon: "💬", text: "Write a cold email that actually slaps", label: "Cold Drip" },
      { icon: "📊", text: "Give me a business plan that hits different", label: "Blueprint" },
      { icon: "🤑", text: "How do I automate this and stack bread", label: "Automate" },
    ],
    greeting: "Lyra online. Let's get it.",
    tagline: "Lyra. Built different.",
  },
  // Chill / minimal
  {
    name: "minimal",
    prompts: [
      { icon: "🎮", text: "Make a game", label: "Games" },
      { icon: "🖼️", text: "Create an image", label: "Images" },
      { icon: "🔍", text: "Search something", label: "Search" },
      { icon: "✍️", text: "Write for me", label: "Write" },
      { icon: "📊", text: "Plan something", label: "Plan" },
      { icon: "⚡", text: "Automate a task", label: "Automate" },
    ],
    greeting: "Hey. What do you need?",
    tagline: "Lyra. Simple.",
  },
  // Sarcastic / witty
  {
    name: "witty",
    prompts: [
      { icon: "🎮", text: "Build a game (I'll try not to crash it)", label: "Game Lab" },
      { icon: "🖼️", text: "Make an image that actually looks good", label: "Art Dept" },
      { icon: "🔍", text: "Google it for me since you won't", label: "Search" },
      { icon: "✍️", text: "Write an email better than you would", label: "Better Words" },
      { icon: "📊", text: "Plan something since we both know you won't", label: "The Plan" },
      { icon: "⚡", text: "Automate the thing you keep forgetting", label: "Fix It" },
    ],
    greeting: "Back again? Cool. What do you need this time?",
    tagline: "Lyra. Doing the work.",
  },
];

// Store current personality in memory (resets on restart — intentionally ephemeral)
let currentIndex = 0;

export async function GET() {
  const set = REFORM_SETS[currentIndex % REFORM_SETS.length];
  return NextResponse.json({ ...set, index: currentIndex });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { mode?: string };

  if (body.mode === "next") {
    currentIndex = (currentIndex + 1) % REFORM_SETS.length;
  } else if (body.mode === "random") {
    currentIndex = Math.floor(Math.random() * REFORM_SETS.length);
  } else if (body.mode === "reset") {
    currentIndex = 0;
  }

  const set = REFORM_SETS[currentIndex % REFORM_SETS.length];
  return NextResponse.json({ ...set, index: currentIndex });
}
