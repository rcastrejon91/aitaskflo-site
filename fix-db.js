const fs = require('fs');
const f = '/home/aitaskflo/lib/lyra/db.ts';
let s = fs.readFileSync(f, 'utf8');
s = s.replace('    CREATE INDEX IF NOT EXISTS idx_facts_importance ON facts(user_id, importance DESC);\n', '');
s = s.replace(
  '  } catch { /* column already exists */ }\n}',
  '  } catch { /* column already exists */ }\n  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_facts_importance ON facts(user_id, importance DESC)`); } catch {}\n}'
);
fs.writeFileSync(f, s);
console.log('done — db.ts patched');
