const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');

// Initialize database structure
const initDB = () => {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [],
      sessions: [],
      tasks: [],
      agents: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    console.log('✅ Database initialized');
  }
};

// Read database
const readDB = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [], sessions: [], tasks: [], agents: [] };
  }
};

// Write database
const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
};

// User operations
const users = {
  create: (userData) => {
    const db = readDB();
    const user = {
      id: Date.now().toString(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    writeDB(db);
    return user;
  },
  
  findByEmail: (email) => {
    const db = readDB();
    return db.users.find(u => u.email === email);
  },
  
  findById: (id) => {
    const db = readDB();
    return db.users.find(u => u.id === id);
  },
  
  update: (id, updates) => {
    const db = readDB();
    const index = db.users.findIndex(u => u.id === id);
    if (index !== -1) {
      db.users[index] = { ...db.users[index], ...updates };
      writeDB(db);
      return db.users[index];
    }
    return null;
  }
};

// Session operations
const sessions = {
  create: (sessionData) => {
    const db = readDB();
    const session = {
      id: Date.now().toString(),
      ...sessionData,
      createdAt: new Date().toISOString()
    };
    db.sessions.push(session);
    writeDB(db);
    return session;
  },
  
  findByToken: (token) => {
    const db = readDB();
    return db.sessions.find(s => s.token === token);
  },
  
  delete: (token) => {
    const db = readDB();
    db.sessions = db.sessions.filter(s => s.token !== token);
    writeDB(db);
  }
};

// Initialize on load
initDB();

module.exports = {
  users,
  sessions,
  readDB,
  writeDB
};
