const express = require('express');
const cors = require('cors');
const db = require('./db');
const questions = require('./questions');
const results = require('./results');
const settings = require('./settings');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/questions', questions);
app.use('/api/results', results);
app.use('/api/settings', settings);

const PORT = process.env.PORT || 3001;

db.ready.then(() => {
  app.listen(PORT, () => {
    console.log('Server running on port', PORT);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});