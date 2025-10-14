const fs = require('fs');

const newAuthContent = `const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aitaskflo-secret-key-2024';

// In-memory user store (for demo)
const users = [];

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Verify JWT middleware
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Register
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  const user = {
    id: users.length + 1,
    username,
    email,
    password,
    createdAt: new Date()
  };
  
  users.push(user);
  
  const token = generateToken(user);
  
  res.json({ 
    success: true, 
    message: 'User registered successfully',
    token,
    user: { id: user.id, username, email }
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = generateToken(user);
  
  res.json({ 
    success: true,
    message: 'Login successful',
    token,
    user: { id: user.id, username: user.username, email: user.email }
  });
});

// Get current user (protected route)
router.get('/me', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    success: true,
    user: { id: user.id, username: user.username, email: user.email }
  });
});

// Get all users (for testing)
router.get('/users', (req, res) => {
  res.json({
    success: true,
    count: users.length,
    users: users.map(u => ({ id: u.id, username: u.username, email: u.email }))
  });
});

module.exports = router;
`;

fs.writeFileSync('routes/auth.js', newAuthContent);
console.log('✅ Updated auth.js with JWT support');
