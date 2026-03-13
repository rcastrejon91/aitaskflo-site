// ─── IMPORTS ──────────────────────────────────────────────────────────────────
// These are npm packages your app needs to run.
// Think of them like ingredients before you cook.

const express = require(‘express’);         // The actual web server framework
const path = require(‘path’);               // Helps build file paths that work on any OS
const cors = require(‘cors’);               // Lets other websites/apps talk to your API
const rateLimit = require(‘express-rate-limit’); // Prevents abuse by limiting requests
const { body, validationResult } = require(‘express-validator’); // Validates user input
const axios = require(‘axios’);             // Makes HTTP requests to other APIs
const helmet = require(‘helmet’);           // Adds security headers automatically
require(‘dotenv’).config();                 // Loads your .env file (secret keys, URLs, etc.)

// ─── CREATE THE APP ───────────────────────────────────────────────────────────
// This creates your Express app. Everything else gets attached to this.
const app = express();

// ─── SECURITY HEADERS (Helmet) ────────────────────────────────────────────────
// Helmet automatically sets HTTP headers that protect against common attacks.
// The Content Security Policy (CSP) controls what resources your site can load.
app.use(helmet({
contentSecurityPolicy: {
directives: {
defaultSrc: [”‘self’”],                              // Only load from your own domain by default
scriptSrc: [”‘self’”, “‘unsafe-inline’”, “https://cdn.jsdelivr.net”], // Allow scripts from your site + CDN
styleSrc: [”‘self’”, “‘unsafe-inline’”, “https://fonts.googleapis.com”], // Allow Google Fonts CSS
fontSrc: [”‘self’”, “https://fonts.gstatic.com”],   // Allow Google Fonts files
imgSrc: [”‘self’”, “data:”, “https:”],               // Allow images from anywhere (https)
connectSrc: [”‘self’”, process.env.FASTAPI_URL || “http://localhost:8000”] // Allow API calls to FastAPI
}
}
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
// CORS = Cross-Origin Resource Sharing.
// Controls which websites are allowed to call your API.
// If ALLOWED_ORIGINS is set in .env, only those sites can call you.
// Otherwise everyone can (’*’).
app.use(cors({
origin: process.env.ALLOWED_ORIGINS?.split(’,’) || ’*’,
methods: [‘GET’, ‘POST’, ‘PUT’, ‘DELETE’, ‘OPTIONS’],
allowedHeaders: [‘Content-Type’, ‘Authorization’, ‘X-User-ID’]
}));

// ─── BODY PARSERS ─────────────────────────────────────────────────────────────
// These tell Express how to read incoming request data.
// Without these, req.body would always be undefined.
app.use(express.json({ limit: ‘10mb’ }));               // Parse JSON bodies (API requests)
app.use(express.urlencoded({ extended: true, limit: ‘10mb’ })); // Parse form submissions

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
// This serves your HTML, CSS, JS, and image files.
// FIX: Your HTML files live in the ROOT of your repo (not a /public folder).
// __dirname = the folder where server.js lives = root of your repo.
// So we point directly to __dirname instead of __dirname + ‘/public’.
app.use(express.static(path.join(__dirname)));

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
// Prevents someone from hammering your API with thousands of requests.

// General API limiter: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
max: 100,
standardHeaders: true,    // Returns rate limit info in response headers
legacyHeaders: false,
message: { success: false, error: ‘Too many requests, please try again later.’ }
});

// Strict limiter for sensitive endpoints: 10 requests per minute per IP
const strictLimiter = rateLimit({
windowMs: 60 * 1000, // 1 minute
max: 10,
message: { success: false, error: ‘Rate limit exceeded.’ }
});

// ─── BOT MEMORY ───────────────────────────────────────────────────────────────
// A Map is like a dictionary — stores key/value pairs.
// This keeps each user’s conversation history with the bots.
// Lives in RAM which is Vercel-safe. Resets on cold starts — okay for now.
const botMemory = new Map();

// ─── ACTIVITY LOGGER ──────────────────────────────────────────────────────────
// Logs what’s happening in your app.
// Uses console.log instead of writing to files (Vercel filesystem is read-only).
// These logs appear in your Vercel dashboard under Runtime Logs.
const logActivity = (action, details, userId = ‘anonymous’) => {
console.log(JSON.stringify({
timestamp: new Date().toISOString(), // When it happened
action,                              // What happened (e.g. ‘medical_prediction’)
userId,                              // Who did it
details                              // Extra context
}));
};

// ─── FASTAPI URL ──────────────────────────────────────────────────────────────
// Your Python FastAPI backend URL.
// Set FASTAPI_URL in Vercel environment variables to point to your real backend.
// Falls back to localhost for local development only.
const FASTAPI_URL = process.env.FASTAPI_URL || ‘http://localhost:8000’;

// ─── BOT DEFINITIONS ──────────────────────────────────────────────────────────
// Your AI bots live here. Each bot is an async function that:
// 1. Takes user input + conversation memory
// 2. Calls an API or runs some logic
// 3. Returns response messages to show the user

const bots = {

// Medical Bot: sends text to your FastAPI ML model for medical specialty prediction
medicalBot: async (input, memory, userId) => {
try {
// POST to your FastAPI /predict endpoint
const response = await axios.post(`${FASTAPI_URL}/predict`, {
text: input,
return_probabilities: true
}, {
headers: { ‘X-API-Key’: process.env.FASTAPI_KEY || ‘demo’ },
timeout: 10000 // Give up after 10 seconds if no response
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
  // If FastAPI is down or unreachable, return a friendly error instead of crashing
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

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
// GET /health — ping this to verify your server is alive.
// Vercel and monitoring tools use this automatically.
app.get(’/health’, (req, res) => {
res.status(200).json({
status: ‘ok’,
timestamp: new Date().toISOString(),
uptime: process.uptime(),           // Seconds since server started
environment: process.env.NODE_ENV || ‘development’,
version: process.env.npm_package_version || ‘1.0.0’
});
});

// ─── PAGE ROUTES ──────────────────────────────────────────────────────────────
// Serves your HTML pages when someone visits a URL.
// FIX: Removed ‘public’ from path — files are in root, not /public.
// Added all pages found in your repo.

const pages = [
‘’, ‘login’, ‘register’, ‘dashboard’, ‘medical’,
‘pricing’, ‘careers’, ‘waitlist’, ‘thank-you’, ‘factory’, ‘funding’
];

pages.forEach(page => {
const route = page ? `/${page}` : ‘/’;              // ‘’ => ‘/’, ‘login’ => ‘/login’
const file = page ? `${page}.html` : ‘index.html’; // ‘login’ => ‘login.html’

app.get(route, (req, res) => {
// sendFile needs an absolute path — path.join(__dirname, file) gives us that
res.sendFile(path.join(__dirname, file));
});
});

// ─── MEDICAL PREDICTION API ───────────────────────────────────────────────────
// POST /api/medical/predict
// Body: { text: “patient has chest pain” }
// Validates input then calls FastAPI and returns the prediction.
app.post(’/api/medical/predict’,
strictLimiter, // Max 10 requests per minute — protects your ML model
body(‘text’).isString().trim().isLength({ min: 1, max: 1000 }).escape(), // Sanitize input
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
    preview: text.substring(0, 100), // Only log first 100 chars for privacy
    prediction: response.data.prediction
  }, userId);

  res.json({
    success: true,
    ...response.data,               // Spread all fields from FastAPI response
    timestamp: new Date().toISOString()
  });
} catch (error) {
  console.error('Medical prediction error:', error.message);
  res.status(503).json({            // 503 = Service Unavailable
    success: false,
    error: 'Medical AI service unavailable',
    message: 'Please try again later.'
  });
}
```

}
);

// ─── BOT RUNNER API ───────────────────────────────────────────────────────────
// POST /api/bot/run
// Body: { botName: ‘medicalBot’, input: ‘chest pain and fever’ }
// Runs any bot by name and returns its responses.
app.post(’/api/bot/run’,
apiLimiter, // Max 100 requests per 15 min
body(‘botName’).isString().trim().isIn(Object.keys(bots)), // Must match a real bot name
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
  const memory = botMemory.get(userId) || []; // Get this user's history or start fresh
  const result = await bots[botName](input, memory, userId); // Run the bot

  // Add this interaction to memory, keep only the last 10
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

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
// Catches any request that didn’t match a route above.
// MUST come after all your routes.
app.use((req, res) => {
res.status(404).json({
success: false,
error: ‘Not found’,
path: req.path,
timestamp: new Date().toISOString()
});
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
// Catches any unhandled errors thrown anywhere in your app.
// The 4 parameters (err, req, res, next) tells Express this is an error handler.
// MUST come absolutely last.
app.use((err, req, res, next) => {
console.error(‘Unhandled error:’, err.stack);
res.status(err.status || 500).json({
success: false,
// Hide technical details from users in production (security)
error: process.env.NODE_ENV === ‘production’ ? ‘Something went wrong.’ : err.message,
timestamp: new Date().toISOString()
});
});

// ─── EXPORT FOR VERCEL ────────────────────────────────────────────────────────
// Vercel imports your app as a module instead of running it directly.
// This line is what makes it work on Vercel serverless functions.
module.exports = app;

// ─── LOCAL DEV SERVER ─────────────────────────────────────────────────────────
// Only runs when you do ‘node server.js’ on your local machine.
// require.main === module = “am I the file being run directly?”
// Vercel SKIPS this block and uses module.exports above instead.
if (require.main === module) {
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`✅ AITaskFlo running on http://localhost:${PORT}`);
console.log(`🏥 Health: http://localhost:${PORT}/health`);
console.log(`🤖 Bot API: http://localhost:${PORT}/api/bot/run`);
console.log(`🔬 Medical API: http://localhost:${PORT}/api/medical/predict`);
});
}