const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');
let lines = content.split('\n');

// Find key line numbers
let authRoutesStart = -1;
let authRoutesEnd = -1;
let notFoundHandler = -1;
let errorHandler = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// AUTH ROUTES') && authRoutesStart === -1) {
    authRoutesStart = i;
  }
  if (authRoutesStart !== -1 && authRoutesEnd === -1 && lines[i].includes("app.use('/auth', authRoutes)")) {
    authRoutesEnd = i;
  }
  if (lines[i].includes('Page not found') && notFoundHandler === -1) {
    // Find the app.use or app.all for 404
    for (let j = i - 10; j < i + 5; j++) {
      if (lines[j] && (lines[j].includes('app.use') || lines[j].includes('app.all')) && !lines[j].includes('//')) {
        notFoundHandler = j;
        break;
      }
    }
  }
  if (lines[i].includes('app.use((err, req, res, next)')) {
    errorHandler = i;
  }
}

console.log('Auth routes:', authRoutesStart, '-', authRoutesEnd);
console.log('404 handler:', notFoundHandler);
console.log('Error handler:', errorHandler);

if (authRoutesStart > notFoundHandler && notFoundHandler !== -1) {
  console.log('⚠️  Auth routes are AFTER 404 handler! Fixing...');
  
  // Extract auth routes section
  const authSection = lines.slice(authRoutesStart, authRoutesEnd + 1);
  
  // Remove auth routes from current position
  lines.splice(authRoutesStart, authRoutesEnd - authRoutesStart + 1);
  
  // Re-find 404 handler position after removal
  notFoundHandler = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Page not found')) {
      for (let j = i - 10; j < i + 5; j++) {
        if (lines[j] && (lines[j].includes('app.use') || lines[j].includes('app.all')) && !lines[j].includes('//')) {
          notFoundHandler = j;
          break;
        }
      }
      break;
    }
  }
  
  // Insert auth routes BEFORE 404 handler
  if (notFoundHandler !== -1) {
    lines.splice(notFoundHandler, 0, ...authSection, '');
    console.log('✅ Moved auth routes before 404 handler');
  }
  
  fs.writeFileSync('server.js', lines.join('\n'));
} else if (notFoundHandler === -1) {
  console.log('⚠️  No 404 handler found, auth routes should work');
} else {
  console.log('✅ Auth routes are already before 404 handler');
}
