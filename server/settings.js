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
// Get passing threshold percent
router.get('/passing-threshold', async (req, res) => {
  try {
    const val = await getSetting('passingThreshold');
    const percent = val != null ? Number(val) : null;
    res.json({ percent: isNaN(percent) ? null : percent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Set passing threshold percent (0-100)
router.post('/passing-threshold', async (req, res) => {
  try {
    const { percent } = req.body;
    const p = Number(percent);
    if (isNaN(p) || p < 0 || p > 100) return res.status(400).json({ error: 'percent must be between 0 and 100' });
    await setSetting('passingThreshold', String(Math.floor(p)));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
