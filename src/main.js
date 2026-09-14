const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { createPixPayload } = require('./services/pix');

let mainWindow;
let session = null;
const loginAttempts = new Map();
const DATA_VERSION = 4;
const dataPath = () => path.join(app.getPath('userData'), 'show-de-premios.json');
const backupPath = () => `${dataPath()}.bak`;

const seed = {
  version: DATA_VERSION,
  currentUserId: 1,
  sequences: { sale: 0, card: 0 },
  settings: {
    organization: 'Show de Prêmios', prefix: 'JDA', cardMode: 'fixed', drawMode: 'automatic',
    salePrice: 2, triplePrice: 5, prizePercent: 50, firstPrizeShare: 65, secondPrizeShare: 35,
    pix: { enabled: false, keyType: 'cnpj', key: '', name: '', city: 'UBATUBA', description: 'SHOW DE PREMIOS', banner: 'PAGUE COM PIX DIRETO DO SEU LUGAR' }
  },
  event: { id: 'EVENTO-001', name: 'Show de Prêmios', date: new Date().toISOString().slice(0, 10), status: 'planning', rounds: 20, initialCash: 0 },
  rounds: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `${i + 1}ª Rodada`, prizes: [], status: i === 0 ? 'ready' : 'waiting', drawn: [], drawLog: [] })),
  sellers: [{ id: 1, name: 'Caixa principal', phone: '', email: '', commission: 0, active: true }],
  users: [{ id: 1, name: 'Administrador Master', login: 'admin', role: 'MASTER', active: true, passwordSalt: '', passwordHash: '' }],
  customers: [], sales: [], cards: [], withdrawals: [], winners: [], cashClosings: [], audit: []
};

const clone = value => structuredClone(value);
const now = () => new Date().toISOString();
const toArray = value => Array.isArray(value) ? value : [];
const sanitizeText = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const parseSeq = (code, prefix) => {
  const match = String(code || '').match(new RegExp(`^${String(prefix || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)`));
  return match ? Number(match[1]) || 0 : 0;
};

function passwordDigest(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function normalizeData(input) {
  const data = input && typeof input === 'object' ? clone(input) : clone(seed);
  data.version = DATA_VERSION;
  data.settings = { ...seed.settings, ...(data.settings || {}), pix: { ...seed.settings.pix, ...(data.settings?.pix || {}) } };
  data.event = { ...seed.event, ...(data.event || {}) };
  data.sequences = { ...seed.sequences, ...(data.sequences || {}) };
  for (const key of ['sellers', 'users', 'customers', 'sales', 'cards', 'withdrawals', 'winners', 'cashClosings', 'audit']) data[key] = toArray(data[key]);
  data.rounds = toArray(data.rounds).map((r, idx) => ({
    id: Number(r?.id) || idx + 1,
    name: sanitizeText(r?.name || `${idx + 1}ª Rodada`, 80),
    prizes: toArray(r?.prizes || (r?.prize ? [{ id: Date.now() + idx, name: r.prize, value: Number(r.value || 0), pattern: 'FULL' }] : [])).map((p, pidx) => ({
      ...p,
      id: Number(p?.id) || Date.now() + idx * 100 + pidx,
      name: sanitizeText(p?.name || `${pidx + 1}º Prêmio`, 120),
      value: Number(p?.value || 0),
      pattern: ['FULL', 'LINE', 'CORNERS'].includes(p?.pattern) ? p.pattern : 'FULL'
    })),
    status: ['waiting', 'ready', 'completed'].includes(r?.status) ? r.status : 'waiting',
    drawn: toArray(r?.drawn).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 75).filter((n, i, a) => a.indexOf(n) === i),
    drawLog: toArray(r?.drawLog)
  }));
  if (!data.rounds.length) data.rounds = clone(seed.rounds);
  data.event.rounds = data.rounds.length;
  data.cards = data.cards.map(c => ({ ...c, type: c?.type === 'PHYSICAL' ? 'PHYSICAL' : 'DIGITAL', createdAt: c?.createdAt || c?.at || now(), status: c?.status === 'canceled' ? 'canceled' : 'valid' }));
  const master = data.users.find(u => u?.role === 'MASTER');
  if (!master) data.users.unshift(clone(seed.users[0]));
  data.currentUserId = Number(data.currentUserId) || data.users.find(u => u.role === 'MASTER')?.id || 1;
  const prefix = sanitizeText(data.settings.prefix || 'JDA', 8).toUpperCase() || 'JDA';
  data.settings.prefix = prefix;
  data.sequences.sale = Math.max(Number(data.sequences.sale) || 0, ...data.sales.map(s => parseSeq(s?.code, prefix)), 0);
  data.sequences.card = Math.max(Number(data.sequences.card) || 0, ...data.cards.map(c => parseSeq(c?.code, prefix)), 0);
  return data;
}

