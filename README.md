# Quiz App - (Electron/React/Tailwind/Express/SQLite)

A simple offline quiz application built with Electron Desktop App

## Features
- Teacher can create multiple-choice questions
- Optional time limit per exam (auto-submit when time is up)
- Randomized question order and answer choices per attempt
- Students take quizzes sequentially on one computer
- Sidebar question tracker with jump-to-question and integrated timer
- In-app result summary (score, percentage, time spent)
- Results saved in local SQLite (embedded) database
- Export results to Excel

## How to run (development)
1. Install root dependencies:
   ```
   npm install
   ```
2. Install client & server deps:
   ```
   cd client && npm install
   cd ../server && npm install
   cd ..
   ```
3. Start dev (opens Electron + client + server):
   ```
   npm run dev
   ```

Open the app window (it will open automatically). By default the client runs on http://localhost:5173 and server on http://localhost:3000.
Open the app window (it will open automatically). By default the client runs on http://localhost:5173 and the server on http://localhost:3001.

## Usage
- Teacher
   - Open the Teacher tab, add/edit questions, and optionally set a time limit (in minutes).
   - Click Save to persist. Use Export to download results as Excel.
- Student
   - Enter your name and start the exam. The timer appears in the left tracker panel.
   - Navigate via the tracker; submit when done. If a time limit is set, the exam auto-submits at 0.

## How to build (production)
1. Build client:
   ```
   npm run build
   cd ..
   ```
2. Create distribution:
   ```
   npm run dist
   ```

This uses `electron-builder` to produce an installer (Windows NSIS by default).

