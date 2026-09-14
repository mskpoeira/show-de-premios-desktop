const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('showApp', {
  authStatus: () => ipcRenderer.invoke('auth:status'),
  setupMaster: password => ipcRenderer.invoke('auth:setup-master', password),
  login: (login, password) => ipcRenderer.invoke('auth:login', login, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  load: () => ipcRenderer.invoke('data:load'),
  save: data => ipcRenderer.invoke('data:save', data),
  exportBackup: () => ipcRenderer.invoke('data:export'),
  importBackup: () => ipcRenderer.invoke('data:import'),
  openScreen: () => ipcRenderer.invoke('screen:open'),
  closeScreen: () => ipcRenderer.invoke('screen:close'),
  pixQr: (config, amount, reference) => ipcRenderer.invoke('pix:generate', config, amount, reference)
});