function publicState(data) {
  const copy = clone(data);
  copy.users = copy.users.map(({ passwordHash, passwordSalt, ...user }) => user);
  copy.currentUserId = session?.userId || copy.currentUserId;
  return copy;
}

function validateStateShape(data) {
  if (!data || typeof data !== 'object') throw new Error('Estrutura de dados inválida.');
  if (!data.event || !Array.isArray(data.rounds) || !Array.isArray(data.sales) || !Array.isArray(data.cards) || !Array.isArray(data.users)) throw new Error('Arquivo de dados incompleto.');
  if (data.rounds.length > 10000 || data.sales.length > 1000000 || data.cards.length > 5000000) throw new Error('Arquivo excede os limites de segurança.');
}

function writeData(data) {
  const normalized = normalizeData(data);
  validateStateShape(normalized);
  const target = dataPath();
  const temp = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) {
    try { fs.copyFileSync(target, backupPath()); } catch { /* best effort */ }
  }
  fs.writeFileSync(temp, JSON.stringify(normalized, null, 2), 'utf8');
  fs.renameSync(temp, target);
  return normalized;
}

function readData() {
  const target = dataPath();
  if (!fs.existsSync(target)) return writeData(seed);
  try {
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    validateStateShape(parsed);
    return normalizeData(parsed);
  } catch (error) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    try { fs.renameSync(target, `${target}.corrupt-${stamp}.json`); } catch { /* keep going */ }
    if (fs.existsSync(backupPath())) {
      try {
        const backup = JSON.parse(fs.readFileSync(backupPath(), 'utf8'));
        validateStateShape(backup);
        const recovered = normalizeData(backup);
        recovered.audit.unshift({ id: crypto.randomUUID(), at: now(), action: 'Banco recuperado automaticamente a partir do backup local', user: 'Sistema', protected: true });
        return writeData(recovered);
      } catch { /* fall through */ }
    }
    const fresh = clone(seed);
    fresh.audit.unshift({ id: crypto.randomUUID(), at: now(), action: `Banco corrompido isolado; nova base iniciada (${error.message})`, user: 'Sistema', protected: true });
    return writeData(fresh);
  }
}

function requireSession(roles = null) {
  if (!session) throw new Error('Sessão não autenticada.');
  if (roles && !roles.includes(session.role)) throw new Error('Permissão insuficiente para esta operação.');
  return session;
}

function appendAudit(stored, incoming, actor) {
  const existingKeys = new Set(toArray(stored.audit).map(a => `${a.id || ''}|${a.at || ''}|${a.action || ''}|${a.user || ''}`));
  const newEntries = toArray(incoming.audit).filter(a => !existingKeys.has(`${a.id || ''}|${a.at || ''}|${a.action || ''}|${a.user || ''}`)).slice(0, 100);
  const stamped = newEntries.map(a => ({ id: crypto.randomUUID(), at: a.at || now(), action: sanitizeText(a.action || 'Alteração registrada', 300), user: actor.name, protected: true }));
  return [...stamped, ...toArray(stored.audit)].slice(0, 50000);
}

