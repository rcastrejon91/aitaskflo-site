const b=require('bcryptjs');
const db=require('better-sqlite3')('./data/lyra.db');
const u=db.prepare("SELECT password_hash FROM auth_users WHERE email='adminricky@aitaskflo.local'").get();
if(!u){console.log('USER NOT FOUND');process.exit(1);}
console.log('hash length:',u.password_hash.length);
console.log('hash:',u.password_hash);
console.log('match:',b.compareSync('lyra13witch',u.password_hash));
