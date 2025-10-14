const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

// Create database in db folder
const dbPath = path.join(__dirname, 'users.db');
const db = new Database(dbPath);

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active INTEGER DEFAULT 1
  )
`);

console.log('✅ Database initialized at:', dbPath);

// Helper functions
const createUser = (username, email, password) => {
  const hashedPassword = bcrypt.hashSync(password, 10);
  const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
  return stmt.run(username, email, hashedPassword);
};

const findUserByEmail = (email) => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
};

const findUserById = (id) => {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
};

const verifyPassword = (password, hashedPassword) => {
  return bcrypt.compareSync(password, hashedPassword);
};

const updateLastLogin = (userId) => {
  const stmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
  return stmt.run(userId);
};

const getAllUsers = () => {
  const stmt = db.prepare('SELECT id, username, email, created_at, last_login FROM users WHERE is_active = 1');
  return stmt.all();
};

module.exports = { 
  db, 
  createUser, 
  findUserByEmail, 
  findUserById,
  verifyPassword,
  updateLastLogin,
  getAllUsers
};
