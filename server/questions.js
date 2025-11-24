const express = require('express');
const db = require('./db');
const multer = require('multer');
const ExcelJS = require('exceljs');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

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

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    
    const questions = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const getCellVal = (idx) => {
        const val = row.getCell(idx).value;
        return val ? val.toString() : '';
      };

      const text = getCellVal(1);
      const choiceA = getCellVal(2);
      const choiceB = getCellVal(3);
      const choiceC = getCellVal(4);
      const choiceD = getCellVal(5);
      const correct = getCellVal(6);

      if (text && choiceA && choiceB && choiceC && choiceD && correct) {
        questions.push({
          text,
          choices: [choiceA, choiceB, choiceC, choiceD],
          correct
        });
      }
    });

    let insertedCount = 0;
    const insertQuestion = (q) => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO questions(text, choices, correct) VALUES (?, ?, ?)',
          [q.text, JSON.stringify(q.choices), q.correct],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    };

    for (const q of questions) {
      await insertQuestion(q);
      insertedCount++;
    }

    res.json({ success: true, count: insertedCount });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process file' });
  }
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

router.delete('/clear-all', (req, res) => {
  db.run('DELETE FROM questions', [], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
