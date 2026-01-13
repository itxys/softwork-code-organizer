const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { scanProject } = require('./shared/scanner');
const { scanProjectForAI } = require('./shared/aiScanner');
const os = require('os');
const { writePdfFromDocx } = require('./shared/exportPdf');
const { writeDocx } = require('./shared/exportDocx');
const { writeManualDocx } = require('./shared/exportManualDocx');
const Store = require('electron-store');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');

const store = new Store();

let mainWindow;
let lastScan = null;

function getWindowIcon() {
  // 打包后，build 目录被包含在 resources/app/build 中
  // __dirname 是 resources/app/src
  const baseDir = path.join(__dirname, '..', 'build');
  if (process.platform === 'win32') {
    const iconPath = path.join(baseDir, 'icon.ico');
    return fs.existsSync(iconPath) ? iconPath : undefined;
  }
  const pngPath = path.join(baseDir, 'icon.png');
  return fs.existsSync(pngPath) ? pngPath : undefined;
}

/**
 * 初始化自动更新（仅打包后生效）：从 GitHub Releases 检查、下载并提示安装。
 */
function setupAutoUpdate() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', async (error) => {
    try {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: '更新失败',
        message: '检查更新时发生错误',
        detail: String(error?.message || error || '')
      });
    } catch {}
  });

  autoUpdater.on('update-available', async () => {
    try {
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '发现新版本',
        message: '发现新版本，正在后台下载…',
        buttons: ['知道了'],
        defaultId: 0
      });
    } catch {}
  });

  autoUpdater.on('update-downloaded', async () => {
    try {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '更新已下载',
        message: '新版本已下载完成，是否立即重启并安装？',
        buttons: ['立即重启安装', '稍后'],
        defaultId: 0,
        cancelId: 1
      });
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    } catch {}
  });

  autoUpdater.checkForUpdates().catch(() => {});
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
  setupAutoUpdate();

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

ipcMain.handle('select-ai-screenshots', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  return result.filePaths.map(filePath => ({
    path: filePath,
    url: pathToFileURL(filePath).href,
    name: path.basename(filePath)
  }));
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

ipcMain.handle('open-output-dir', async (_event, outputDir) => {
  const dir = String(outputDir || '').trim();
  if (!dir) return false;
  const result = await shell.openPath(dir);
  if (result) throw new Error(result);
  return true;
});

ipcMain.handle('ensure-output-dir', async (_event, outputDir) => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return true;
});

// AI Feature Handlers
ipcMain.handle('ai:save-config', async (_event, config) => {
  store.set('aiConfig', config);
  return true;
});

ipcMain.handle('ai:get-config', async () => {
  return store.get('aiConfig') || {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo'
  };
});

ipcMain.handle('ai:generate-manual', async (_event, { projectPath, config, screenshots }) => {
  try {
    const context = scanProjectForAI(projectPath);
    const shotList = Array.isArray(screenshots) ? screenshots : [];
    const shotText = shotList.length
      ? shotList
          .map((s, i) => {
            const note = String(s?.note || '').trim();
            const name = String(s?.name || '').trim();
            const label = note || name || String(s?.path || '').trim();
            return `${i + 1}. ${label}`;
          })
          .join('\n')
      : '（无）';
    
    const prompt = `
你是一个专业的软件文档撰写专家。请根据以下项目上下文，撰写一份详细的《软件说明书》。
请严格使用 Markdown 标题（# / ## / ###）组织结构，标题不要只用纯编号列表代替。

## 截图列表（可用于插图）
${shotText}

当正文需要插入某张截图时，请在合适位置“单独输出一行”占位符，格式必须严格为：
[[SCREENSHOT:截图说明]]
其中“截图说明”必须与上面的截图列表某一项完全一致（优先使用用户填写的备注）。

## 1. 项目结构
\`\`\`
${context.structure}
\`\`\`

## 2. README 内容
${context.readme}

## 3. 依赖/配置信息
${context.packageJson}

## 4. 核心代码片段
${context.sourceSnippets.map(s => `--- ${s.path} ---\n${s.content}`).join('\n\n')}

请输出 Markdown 格式，包含以下章节：
1. # 软件概述（根据 README 和代码推断）
2. # 功能列表（详细列出功能点）
3. # 技术特点（架构、语言、关键技术）
4. # 运行环境要求
5. # 使用说明（如有）
`;

    // Ensure baseUrl does not end with slash
    const baseUrl = config.baseUrl.replace(/\/$/, '');
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: '你是一个专业的软件技术文档专家，擅长编写软件说明书。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI 请求失败 (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      throw new Error('AI 返回结果为空');
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw error;
  }
});

ipcMain.handle('ai:export-manual-docx', async (_event, options) => {
  const outputPath = path.join(options.outputDir, options.fileName);
  await writeManualDocx(outputPath, options);
  return outputPath;
});

ipcMain.handle('ai:export-manual-pdf', async (_event, options) => {
  const outputPath = path.join(options.outputDir, options.fileName);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'softreg-manual-'));
  const tempDocx = path.join(tempDir, 'manual.docx');
  await writeManualDocx(tempDocx, options);
  writePdfFromDocx(tempDocx, outputPath);
  return outputPath;
});

ipcMain.handle('save-file', async (_event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  });
  
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf8');
    return result.filePath;
  }
  return null;
});
