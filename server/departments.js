const express = require('express');
const db = require('./db');
const router = express.Router();

function validateName(body) {
  const name = body && body.name != null ? String(body.name).trim() : '';
  if (!name) return { error: 'Tên phòng ban là bắt buộc' };
  if (name.length > 200) return { error: 'Tên phòng ban quá dài (tối đa 200 ký tự)' };
  return { name };
}

// The UNIQUE index on name is what actually guards against duplicates; translate its
// error so the dashboard can show something readable.
function sendDbError(res, err) {
  if (err && /UNIQUE/i.test(err.message)) {
    return res.status(409).json({ error: 'Phòng ban này đã tồn tại' });
  }
  return res.status(500).json({ error: err.message });
}

router.get('/', (req, res) => {
  db.all('SELECT * FROM departments ORDER BY sortOrder ASC, id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const parsed = validateName(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  // New departments go to the end of the list
  db.all('SELECT MAX(sortOrder) as maxOrder FROM departments', [], (err, rows) => {
    const nextOrder = (!err && rows && rows[0] && rows[0].maxOrder != null ? rows[0].maxOrder : -1) + 1;
    db.run(
      'INSERT INTO departments(name, sortOrder, createdAt) VALUES (?, ?, ?)',
      [parsed.name, nextOrder, new Date().toISOString()],
      function (insertErr) {
        if (insertErr) return sendDbError(res, insertErr);
        res.json({ id: this.lastID });
      }
    );
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const parsed = validateName(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  db.run('UPDATE departments SET name = ? WHERE id = ?', [parsed.name, id], function (err) {
    if (err) return sendDbError(res, err);
    res.json({ success: true });
  });
});

// Results store the department name as a snapshot (like examTitle), so removing a
// department here never rewrites exam history — only its exam assignments go with it.
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM exam_departments WHERE departmentId = ?', [id], function (linkErr) {
    if (linkErr) return res.status(500).json({ error: linkErr.message });
    db.run('DELETE FROM departments WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

module.exports = router;
