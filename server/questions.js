const express = require('express');
const db = require('./db');
const ExcelJS = require('exceljs');
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

// Import questions from Excel file
router.post('/import', async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Parse Excel file from buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) return res.status(400).json({ error: 'No worksheet found' });
    
    const results = {
      imported: 0,
      errors: [],
      skipped: 0
    };
    
    // Helper function to safely convert cell value to string
    const toString = (val) => {
      if (val === null || val === undefined) return '';
      return String(val).trim();
    };
    
    // Process each row (skip header if row 1 is present)
    worksheet.eachRow((row, rowNum) => {
      // Skip empty rows
      if (!row.values || row.values.every(v => !v)) {
        results.skipped++;
        return;
      }
      
      const [, text, choice1, choice2, choice3, choice4, correctStr] = row.values || [];
      
      // Convert all values to string and trim
      const textStr = toString(text);
      
      // Validate question text
      if (!textStr) {
        results.errors.push({ row: rowNum, message: 'Question text required (Column A)' });
        return;
      }
      
      // Collect valid choices - convert any type to string
      const choicesArray = [];
      const c1 = toString(choice1);
      const c2 = toString(choice2);
      const c3 = toString(choice3);
      const c4 = toString(choice4);
      
      if (c1) choicesArray.push(c1);
      if (c2) choicesArray.push(c2);
      if (c3) choicesArray.push(c3);
      if (c4) choicesArray.push(c4);
      
      // Validate choices count
      if (choicesArray.length < 2) {
        results.errors.push({ row: rowNum, message: 'At least 2 choices required (Columns B-E)' });
        return;
      }
      
      // Parse and validate correct answer index
      const correctIdx = parseInt(toString(correctStr), 10);
      if (isNaN(correctIdx) || correctIdx < 1 || correctIdx > choicesArray.length) {
        results.errors.push({ row: rowNum, message: `Correct answer must be between 1 and ${choicesArray.length} (Column F)` });
        return;
      }
      
      // Convert to 0-based index for storage
      const correct = String(correctIdx - 1);
      
      // Insert into database
      db.run(
        'INSERT INTO questions(text, choices, correct) VALUES (?, ?, ?)',
        [textStr, JSON.stringify(choicesArray), correct],
        function (err) {
          if (err) {
            results.errors.push({ row: rowNum, message: `Database error: ${err.message}` });
          } else {
            results.imported++;
          }
        }
      );
    });
    
    // Wait a bit for all inserts to complete
    setTimeout(() => {
      res.json(results);
    }, 100);
    
  } catch (e) {
    res.status(500).json({ error: `Failed to parse Excel file: ${e.message}` });
  }
});

// Clear all questions
router.post('/clear-all', (req, res) => {
  db.run('DELETE FROM questions', [], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

module.exports = router;
