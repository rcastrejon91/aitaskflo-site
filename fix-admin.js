const path=require('path');
const dbPath=path.join(process.cwd(),'data','lyra.db');
console.log('db path:',dbPath);
const b=require('bcryptjs');
const db=require('better-sqlite3')(dbPath);
const all=db.prepare("SELECT id,email,name FROM auth_users").all();
console.log('all users:',JSON.stringify(all));
const u=db.prepare("SELECT password_hash FROM auth_users WHERE email='adminricky@aitaskflo.local'").get();
if(!u){console.log('USER NOT FOUND');process.exit(1);}
console.log('hash length:',u.password_hash.length);
console.log('match:',b.compareSync('lyra13witch',u.password_hash));
