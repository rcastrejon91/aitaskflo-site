const db = require("better-sqlite3")("data/lyra.db");
const result = db.prepare(
  "UPDATE subscriptions SET plan='pro' WHERE user_id=(SELECT id FROM auth_users WHERE email='aitaskflo@gmail.com')"
).run();
console.log("Rows updated:", result.changes);
if (result.changes === 0) {
  // Maybe no subscription row yet — insert one
  const user = db.prepare("SELECT id FROM auth_users WHERE email='aitaskflo@gmail.com'").get();
  if (user) {
    db.prepare("INSERT OR REPLACE INTO subscriptions (user_id, plan) VALUES (?, 'pro')").run(user.id);
    console.log("Inserted pro subscription for user:", user.id);
  } else {
    console.log("User not found.");
  }
}
