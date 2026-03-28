const Database = require("better-sqlite3");
const db = new Database("/home/aitaskflo/data/lyra.db");
db.prepare("UPDATE subscriptions SET plan='pro', status='active' WHERE user_id='admin-1'").run();
const row = db.prepare("SELECT plan, status FROM subscriptions WHERE user_id='admin-1'").get();
console.log("Result:", row);
db.close();
