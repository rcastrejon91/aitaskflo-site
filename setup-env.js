#!/usr/bin/env node
/**
 * Interactive .env.local setup script
 * Run: node setup-env.js
 */
const readline = require("readline");
const fs = require("fs");
const path = require("path");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, def) => new Promise((res) => rl.question(q + (def ? ` [${def}]` : "") + ": ", (a) => res(a.trim() || def || "")));

const ENV_FILE = path.join(__dirname, ".env.local");

async function main() {
  console.log("\n=== Lyra .env.local Setup ===\n");
  console.log("Press Enter to keep existing value shown in [brackets]\n");

  // Load existing values
  let existing = {};
  if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, "utf8").split("\n");
    for (const line of lines) {
      const [k, ...v] = line.split("=");
      if (k && v.length) existing[k.trim()] = v.join("=").trim();
    }
  }

  const keys = {
    ANTHROPIC_API_KEY: "Anthropic API key (sk-ant-...)",
    GROQ_API_KEY: "Groq API key (gsk_...)",
    HF_TOKEN: "Hugging Face token (hf_...)",
    POLLINATIONS_TOKEN: "Pollinations token",
    STRIPE_SECRET_KEY: "Stripe secret key (sk_live_... or sk_test_...)",
    STRIPE_PUBLISHABLE_KEY: "Stripe publishable key (pk_live_...)",
    STRIPE_WEBHOOK_SECRET: "Stripe webhook secret (whsec_...)",
    STRIPE_PRO_PRICE_ID: "Stripe Pro price ID (price_...)",
    NEXTAUTH_URL: "Your site URL (e.g. https://aitaskflo.com)",
    NEXTAUTH_SECRET: "NextAuth secret (any random string)",
    PYTHON_ORCHESTRATOR_URL: "Python orchestrator URL",
  };

  const result = {};
  for (const [key, label] of Object.entries(keys)) {
    const val = await ask(`${label}`, existing[key]);
    if (val) result[key] = val;
  }

  const content = Object.entries(result).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  fs.writeFileSync(ENV_FILE, content, "utf8");
  console.log(`\n✅ Saved to ${ENV_FILE}`);
  console.log("Run: pm2 restart aitaskflo --update-env\n");
  rl.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
