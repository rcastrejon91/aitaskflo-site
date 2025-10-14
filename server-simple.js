const express = require('express');
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Disable cache
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
});

// Simple lead capture (logs to console for now)
app.post('/api/capture-lead', (req, res) => {
    console.log('📧 New lead:', req.body);
    res.json({ success: true, message: 'Lead captured!' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`🤖 Bot Studio: http://localhost:${PORT}/studio.html\n`);
});
