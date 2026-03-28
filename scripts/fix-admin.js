const Database = require("better-sqlite3");
const db = new Database("/home/aitaskflo/data/lyra.db");

// Check schema
console.log("Users columns:", db.prepare("PRAGMA table_info(users)").all());
console.log("Users rows:", db.prepare("SELECT * FROM users LIMIT 5").all());
console.log("Subscriptions:", db.prepare("SELECT * FROM subscriptions LIMIT 5").all());

db.close();
