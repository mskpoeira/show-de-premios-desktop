const { contextBridge, ipcRenderer } = require('electron');
const { version } = require('../package.json');

contextBridge.exposeInMainWorld('showApp', {
  version,
  authStatus: () => ipcRenderer.invoke('auth:status'),
  setupMaster: password => ipcRenderer.invoke('auth:setup-master', password),
  login: (login, password) => ipcRenderer.invoke('auth:login', login, password),
  setUserPassword: (userId, password) => ipcRenderer.invoke('auth:set-user-password', userId, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  load: () => ipcRenderer.invoke('data:load'),
  save: data => ipcRenderer.invoke('data:save', data),
  exportBackup: () => ipcRenderer.invoke('data:export'),
  importBackup: () => ipcRenderer.invoke('data:import'),
  openScreen: () => ipcRenderer.invoke('screen:open'),
  closeScreen: () => ipcRenderer.invoke('screen:close'),
  pixQr: (config, amount, reference) => ipcRenderer.invoke('pix:generate', config, amount, reference)
});
