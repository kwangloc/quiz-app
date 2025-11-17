const express = require('express');
const db = require('./db');
const router = express.Router();

router.get('/', (req, res) => {
  db.all('SELECT * FROM questions', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const parsed = rows.map(r => ({ ...r, choices: JSON.parse(r.choices) }));
    res.json(parsed);
  });
});

router.post('/', (req, res) => {
  const { text, choices, correct } = req.body;
  db.run(
    'INSERT INTO questions(text, choices, correct) VALUES (?, ?, ?)',
    [text, JSON.stringify(choices), correct],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/:id', (req, res) => {
  const { text, choices, correct } = req.body;
  const { id } = req.params;
  db.run(
    'UPDATE questions SET text = ?, choices = ?, correct = ? WHERE id = ?',
    [text, JSON.stringify(choices), correct, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run(
    'DELETE FROM questions WHERE id = ?',
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

module.exports = router;
