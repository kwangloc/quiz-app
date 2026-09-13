const express = require('express');
const db = require('./db');
const router = express.Router();

// Accepts an array of department ids. Returns null when the payload is malformed so
// the caller can reject it, and [] when the exam is simply assigned to nobody.
function parseDepartmentIds(raw) {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const ids = [];
  for (const v of raw) {
    const n = Number(v);
    if (isNaN(n) || n < 1) return null;
    const id = Math.floor(n);
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

function validateExamBody(body) {
  const { title, timeLimitMinutes, passingThreshold, numQuestions } = body;
  if (!title || !String(title).trim()) {
    return { error: 'Tiêu đề bài thi là bắt buộc' };
  }
  const t = Number(timeLimitMinutes);
  if (isNaN(t) || t < 0) {
    return { error: 'Thời gian làm bài phải là số phút không âm' };
  }
  const p = Number(passingThreshold);
  if (isNaN(p) || p < 0 || p > 100) {
    return { error: 'Ngưỡng đạt phải từ 0 đến 100' };
  }
  let n = null;
  if (numQuestions !== null && numQuestions !== undefined && numQuestions !== '') {
    n = Number(numQuestions);
    if (isNaN(n) || n < 1) {
      return { error: 'Số câu hỏi phải là số dương' };
    }
  }
  const departmentIds = parseDepartmentIds(body.departmentIds);
  if (departmentIds === null) {
    return { error: 'Danh sách phòng ban không hợp lệ' };
  }
  return {
    title: String(title).trim(),
    timeLimitMinutes: Math.floor(t),
    passingThreshold: Math.floor(p),
    numQuestions: n != null ? Math.floor(n) : null,
    departmentIds,
  };
}

// Replaces an exam's assignments wholesale. db.run resolves synchronously (sql.js),
// so the counter below settles before this returns.
function setExamDepartments(examId, departmentIds, cb) {
  db.run('DELETE FROM exam_departments WHERE examId = ?', [examId], (err) => {
    if (err) return cb(err);
    if (!departmentIds.length) return cb(null);
    let remaining = departmentIds.length;
    let failure = null;
    departmentIds.forEach((departmentId) => {
      db.run(
        'INSERT OR IGNORE INTO exam_departments(examId, departmentId) VALUES (?, ?)',
        [examId, departmentId],
        (e) => {
          if (e && !failure) failure = e;
          if (--remaining === 0) cb(failure);
        }
      );
    });
  });
}

// Folds the assignment rows into the exam rows so the dashboard gets everything in one call
function respondWithDepartments(rows, res) {
  db.all(
    `SELECT ed.examId, ed.departmentId, d.name
     FROM exam_departments ed
     LEFT JOIN departments d ON d.id = ed.departmentId
     ORDER BY d.sortOrder ASC, d.id ASC`,
    [],
    (err, links) => {
      if (err) return res.status(500).json({ error: err.message });
      const byExam = new Map();
      links.forEach((l) => {
        if (!byExam.has(l.examId)) byExam.set(l.examId, []);
        byExam.get(l.examId).push(l);
      });
      res.json(
        rows.map((r) => {
          const assigned = byExam.get(r.id) || [];
          return {
            ...r,
            departmentIds: assigned.map((a) => a.departmentId),
            departmentNames: assigned.map((a) => a.name).filter(Boolean),
          };
        })
      );
    }
  );
}

// ?departmentId=N returns only the exams offered to that department — this is what
// the candidate flow uses after the department is picked.
router.get('/', (req, res) => {
  const { departmentId } = req.query;
  const sql = departmentId
    ? `SELECT e.*, COUNT(q.id) as questionCount
       FROM exams e
       JOIN exam_departments ed ON ed.examId = e.id AND ed.departmentId = ?
       LEFT JOIN questions q ON q.examId = e.id
       GROUP BY e.id
       ORDER BY e.id ASC`
    : `SELECT e.*, COUNT(q.id) as questionCount
       FROM exams e
       LEFT JOIN questions q ON q.examId = e.id
       GROUP BY e.id
       ORDER BY e.id ASC`;
  const params = departmentId ? [departmentId] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    respondWithDepartments(rows, res);
  });
});

router.post('/', (req, res) => {
  const parsed = validateExamBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  db.run(
    'INSERT INTO exams(title, timeLimitMinutes, passingThreshold, numQuestions, createdAt) VALUES (?, ?, ?, ?, ?)',
    [parsed.title, parsed.timeLimitMinutes, parsed.passingThreshold, parsed.numQuestions, new Date().toISOString()],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const examId = this.lastID;
      setExamDepartments(examId, parsed.departmentIds, (linkErr) => {
        if (linkErr) return res.status(500).json({ error: linkErr.message });
        res.json({ id: examId });
      });
    }
  );
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const parsed = validateExamBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  db.run(
    'UPDATE exams SET title = ?, timeLimitMinutes = ?, passingThreshold = ?, numQuestions = ? WHERE id = ?',
    [parsed.title, parsed.timeLimitMinutes, parsed.passingThreshold, parsed.numQuestions, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      setExamDepartments(Number(id), parsed.departmentIds, (linkErr) => {
        if (linkErr) return res.status(500).json({ error: linkErr.message });
        res.json({ success: true });
      });
    }
  );
});

// Deleting an exam removes its question bank and department assignments too. Results
// keep their own examTitle snapshot (see results.js) so history stays readable afterwards.
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM questions WHERE examId = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM exam_departments WHERE examId = ?', [id], function (errLinks) {
      if (errLinks) return res.status(500).json({ error: errLinks.message });
      db.run('DELETE FROM exams WHERE id = ?', [id], function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ success: true });
      });
    });
  });
});

module.exports = router;
