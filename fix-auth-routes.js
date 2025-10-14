const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

// Find the 404 handler line
const lines = content.split('\n');
let notFoundLine = -1;
let authRoutesStart = -1;
let authRoutesEnd = -1;

for (let i = 0; i < lines.length; i++) {
  // Find 404 handler (the app.use before "Page not found")
  if (lines[i].includes("res.status(404).json({ error: 'Page not found' })")) {
    // Go backwards to find the app.use
    for (let j = i; j >= 0; j--) {
      if (lines[j].trim().startsWith('app.use((req, res, next)')) {
        notFoundLine = j;
        break;
      }
    }
  }
  
  // Find auth routes
  if (lines[i].includes('// AUTH ROUTES')) {
    authRoutesStart = i;
  }
  if (lines[i].includes("app.use('/auth', authRoutes)")) {
    authRoutesEnd = i;
  }
}

console.log('404 handler at line:', notFoundLine);
console.log('Auth routes at lines:', authRoutesStart, '-', authRoutesEnd);

if (authRoutesStart > notFoundLine && notFoundLine > 0) {
  console.log('❌ Auth routes are AFTER 404 handler - fixing...');
  
  // Extract auth routes section (including comments)
  const authSection = lines.slice(authRoutesStart, authRoutesEnd + 1);
  
  // Remove from current position
  lines.splice(authRoutesStart, authRoutesEnd - authRoutesStart + 1);
  
  // Re-calculate 404 line after removal
  notFoundLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("res.status(404).json({ error: 'Page not found' })")) {
      for (let j = i; j >= 0; j--) {
        if (lines[j].trim().startsWith('app.use((req, res, next)')) {
          notFoundLine = j;
          break;
        }
      }
      break;
    }
  }
  
  // Insert BEFORE 404 handler
  lines.splice(notFoundLine, 0, '', ...authSection, '');
  
  fs.writeFileSync('server.js', lines.join('\n'));
  console.log('✅ Fixed! Auth routes moved before 404 handler');
} else {
  console.log('✅ Auth routes are already in correct position');
}
