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
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openOutputDir: (outputDir) => ipcRenderer.invoke('open-output-dir', outputDir),
  
  // AI APIs
  ai: {
    saveConfig: (config) => ipcRenderer.invoke('ai:save-config', config),
    getConfig: () => ipcRenderer.invoke('ai:get-config'),
    generateManual: (projectPath, config, screenshots) => ipcRenderer.invoke('ai:generate-manual', { projectPath, config, screenshots }),
    exportManualDocx: (options) => ipcRenderer.invoke('ai:export-manual-docx', options),
    exportManualPdf: (options) => ipcRenderer.invoke('ai:export-manual-pdf', options)
  },
  selectAiScreenshots: () => ipcRenderer.invoke('select-ai-screenshots'),
  saveFile: (content, defaultName) => ipcRenderer.invoke('save-file', { content, defaultName })
});
