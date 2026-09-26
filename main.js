/**
 * NEURAPRESS Main Process
 * Electron application lifecycle, security hardening, and privileged services.
 */

const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const {
  SCHEME,
  APP_HOST,
  registerPrivilegedSchemes,
  setupSecurity,
  hardenWindow
} = require('./src/main/security');
const { registerIpcHandlers, cleanupAllJobs } = require('./src/main/ipc-service');

// Register privileged custom scheme before app is ready
registerPrivilegedSchemes();

let mainWindow = null;
let splashWindow = null;

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
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false
    }
  });

  hardenWindow(splashWindow);
  splashWindow.loadURL(`${SCHEME}://${APP_HOST}/splash.html`);

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
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false
    }
  });

  hardenWindow(mainWindow);
  registerIpcHandlers(mainWindow);

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

  mainWindow.loadURL(`${SCHEME}://${APP_HOST}/index.html`);

  // Fallback will-download handling for direct browser blob downloads
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    const win = BrowserWindow.fromWebContents(webContents) || mainWindow;
    const suggested = item.getFilename();

    if (process.env.NEURAPRESS_AUTOSAVE_DIR) {
      setDownloadSavePath(item, webContents, path.join(process.env.NEURAPRESS_AUTOSAVE_DIR, suggested));
      return;
    }

    const filePath = dialog.showSaveDialogSync(win, {
      title: 'Save Compressed PDF Document',
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
  setupSecurity();

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

app.on('before-quit', () => {
  cleanupAllJobs();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});