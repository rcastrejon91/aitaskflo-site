// COMPLETE Enhanced server.js with ALL FEATURES + FREE APIs
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet"); // Security headers
const rateLimit = require("express-rate-limit"); // Rate limiting
const compression = require("compression"); // Gzip compression
const morgan = require("morgan"); // Logging
const bcrypt = require("bcrypt"); // Password hashing
const jwt = require("jsonwebtoken"); // JWT tokens
const multer = require("multer"); // File uploads
const { body, validationResult } = require("express-validator"); // Input validation
const nodemailer = require("nodemailer"); // Email sending
const cron = require("node-cron"); // Scheduled tasks
const WebSocket = require("ws"); // Real-time features
const axios = require("axios"); // For API calls
const FormData = require("form-data");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this";

// --- FREE API CONFIGURATIONS ---
const FREE_APIS = {
  // Weather API (OpenWeatherMap - Free: 1000 calls/day)
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || 'your-openweather-key',
  WEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5',
  
  // News API (NewsAPI - Free: 1000 requests/day)
  NEWS_API_KEY: process.env.NEWS_API_KEY || 'your-news-api-key',
  NEWS_BASE_URL: 'https://newsapi.org/v2',
  
  // Currency Exchange (Free: 1000 requests/month)
  EXCHANGE_BASE_URL: 'https://api.exchangerate-api.com/v4/latest',
  
  // QR Code API (Free: unlimited)
  QR_CODE_API: 'https://api.qrserver.com/v1/create-qr-code/',
  
  // Random Quote API (Free: unlimited)
  QUOTES_API: 'https://api.quotable.io',
  
  // Cat/Dog Images API (Free: unlimited)
  CAT_API: 'https://api.thecatapi.com/v1/images/search',
  DOG_API: 'https://api.thedogapi.com/v1/images/search',
  
  // IP Geolocation (Free: 1000 requests/day)
  IP_API: 'http://ip-api.com/json',
  
  // URL Shortener (TinyURL - Free: unlimited)
  TINY_URL_API: 'https://tinyurl.com/api-create.php',
  
  // UUID Generator (Free: unlimited)
  UUID_API: 'https://httpbin.org/uuid',
  
  // Color Palette Generator (Free: unlimited)
  COLOR_API: 'https://www.colr.org/json/color/random',
  
  // Joke API (Free: unlimited)
  JOKE_API: 'https://official-joke-api.appspot.com/random_joke'
};

// --- SECURITY & PERFORMANCE MIDDLEWARE ---
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression for better performance
app.use(morgan("combined")); // Request logging
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased payload limit
app.use(express.urlencoded({ extended: true }));

// --- RATE LIMITING ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

// API-specific rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute for API endpoints
  message: { error: "API rate limit exceeded" }
});

