const { app, BrowserWindow, shell, dialog, session } = require('electron');
const path = require('path');

let mainWindow;
let splashWindow;

const ICON_PATH = path.join(__dirname, 'build', 'icon.png');

function setDownloadSavePath(item, webContents, filePath) {
  item.once('done', (_event, state) => {
    if (webContents.isDestroyed()) return;
    webContents.send('download-complete', {
      success: state === 'completed',
      fileName: path.basename(filePath),
      filePath
    });
  });
  item.setSavePath(filePath);
}

function createSplash() {
  // Frameless, transparent, always-on-top boot screen with the app emblem
  splashWindow = new BrowserWindow({
    width: 540,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    closable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    hasShadow: false,
    icon: ICON_PATH,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
    splashWindow.center();
  });
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#030712',
    autoHideMenuBar: true,
    show: false,
    title: 'NEURAPRESS // Quantum PDF Compressor',
    icon: ICON_PATH,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webSecurity: false, // Permits local worker buffers under file:// protocol
      backgroundThrottling: false
    }
  });

  // Hand the baton from splash to main window (keep splash up >= 1.6s so it reads)
  const readyAt = Date.now();
  const reveal = () => {
    if (process.env.NEURAPRESS_HIDDEN === '1') {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
      return;
    }
    const wait = Math.max(0, 1600 - (Date.now() - readyAt));
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.show();
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
    }, wait);
  };
  const failsafe = setTimeout(reveal, 12000);
  mainWindow.webContents.once('did-finish-load', () => {
    clearTimeout(failsafe);
    reveal();
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open external links securely in the user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Route in-app PDF downloads through a native "Save As" dialog.
  // If a file is never written it's a symptom of wrong will-download handling.
  // event.preventDefault() in Electron 29 cancels the item instead of pausing,
  // so the file is only written when setSavePath() is set synchronously BEFORE
  // the handler returns and the blob transfer begins. That is why we use a
  // synchronous Save dialog here; cancelling prevents the item entirely.
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    const win = BrowserWindow.fromWebContents(webContents) || mainWindow;
    const suggested = item.getFilename();

    if (process.env.NEURAPRESS_AUTOSAVE_DIR) {
      setDownloadSavePath(item, webContents, path.join(process.env.NEURAPRESS_AUTOSAVE_DIR, suggested));
      return;
    }

    const filePath = dialog.showSaveDialogSync(win, {
      title: 'Save Compressed PDF',
      defaultPath: path.join(app.getPath('downloads'), suggested),
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (!filePath) {
      event.preventDefault();
      return;
    }

    setDownloadSavePath(item, webContents, filePath);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const hidden = process.env.NEURAPRESS_HIDDEN === '1';
  if (!hidden) {
    createSplash();
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});