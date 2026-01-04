const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}
const DB_FILE = path.join(DATA_DIR, 'db.sqlite');

let SQL = null;
let db = null;

async function init() {
  const initSqlJs = require('sql.js');
  // Resolve wasm path robustly in dev and packaged builds
  SQL = await initSqlJs({
    locateFile: () => {
      try {
        // Node resolution is robust across asar/unpacked
        return require.resolve('sql.js/dist/sql-wasm.wasm');
      } catch (_e) {
        // Safe fallback
        return path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
      }
    }
  });

  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  // initialize tables
  db.exec(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    choices TEXT,
    correct TEXT
  );`);

  db.exec(`CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentName TEXT,
    answers TEXT,
    score INTEGER,
    percent INTEGER,
    createdAt TEXT,
    startTime TEXT,
    submitTime TEXT,
    timeSpent INTEGER
  );`);

  // simple key/value settings table
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );`);

  // Migrate existing DBs: ensure required columns exist on results
  try {
    const pragma = db.exec(`PRAGMA table_info(results);`);
    if (pragma && pragma[0] && pragma[0].values) {
      const existingCols = new Set(pragma[0].values.map(row => row[1])); // row[1] is name
      const toAdd = [];
      if (!existingCols.has('createdAt')) toAdd.push({ name: 'createdAt', type: 'TEXT' });
      if (!existingCols.has('startTime')) toAdd.push({ name: 'startTime', type: 'TEXT' });
      if (!existingCols.has('submitTime')) toAdd.push({ name: 'submitTime', type: 'TEXT' });
      if (!existingCols.has('timeSpent')) toAdd.push({ name: 'timeSpent', type: 'INTEGER' });
      if (!existingCols.has('percent')) toAdd.push({ name: 'percent', type: 'INTEGER' });
      toAdd.forEach(col => {
        try { db.exec(`ALTER TABLE results ADD COLUMN ${col.name} ${col.type};`); } catch (e) {}
      });
    }
  } catch (e) {
    // ignore pragma errors in case of corrupted DB; DB will still operate with available columns
  }

  persist();
}

function persist() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  try {
    fs.writeFileSync(DB_FILE, buffer);
  } catch (e) {
    console.error('Failed to persist database at', DB_FILE, e);
  }
}

function run(sql, params, cb) {
  try {
    const stmt = db.prepare(sql);
    stmt.run(params || []);
    // emulate lastID
    const res = db.exec('SELECT last_insert_rowid() as id;');
    const lastID = res && res[0] && res[0].values && res[0].values[0] ? res[0].values[0][0] : undefined;
    stmt.free();
    // persist after write
    persist();
    if (typeof cb === 'function') cb.call({ lastID }, null);
  } catch (err) {
    if (typeof cb === 'function') cb(err);
  }
}

function all(sql, params, cb) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params || []);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    if (typeof cb === 'function') cb(null, rows);
  } catch (err) {
    if (typeof cb === 'function') cb(err);
  }
}

const ready = init();

module.exports = { run, all, ready };
