const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('softreg', {
  selectProject: () => ipcRenderer.invoke('select-project'),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  scanProject: (options) => ipcRenderer.invoke('scan-project', options),
  generateDocx: (options) => ipcRenderer.invoke('generate-docx', options),
  generatePdf: (options) => ipcRenderer.invoke('generate-pdf', options),
  setExportPages: (mode) => ipcRenderer.invoke('set-export-pages', mode),
  initScanState: () => ipcRenderer.invoke('init-scan-state'),
  ensureOutputDir: (outputDir) => ipcRenderer.invoke('ensure-output-dir', outputDir),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
