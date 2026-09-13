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
    total INTEGER,
    percent INTEGER,
    createdAt TEXT,
    startTime TEXT,
    submitTime TEXT,
    timeSpent INTEGER
  );`);

  // simple key/value settings table (legacy — kept only so old DBs can be read during the exam backfill below)
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );`);

  db.exec(`CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    timeLimitMinutes INTEGER DEFAULT 0,
    passingThreshold INTEGER DEFAULT 80,
    numQuestions INTEGER,
    createdAt TEXT
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
      if (!existingCols.has('total')) toAdd.push({ name: 'total', type: 'INTEGER' });
      if (!existingCols.has('examId')) toAdd.push({ name: 'examId', type: 'INTEGER' });
      if (!existingCols.has('examTitle')) toAdd.push({ name: 'examTitle', type: 'TEXT' });
      toAdd.forEach(col => {
        try { db.exec(`ALTER TABLE results ADD COLUMN ${col.name} ${col.type};`); } catch (e) {}
      });
    }
  } catch (e) {
    // ignore pragma errors in case of corrupted DB; DB will still operate with available columns
  }

  // Migrate existing DBs: ensure examId column exists on questions
  try {
    const qPragma = db.exec(`PRAGMA table_info(questions);`);
    if (qPragma && qPragma[0] && qPragma[0].values) {
      const existingQCols = new Set(qPragma[0].values.map(row => row[1]));
      if (!existingQCols.has('examId')) {
        try { db.exec(`ALTER TABLE questions ADD COLUMN examId INTEGER;`); } catch (e) {}
      }
    }
  } catch (e) {
    // ignore pragma errors in case of corrupted DB; DB will still operate with available columns
  }

  // One-time backfill: older DBs had a single implicit exam (global settings + one flat
  // question bank). If no exam has been created yet but legacy questions/results exist,
  // create a default exam from the old settings values and attach the orphaned rows to it.
  try {
    const examCountRes = db.exec('SELECT COUNT(*) as c FROM exams;');
    const examCount = examCountRes && examCountRes[0] ? examCountRes[0].values[0][0] : 0;
    if (examCount === 0) {
      const legacyQRes = db.exec('SELECT COUNT(*) as c FROM questions WHERE examId IS NULL;');
      const legacyQCount = legacyQRes && legacyQRes[0] ? legacyQRes[0].values[0][0] : 0;
      const legacyRRes = db.exec('SELECT COUNT(*) as c FROM results WHERE examId IS NULL;');
      const legacyRCount = legacyRRes && legacyRRes[0] ? legacyRRes[0].values[0][0] : 0;
      if (legacyQCount > 0 || legacyRCount > 0) {
        let legacyTitle = 'Bài thi mặc định';
        let legacyTimeLimit = 0;
        let legacyThreshold = 80;
        let legacyNumQuestions = null;
        try {
          const settingsRes = db.exec('SELECT key, value FROM settings;');
          if (settingsRes && settingsRes[0]) {
            const map = {};
            settingsRes[0].values.forEach(([k, v]) => { map[k] = v; });
            if (map.examTitle) legacyTitle = map.examTitle;
            if (map.timeLimitMinutes != null) legacyTimeLimit = Number(map.timeLimitMinutes) || 0;
            if (map.passingThreshold != null) legacyThreshold = Number(map.passingThreshold);
            if (map.numQuestions != null) legacyNumQuestions = Number(map.numQuestions);
          }
        } catch (e) {}

        const insertStmt = db.prepare('INSERT INTO exams(title, timeLimitMinutes, passingThreshold, numQuestions, createdAt) VALUES (?, ?, ?, ?, ?)');
        insertStmt.run([legacyTitle, legacyTimeLimit, legacyThreshold, legacyNumQuestions, new Date().toISOString()]);
        insertStmt.free();
        const idRes = db.exec('SELECT last_insert_rowid() as id;');
        const defaultExamId = idRes[0].values[0][0];

        const backfillQStmt = db.prepare('UPDATE questions SET examId = ? WHERE examId IS NULL');
        backfillQStmt.run([defaultExamId]);
        backfillQStmt.free();

        const backfillRStmt = db.prepare('UPDATE results SET examId = ?, examTitle = ? WHERE examId IS NULL');
        backfillRStmt.run([defaultExamId, legacyTitle]);
        backfillRStmt.free();
      }
    }
  } catch (e) {
    console.error('Exam backfill migration error:', e);
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
