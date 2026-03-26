const b=require('bcryptjs');
const db=require('better-sqlite3')('./data/lyra.db');
db.prepare("DELETE FROM auth_users WHERE email='adminricky@aitaskflo.local'").run();
const h=b.hashSync('lyra13witch',12);
db.prepare("INSERT INTO auth_users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)").run('admin-1','adminricky@aitaskflo.local','adminricky',h,new Date().toISOString());
console.log('done, hash length:',h.length);
