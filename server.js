const express = require('express');
<<<<<<< HEAD
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes (BEFORE static file serving)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./src/routes/tasks'));

// Serve HTML files from root (AFTER API routes)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ AITaskFlo server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`📋 Tasks API: http://localhost:${PORT}/api/tasks`);
=======
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000; // Changed to 3000

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Activity logging
const logActivity = (action, details, userId = 'anonymous') => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details
  };
  
  const logFile = path.join(logsDir, 'activity.log');
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

// Bot memory
const botMemory = new Map();

// Bot definitions
const bots = {};

// Medical Bot - connects to FastAPI on port 8000
bots.medicalBot = async (input, memory, userId) => {
  try {
    const response = await axios.post('http://localhost:8000/predict', {
      text: input,
      return_probabilities: true
    }, {
      headers: { 'X-API-Key': 'demo' },
      timeout: 10000
    });
    
    const { prediction, confidence, probabilities } = response.data;
    
    const responses = [
      `[MedicalBot] 🏥 Analyzing: "${input}"`,
      `[MedicalBot] 🎯 Specialty: ${prediction}`,
      `[MedicalBot] 📈 Confidence: ${(confidence * 100).toFixed(1)}%`,
      `[MedicalBot] ⚠️ Consult a healthcare professional`
    ];
    
    return { 
      responses, 
      apiData: { prediction, confidence, probabilities }
    };
  } catch (error) {
    return {
      responses: [
        `[MedicalBot] ⚠️ Service unavailable`,
        `[MedicalBot] Error: ${error.message}`,
        `[MedicalBot] Make sure FastAPI is running on port 8000`
      ],
      apiData: { error: error.message }
    };
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/medical', (req, res) => {
  res.sendFile(path.join(__dirname, 'medical.html'));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    port: PORT
  });
});

// Medical prediction endpoint - proxies to FastAPI
app.post('/medical-predict', apiLimiter, [
  body('text').isString().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { text } = req.body;
  const userId = req.headers['x-user-id'] || 'anonymous';

  try {
    // Call FastAPI on port 8000
    const response = await axios.post('http://localhost:8000/predict', {
      text: text,
      return_probabilities: true
    }, {
      headers: { 'X-API-Key': 'demo' },
      timeout: 10000
    });

    logActivity('medical_prediction', { 
      text: text.substring(0, 100),
      prediction: response.data.prediction 
    }, userId);

    res.json({
      success: true,
      ...response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Medical prediction error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Medical AI service unavailable',
      message: 'Please ensure FastAPI server is running on port 8000'
    });
  }
});

// Run bot endpoint
app.post('/run-bot', apiLimiter, [
  body('botName').isString(),
  body('input').isString().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { botName, input } = req.body;
  const userId = req.headers['x-user-id'] || 'anonymous';

  if (!bots[botName]) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  try {
    let memory = botMemory.get(userId) || [];
    const result = await bots[botName](input, memory, userId);
    
    memory.push({ input, output: result.responses });
    botMemory.set(userId, memory.slice(-10));

    logActivity('bot_execution', { botName, input: input.substring(0, 50) }, userId);

    res.json({
      success: true,
      responses: result.responses,
      apiData: result.apiData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Bot execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Bot execution failed',
      message: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 AITaskFlo Server Started!');
  console.log('================================');
  console.log(`📡 Node.js Port: ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🏥 Medical Page: http://localhost:${PORT}/medical`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log(`🔗 FastAPI Backend: http://localhost:8000`);
  console.log(`🔗 API Docs: http://localhost:8000/docs`);
  console.log('================================');
  console.log('');
>>>>>>> 7abc438 (deploy: 2025-11-11)
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