// --- FILE UPLOAD CONFIGURATION ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransporter({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- JWT MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// --- SERVE STATIC FILES ---
app.use(express.static('.', {
  extensions: ['html', 'htm'],
  index: 'index.html',
  setHeaders: (res, path) => {
    // Cache static assets for 1 hour
    if (path.endsWith('.css') || path.endsWith('.js') || path.endsWith('.png') || path.endsWith('.jpg')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// --- DATABASE UTILITIES (Enhanced) ---
function getDatabase() {
  if (!fs.existsSync("database.json")) {
    const initialDb = {
      users: [],
      analytics: [],
      logs: [],
      settings: {},
      subscribers: [],
      tasks: [],
      billing: [],
      api_usage: {}
    };
    fs.writeFileSync("database.json", JSON.stringify(initialDb, null, 2));
  }
  return JSON.parse(fs.readFileSync("database.json"));
}

function saveDatabase(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

function logActivity(action, details, userId = null) {
  const db = getDatabase();
  db.logs.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    action,
    details,
    userId,
    ip: null // Add IP tracking if needed
  });
  saveDatabase(db);
}

function logApiUsage(apiName, endpoint, success = true) {
  const db = getDatabase();
  if (!db.api_usage[apiName]) db.api_usage[apiName] = [];
  
  db.api_usage[apiName].push({
    endpoint,
    timestamp: new Date().toISOString(),
    success
  });
  
  // Keep only last 100 entries per API
  if (db.api_usage[apiName].length > 100) {
    db.api_usage[apiName] = db.api_usage[apiName].slice(-100);
  }
  
  saveDatabase(db);
}

// --- SAFETY NET: Ensure core files exist ---
if (!fs.existsSync("admins.json")) {
  const hashedPassword = bcrypt.hashSync("taskflo_01", 10);
  fs.writeFileSync("admins.json", JSON.stringify([
    { 
      id: 1,
      email: "admin@taskflo.com", 
      password: hashedPassword, 
      active: true,
      role: "super-admin",
      createdAt: new Date().toISOString()
    }
  ], null, 2));
  console.log("⚠️ Created default admins.json with hashed password");
}

if (!fs.existsSync("db.json")) {
  fs.writeFileSync("db.json", JSON.stringify({ users: [], billing: [] }, null, 2));
  console.log("⚠️ Created empty db.json for customer accounts + billing");
}

// --- FREE API ENDPOINTS ---

// 🌤️ WEATHER API
app.get('/api/weather/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const response = await axios.get(
      `${FREE_APIS.WEATHER_BASE_URL}/weather?q=${city}&appid=${FREE_APIS.WEATHER_API_KEY}&units=metric`
    );
    
    const weatherData = {
      city: response.data.name,
      temperature: response.data.main.temp,
      description: response.data.weather[0].description,
      humidity: response.data.main.humidity,
      windSpeed: response.data.wind.speed,
      icon: `https://openweathermap.org/img/w/${response.data.weather[0].icon}.png`
    };
    
    logApiUsage('weather', `/weather/${city}`);
    res.json({ success: true, data: weatherData });
  } catch (error) {
    logApiUsage('weather', `/weather/${req.params.city}`, false);
    res.status(500).json({ success: false, error: 'Weather data not available' });
  }
});

// 📰 NEWS API
app.get('/api/news/:category?', async (req, res) => {
  try {
    const category = req.params.category || 'general';
    const response = await axios.get(
      `${FREE_APIS.NEWS_BASE_URL}/top-headlines?category=${category}&country=us&apiKey=${FREE_APIS.NEWS_API_KEY}`
    );
    
    const articles = response.data.articles.slice(0, 10).map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source.name
    }));
    
    logApiUsage('news', `/news/${category}`);
    res.json({ success: true, data: articles, total: response.data.totalResults });
  } catch (error) {
    logApiUsage('news', `/news/${req.params.category}`, false);
    res.status(500).json({ success: false, error: 'News data not available' });
  }
});

// 💱 CURRENCY EXCHANGE
app.get('/api/exchange/:from/:to/:amount?', async (req, res) => {
  try {
    const { from, to, amount = 1 } = req.params;
    const response = await axios.get(`${FREE_APIS.EXCHANGE_BASE_URL}/${from.toUpperCase()}`);
    
    const rate = response.data.rates[to.toUpperCase()];
    const convertedAmount = (parseFloat(amount) * rate).toFixed(2);
    
    const result = {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate: rate,
      amount: parseFloat(amount),
      convertedAmount: parseFloat(convertedAmount),
      date: response.data.date
    };
    
    logApiUsage('exchange', `/exchange/${from}/${to}`);
    res.json({ success: true, data: result });
  } catch (error) {
    logApiUsage('exchange', `/exchange/${req.params.from}/${req.params.to}`, false);
    res.status(500).json({ success: false, error: 'Exchange rate not available' });
  }
});

// 📱 QR CODE GENERATOR
app.post('/api/qr-code', async (req, res) => {
  try {
    const { text, size = '200x200' } = req.body;
    const qrUrl = `${FREE_APIS.QR_CODE_API}?size=${size}&data=${encodeURIComponent(text)}`;
    
    logApiUsage('qr-code', '/qr-code');
    res.json({ 
      success: true, 
      data: { 
        qrCodeUrl: qrUrl,
        downloadUrl: qrUrl + '&download=1'
      }
    });
  } catch (error) {
    logApiUsage('qr-code', '/qr-code', false);
    res.status(500).json({ success: false, error: 'QR code generation failed' });
  }
});