function mergeAuthorizedState(incomingRaw) {
  const actor = requireSession(['MASTER', 'ADMIN', 'OPERATOR']);
  const stored = readData();
  const incoming = normalizeData(incomingRaw);
  validateStateShape(incoming);

  const storedMaster = stored.users.find(u => u.role === 'MASTER');
  const secrets = new Map(stored.users.map(u => [String(u.id), { passwordHash: u.passwordHash || '', passwordSalt: u.passwordSalt || '' }]));

  if (!['MASTER', 'ADMIN'].includes(actor.role)) incoming.users = clone(stored.users);
  else {
    incoming.users = incoming.users.filter(u => u.role !== 'MASTER');
    incoming.users.unshift(clone(storedMaster));
    incoming.users = incoming.users.map(u => ({ ...u, ...(secrets.get(String(u.id)) || {}) }));
  }

  if (actor.role === 'OPERATOR') {
    incoming.settings = clone(stored.settings);
    incoming.event = { ...clone(stored.event), status: incoming.event.status };
    incoming.sellers = clone(stored.sellers);
    incoming.cashClosings = clone(stored.cashClosings);
  }

  incoming.audit = appendAudit(stored, incoming, actor);
  incoming.currentUserId = actor.userId;
  incoming.version = DATA_VERSION;
  return incoming;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500, height: 940, minWidth: 1000, minHeight: 680,
    backgroundColor: '#f4f7fb',
    title: 'Show de Prêmios',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, devTools: process.argv.includes('--dev') }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('file://')) event.preventDefault(); });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'login.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('auth:status', () => {
    const data = readData();
    const master = data.users.find(u => u.role === 'MASTER');
    return { authenticated: !!session, needsSetup: !master?.passwordHash, user: session ? { id: session.userId, name: session.name, role: session.role } : null };
  });
  ipcMain.handle('auth:setup-master', (_event, password) => {
    const data = readData();
    const master = data.users.find(u => u.role === 'MASTER');
    if (master?.passwordHash) throw new Error('O Administrador Master já possui senha definida.');
    if (String(password || '').length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
    const salt = crypto.randomBytes(16).toString('hex');
    master.passwordSalt = salt;
    master.passwordHash = passwordDigest(password, salt);
    data.audit.unshift({ id: crypto.randomUUID(), at: now(), action: 'Senha inicial do Administrador Master configurada', user: master.name, protected: true });
    writeData(data);
    session = { userId: master.id, name: master.name, role: master.role };
    return { ok: true, user: { id: master.id, name: master.name, role: master.role } };
  });
  ipcMain.handle('auth:login', (_event, login, password) => {
    const loginKey = String(login || '').trim().toLowerCase();
    const attempt = loginAttempts.get(loginKey);
    if (attempt?.lockedUntil > Date.now()) {
      const seconds = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
      throw new Error(`Acesso temporariamente bloqueado. Tente novamente em ${seconds}s.`);
    }
    const data = readData();
    const user = data.users.find(u => u.active !== false && String(u.login).toLowerCase() === loginKey);
    let valid = false;
    if (user?.passwordHash && user?.passwordSalt) {
      const given = Buffer.from(passwordDigest(password, user.passwordSalt), 'hex');
      const expected = Buffer.from(user.passwordHash, 'hex');
      valid = given.length === expected.length && crypto.timingSafeEqual(given, expected);
    }
    if (!valid) {
      const count = (attempt?.count || 0) + 1;
      loginAttempts.set(loginKey, { count: count >= 5 ? 0 : count, lockedUntil: count >= 5 ? Date.now() + 5 * 60 * 1000 : 0 });
      throw new Error('Usuário ou senha inválidos.');
    }
    loginAttempts.delete(loginKey);
    session = { userId: user.id, name: user.name, role: user.role };
    data.audit.unshift({ id: crypto.randomUUID(), at: now(), action: 'Login realizado', user: user.name, protected: true });
    writeData(data);
    return { ok: true, user: { id: user.id, name: user.name, role: user.role } };
  });
  ipcMain.handle('auth:set-user-password', (_event, userId, password) => {
    requireSession(['MASTER', 'ADMIN']);
    if (String(password || '').length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
    const data = readData();
    const user = data.users.find(u => String(u.id) === String(userId));
    if (!user) throw new Error('Usuário não localizado.');
    if (user.role === 'MASTER') throw new Error('O Administrador Master é protegido por este fluxo.');
    const salt = crypto.randomBytes(16).toString('hex');
    user.passwordSalt = salt;
    user.passwordHash = passwordDigest(password, salt);
    data.audit.unshift({ id: crypto.randomUUID(), at: now(), action: `Senha do usuário ${user.login} atualizada`, user: session.name, protected: true });
    writeData(data);
    return { ok: true };
  });
  ipcMain.handle('auth:logout', () => {
    if (session) {
      const data = readData();
      data.audit.unshift({ id: crypto.randomUUID(), at: now(), action: 'Logout realizado', user: session.name, protected: true });
      writeData(data);
    }
    session = null;
    return { ok: true };
  });

  ipcMain.handle('data:load', () => { requireSession(); return publicState(readData()); });
  ipcMain.handle('data:save', (_event, data) => {
    const saved = writeData(mergeAuthorizedState(data));
    return { ok: true, data: publicState(saved) };
  });
  ipcMain.handle('data:export', async () => {
    requireSession(['MASTER', 'ADMIN']);
    const result = await dialog.showSaveDialog({ title: 'Exportar backup', defaultPath: `show-de-premios-backup-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'Backup JSON', extensions: ['json'] }] });
    if (result.canceled) return { ok: false };
    fs.writeFileSync(result.filePath, JSON.stringify(readData(), null, 2), 'utf8');
    const data = readData();
    data.audit.unshift({ id: crypto.randomUUID(), at: now(), action: 'Backup exportado', user: session.name, protected: true });
    writeData(data);
    return { ok: true, path: result.filePath };
  });
  ipcMain.handle('data:import', async () => {
    requireSession(['MASTER']);
    const result = await dialog.showOpenDialog({ title: 'Importar backup', properties: ['openFile'], filters: [{ name: 'Backup JSON', extensions: ['json'] }] });
    if (result.canceled) return { ok: false };
    const imported = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
    validateStateShape(imported);
    const normalized = normalizeData(imported);
    const current = readData();
    const currentMaster = current.users.find(u => u.role === 'MASTER');
    normalized.users = normalized.users.filter(u => u.role !== 'MASTER');
    normalized.users.unshift(currentMaster);
    normalized.audit = [...toArray(normalized.audit), ...toArray(current.audit)];
    normalized.audit.unshift({ id: crypto.randomUUID(), at: now(), action: 'Backup importado e validado', user: session.name, protected: true });
    const saved = writeData(normalized);
    return { ok: true, data: publicState(saved) };
  });
  ipcMain.handle('screen:open', () => {
    requireSession();
    const win = new BrowserWindow({ fullscreen: true, backgroundColor: '#07101d', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, devTools: false } });
    win.loadFile(path.join(__dirname, 'renderer', 'screen.html'));
    return { ok: true };
  });
  ipcMain.handle('screen:close', event => { BrowserWindow.fromWebContents(event.sender)?.close(); return { ok: true }; });
  ipcMain.handle('pix:generate', async (_event, config, amount, reference) => {
    requireSession();
    const payload = createPixPayload(config, amount, reference);
    return { payload, dataUrl: await QRCode.toDataURL(payload, { width: 420, margin: 1, errorCorrectionLevel: 'M' }) };
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
