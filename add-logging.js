const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Find where to add logging (before 404 handler)
const logMiddleware = `
// DEBUG: Log all requests
app.use((req, res, next) => {
  console.log(\`📥 \${req.method} \${req.path}\`);
  next();
});
`;

// Find 404 handler line
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("res.status(404).json({ error: 'Page not found' })")) {
    for (let j = i; j >= 0; j--) {
      if (lines[j].trim().startsWith('app.use((req, res, next)')) {
        // Insert logging before 404
        lines.splice(j, 0, logMiddleware);
        break;
      }
    }
    break;
  }
}

fs.writeFileSync('server.js', lines.join('\n'));
console.log('✅ Added request logging');
