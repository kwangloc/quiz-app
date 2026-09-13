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

function formatMinSec(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return 'N/A'
  const s = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins} phút ${secs} giây`
}

router.post('/', (req, res) => {
  const { studentName, department, answers, score, total, startTime, submitTime, timeSpent, examId } = req.body;
  if (!studentName) {
    return res.status(400).json({ error: 'studentName is required' });
  }
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  function insertResult(examTitle) {
    db.run(
      'INSERT INTO results(studentName, department, answers, score, total, percent, createdAt, startTime, submitTime, timeSpent, examId, examTitle) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [studentName, department || null, JSON.stringify(answers), score, total, percent, new Date().toISOString(), startTime, submitTime, timeSpent, examId || null, examTitle],
      function (err) {
        if (err) {
          console.error('Insert result error:', err);
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID });
      }
    );
  }

  if (examId) {
    db.all('SELECT title FROM exams WHERE id = ?', [examId], (err, rows) => {
      insertResult(!err && rows && rows[0] ? rows[0].title : null);
    });
  } else {
    insertResult(null);
  }
});

router.get('/', (req, res) => {
  const { examId } = req.query;
  const sql = examId ? 'SELECT * FROM results WHERE examId = ?' : 'SELECT * FROM results';
  const params = examId ? [examId] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const parsed = rows.map(r => ({ ...r, answers: JSON.parse(r.answers) }));
    res.json(parsed);
  });
});

function getExamTitle(examId) {
  return new Promise((resolve) => {
    db.all('SELECT title FROM exams WHERE id = ?', [examId], (err, rows) => {
      resolve(!err && rows && rows[0] ? rows[0].title : null);
    });
  });
}

router.get('/export', async (req, res) => {
  const { examId } = req.query;
  const sql = examId ? 'SELECT * FROM results WHERE examId = ?' : 'SELECT * FROM results';
  const params = examId ? [examId] : [];
  db.all(sql, params, async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const titleHeading = examId
      ? (await getExamTitle(examId)) || 'Không rõ bài thi'
      : 'Tất cả bài thi';

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Results');
    const columnDefs = [
      { header: 'Tên', key: 'studentName', width: 25 },
      { header: 'Phòng ban', key: 'department', width: 30 },
      // Only needed when exporting across exams — a single-exam export already states it in the metadata above
      ...(examId ? [] : [{ header: 'Bài thi', key: 'examTitle', width: 25 }]),
      { header: 'Ngày', key: 'createdAt', width: 16 },
      { header: 'Thời gian bắt đầu', key: 'startTime', width: 20 },
      { header: 'Thời gian nộp', key: 'submitTime', width: 18 },
      { header: 'Thời gian làm', key: 'timeSpent', width: 22 },
      { header: 'Số câu đúng', key: 'score', width: 16 },
      { header: 'Tổng số câu', key: 'total', width: 16 },
      { header: 'Tỷ lệ đúng (%)', key: 'percent', width: 18 },
    ];
    const numCols = columnDefs.length;
    const dataStartCol = 2; // column A left blank as a margin
    const dataEndCol = dataStartCol + numCols - 1;
    // Set widths/keys without auto-writing a header row yet — metadata rows go above it
    sheet.columns = [{ width: 3 }, ...columnDefs.map(({ header, ...rest }) => rest)];

    // Metadata block
    const titleRow = sheet.addRow([]);
    titleRow.getCell(dataStartCol).value = `Bài thi: ${titleHeading}`;
    titleRow.getCell(dataStartCol).font = { bold: true, size: 13, color: { argb: 'FF15803D' } };
    sheet.mergeCells(titleRow.number, dataStartCol, titleRow.number, dataEndCol);

    const exportedAtRow = sheet.addRow([]);
    exportedAtRow.getCell(dataStartCol).value = `Thời gian xuất file: ${new Date().toLocaleString([], { hour12: false })}`;
    exportedAtRow.getCell(dataStartCol).font = { size: 11, color: { argb: 'FF6B7280' } };
    sheet.mergeCells(exportedAtRow.number, dataStartCol, exportedAtRow.number, dataEndCol);

    const totalRow = sheet.addRow([]);
    totalRow.getCell(dataStartCol).value = `Tổng số người thi: ${rows.length}`;
    totalRow.getCell(dataStartCol).font = { size: 11, color: { argb: 'FF6B7280' } };
    sheet.mergeCells(totalRow.number, dataStartCol, totalRow.number, dataEndCol);

    sheet.addRow([]); // spacer

    // Header row
    const headerRow = sheet.addRow([]);
    const headerRowNumber = headerRow.number;
    headerRow.height = 22;
    columnDefs.forEach((c, i) => {
      const cell = headerRow.getCell(dataStartCol + i);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    rows.forEach(r => {
      sheet.addRow({
        studentName: r.studentName,
        department: r.department || 'N/A',
        examTitle: r.examTitle || 'N/A',
        score: r.score,
        total: r.total || 'N/A',
        percent: r.percent != null ? `${r.percent}%` : 'N/A',
        startTime: formatTimeOnly(r.startTime),
        submitTime: formatTimeOnly(r.submitTime),
        timeSpent: formatMinSec(r.timeSpent),
        createdAt: formatDateOnly(r.createdAt)
      });
    });

    const thinBorder = { style: 'thin', color: { argb: 'FFD1D5DB' } };
    const mediumBorder = { style: 'medium', color: { argb: 'FF15803D' } };
    const centeredCols = new Set(['createdAt', 'startTime', 'submitTime', 'timeSpent', 'score', 'total', 'percent']);

    sheet.columns.forEach(col => {
      col.alignment = centeredCols.has(col.key)
        ? { vertical: 'middle', horizontal: 'center' }
        : { vertical: 'middle', horizontal: 'left' };
    });

    const dataEndRow = sheet.rowCount;

    // Only style cells that actually hold data (header + result rows), never the whole row width
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber < headerRowNumber) return;
      const isStripe = rowNumber > headerRowNumber && (rowNumber - headerRowNumber) % 2 === 0;
      row.eachCell(cell => {
        cell.border = {
          top: rowNumber === headerRowNumber ? mediumBorder : thinBorder,
          bottom: rowNumber === dataEndRow ? mediumBorder : thinBorder,
          left: cell.col === dataStartCol ? mediumBorder : thinBorder,
          right: cell.col === dataEndCol ? mediumBorder : thinBorder,
        };
        if (isStripe) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
      });
    });

    sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
    sheet.autoFilter = { from: { row: headerRowNumber, column: dataStartCol }, to: { row: headerRowNumber, column: dataEndCol } };

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

// Clear all results (optionally scoped to one exam)
router.post('/clear-all', (req, res) => {
  const { examId } = req.body || {};
  const sql = examId ? 'DELETE FROM results WHERE examId = ?' : 'DELETE FROM results';
  const params = examId ? [examId] : [];
  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
