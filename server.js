const express = require(‘express’);
const path = require(‘path’);
const cors = require(‘cors’);
const rateLimit = require(‘express-rate-limit’);
const { body, validationResult } = require(‘express-validator’);
const axios = require(‘axios’);
const helmet = require(‘helmet’);
require(‘dotenv’).config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({
contentSecurityPolicy: {
directives: {
defaultSrc: [”‘self’”],
scriptSrc: [”‘self’”, “‘unsafe-inline’”, “https://cdn.jsdelivr.net”],
styleSrc: [”‘self’”, “‘unsafe-inline’”, “https://fonts.googleapis.com”],
fontSrc: [”‘self’”, “https://fonts.gstatic.com”],
imgSrc: [”‘self’”, “data:”, “https:”],
connectSrc: [”‘self’”, process.env.FASTAPI_URL || “http://localhost:8000”]
}
}
}));

app.use(cors({
origin: process.env.ALLOWED_ORIGINS?.split(’,’) || ‘*’,
methods: [‘GET’, ‘POST’, ‘PUT’, ‘DELETE’, ‘OPTIONS’],
allowedHeaders: [‘Content-Type’, ‘Authorization’, ‘X-User-ID’]
}));

app.use(express.json({ limit: ‘10mb’ }));
app.use(express.urlencoded({ extended: true, limit: ‘10mb’ }));
app.use(express.static(path.join(__dirname, ‘public’)));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 100,
standardHeaders: true,
legacyHeaders: false,
message: { success: false, error: ‘Too many requests, please try again later.’ }
});

const strictLimiter = rateLimit({
windowMs: 60 * 1000, // 1 minute
max: 10,
message: { success: false, error: ‘Rate limit exceeded.’ }
});

// ─── In-Memory Bot State (Vercel-safe) ───────────────────────────────────────
const botMemory = new Map();

// ─── Activity Logger (Vercel-safe: console only) ─────────────────────────────
const logActivity = (action, details, userId = ‘anonymous’) => {
console.log(JSON.stringify({
timestamp: new Date().toISOString(),
action,
userId,
details
}));
};

// ─── Bot Definitions ──────────────────────────────────────────────────────────
const FASTAPI_URL = process.env.FASTAPI_URL || ‘http://localhost:8000’;

const bots = {
medicalBot: async (input, memory, userId) => {
try {
const response = await axios.post(`${FASTAPI_URL}/predict`, {
text: input,
return_probabilities: true
}, {
headers: { ‘X-API-Key’: process.env.FASTAPI_KEY || ‘demo’ },
timeout: 10000
});

```
  const { prediction, confidence, probabilities } = response.data;

  return {
    responses: [
      `🏥 Analyzing: "${input}"`,
      `🎯 Specialty: ${prediction}`,
      `📈 Confidence: ${(confidence * 100).toFixed(1)}%`,
      `⚠️ Always consult a licensed healthcare professional.`
    ],
    apiData: { prediction, confidence, probabilities }
  };
} catch (error) {
  console.error('MedicalBot error:', error.message);
  return {
    responses: [
      `⚠️ Medical AI service is currently unavailable.`,
      `Please try again shortly.`
    ],
    apiData: { error: error.message }
  };
}
```

}
};

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get(’/health’, (req, res) => {
res.status(200).json({
status: ‘ok’,
timestamp: new Date().toISOString(),
uptime: process.uptime(),
environment: process.env.NODE_ENV || ‘development’,
version: process.env.npm_package_version || ‘1.0.0’
});
});

// ─── Page Routes ──────────────────────────────────────────────────────────────
const pages = [’’, ‘login’, ‘register’, ‘dashboard’, ‘medical’];

pages.forEach(page => {
const route = page ? `/${page}` : ‘/’;
const file = page ? `${page}.html` : ‘index.html’;
app.get(route, (req, res) => {
res.sendFile(path.join(__dirname, ‘public’, file));
});
});

// ─── Medical Prediction ───────────────────────────────────────────────────────
app.post(’/api/medical/predict’,
strictLimiter,
body(‘text’).isString().trim().isLength({ min: 1, max: 1000 }).escape(),
async (req, res) => {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ success: false, errors: errors.array() });
}

```
const { text } = req.body;
const userId = req.headers['x-user-id'] || 'anonymous';

try {
  const response = await axios.post(`${FASTAPI_URL}/predict`, {
    text,
    return_probabilities: true
  }, {
    headers: { 'X-API-Key': process.env.FASTAPI_KEY || 'demo' },
    timeout: 10000
  });

  logActivity('medical_prediction', {
    preview: text.substring(0, 100),
    prediction: response.data.prediction
  }, userId);

  res.json({
    success: true,
    ...response.data,
    timestamp: new Date().toISOString()
  });
} catch (error) {
  console.error('Medical prediction error:', error.message);
  res.status(503).json({
    success: false,
    error: 'Medical AI service unavailable',
    message: 'Please try again later.'
  });
}
```

}
);

// ─── Bot Runner ───────────────────────────────────────────────────────────────
app.post(’/api/bot/run’,
apiLimiter,
body(‘botName’).isString().trim().isIn(Object.keys(bots)),
body(‘input’).isString().trim().isLength({ min: 1, max: 1000 }).escape(),
async (req, res) => {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ success: false, errors: errors.array() });
}

```
const { botName, input } = req.body;
const userId = req.headers['x-user-id'] || 'anonymous';

try {
  const memory = botMemory.get(userId) || [];
  const result = await bots[botName](input, memory, userId);

  // Keep last 10 interactions per user
  botMemory.set(userId, [...memory, { input, output: result.responses }].slice(-10));

  logActivity('bot_execution', {
    botName,
    preview: input.substring(0, 50)
  }, userId);

  res.json({
    success: true,
    botName,
    responses: result.responses,
    apiData: result.apiData,
    timestamp: new Date().toISOString()
  });
} catch (error) {
  console.error('Bot execution error:', error.message);
  res.status(500).json({
    success: false,
    error: 'Bot execution failed',
    message: error.message
  });
}
```

}
);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
res.status(404).json({
success: false,
error: ‘Not found’,
path: req.path,
timestamp: new Date().toISOString()
});
});

// ─── Global Error Handler (Express 5 compatible) ─────────────────────────────
app.use((err, req, res, next) => {
console.error(‘Unhandled error:’, err.stack);
res.status(err.status || 500).json({
success: false,
error: process.env.NODE_ENV === ‘production’ ? ‘Something went wrong.’ : err.message,
timestamp: new Date().toISOString()
});
});

// ─── Export for Vercel ────────────────────────────────────────────────────────
module.exports = app;

// ─── Local Dev Server ─────────────────────────────────────────────────────────
if (require.main === module) {
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`✅ AITaskFlo running on http://localhost:${PORT}`);
console.log(`🏥 Health: http://localhost:${PORT}/health`);
console.log(`🤖 Bot API: http://localhost:${PORT}/api/bot/run`);
console.log(`🔬 Medical API: http://localhost:${PORT}/api/medical/predict`);
});
}