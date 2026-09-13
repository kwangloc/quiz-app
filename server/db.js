const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}
const DB_FILE = path.join(DATA_DIR, 'db.sqlite');

// Seeded into the departments table the first time the app runs against a DB.
// Admins edit the list from the dashboard afterwards; this array is never re-applied.
const DEFAULT_DEPARTMENTS = [
  'Phòng Tài chính',
  'Phòng Kế hoạch kinh doanh',
  'Phòng Chính trị',
  'Phòng Thiết kế Công nghệ',
  'Phòng Tổ chức lao động',
  'Phòng Kỹ thuật',
  'Phòng Vật tư',
  'Phòng Điều độ sản xuất',
  'Phòng Hành chính Hậu cần',
  'Phòng An toàn',
  'Phòng KCS',
  'Phòng Cơ điện',
  'Xí nghiệp Cơ khí Điện tàu',
  'Xí nghiệp Nhôm Composite',
  'Xí nghiệp Sơn và nội thất tàu',
  'Xí nghiệp Dịch vụ cảng và xử lý chất thải nguy hại',
  'Xí nghiệp Ván ống',
  'Xí nghiệp Vũ khí hải tài',
  'Xí nghiệp Đà đốc',
  'Xí nghiệp Động Lực',
  'Xí nghiệp Thương mại',
  'Xí nghiệp Vỏ 1',
  'Xí nghiệp Vỏ 2',
];

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
    department TEXT,
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

  db.exec(`CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sortOrder INTEGER,
    createdAt TEXT
  );`);

  // Which departments each exam is offered to (many-to-many). An exam with no rows
  // here is not offered to anyone — see exams.js.
  db.exec(`CREATE TABLE IF NOT EXISTS exam_departments (
    examId INTEGER NOT NULL,
    departmentId INTEGER NOT NULL,
    PRIMARY KEY (examId, departmentId)
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
      if (!existingCols.has('department')) toAdd.push({ name: 'department', type: 'TEXT' });
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

  // One-time seed of the department list. Guarded by a settings flag rather than by
  // "is the table empty" so that an admin who deletes departments does not get the
  // defaults resurrected on the next start.
  try {
    const seededRes = db.exec("SELECT value FROM settings WHERE key = 'departmentsSeeded';");
    const alreadySeeded = seededRes && seededRes[0] && seededRes[0].values.length > 0;
    if (!alreadySeeded) {
      const now = new Date().toISOString();
      const insertDept = db.prepare('INSERT OR IGNORE INTO departments(name, sortOrder, createdAt) VALUES (?, ?, ?)');
      DEFAULT_DEPARTMENTS.forEach((name, idx) => insertDept.run([name, idx, now]));
      insertDept.free();
      const flagStmt = db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES ('departmentsSeeded', '1')");
      flagStmt.run([]);
      flagStmt.free();
    }
  } catch (e) {
    console.error('Department seed error:', e);
  }

  // One-time backfill: exams that predate departments have no assignments, and an
  // unassigned exam is invisible to candidates. Attach those to every department so
  // nothing silently disappears; the admin trims the list from the dashboard.
  // Runs after the seed above so the departments actually exist to attach to.
  try {
    const flagRes = db.exec("SELECT value FROM settings WHERE key = 'examDepartmentsBackfilled';");
    const alreadyBackfilled = flagRes && flagRes[0] && flagRes[0].values.length > 0;
    if (!alreadyBackfilled) {
      db.exec(`INSERT OR IGNORE INTO exam_departments(examId, departmentId)
               SELECT e.id, d.id FROM exams e CROSS JOIN departments d;`);
      const flagStmt = db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES ('examDepartmentsBackfilled', '1')");
      flagStmt.run([]);
      flagStmt.free();
    }
  } catch (e) {
    console.error('Exam-department backfill error:', e);
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
