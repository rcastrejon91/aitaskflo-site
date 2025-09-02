// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('.'));

// --- SAFETY NET: Ensure core files exist ---
if (!fs.existsSync("admins.json")) {
  fs.writeFileSync("admins.json", JSON.stringify([
    { email: "admin@taskflo.com", password: "taskflo_01", active: true }
  ], null, 2));
  console.log("⚠️ Created default admins.json with 1 admin (admin@taskflo.com / taskflo_01)");
}

if (!fs.existsSync("db.json")) {
  fs.writeFileSync("db.json", JSON.stringify({ users: [], billing: [] }, null, 2));
  console.log("⚠️ Created empty db.json for customer accounts + billing");
}

// --- Bot Memory Utilities ---
function getMemory(botName) {
  const path = `./memory/${botName}.json`;
  if (!fs.existsSync("./memory")) fs.mkdirSync("./memory");
  if (!fs.existsSync(path)) return { history: [] };
  return JSON.parse(fs.readFileSync(path));
}

function saveMemory(botName, input, output) {
  const path = `./memory/${botName}.json`;
  const memory = getMemory(botName);
  memory.history.push({
    input,
    output,
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(path, JSON.stringify(memory, null, 2));
}

// --- Bot personalities ---
const bots = {
  emailBot: (input, memory) => [
    `[EmailBot] You said: "${input}"`,
    memory.history.length > 0
      ? `[EmailBot] Last time you asked: "${memory.history[memory.history.length - 1].input}"`
      : "[EmailBot] This is our first chat! 💌",
    "[EmailBot] ✅ Reply sent!"
  ],
  taskBot: (input, memory) => [
    `[TaskBot] Task received: "${input}"`,
    memory.history.length > 0
      ? `[TaskBot] Previously, you logged: "${memory.history[memory.history.length - 1].input}"`
      : "[TaskBot] New task created 🗂️",
    "[TaskBot] ✅ Task assigned successfully."
  ],
  analyticsBot: (input, memory) => [
    `[AnalyticsBot] Question: "${input}"`,
    memory.history.length > 0
      ? `[AnalyticsBot] Last analysis: "${memory.history[memory.history.length - 1].input}"`
      : "[AnalyticsBot] Running fresh analysis 📊",
    "[AnalyticsBot] ✅ Insight: Engagement up 12% this week!"
  ],
  researchBot: (input, memory) => [
    `[ResearchBot] Query: "${input}"`,
    memory.history.length > 0
      ? `[ResearchBot] You last searched: "${memory.history[memory.history.length - 1].input}"`
      : "[ResearchBot] Beginning new search 🔍",
    "[ResearchBot] ✅ Found 3 relevant articles."
  ]
};

// --- Run a single bot ---
app.post("/run-bot", (req, res) => {
  const { botName, input } = req.body;
  const memory = getMemory(botName);

  if (bots[botName]) {
    const output = bots[botName](input, memory);
    saveMemory(botName, input, output);
    res.json({ logs: output });
  } else {
    res.status(404).json({ logs: [`❌ No bot found: ${botName}`] });
  }
});

// --- Run the whole crew ---
app.post("/team-run", (req, res) => {
  const { input } = req.body;
  const crew = ["emailBot", "taskBot", "analyticsBot", "researchBot"];
  let logs = [];

  logs.push(`🧑‍🤝‍🧑 Crew Meeting — Topic: "${input}"`);

  crew.forEach(botName => {
    const memory = getMemory(botName);
    const output = bots[botName](input, memory);
    saveMemory(botName, input, output);
    logs.push(...output);
  });

  logs.push("💡 TaskBot: I agree with AnalyticsBot’s numbers!");
  logs.push("😂 EmailBot: But don’t forget to add ✨sparkle✨!");
  logs.push("🔍 ResearchBot: I found a tool we should test.");
  logs.push("✅ Crew Summary: Automate follow-ups + track metrics + test new tools.");

  saveMemory("team", input, logs);
  res.json({ logs });
});

// --- Admin Login ---
app.post("/admin-login", (req, res) => {
  const { email, password } = req.body;

  try {
    const admins = JSON.parse(fs.readFileSync("admins.json"));
    const admin = admins.find(a => a.email === email && a.password === password && a.active);

    if (admin) {
      res.json({ success: true, message: `✅ Welcome back, ${email}` });
    } else {
      res.status(401).json({ success: false, message: "❌ Invalid email or password" });
    }
  } catch (err) {
    console.error("Error reading admins.json:", err);
    res.status(500).json({ success: false, message: "⚠️ Server error" });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 AITaskFlo Factory backend running with MEMORY on http://localhost:${PORT}`);
});