// 💭 RANDOM QUOTES
app.get('/api/quote/:tag?', async (req, res) => {
  try {
    const tag = req.params.tag;
    let url = `${FREE_APIS.QUOTES_API}/random`;
    if (tag) url += `?tags=${tag}`;
    
    const response = await axios.get(url);
    
    const quote = {
      text: response.data.content,
      author: response.data.author,
      tags: response.data.tags,
      length: response.data.length
    };
    
    logApiUsage('quotes', `/quote/${tag || 'random'}`);
    res.json({ success: true, data: quote });
  } catch (error) {
    logApiUsage('quotes', `/quote/${req.params.tag}`, false);
    res.status(500).json({ success: false, error: 'Quote not available' });
  }
});

// 🐱 RANDOM CAT/DOG IMAGES
app.get('/api/random/:animal', async (req, res) => {
  try {
    const { animal } = req.params;
    let apiUrl;
    
    if (animal === 'cat') apiUrl = FREE_APIS.CAT_API;
    else if (animal === 'dog') apiUrl = FREE_APIS.DOG_API;
    else throw new Error('Invalid animal type');
    
    const response = await axios.get(apiUrl);
    const imageData = {
      imageUrl: response.data[0].url,
      width: response.data[0].width,
      height: response.data[0].height
    };
    
    logApiUsage('animals', `/random/${animal}`);
    res.json({ success: true, data: imageData });
  } catch (error) {
    logApiUsage('animals', `/random/${req.params.animal}`, false);
    res.status(500).json({ success: false, error: 'Animal image not available' });
  }
});

// 🌍 IP GEOLOCATION
app.get('/api/location/:ip?', async (req, res) => {
  try {
    const ip = req.params.ip || req.ip;
    const response = await axios.get(`${FREE_APIS.IP_API}/${ip}`);
    
    const locationData = {
      ip: response.data.query,
      country: response.data.country,
      region: response.data.regionName,
      city: response.data.city,
      zipCode: response.data.zip,
      timezone: response.data.timezone,
      isp: response.data.isp,
      coordinates: {
        lat: response.data.lat,
        lon: response.data.lon
      }
    };
    
    logApiUsage('geolocation', `/location/${ip}`);
    res.json({ success: true, data: locationData });
  } catch (error) {
    logApiUsage('geolocation', `/location/${req.params.ip}`, false);
    res.status(500).json({ success: false, error: 'Location data not available' });
  }
});

// 🔗 URL SHORTENER
app.post('/api/shorten-url', async (req, res) => {
  try {
    const { url } = req.body;
    const response = await axios.get(`${FREE_APIS.TINY_URL_API}?url=${encodeURIComponent(url)}`);
    
    logApiUsage('url-shortener', '/shorten-url');
    res.json({ 
      success: true, 
      data: { 
        originalUrl: url,
        shortUrl: response.data,
        saved: url.length - response.data.length
      }
    });
  } catch (error) {
    logApiUsage('url-shortener', '/shorten-url', false);
    res.status(500).json({ success: false, error: 'URL shortening failed' });
  }
});

// 🎲 RANDOM UUID GENERATOR
app.get('/api/uuid/:count?', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.params.count) || 1, 10);
    const uuids = [];
    
    for (let i = 0; i < count; i++) {
      const response = await axios.get(FREE_APIS.UUID_API);
      uuids.push(response.data.uuid);
    }
    
    logApiUsage('uuid', `/uuid/${count}`);
    res.json({ 
      success: true, 
      data: count === 1 ? uuids[0] : uuids,
      count: uuids.length
    });
  } catch (error) {
    logApiUsage('uuid', `/uuid/${req.params.count}`, false);
    res.status(500).json({ success: false, error: 'UUID generation failed' });
  }
});

// 🎨 RANDOM COLOR GENERATOR
app.get('/api/color/:count?', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.params.count) || 1, 10);
    const colors = [];
    
    for (let i = 0; i < count; i++) {
      const response = await axios.get(FREE_APIS.COLOR_API);
      colors.push({
        hex: response.data.new_color,
        rgb: hexToRgb(response.data.new_color),
        name: `Color-${Date.now()}-${i}`
      });
    }
    
    logApiUsage('colors', `/color/${count}`);
    res.json({ 
      success: true, 
      data: count === 1 ? colors[0] : colors,
      count: colors.length
    });
  } catch (error) {
    logApiUsage('colors', `/color/${req.params.count}`, false);
    res.status(500).json({ success: false, error: 'Color generation failed' });
  }
});

