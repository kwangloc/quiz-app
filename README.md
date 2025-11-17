# Quiz App - Electron + React + Tailwind + Express + SQLite

This starter project packages a simple offline quiz application as an Electron desktop app.

## Features
- Teacher can create multiple-choice questions
- Students take quizzes sequentially on one computer
- Results saved in local SQLite database
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

## How to build (production)
1. Build client:
   ```
   cd client
   npm run build
   cd ..
   ```
2. Create distribution:
   ```
   npm run dist
   ```

This uses `electron-builder` to produce an installer (Windows NSIS by default).

## Notes
- This starter is intentionally minimal so a non-technical teacher can use the app.
- For production, consider signing the installer and testing on the target OS.

