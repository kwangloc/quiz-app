const express = require('express');
const db = require('./db');
const router = express.Router();

// helpers
function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.all('SELECT value FROM settings WHERE key = ?', [key], (err, rows) => {
      if (err) return reject(err);
      resolve(rows && rows[0] ? rows[0].value : null);
    });
  });
}

function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)', [key, value], function (err) {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

// Get time limit in minutes
router.get('/time-limit', async (req, res) => {
  try {
    const val = await getSetting('timeLimitMinutes');
    const minutes = val != null ? Number(val) : null;
    res.json({ minutes: isNaN(minutes) ? null : minutes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Set time limit in minutes
router.post('/time-limit', async (req, res) => {
  try {
    const { minutes } = req.body;
    const m = Number(minutes);
    if (isNaN(m) || m < 0) return res.status(400).json({ error: 'minutes must be a non-negative number' });
    await setSetting('timeLimitMinutes', String(Math.floor(m)));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
