const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { scanProject } = require('./shared/scanner');
const os = require('os');
const { writePdfFromDocx } = require('./shared/exportPdf');
const { writeDocx } = require('./shared/exportDocx');

let mainWindow;
let lastScan = null;

function getWindowIcon() {
  const baseDir = path.join(__dirname, '..', 'build');
  if (process.platform === 'win32') {
    return path.join(baseDir, 'icon.ico');
  }
  return path.join(baseDir, 'icon.png');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    title: '软著代码资料整理器',
    icon: getWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-project', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('select-output-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('scan-project', async (_event, options) => {
  const scan = scanProject(options.projectPath);
  if (scan.totalPages === 0) {
    throw new Error('未找到可用源码文件。');
  }
  lastScan = {
    ...scan,
    headerText: options.headerText,
    pagesToExport: scan.pagesToExport
  };
  return {
    projectPath: scan.projectPath,
    fileCount: scan.fileCount,
    effectiveLines: scan.effectiveLines,
    totalPages: scan.totalPages,
    selectedPages: scan.pagesToExport.length
  };
});

ipcMain.handle('generate-docx', async (_event, options) => {
  if (!lastScan) throw new Error('请先扫描项目。');
  const outputPath = path.join(options.outputDir, options.fileName);
  await writeDocx(outputPath, lastScan.pagesToExport, lastScan.headerText);
  return outputPath;
});

ipcMain.handle('generate-pdf', async (_event, options) => {
  if (!lastScan) throw new Error('请先扫描项目。');
  const outputPath = path.join(options.outputDir, options.fileName);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'softreg-'));
  const tempDocx = path.join(tempDir, 'program-material.docx');
  await writeDocx(tempDocx, lastScan.pagesToExport, lastScan.headerText);
  writePdfFromDocx(tempDocx, outputPath);
  return outputPath;
});

ipcMain.handle('set-export-pages', async (_event, mode) => {
  if (!lastScan) throw new Error('请先扫描项目。');
  if (mode === 'all') {
    lastScan.pagesToExport = lastScan.pages;
  } else {
    lastScan.pagesToExport = lastScan.selectedPages;
  }
  return {
    pagesToExport: lastScan.pagesToExport.length
  };
});

ipcMain.handle('init-scan-state', async () => {
  lastScan = null;
});

ipcMain.handle('open-external', async (_event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('ensure-output-dir', async (_event, outputDir) => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return true;
});