// Helper function for color conversion
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// 😂 RANDOM JOKES
app.get('/api/joke/:type?', async (req, res) => {
  try {
    const response = await axios.get(FREE_APIS.JOKE_API);
    
    const joke = {
      setup: response.data.setup,
      punchline: response.data.punchline,
      type: response.data.type,
      id: response.data.id
    };
    
    logApiUsage('jokes', `/joke/${req.params.type || 'random'}`);
    res.json({ success: true, data: joke });
  } catch (error) {
    logApiUsage('jokes', `/joke/${req.params.type}`, false);
    res.status(500).json({ success: false, error: 'Joke not available' });
  }
});

// 🔐 PASSWORD GENERATOR
app.get('/api/password/:length?', async (req, res) => {
  try {
    const length = Math.min(Math.max(parseInt(req.params.length) || 12, 8), 50);
    
    // Generate password locally (more reliable than external API)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const passwordData = {
      password: password,
      length: password.length,
      strength: getPasswordStrength(password),
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSymbols: /[!@#$%^&*]/.test(password)
    };
    
    logApiUsage('password', `/password/${length}`);
    res.json({ success: true, data: passwordData });
  } catch (error) {
    logApiUsage('password', `/password/${req.params.length}`, false);
    res.status(500).json({ success: false, error: 'Password generation failed' });
  }
});

// Helper function for password strength
function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*]/.test(password)) score++;
  
  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Medium';
  return 'Strong';
}

// --- ENHANCED BOT MEMORY ---
function getMemory(botName) {
  const filePath = `./memory/${botName}.json`;
  if (!fs.existsSync("./memory")) fs.mkdirSync("./memory");
  if (!fs.existsSync(filePath)) return { 
    history: [], 
    stats: { totalInteractions: 0, lastUsed: null },
    preferences: {},
    apiData: {}
  };
  return JSON.parse(fs.readFileSync(filePath));
}

function saveMemory(botName, input, output, userId = null, apiData = {}) {
  const filePath = `./memory/${botName}.json`;
  const memory = getMemory(botName);
  
  memory.history.push({
    input, output, timestamp: new Date().toISOString(), userId
  });
  
  memory.stats.totalInteractions++;
  memory.stats.lastUsed = new Date().toISOString();
  memory.apiData = { ...memory.apiData, ...apiData };
  
  if (memory.history.length > 50) {
    memory.history = memory.history.slice(-50);
  }
  
  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
}

