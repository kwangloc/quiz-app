const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('./db');
const ExcelJS = require('exceljs');
const router = express.Router();

function formatDateOnly(iso) {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  if (isNaN(d)) return 'N/A'
  return d.toLocaleDateString()
}

function formatTimeOnly(iso) {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  if (isNaN(d)) return 'N/A'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

router.post('/', (req, res) => {
  const { studentName, answers, score, total, startTime, submitTime, timeSpent } = req.body;
  if (!studentName) {
    return res.status(400).json({ error: 'studentName is required' });
  }
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  db.run(
    'INSERT INTO results(studentName, answers, score, percent, createdAt, startTime, submitTime, timeSpent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [studentName, JSON.stringify(answers), score, percent, new Date().toISOString(), startTime, submitTime, timeSpent],
    function (err) {
      if (err) {
        console.error('Insert result error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

router.get('/', (req, res) => {
  db.all('SELECT * FROM results', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const parsed = rows.map(r => ({ ...r, answers: JSON.parse(r.answers) }));
    res.json(parsed);
  });
});

router.get('/export', async (req, res) => {
  db.all('SELECT * FROM results', [], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Results');
    sheet.columns = [
      { header: 'Tên', key: 'studentName', width: 25 },
      { header: 'Ngày', key: 'createdAt', width: 16 },
      { header: 'Thời gian bắt đầu', key: 'startTime', width: 14 },
      { header: 'Thời gian nộp', key: 'submitTime', width: 14 },
      { header: 'Thời gian làm (giây)', key: 'timeSpent', width: 18 },
      { header: 'Số câu đúng', key: 'score', width: 10 },
      { header: 'Tỷ lệ đúng (%)', key: 'percent', width: 15 },
    ];

    rows.forEach(r => {
      sheet.addRow({
        studentName: r.studentName,
        score: r.score,
        percent: r.percent,
        startTime: formatTimeOnly(r.startTime),
        submitTime: formatTimeOnly(r.submitTime),
        timeSpent: r.timeSpent ?? 'N/A',
        createdAt: formatDateOnly(r.createdAt)
      });
    });

    try {
      const tmpPath = path.join(os.tmpdir(), `ket_qua_thi_${Date.now()}.xlsx`);
      await workbook.xlsx.writeFile(tmpPath);
      res.download(tmpPath, 'ket_qua_thi.xlsx', (err) => {
        if (err) console.error('Download error:', err);
        try { fs.unlinkSync(tmpPath); } catch (e) {}
      });
    } catch (e) {
      console.error('Export error:', e);
      res.status(500).json({ error: e.message });
    }
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run(
    'DELETE FROM results WHERE id = ?',
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Clear all results
router.post('/clear-all', (req, res) => {
  db.run('DELETE FROM results', [], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

module.exports = router;
