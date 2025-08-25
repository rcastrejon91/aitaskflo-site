import express from "express";
import fs from "fs";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const PORT = 3001;

// --- Bot Personalities ---
const personalities = {
  emailBot: { intro: "💌 EmailBot: Ready to craft messages ✨" },
  taskBot: { intro: "📋 TaskBot: Focused on deadlines ✅" },
  analyticsBot: { intro: "📊 AnalyticsBot: Reporting insights 📈" },
  researchBot: { intro: "🔍 ResearchBot: Digging deeper 🕵️" }
};

// --- Memory Helpers ---
function getMemory(botName) {
  const path = `./memory/${botName}.json`;
  if (!fs.existsSync(path)) {
    return { requests: [] };
  }
  return JSON.parse(fs.readFileSync(path));
}

function saveMemory(botName, data) {
  const dir = "./memory";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const path = `${dir}/${botName}.json`;
  let file = getMemory(botName);

  file.requests.push({
    input: data.input,
    output: data.output,
    timestamp: new Date().toISOString(),
  });

  fs.writeFileSync(path, JSON.stringify(file, null, 2));
}

function summarizeKnowledge(memory) {
  if (memory.requests.length === 0) return "Still learning... 🍼";
  const lastFew = memory.requests.slice(-3).map(r => r.input);
  return `I’ve noticed you often ask about: ${lastFew.join(", ")}.`;
}

// --- Run Single Bot ---
app.post("/run-bot", (req, res) => {
  const { botName, input } = req.body;
  const memory = getMemory(botName);

  const personality = personalities[botName] || { intro: "🤖 Unknown bot" };
  let friendlyContext = "";

  if (memory.requests.length > 0) {
    const last = memory.requests[memory.requests.length - 1];
    friendlyContext = ` Last time, you asked: "${last.input}".`;
  }

  const knowledgeSummary = summarizeKnowledge(memory);
  const reply = `${personality.intro}\nYou said: "${input}".${friendlyContext}\n${knowledgeSummary}`;

  saveMemory(botName, { input, output: reply });

  res.json({ logs: [reply] });
});

// --- Run Crew Mode ---
app.post("/team-run", (req, res) => {
  const { input } = req.body;
  const crew = ["emailBot", "taskBot", "analyticsBot", "researchBot"];
  let logs = [];

  logs.push(`🧑‍🤝‍🧑 Crew Meeting — Topic: "${input}"`);

  crew.forEach(bot => {
    const memory = getMemory(bot);
    const personality = personalities[bot];
    const last = memory.requests[memory.requests.length - 1];
    const knowledgeSummary = summarizeKnowledge(memory);
    let context = last ? ` (Last time: "${last.input}")` : "";

    logs.push(`${personality.intro}\n"${input}" → ${knowledgeSummary}${context}`);
  });

  // Crew banter
  logs.push("💡 TaskBot: 'AnalyticsBot, I back up your numbers!'");
  logs.push("😂 EmailBot: 'But add some ✨sparkle✨!'");
  logs.push("🔍 ResearchBot: 'I found a tool we should test.'");

  // Crew conclusion
  const summary = "✅ Crew Summary: Automate follow-ups + track churn + test onboarding tool.";
  logs.push(summary);

  saveMemory("team", { input, output: logs.join("\n") });

  res.json({ logs });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 AITaskFlo Factory backend running on http://localhost:${PORT}`);
});