const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./db');
const questions = require('./questions');
const results = require('./results');
const exams = require('./exams');
const departments = require('./departments');

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads (max 10MB, single file field 'file')
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use('/api/questions', upload.single('file'), questions);
app.use('/api/results', results);
app.use('/api/exams', exams);
app.use('/api/departments', departments);

const PORT = process.env.PORT || 3001;

db.ready.then(() => {
  app.listen(PORT, () => {
    console.log('Server running on port', PORT);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});