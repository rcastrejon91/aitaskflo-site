const fs = require('fs');

// Read server.js
let content = fs.readFileSync('server.js', 'utf8');

// Find the line with module.exports
const lines = content.split('\n');
const exportIndex = lines.findIndex(line => line.includes('module.exports = app;'));

if (exportIndex === -1) {
  console.log('❌ Could not find module.exports line');
  process.exit(1);
}

// Insert auth routes BEFORE module.exports
const authRoutes = `
// ==========================================
// AUTH ROUTES
// ==========================================
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);
`;

lines.splice(exportIndex, 0, authRoutes);

// Write back
fs.writeFileSync('server.js', lines.join('\n'));
console.log('✅ Auth routes added successfully!');
