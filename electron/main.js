const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

const isDev = !app.isPackaged;

let win;

function createWindow() {
  win = new BrowserWindow({
    autoHideMenuBar: true,
    show: false,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (isDev) {
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    win.loadURL(startUrl);
  } else {
    const indexHtml = path.join(__dirname, '..', 'client', 'dist', 'index.html');
    win.loadFile(indexHtml);
  }

  win.once('ready-to-show', () => {
    // Start maximized (shows native close/minimize controls) instead of fullscreen
    try { win.maximize(); } catch {}
    win.show();
    win.focus();
  });

  // Minimal diagnostics retained (no devtools)
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('did-fail-load:', { errorCode, errorDescription, validatedURL });
  });
  win.webContents.on('crashed', () => {
    console.error('Renderer crashed');
  });
}

let serverProcess = null;

app.whenReady().then(() => {
  // Start API server only in production (packaged) build
  if (!isDev) {
    try {
      const appPath = app.getAppPath();
      const serverEntry = path.join(appPath, 'server', 'index.js');
      if (!fs.existsSync(serverEntry)) {
        throw new Error(`Bundled server entry not found at: ${serverEntry}`);
      }
      // Fork server as a separate Node process to ensure proper module resolution
      const dataDir = app.getPath('userData');
      const logDir = path.join(dataDir, 'logs');
      try { if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); } catch {}
      const outLog = fs.openSync(path.join(logDir, 'server.out.log'), 'a');
      const errLog = fs.openSync(path.join(logDir, 'server.err.log'), 'a');

      serverProcess = fork(serverEntry, [], {
        stdio: ['ignore', outLog, errLog, 'ipc'],
        detached: false,
        env: { ...process.env, DATA_DIR: dataDir }
      });
      serverProcess.on('error', (e) => console.error('Server process error:', e));
    } catch (err) {
      console.error('Failed to start bundled server:', err);
    }
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch {}
    serverProcess = null;
  }
  app.quit();
});

// Optional: toggle fullscreen with F11 when window is focused
app.on('browser-window-focus', () => {
  try {
    const { globalShortcut } = require('electron');
    globalShortcut.register('F11', () => {
      if (win) win.setFullScreen(!win.isFullScreen());
    });
    globalShortcut.register('Escape', () => {
      if (win && win.isFullScreen()) win.setFullScreen(false);
    });
  } catch (e) {}
});

app.on('browser-window-blur', () => {
  try {
    const { globalShortcut } = require('electron');
    globalShortcut.unregister('F11');
    globalShortcut.unregister('Escape');
  } catch (e) {}
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  } else {
    win.focus();
  }
});