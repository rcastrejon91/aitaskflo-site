#!/usr/bin/env node
// Run on server: node scripts/write-env.js
const fs = require("fs");
const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lines = [];
console.log("Paste each KEY=VALUE line, one at a time. Type DONE when finished.\n");
rl.on("line", (input) => {
  if (input.trim() === "DONE") {
    fs.writeFileSync("/home/aitaskflo/.env.local", lines.join("\n") + "\n");
    console.log("Saved! Now run: pm2 restart aitaskflo --update-env");
    rl.close();
  } else if (input.trim()) {
    lines.push(input.trim());
    console.log("Added. Next line or DONE:");
  }
});
