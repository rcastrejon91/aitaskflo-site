#!/usr/bin/env node
// One-time migration: split shared memories.json into per-user files
// Run on server: node scripts/migrate-memories.js

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR ?? "/home/aitaskflo/data";
const sharedFile = path.join(DATA_DIR, "memories.json");

if (!fs.existsSync(sharedFile)) {
  console.log("No memories.json found — nothing to migrate.");
  process.exit(0);
}

const memories = JSON.parse(fs.readFileSync(sharedFile, "utf-8"));
if (!Array.isArray(memories) || memories.length === 0) {
  console.log("memories.json is empty — nothing to migrate.");
  process.exit(0);
}

// Group by userId
const byUser = {};
const noUser = [];
for (const m of memories) {
  if (m.userId) {
    (byUser[m.userId] = byUser[m.userId] || []).push(m);
  } else {
    noUser.push(m);
  }
}

// Write per-user files
for (const [userId, mems] of Object.entries(byUser)) {
  const dest = path.join(DATA_DIR, `memories-${userId}.json`);
  fs.writeFileSync(dest, JSON.stringify(mems, null, 2), "utf-8");
  console.log(`  Written ${mems.length} memories → memories-${userId}.json`);
}

if (noUser.length > 0) {
  console.log(`  ${noUser.length} memories had no userId — left in memories.json`);
} else {
  // Rename the old shared file as backup
  fs.renameSync(sharedFile, sharedFile + ".migrated");
  console.log("  Renamed memories.json → memories.json.migrated (backup)");
}

console.log("Migration complete.");
