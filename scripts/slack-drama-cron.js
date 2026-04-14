/**
 * scripts/slack-drama-cron.js
 * Run this via PM2 cron_restart or system crontab to fire drama sessions.
 *
 * PM2 setup (run once on your DigitalOcean server):
 *   pm2 start scripts/slack-drama-cron.js --name "slack-drama" --cron "0 9,12,15,18,21 * * *" --no-autorestart
 *   pm2 save
 *
 * Or add to system crontab: crontab -e
 *   0 9,12,15,18,21 * * * node /home/your-user/aitaskflo/scripts/slack-drama-cron.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;
const CHANNEL = process.env.SLACK_DRAMA_CHANNEL || "general";

if (!CRON_SECRET) {
  console.error("CRON_SECRET not set — exiting");
  process.exit(1);
}

async function main() {
  console.log(`[slack-drama] Firing drama session at ${new Date().toISOString()}`);

  try {
    const res = await fetch(`${BASE_URL}/api/slack/drama`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: CRON_SECRET,
        channel: CHANNEL,
        count: 4,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      console.log(`[slack-drama] Posted ${data.posted} messages`);
      data.messages?.forEach(m => console.log(" -", m));
    } else {
      console.error("[slack-drama] Error:", data.error);
    }
  } catch (err) {
    console.error("[slack-drama] Failed:", err.message);
  }
}

main();
