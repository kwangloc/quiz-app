const express = require('express');
const db = require('./db');
const router = express.Router();

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
  return {
    title: String(title).trim(),
    timeLimitMinutes: Math.floor(t),
    passingThreshold: Math.floor(p),
    numQuestions: n != null ? Math.floor(n) : null,
  };
}

router.get('/', (req, res) => {
  db.all(
    `SELECT e.*, COUNT(q.id) as questionCount
     FROM exams e
     LEFT JOIN questions q ON q.examId = e.id
     GROUP BY e.id
     ORDER BY e.id ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/', (req, res) => {
  const parsed = validateExamBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  db.run(
    'INSERT INTO exams(title, timeLimitMinutes, passingThreshold, numQuestions, createdAt) VALUES (?, ?, ?, ?, ?)',
    [parsed.title, parsed.timeLimitMinutes, parsed.passingThreshold, parsed.numQuestions, new Date().toISOString()],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
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
      res.json({ success: true });
    }
  );
});

// Deleting an exam removes its question bank too. Results keep their own
// examTitle snapshot (see results.js) so history stays readable afterwards.
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM questions WHERE examId = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM exams WHERE id = ?', [id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

module.exports = router;