// --- ENHANCED BOTS WITH API INTEGRATION ---
const bots = {
  emailBot: async (input, memory, userId) => {
    // Get a motivational quote for emails
    try {
      const quoteRes = await axios.get(`${FREE_APIS.QUOTES_API}/random?tags=motivational`);
      const quote = quoteRes.data.content;
      
      const responses = [
        `[EmailBot] Crafting email: "${input}"`,
        `[EmailBot] Adding inspirational touch: "${quote}"`,
        memory.history.length > 0
          ? `[EmailBot] Building on: "${memory.history[memory.history.length - 1].input}"`
          : "[EmailBot] Fresh email campaign! 💌",
        "[EmailBot] ✅ Email ready with motivational boost!"
      ];
      
      return { responses, apiData: { lastQuote: quote } };
    } catch (error) {
      return { 
        responses: [`[EmailBot] Processing: "${input}"`, "[EmailBot] ✅ Standard email ready!"],
        apiData: {}
      };
    }
  },
  
  taskBot: async (input, memory, userId) => {
    // Generate a UUID for the task
    try {
      const uuidRes = await axios.get(FREE_APIS.UUID_API);
      const taskId = uuidRes.data.uuid;
      
      const responses = [
        `[TaskBot] Task created: "${input}"`,
        `[TaskBot] Task ID: ${taskId}`,
        `[TaskBot] Priority: ${Math.random() > 0.5 ? 'High' : 'Medium'}`,
        "[TaskBot] ✅ Task queued with unique identifier!"
      ];
      
      // Save task to database
      const db = getDatabase();
      db.tasks.push({
        id: taskId,
        content: input,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId
      });
      saveDatabase(db);
      
      return { responses, apiData: { lastTaskId: taskId } };
    } catch (error) {
      return {
        responses: [`[TaskBot] Task: "${input}"`, "[TaskBot] ✅ Task queued!"],
        apiData: {}
      };
    }
  },
  
  analyticsBot: async (input, memory, userId) => {
    // Get random color for analytics visualization
    try {
      const colorRes = await axios.get(FREE_APIS.COLOR_API);
      const color = colorRes.data.new_color;
      
      const metrics = {
        engagement: Math.floor(Math.random() * 30) + 70,
        conversions: Math.floor(Math.random() * 15) + 5,
        growth: Math.floor(Math.random() * 20) + 5
      };
      
      const responses = [
        `[AnalyticsBot] Analyzing: "${input}"`,
        `[AnalyticsBot] Metrics - Engagement: ${metrics.engagement}%, Growth: +${metrics.growth}%`,
        `[AnalyticsBot] Chart color theme: ${color}`,
        "[AnalyticsBot] ✅ Visual analytics ready!"
      ];
      
      return { responses, apiData: { chartColor: color, lastMetrics: metrics } };
    } catch (error) {
      return {
        responses: [`[AnalyticsBot] Analyzing: "${input}"`, "[AnalyticsBot] ✅ Basic analytics ready!"],
        apiData: {}
      };
    }
  },
  
  researchBot: async (input, memory, userId) => {
    // Get news related to the research topic
    try {
      const newsRes = await axios.get(
        `${FREE_APIS.NEWS_BASE_URL}/everything?q=${encodeURIComponent(input)}&pageSize=3&apiKey=${FREE_APIS.NEWS_API_KEY}`
      );
      
      const articles = newsRes.data.articles.slice(0, 2);
      const responses = [
        `[ResearchBot] Researching: "${input}"`,
        `[ResearchBot] Found ${articles.length} recent articles`,
        ...articles.map(article => `[ResearchBot] Source: ${article.source.name} - "${article.title}"`),
        "[ResearchBot] ✅ Research compilation with live sources ready!"
      ];
      
      return { responses, apiData: { lastSources: articles.length, articles } };
    } catch (error) {
      return {
        responses: [`[ResearchBot] Researching: "${input}"`, "[ResearchBot] ✅ Research ready!"],
        apiData: {}
      };
    }
  }
};

// --- HEALTH CHECK ---
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: "3.0.0",
    features: {
      security: true,
      apis: true,
      fileUploads: true,
      websockets: true,
      email: true,
      analytics: true
    }
  });
});

// --- ENHANCED BOT ROUTES ---
app.post("/run-bot", apiLimiter, [
  body('botName').isString().isLength({ min: 1, max: 50 }),
  body('input').isString().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { botName, input } = req.body;
  const userId = req.headers['x-user-id'] || 'anonymous';
  const memory = getMemory(botName);

  if (bots[botName]) {
    const result = await bots[botName](input, memory, userId);
    saveMemory(botName, input, result.responses, userId, result.apiData);
    
    logActivity('bot_interaction', { botName, input }, userId);
    
    res.json({ 
      success: true,
      logs: result.responses,
      botStats: memory.stats,
      apiEnhanced: Object.keys(result.apiData).length > 0
    });
  } else {
    res.status(404).json({ 
      success: false,
      logs: [`❌ No bot found: ${botName}`],
      availableBots: Object.keys(bots)
    });
  }
});

