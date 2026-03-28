const Database = require("better-sqlite3");
const db = new Database("/home/aitaskflo/data/lyra.db");
db.prepare("INSERT OR REPLACE INTO subscriptions (user_id, plan, status, updated_at) VALUES ('b9969c91-8bb4-4377-aae5-94e2a8b7f718', 'pro', 'active', datetime('now'))").run();
const row = db.prepare("SELECT plan, status FROM subscriptions WHERE user_id='b9969c91-8bb4-4377-aae5-94e2a8b7f718'").get();
console.log("Result:", row);
db.close();
