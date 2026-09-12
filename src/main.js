const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const dataPath = () => path.join(app.getPath('userData'), 'show-de-premios.json');

const seed = {
  version: 1,
  settings: { organization: 'Show de Prêmios', prefix: 'JDA', cardMode: 'fixed', salePrice: 2, triplePrice: 5, prizePercent: 50, firstPrizeShare: 65, secondPrizeShare: 35 },
  event: { id: 'EVENTO-001', name: 'Show de Prêmios', date: new Date().toISOString().slice(0, 10), status: 'planning', rounds: 20, initialCash: 0 },
  rounds: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `${i + 1}ª Rodada`, prize: '', value: 0, status: i === 0 ? 'ready' : 'waiting', drawn: [] })),
  sellers: [{ id: 1, name: 'Caixa principal', active: true }],
  sales: [], cards: [], withdrawals: [], audit: []
};

function readData() {
  try { return JSON.parse(fs.readFileSync(dataPath(), 'utf8')); }
  catch { writeData(seed); return structuredClone(seed); }
}

function writeData(data) {
  const temp = `${dataPath()}.tmp`;
  fs.mkdirSync(path.dirname(dataPath()), { recursive: true });
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temp, dataPath());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500, height: 940, minWidth: 1180, minHeight: 720,
    backgroundColor: '#f4f7fb',
    title: 'Show de Prêmios',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('data:load', () => readData());
  ipcMain.handle('data:save', (_event, data) => { writeData(data); return { ok: true }; });
  ipcMain.handle('data:export', async (_event, data) => {
    const result = await dialog.showSaveDialog({ title: 'Exportar backup', defaultPath: `show-de-premios-backup-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'Backup JSON', extensions: ['json'] }] });
    if (result.canceled) return { ok: false };
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, path: result.filePath };
  });
  ipcMain.handle('data:import', async () => {
    const result = await dialog.showOpenDialog({ title: 'Importar backup', properties: ['openFile'], filters: [{ name: 'Backup JSON', extensions: ['json'] }] });
    if (result.canceled) return { ok: false };
    const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
    if (!data.event || !Array.isArray(data.rounds) || !Array.isArray(data.sales)) throw new Error('Arquivo de backup inválido.');
    writeData(data); return { ok: true, data };
  });
  ipcMain.handle('screen:open', () => {
    const win = new BrowserWindow({ fullscreen: true, backgroundColor: '#07101d', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } });
    win.loadFile(path.join(__dirname, 'renderer', 'screen.html'));
    return { ok: true };
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