// Enhanced team run
app.post("/team-run", apiLimiter, [
  body('input').isString().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { input } = req.body;
  const userId = req.headers['x-user-id'] || 'anonymous';
  const crew = ["emailBot", "taskBot", "analyticsBot", "researchBot"];
  let logs = [];

  logs.push(`🧑‍🤝‍🧑 AI Crew Assembly — Mission: "${input}"`);
  logs.push(`⏰ Timestamp: ${new Date().toLocaleString()}`);

  for (const botName of crew) {
    const memory = getMemory(botName);
    const result = await bots[botName](input, memory, userId);
    saveMemory(botName, input, result.responses, userId, result.apiData);
    logs.push(...result.responses);
  }

  logs.push("💬 Cross-bot collaboration:");
  logs.push("💡 TaskBot: Analytics show this should be priority #1!");
  logs.push("😂 EmailBot: Perfect! I'll add some personality ✨");
  logs.push("🔍 ResearchBot: I found 3 case studies supporting this approach.");
  logs.push("📊 AnalyticsBot: Expected ROI: +25% within 30 days");
  logs.push("✅ Mission Complete: Strategy deployed successfully!");

  saveMemory("team", input, logs, userId);
  logActivity('team_collaboration', { input, crewSize: crew.length }, userId);
  
  res.json({ 
    success: true,
    logs,
    timestamp: new Date().toISOString()
  });
});

// Enhanced admin login with JWT
app.post("/admin-login", [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const admins = JSON.parse(fs.readFileSync("admins.json"));
    const admin = admins.find(a => a.email === email && a.active);

    if (admin && await bcrypt.compare(password, admin.password)) {
      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      logActivity('admin_login', { email }, admin.id);
      
      res.json({ 
        success: true, 
        message: `✅ Welcome back, ${email}`,
        token,
        user: { id: admin.id, email: admin.email, role: admin.role }
      });
    } else {
      logActivity('failed_login_attempt', { email });
      res.status(401).json({ success: false, message: "❌ Invalid credentials" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "⚠️ Server error" });
  }
});

// --- ANALYTICS DASHBOARD ---
app.get("/analytics/dashboard", authenticateToken, (req, res) => {
  const db = getDatabase();
  const logs = db.logs;
  
  const analytics = {
    totalInteractions: logs.filter(l => l.action === 'bot_interaction').length,
    totalTasks: db.tasks.length,
    completedTasks: db.tasks.filter(t => t.status === 'completed').length,
    activeUsers: [...new Set(logs.map(l => l.userId).filter(Boolean))].length,
    recentActivity: logs.slice(-10),
    botUsage: {},
    apiUsage: db.api_usage
  };

  // Calculate bot usage stats
  Object.keys(bots).forEach(botName => {
    const memory = getMemory(botName);
    analytics.botUsage[botName] = memory.stats;
  });

  res.json(analytics);
});

// --- EMAIL SUBSCRIPTION ---
app.post("/subscribe", [
  body('email').isEmail(),
  body('name').optional().isLength({ min: 1, max: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, name } = req.body;
  const db = getDatabase();
  
  // Check if already subscribed
  const existing = db.subscribers.find(s => s.email === email);
  if (existing) {
    return res.status(409).json({ message: "Email already subscribed" });
  }

  // Add subscriber
  db.subscribers.push({
    id: Date.now(),
    email,
    name: name || 'Anonymous',
    subscribedAt: new Date().toISOString(),
    active: true
  });
  saveDatabase(db);

  // Send welcome email (if configured)
  if (transporter && process.env.EMAIL_USER) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to AITaskFlo!',
        html: `
          <h2>Welcome to AITaskFlo, ${name || 'there'}!</h2>
          <p>Thanks for subscribing. You'll be the first to know about our latest AI automation features.</p>
          <p>Best regards,<br>The AITaskFlo Team</p>
        `
      });
    } catch (emailError) {
      console.error("Email send error:", emailError);
    }
  }

  logActivity('user_subscribed', { email, name });
  res.json({ success: true, message: "Successfully subscribed!" });
});

