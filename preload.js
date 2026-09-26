/**
 * NEURAPRESS Minimal Hardened Context Isolation Preload
 * Strictly exposes whitelisted APIs without raw ipcRenderer or Node access.
 */

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('neurapress', {
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
      return file ? file.path : '';
    } catch (e) {
      return file ? file.path : '';
    }
  },

  analyzePdf: (payload) => {
    return ipcRenderer.invoke('pdf:analyze', payload);
  },

  compressPdf: (payload) => {
    return ipcRenderer.invoke('pdf:compress', payload);
  },

  cancelCompression: (jobId) => {
    return ipcRenderer.invoke('pdf:cancel', jobId);
  },

  saveFile: (payload) => {
    return ipcRenderer.invoke('pdf:save-as', payload);
  },

  onProgress: (jobId, callback) => {
    const channel = `pdf:progress:${jobId}`;
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  onStatus: (jobId, callback) => {
    const channel = `pdf:status:${jobId}`;
    const listener = (_event, message) => callback(message);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  onDownloadComplete: (callback) => {
    const listener = (_event, result) => callback(result);
    ipcRenderer.on('download-complete', listener);
    return () => ipcRenderer.removeListener('download-complete', listener);
  }
});
