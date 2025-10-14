const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');
let lines = content.split('\n');

// Find module.exports line
const exportIndex = lines.findIndex(line => line.trim() === 'module.exports = app;');

if (exportIndex === -1) {
  console.log('❌ Could not find module.exports');
  process.exit(1);
}

// Check if auth routes already exist
const hasAuthRoutes = content.includes("require('./routes/auth')");

if (hasAuthRoutes) {
  console.log('⚠️  Auth routes already exist, removing old ones...');
  // Remove all lines with authRoutes
  lines = lines.filter(line => !line.includes('authRoutes') && !line.includes('AUTH ROUTES'));
  
  // Re-find export index after filtering
  const newExportIndex = lines.findIndex(line => line.trim() === 'module.exports = app;');
  
  // Insert auth routes
  lines.splice(newExportIndex, 0, 
    '',
    '// ==========================================',
    '// AUTH ROUTES',
    '// ==========================================',
    "const authRoutes = require('./routes/auth');",
    "app.use('/auth', authRoutes);",
    ''
  );
} else {
  // Insert auth routes before module.exports
  lines.splice(exportIndex, 0, 
    '',
    '// ==========================================',
    '// AUTH ROUTES', 
    '// ==========================================',
    "const authRoutes = require('./routes/auth');",
    "app.use('/auth', authRoutes);",
    ''
  );
}

fs.writeFileSync('server.js', lines.join('\n'));
console.log('✅ Auth routes added successfully!');
