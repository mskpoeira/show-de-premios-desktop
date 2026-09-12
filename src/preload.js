const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('showApp', {
  load: () => ipcRenderer.invoke('data:load'),
  save: data => ipcRenderer.invoke('data:save', data),
  exportBackup: data => ipcRenderer.invoke('data:export', data),
  importBackup: () => ipcRenderer.invoke('data:import'),
  openScreen: () => ipcRenderer.invoke('screen:open'),
  pixQr: (config, amount, reference) => ipcRenderer.invoke('pix:generate', config, amount, reference)
});
