const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('neurapress', {
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (_event, result) => callback(result));
  }
});
