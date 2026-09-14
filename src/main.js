const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');

const APP_VERSION = '0.5.0-rc.1';
const DEFAULT_WEB_URL = 'https://showdepremios.mskpoeira.com.br';
const WEB_URL = process.env.SHOW_DE_PREMIOS_URL || DEFAULT_WEB_URL;

let mainWindow = null;
let loadingFallback = false;

function isAllowedAppUrl(rawUrl) {
  try {
    const target = new URL(rawUrl);
    const allowed = new URL(WEB_URL);
    return target.origin === allowed.origin || target.protocol === 'file:';
  } catch {
    return false;
  }
}

async function loadSynchronizedApp() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  loadingFallback = false;
  try {
    await mainWindow.loadURL(WEB_URL, {
      userAgent: `ShowDePremiosWindows/${APP_VERSION} Electron/${process.versions.electron}`
    });
  } catch (error) {
    console.error('[Show de Prêmios] Falha ao carregar versão web sincronizada:', error.message);
    await loadOfflineScreen(error.message);
  }
}

async function loadOfflineScreen(reason = '') {
  if (!mainWindow || mainWindow.isDestroyed() || loadingFallback) return;
  loadingFallback = true;
  try {
    await mainWindow.loadFile(path.join(__dirname, 'renderer', 'offline.html'), {
      query: {
        target: WEB_URL,
        version: APP_VERSION,
        reason: String(reason || '').slice(0, 300)
      }
    });
  } catch (error) {
    dialog.showErrorBox('Show de Prêmios', `Não foi possível abrir a tela offline.\n${error.message}`);
  } finally {
    loadingFallback = false;
  }
}

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
      devTools: process.argv.includes('--dev')
    }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedAppUrl(url)) {
      mainWindow.loadURL(url).catch(() => loadOfflineScreen('Falha ao abrir página interna.'));
      return { action: 'deny' };
    }
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedAppUrl(url)) {
      event.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || validatedURL.startsWith('file://')) return;
    console.error(`[Show de Prêmios] did-fail-load ${errorCode}: ${errorDescription}`);
    loadOfflineScreen(`${errorDescription} (${errorCode})`).catch(() => {});
  });

  mainWindow.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    mainWindow.setTitle(`${title || 'Show de Prêmios'} · Windows v${APP_VERSION}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  loadSynchronizedApp();
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
    const payload = JSON.stringify(String(error && error.stack ? error.stack : error));
    mainWindow.webContents.executeJavaScript(`
      (() => {
        const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
        if (!token) return;
        fetch('/fire-test.php', {
          method: 'POST',
          headers: {'Content-Type':'application/x-www-form-urlencoded'},
          credentials: 'include',
          body: new URLSearchParams({
            _csrf: token,
            action: 'auto_issue',
            source: 'WINDOWS',
            severity: 'CRITICAL',
            category: 'DESKTOP',
            title: 'Erro nativo do aplicativo Windows',
            description: ${payload},
            actual_result: ${payload}
          }).toString()
        }).catch(() => {});
      })();
    `).catch(() => {});
  }
});
