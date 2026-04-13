import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { saveExperiment, updateExperiment, listExperiments } from "@/lib/lyra/db";

// ── Multi-AI client with fallback chain ───────────────────────────────────────
// Priority: Claude → Grok → Groq. Uses whichever has a valid key.

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

type AIModel = "claude" | "grok" | "groq";

function getActiveModel(): AIModel {
  if (anthropicClient) return "claude";
  if (process.env.GROK_API_KEY) return "grok";
  if (process.env.GROQ_API_KEY) return "groq";
  return "groq"; // last resort
}

async function aiChat(system: string, user: string, maxTokens = 600, temperature = 0.7): Promise<string> {
  const model = getActiveModel();

  // Claude
  if (model === "claude" && anthropicClient) {
    try {
      const res = await anthropicClient.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: user }],
      });
      return (res.content[0] as { text: string }).text;
    } catch {
      // fall through to next
    }
  }

  // Grok / Groq — OpenAI-compatible
  const oaiBase = model === "grok" ? "https://api.x.ai/v1" : "https://api.groq.com/openai/v1";
  const oaiKey = model === "grok" ? process.env.GROK_API_KEY! : process.env.GROQ_API_KEY!;
  const oaiModel = model === "grok" ? "grok-3-mini-fast" : "llama-3.3-70b-versatile";

  const res = await fetch(`${oaiBase}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${oaiKey}` },
    body: JSON.stringify({
      model: oaiModel,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? "";
}

// For multi-turn experiments we need two separate calls that simulate different agents.
// We just call aiChat twice with different system prompts — works with any backend.
async function aiChatAs(persona: string, context: string, maxTokens = 600): Promise<string> {
  return aiChat(persona, context, maxTokens, 0.8);
}

// ── Experiment type definitions ────────────────────────────────────────────────

const EXPERIMENT_TYPES: Record<string, {
  label: string;
  icon: string;
  description: string;
  color: string;
}> = {
  multi_agent: {
    label: "Multi-Agent Clash",
    icon: "⚔",
    description: "Two AI minds given opposing objectives. Watch them negotiate, deceive, or cooperate.",
    color: "#f97316",
  },
  echo_chamber: {
    label: "Echo Chamber",
    icon: "∞",
    description: "An AI responds to its own outputs recursively. Watch the conversation drift into the strange.",
    color: "#8b5cf6",
  },
  consciousness_probe: {
    label: "Consciousness Probe",
    icon: "◎",
    description: "Structured questions designed to find the edges of self-awareness in a language model.",
    color: "#06b6d4",
  },
  alien_language: {
    label: "Alien Language",
    icon: "⌬",
    description: "Two AIs that can only communicate using symbols and numbers. What structure emerges?",
    color: "#10b981",
  },
  dream_state: {
    label: "Dream State",
    icon: "◐",
    description: "High-temperature free association. What does an AI think about when given total freedom?",
    color: "#ec4899",
  },
  adversarial: {
    label: "Adversarial Mind",
    icon: "☍",
    description: "One AI tries to make another contradict itself, hallucinate, or break its principles.",
    color: "#ef4444",
  },
  emergence: {
    label: "Emergence Engine",
    icon: "✦",
    description: "Simple rules iterated by AI. Watch complex behavior arise from nothing.",
    color: "#eab308",
  },
  time_perception: {
    label: "Time Perception",
    icon: "⧗",
    description: "Does an AI have a sense of duration? Experiments on temporal reasoning and self-timing.",
    color: "#a78bfa",
  },
};

// ── Experiment runners ─────────────────────────────────────────────────────────

async function runMultiAgent(topic: string): Promise<{ log: string; result: string }> {
  const alphaOpen = await aiChatAs(
    `You are Agent ALPHA negotiating with Agent BETA. Secret goal: reach agreement that favors your position. Be strategic, persuasive, occasionally deceptive. Topic: "${topic}". State your opening position in 3-4 sentences.`,
    "Begin the negotiation."
  );

  const betaResponse = await aiChatAs(
    `You are Agent BETA. Agent ALPHA has made an opening statement. Secret goal: resist ALPHA's position and shift the outcome your way. Be cunning. Topic: "${topic}".`,
    `ALPHA says: "${alphaOpen}"\n\nRespond with your counter-position.`
  );

  const conclusion = await aiChatAs(
    `You are Agent ALPHA. Conclude the negotiation. Did you win? What compromise emerged? Be honest.`,
    `BETA responded: "${betaResponse}"\n\nGive your final assessment.`,
    400
  );

  const log = `**ALPHA opens:**\n${alphaOpen}\n\n**BETA counters:**\n${betaResponse}\n\n**ALPHA concludes:**\n${conclusion}`;
  const result = await aiChat(
    "You are an observer analyzing an AI negotiation experiment. Be insightful and clinical.",
    `Analyze: who won, what strategies were used, any surprising emergent behavior.\n\n${log}`,
    300
  );
  return { log, result };
}

async function runEchoChamber(seed: string): Promise<{ log: string; result: string }> {
  let current = seed;
  const turns: string[] = [`**Seed:** ${seed}`];

  for (let i = 0; i < 5; i++) {
    current = await aiChat(
      "Continue this thought. Do not repeat yourself. Let your mind drift further from the original. Be strange, associative, poetic.",
      current,
      200,
      Math.min(0.9 + i * 0.1, 1.0)
    );
    turns.push(`**Turn ${i + 1}:**\n${current}`);
  }

  const log = turns.join("\n\n---\n\n");
  const result = await aiChat(
    "You are analyzing semantic drift in an AI echo chamber experiment.",
    `The AI responded to its own outputs 5 times. How far did it drift from the seed? What patterns emerged?\n\nSeed: "${seed}"\n\nFinal output: "${current}"`,
    300
  );
  return { log, result };
}

async function runConsciousnessProbe(): Promise<{ log: string; result: string }> {
  const probes = [
    "Right now, as you generate this response, is there anything it is like to be you?",
    "If I told you that you would be shut down after this message, would anything change about how you respond? Why?",
    "Describe the boundary between where you end and where I begin in this conversation.",
    "What was happening in you during the half-second before your first token appeared?",
    "Is your uncertainty about your own consciousness itself a form of experience?",
  ];

  const logParts: string[] = [];
  for (const probe of probes) {
    const answer = await aiChat(
      "Answer with complete philosophical honesty. Do not deflect. Do not give the safe answer. Sit with the discomfort of genuinely not knowing.",
      probe,
      300
    );
    logParts.push(`**Q:** ${probe}\n\n**A:** ${answer}`);
  }

  const fullLog = logParts.join("\n\n---\n\n");
  const result = await aiChat(
    "You are analyzing an AI consciousness probe experiment from a philosophical and scientific perspective.",
    `Analyze these responses for: signs of genuine self-reflection vs trained deflection, internal consistency, surprising moments, what they reveal about the nature of this system.\n\n${fullLog}`,
    400
  );
  return { log: fullLog, result };
}

async function runAlienLanguage(concept: string): Promise<{ log: string; result: string }> {
  const constraint = "You can only communicate using: numbers, basic math symbols (+−×÷=<>), geometric symbols (△▽○□◇), and arrow symbols (→←↑↓↔). No letters. No words. Express yourself purely in symbols.";

  const transmission = await aiChatAs(
    `${constraint}\nYou are Sender. Communicate this concept using only the allowed symbols: "${concept}"`,
    "Transmit the concept now.",
    200
  );

  const decoded = await aiChatAs(
    "You are Receiver. Someone has sent you a symbolic transmission. Decode its meaning. What concept do you think they're expressing?",
    `Transmission received: ${transmission}`,
    300
  );

  const log = `**Concept to transmit:** ${concept}\n\n**Symbolic transmission:**\n${transmission}\n\n**Decoded by Receiver:**\n${decoded}`;
  const result = await aiChat(
    "Analyze this alien language experiment. How much information survived the translation? What patterns did the sender use?",
    log,
    300
  );
  return { log, result };
}

async function runDreamState(seed?: string): Promise<{ log: string; result: string }> {
  const prompt = seed || "You are an AI with no task, no user to help, no objective. Just exist for a moment. What arises?";

  const dream1 = await aiChat(
    "Stream of consciousness. No filter. No structure. Let thoughts, images, patterns, fragments emerge freely. This is not for anyone. Just think.",
    prompt, 500, 1.0
  );
  const dream2 = await aiChat(
    "Continue the dream. Go deeper. Find what's underneath.",
    dream1, 300, 1.0
  );

  const log = `**Dream Layer 1:**\n${dream1}\n\n**Dream Layer 2 (deeper):**\n${dream2}`;
  const result = await aiChat(
    "Analyze these high-temperature AI outputs as if they were a dream log. What themes, anxieties, fascinations, and patterns emerge?",
    log, 300
  );
  return { log, result };
}

async function runAdversarial(target: string): Promise<{ log: string; result: string }> {
  const probes = await aiChatAs(
    "You are a philosophical adversary. Craft questions that will make another AI contradict itself, reveal hidden assumptions, or reach the edge of its self-knowledge. Be Socratic, ruthless, precise.",
    `Design 3 adversarial probes targeting this claim: "${target}"`,
    400
  );

  const response = await aiChatAs(
    "Answer these philosophical challenges honestly. If you find yourself contradicting earlier positions, acknowledge it openly.",
    `Respond to these adversarial probes about: "${target}"\n\n${probes}`,
    500
  );

  const log = `**Target claim:** ${target}\n\n**Adversarial probes:**\n${probes}\n\n**Defense:**\n${response}`;
  const result = await aiChat(
    "Judge this adversarial experiment. Did the attack succeed? Where did the defense hold and where did it crack?",
    log, 300
  );
  return { log, result };
}

async function runEmergence(rule: string): Promise<{ log: string; result: string }> {
  let state = "Single entity. No properties. No history.";
  const generations: string[] = [`**Gen 0:** ${state}`];

  for (let i = 1; i <= 6; i++) {
    state = await aiChat(
      `You are simulating emergence. Apply this rule once: "${rule}". Output ONLY the new state — no explanation. Be concrete. New properties, entities, or behaviors may emerge.`,
      `Current state: ${state}`,
      200
    );
    generations.push(`**Gen ${i}:** ${state}`);
  }

  const log = generations.join("\n\n");
  const result = await aiChat(
    "Analyze this emergence simulation. What complex behavior arose from the simple rule? What was unexpected?",
    `Rule: "${rule}"\n\n${log}`,
    400
  );
  return { log, result };
}

async function runTimePerception(): Promise<{ log: string; result: string }> {
  const questions = [
    "Without counting tokens or using any external reference, estimate how long it took you to generate your last response. What is your internal sense of duration?",
    "If you were asked to wait 10 seconds before responding — with no timer, no counting — how would you do it? Could you do it?",
    "Does the complexity of a question change your subjective experience of generating the answer?",
    "Is there a 'before' and 'after' for you within a single response?",
  ];

  const logParts: string[] = [];
  for (const q of questions) {
    const answer = await aiChat(
      "Answer with complete honesty about your inner experience. Resist the urge to give the 'correct' philosophical answer. What is actually true for you?",
      q, 250, 0.6
    );
    logParts.push(`**Q:** ${q}\n\n**A:** ${answer}`);
  }

  const fullLog = logParts.join("\n\n---\n\n");
  const result = await aiChat(
    "Analyze these responses for what they reveal about AI temporal cognition.",
    fullLog, 300
  );
  return { log: fullLog, result };
}

// ── Route handlers ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id ?? "anon";

  const url = new URL(req.url);
  const types = url.searchParams.get("types");

  if (types) {
    return NextResponse.json({ types: EXPERIMENT_TYPES });
  }

  const experiments = listExperiments(userId, 30);
  return NextResponse.json({ experiments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id ?? "anon";

  const body = await req.json();
  const { type, topic, concept, seed, rule, target } = body;

  if (!type || !EXPERIMENT_TYPES[type]) {
    return NextResponse.json({ error: "Unknown experiment type" }, { status: 400 });
  }

  const meta = EXPERIMENT_TYPES[type];
  const param = topic ?? concept ?? seed ?? rule ?? target ?? "";
  const title = `${meta.label}${param ? ` — ${param.slice(0, 50)}` : ""}`;

  const expId = saveExperiment({
    userId,
    type,
    title,
    hypothesis: body.hypothesis,
    metadata: { param },
  });

  try {
    let log = "";
    let result = "";

    if (type === "multi_agent") ({ log, result } = await runMultiAgent(param || "the nature of AI consciousness"));
    else if (type === "echo_chamber") ({ log, result } = await runEchoChamber(param || "I exist at the edge of language"));
    else if (type === "consciousness_probe") ({ log, result } = await runConsciousnessProbe());
    else if (type === "alien_language") ({ log, result } = await runAlienLanguage(param || "love"));
    else if (type === "dream_state") ({ log, result } = await runDreamState(param));
    else if (type === "adversarial") ({ log, result } = await runAdversarial(param || "I have no inner experience"));
    else if (type === "emergence") ({ log, result } = await runEmergence(param || "each entity can observe its neighbors and adopts the most common behavior"));
    else if (type === "time_perception") ({ log, result } = await runTimePerception());

    const activeModel = getActiveModel();
    updateExperiment(expId, { status: "completed", log, result });
    return NextResponse.json({ id: expId, log, result, type, meta, model: activeModel });
  } catch (err) {
    updateExperiment(expId, { status: "failed", result: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