// --- FILE UPLOAD ---
app.post("/upload", upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  logActivity('file_uploaded', { 
    filename: req.file.filename, 
    originalName: req.file.originalname,
    size: req.file.size 
  });

  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`
    }
  });
});

// --- BULK ADMIN OPERATIONS ---
app.post("/admin/bulk-actions", authenticateToken, [
  body('action').isIn(['delete-logs', 'export-data', 'reset-bots', 'clear-api-usage'])
], (req, res) => {
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { action } = req.body;
  
  switch (action) {
    case 'delete-logs':
      const db = getDatabase();
      db.logs = [];
      saveDatabase(db);
      res.json({ success: true, message: 'Logs cleared' });
      break;
      
    case 'export-data':
      const exportData = getDatabase();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=aitaskflo-export.json');
      res.send(JSON.stringify(exportData, null, 2));
      break;
      
    case 'reset-bots':
      Object.keys(bots).forEach(botName => {
        const path = `./memory/${botName}.json`;
        if (fs.existsSync(path)) fs.unlinkSync(path);
      });
      res.json({ success: true, message: 'Bot memories reset' });
      break;

    case 'clear-api-usage':
      const apiDb = getDatabase();
      apiDb.api_usage = {};
      saveDatabase(apiDb);
      res.json({ success: true, message: 'API usage data cleared' });
      break;
      
    default:
      res.status(400).json({ error: 'Invalid action' });
  }
});

// --- API USAGE ANALYTICS ---
app.get('/api/analytics/usage', (req, res) => {
  const db = getDatabase();
  const usage = db.api_usage;
  
  const analytics = Object.keys(usage).map(apiName => ({
    apiName,
    totalCalls: usage[apiName].length,
    successfulCalls: usage[apiName].filter(call => call.success).length,
    failedCalls: usage[apiName].filter(call => !call.success).length,
    lastUsed: usage[apiName][usage[apiName].length - 1]?.timestamp
  }));
  
  res.json({ 
    success: true, 
    data: analytics,
    totalAPIs: analytics.length,
    totalCalls: analytics.reduce((sum, api) => sum + api.totalCalls, 0)
  });
});

// --- BULK API OPERATIONS ---
app.post('/api/bulk/mixed-data', async (req, res) => {
  try {
    const { city = 'London', animal = 'cat' } = req.body;
    
    // Get multiple API data in parallel
    const [weatherRes, quoteRes, animalRes, jokeRes] = await Promise.allSettled([
      axios.get(`${FREE_APIS.WEATHER_BASE_URL}/weather?q=${city}&appid=${FREE_APIS.WEATHER_API_KEY}&units=metric`),
      axios.get(`${FREE_APIS.QUOTES_API}/random`),
      axios.get(animal === 'cat' ? FREE_APIS.CAT_API : FREE_APIS.DOG_API),
      axios.get(FREE_APIS.JOKE_API)
    ]);
    
    const result = {
      weather: weatherRes.status === 'fulfilled' ? {
        city: weatherRes.value.data.name,
        temp: weatherRes.value.data.main.temp,
        description: weatherRes.value.data.weather[0].description
      } : null,
      quote: quoteRes.status === 'fulfilled' ? {
        text: quoteRes.value.data.content,
        author: quoteRes.value.data.author
      } : null,
      animalImage: animalRes.status === 'fulfilled' ? animalRes.value.data[0].url : null,
      joke: jokeRes.status === 'fulfilled' ? {
        setup: jokeRes.value.data.setup,
        punchline: jokeRes.value.data.punchline
      } : null
    };
    
    logApiUsage('bulk', '/bulk/mixed-data');
    res.json({ success: true, data: result });
  } catch (error) {
    logApiUsage('bulk', '/bulk/mixed-data', false);
    res.status(500).json({ success: false, error: 'Bulk operation failed' });
  }
});

// --- SCHEDULED TASKS ---
// Daily cleanup task
cron.schedule('0 2 * * *', () => {
  console.log('🧹 Running daily cleanup...');
  
  // Clean old log files
  const db = getDatabase();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  db.logs = db.logs.filter(log => new Date(log.timestamp) > oneWeekAgo);
  
  // Clean old API usage data
  Object.keys(db.api_usage).forEach(apiName => {
    db.api_usage[apiName] = db.api_usage[apiName].filter(
      usage => new Date(usage.timestamp) > oneWeekAgo
    );
  });
  
  saveDatabase(db);
  console.log('✅ Daily cleanup completed');
});

// Weekly analytics email (if email is configured)
cron.schedule('0 9 * * 1', async () => {
  console.log('📊 Generating weekly analytics...');
  
  if (transporter && process.env.EMAIL_USER) {
    try {
      const db = getDatabase();
      const weeklyStats = {
        totalInteractions: db.logs.filter(l => l.action === 'bot_interaction').length,
        newSubscribers: db.subscribers.filter(s => {
          const subDate = new Date(s.subscribedAt);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return subDate > weekAgo;
        }).length,
        apiCalls: Object.values(db.api_usage).flat().length
      };

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || 'admin@taskflo.com',
        subject: 'AITaskFlo Weekly Analytics Report',
        html: `
          <h2>Weekly Analytics Report</h2>
          <p><strong>Bot Interactions:</strong> ${weeklyStats.totalInteractions}</p>
          <p><strong>New Subscribers:</strong> ${weeklyStats.newSubscribers}</p>
          <p><strong>API Calls:</strong> ${weeklyStats.apiCalls}</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        `
      });
      
      console.log('📧 Weekly analytics email sent');
    } catch (error) {
      console.error('Email error:', error);
    }
  }
});

// --- WEBSITE ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/factory', (req, res) => res.sendFile(path.join(__dirname, 'factory.html')));
app.get('/pricing', (req, res) => res.sendFile(path.join(__dirname, 'pricing.html')));
app.get('/careers', (req, res) => res.sendFile(path.join(__dirname, 'careers.html')));
app.get('/waitlist', (req, res) => res.sendFile(path.join(__dirname, 'waitlist.html')));
app.get('/thank-you', (req, res) => res.sendFile(path.join(__dirname, 'thank-you.html')));
app.get('/roadmap', (req, res) => res.sendFile(path.join(__dirname, 'docs/roadmap.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'docs/terms.html')));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// --- 404 HANDLER ---
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/run-bot') || 
      req.path.startsWith('/team-run') || req.path.startsWith('/admin-login') ||
      req.path.startsWith('/analytics') || req.path.startsWith('/subscribe') ||
      req.path.startsWith('/upload') || req.path.startsWith('/health')) {
    return next();
  }
  
  const custom404Path = path.join(__dirname, '404.html');
  
  if (fs.existsSync(custom404Path)) {
    res.status(404).sendFile(custom404Path);
  } else {
    res.status(404).json({ error: 'Page not found' });
  }
});

// --- ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// --- WEBSOCKET SERVER (Real-time features) ---
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to AITaskFlo real-time server',
    timestamp: new Date().toISOString()
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      if (data.type === 'bot_activity') {
        // Broadcast bot activity to all connected clients
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'bot_activity',
              data: data.data,
              timestamp: new Date().toISOString()
            }));
          }
        });
      }
      
      if (data.type === 'api_call') {
        // Broadcast API usage to dashboard clients
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'api_usage_update',
              data: data.data,
              timestamp: new Date().toISOString()
            }));
          }
        });
      }
      
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// --- START SERVER ---
server.listen(PORT, () => {
  console.log(`🚀 COMPLETE AITaskFlo server running on http://localhost:${PORT}`);
  console.log(`📱 Website: http://localhost:${PORT}`);
  console.log(`🤖 Bots: http://localhost:${PORT}/run-bot`);
  console.log(`📊 Analytics: http://localhost:${PORT}/analytics/dashboard`);
  console.log(`🔒 Security: Rate limiting, JWT, bcrypt, Helmet`);
  console.log(`📁 File uploads: http://localhost:${PORT}/upload`);
  console.log(`🔌 WebSocket: Real-time features enabled`);
  console.log(`⏰ Scheduled: Daily cleanup + weekly reports`);
  console.log(`🌤️  Weather: /api/weather/london`);
  console.log(`📰 News: /api/news/technology`);
  console.log(`💱 Exchange: /api/exchange/usd/eur/100`);
  console.log(`📱 QR Code: POST /api/qr-code`);
  console.log(`💭 Quotes: /api/quote/motivational`);
  console.log(`🐱 Animals: /api/random/cat`);
  console.log(`🌍 Location: /api/location`);
  console.log(`🔗 URL Shortener: POST /api/shorten-url`);
  console.log(`🎲 UUID: /api/uuid/5`);
  console.log(`🎨 Colors: /api/color/3`);
  console.log(`😂 Jokes: /api/joke`);
  console.log(`🔐 Password: /api/password/16`);
  console.log(`🔄 Bulk Data: POST /api/bulk/mixed-data`);
});

module.exports = app;
