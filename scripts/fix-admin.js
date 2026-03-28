const Database = require("better-sqlite3");
const db = new Database("/home/aitaskflo/data/lyra.db");
db.prepare("UPDATE subscriptions SET plan='pro', status='active' WHERE user_id=(SELECT id FROM users WHERE email='ricardomcastrejon@gmail.com')").run();
const row = db.prepare("SELECT plan, status FROM subscriptions WHERE user_id=(SELECT id FROM users WHERE email='ricardomcastrejon@gmail.com')").get();
console.log("Result:", row);
db.close();
