// server.js
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Simulated bot personalities
const bots = {
  emailBot: (input) => [
    `[EmailBot] You said: "${input}"`,
    "[EmailBot] 💌 Drafting a friendly reply...",
    "[EmailBot] ✅ Reply sent!"
  ],
  taskBot: (input) => [
    `[TaskBot] Task received: "${input}"`,
    "[TaskBot] 🗂️ Logging into task manager...",
    "[TaskBot] ✅ Task assigned successfully."
  ],
  analyticsBot: (input) => [
    `[AnalyticsBot] Question: "${input}"`,
    "[AnalyticsBot] 📊 Running analysis...",
    "[AnalyticsBot] ✅ Insight: Engagement up 12% this week!"
  ],
  researchBot: (input) => [
    `[ResearchBot] Query: "${input}"`,
    "[ResearchBot] 🔍 Searching sources...",
    "[ResearchBot] ✅ Found 3 relevant articles."
  ]
};

// --- Run a single bot ---
app.post("/run-bot", (req, res) => {
  const { botName, input } = req.body;
  if (bots[botName]) {
    res.json({ logs: bots[botName](input) });
  } else {
    res.status(404).json({ logs: [`❌ No bot found: ${botName}`] });
  }
});

// --- Run the whole crew ---
app.post("/team-run", (req, res) => {
  const { input } = req.body;
  let logs = [];

  logs.push(`🧑‍🤝‍🧑 Crew Meeting — Topic: "${input}"`);

  logs.push(...bots.emailBot(input));
  logs.push(...bots.taskBot(input));
  logs.push(...bots.analyticsBot(input));
  logs.push(...bots.researchBot(input));

  logs.push("💡 TaskBot: I agree with AnalyticsBot’s numbers!");
  logs.push("😂 EmailBot: But don’t forget to add ✨sparkle✨!");
  logs.push("🔍 ResearchBot: I found a tool we should test.");
  logs.push("✅ Crew Summary: Automate follow-ups + track metrics + test new tools.");

  res.json({ logs });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 AITaskFlo Factory backend running on http://localhost:${PORT}`);
});