const Database = require("better-sqlite3");
const db = new Database("/home/aitaskflo/data/lyra.db");

// Check auth accounts table
try {
  console.log("Accounts:", db.prepare("SELECT * FROM accounts LIMIT 10").all());
} catch { console.log("No accounts table"); }

try {
  console.log("Auth users:", db.prepare("SELECT * FROM auth_users LIMIT 10").all());
} catch { console.log("No auth_users table"); }

// List all tables
console.log("Tables:", db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());

db.close();
