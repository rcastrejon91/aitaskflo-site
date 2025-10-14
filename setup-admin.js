const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin credentials
const adminUser = {
  username: 'admin',
  email: 'admin@aitaskflo.com',
  password: 'TaskFlo2024!',
  role: 'admin',
  createdAt: new Date()
};

// Hash password
const salt = bcrypt.genSaltSync(10);
adminUser.passwordHash = bcrypt.hashSync(adminUser.password, salt);
delete adminUser.password;

console.log('✅ Admin User Created:');
console.log('Username:', adminUser.username);
console.log('Email:', adminUser.email);
console.log('Password: TaskFlo2024!');
console.log('\n📝 Save this user to your database!');
console.log(JSON.stringify(adminUser, null, 2));
