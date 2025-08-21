// server.js
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Simulated bots
const bots = {
  receptionist: () => [
    "[Receptionist Bot] Checking available slots…",
    "[Receptionist Bot] ✅ Appointment booked for Friday at 2PM."
  ],
  billing: () => [
    "[Billing Bot] Preparing invoice…",
    "[Billing Bot] ✅ Invoice #1234 sent to customer."
  ],
  analytics: () => [
    "[Analytics Bot] Crunching business data…",
    "[Analytics Bot] 📊 Insights: Top customers this week = Alice, Bob, Charlie."
  ],
  security: () => [
    "[Security Bot] Scanning request…",
    "[Security Bot] ✅ No threats detected."
  ]
};

// Endpoint for bots
app.post("/run/:bot", (req, res) => {
  const { bot } = req.params;
  if (bots[bot]) {
    res.json({ logs: bots[bot]() });
  } else {
    res.status(404).json({ logs: [`[Orchestrator] ❌ No bot found: ${bot}`] });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bot Orchestrator running on http://localhost:${PORT}`);
});