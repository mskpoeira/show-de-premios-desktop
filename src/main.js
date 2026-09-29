const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { version: APP_VERSION } = require('../package.json');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: '#0f172a',
    title: `Show de Prêmios v${APP_VERSION}`,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: process.argv.includes('--dev'),
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  mainWindow.webContents.on('will-attach-webview', event => {
    event.preventDefault();
  });

  mainWindow.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    mainWindow.setTitle(`${title || 'Show de Prêmios'} · Windows v${APP_VERSION}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html')).catch(error => {
    dialog.showErrorBox('Show de Prêmios', `Não foi possível abrir a aplicação local.\n${error.message}`);
  });
}

app.whenReady().then(() => {
  app.setName('Show de Prêmios');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', error => {
  console.error('[Show de Prêmios] Erro não tratado:', error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showErrorBox('Show de Prêmios', String(error && error.stack ? error.stack : error));
  }
});
