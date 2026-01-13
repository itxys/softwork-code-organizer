const projectPathInput = document.getElementById('projectPath');
const outputDirInput = document.getElementById('outputDir');
const softwareNameInput = document.getElementById('softwareName');
const softwareVersionInput = document.getElementById('softwareVersion');
const statFiles = document.getElementById('statFiles');
const statLines = document.getElementById('statLines');
const statPages = document.getElementById('statPages');
const statExport = document.getElementById('statExport');
const statExportLines = document.getElementById('statExportLines');
const statusEl = document.getElementById('status');

const btnSelectProject = document.getElementById('btnSelectProject');
const btnSelectOutput = document.getElementById('btnSelectOutput');
const btnScan = document.getElementById('btnScan');
const btnExportDocx = document.getElementById('btnExportDocx');
const btnExportPdf = document.getElementById('btnExportPdf');
const btnExportBoth = document.getElementById('btnExportBoth');

const lightRed = document.querySelector('.light.red');
const lightAmber = document.querySelector('.light.amber');
const lightGreen = document.querySelector('.light.green');

/**
 * 更新面板指示灯状态
 * @param {'idle' | 'busy' | 'success' | 'error'} state 
 */
function updateLights(state) {
  lightRed.classList.remove('active');
  lightAmber.classList.remove('active');
  lightGreen.classList.remove('active');

  switch (state) {
    case 'idle':
      lightRed.classList.add('active');
      break;
    case 'busy':
      lightAmber.classList.add('active');
      break;
    case 'success':
      lightGreen.classList.add('active');
      break;
    case 'error':
      lightRed.classList.add('active');
      // 可以加个闪烁效果
      break;
  }
}

/**
 * 格式化数字显示（补零）
 * @param {number|string} num 
 * @param {number} length 
 */
function formatNum(num, length) {
  return String(num).padStart(length, '0');
}

function getSoftwareType() {
  const selected = document.querySelector('input[name="softwareType"]:checked');
  return selected ? selected.value : 'software';
}

function buildHeaderText() {
  const name = softwareNameInput.value.trim();
  const version = softwareVersionInput.value.trim();
  const type = getSoftwareType() === 'game' ? '游戏软件' : '软件';
  if (!name || !version) return '';
  return `${name}${type}V${version}`;
}

function setStatus(message) {
  statusEl.textContent = message.toUpperCase();
  console.log(`[系统] ${message}`);
}

function validateInputs() {
  if (!projectPathInput.value) {
    setStatus('错误: 缺失项目路径');
    updateLights('error');
    return false;
  }
  if (!softwareNameInput.value.trim()) {
    setStatus('错误: 需填写软件名称');
    updateLights('error');
    return false;
  }
  if (!softwareVersionInput.value.trim()) {
    setStatus('错误: 需填写版本号');
    updateLights('error');
    return false;
  }
  if (!outputDirInput.value) {
    setStatus('错误: 缺失输出路径');
    updateLights('error');
    return false;
  }
  return true;
}

async function handleSelectProject() {
  const selected = await window.softreg.selectProject();
  if (selected) projectPathInput.value = selected;
}

async function handleSelectOutput() {
  const selected = await window.softreg.selectOutputDir();
  if (selected) outputDirInput.value = selected;
}

const scanOverlay = document.getElementById('scanOverlay');
let audioCtx = null;

/**
 * 播放科幻扫描音效 (增强合成音效)
 */
function playScanSound() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const now = audioCtx.currentTime;
  const duration = 2.5; // 与填充动画时长一致

  // 主振荡器 (锯齿波 - 提供质感)
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator(); // 副振荡器 (正弦波 - 提供底蕴)
  const filter = audioCtx.createBiquadFilter();
  const gainNode = audioCtx.createGain();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(80, now);
  osc1.frequency.exponentialRampToValueAtTime(450, now + duration);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(40, now);
  osc2.frequency.exponentialRampToValueAtTime(120, now + duration);

  // 滤波器扫频 (更有科幻感)
  filter.type = 'lowpass';
  filter.Q.value = 15; // 高共振
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(3000, now + duration);

  // 音量包络
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.08, now + 0.1); // 快速开启
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // 逐渐消失

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
}

/**
 * 启动按钮动效与音效
 * @param {HTMLElement} btn 
 */
function startButtonEffect(btn) {
  btn.classList.add('processing');
  playScanSound();
}

/**
 * 停止按钮动效
 * @param {HTMLElement} btn 
 */
function stopButtonEffect(btn) {
  btn.classList.remove('processing');
}

async function handleScan() {
  if (!projectPathInput.value) {
    setStatus('错误: 请先选择项目目录');
    updateLights('error');
    return;
  }
  const headerText = buildHeaderText();
  if (!headerText) {
    setStatus('错误: 名称和版本号缺失');
    updateLights('error');
    return;
  }
  try {
    setStatus('状态: 正在扫描项目文件...');
    updateLights('busy');
    startButtonEffect(btnScan);

    await window.softreg.initScanState();
    const result = await window.softreg.scanProject({
      projectPath: projectPathInput.value,
      headerText
    });

    // 模拟一段处理延迟，让“数据灌注”动效完全展现 (2.5秒与CSS动画匹配)
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 更新数据展示，带补零效果
    statFiles.textContent = formatNum(result.fileCount, 4);
    statLines.textContent = formatNum(result.effectiveLines, 6);
    statPages.textContent = formatNum(result.totalPages, 3);
    statExport.textContent = formatNum(result.selectedPages, 3);
    statExportLines.textContent = formatNum(result.selectedPages * 50, 4);

    const truncationNote = result.totalPages > 60 ? ' (已截断至 3000 行)' : '';
    setStatus(`状态: 扫描完成${truncationNote}. 准备就绪.`);
    updateLights('success');
  } catch (err) {
    setStatus(`错误: 扫描失败 // ${String(err.message || err).toUpperCase()}`);
    updateLights('error');
  } finally {
    stopButtonEffect(btnScan);
  }
}

function buildFileName(suffix) {
  const headerText = buildHeaderText();
  return `${headerText}_${suffix}`;
}

async function exportDocx() {
  if (!validateInputs()) return;
  try {
    setStatus('状态: 正在生成 DOCX 数据流...');
    updateLights('busy');
    startButtonEffect(btnExportDocx);

    await window.softreg.ensureOutputDir(outputDirInput.value);
    const fileName = buildFileName('程序鉴别材料.docx');
    const outputPath = await window.softreg.generateDocx({
      outputDir: outputDirInput.value,
      fileName
    });

    await new Promise(resolve => setTimeout(resolve, 2500));
    setStatus(`成功: DOCX 已保存至磁盘`);
    updateLights('success');
  } catch (err) {
    setStatus(`错误: DOCX 生成失败 // ${String(err.message || err).toUpperCase()}`);
    updateLights('error');
  } finally {
    stopButtonEffect(btnExportDocx);
  }
}

async function exportPdf() {
  if (!validateInputs()) return;
  try {
    setStatus('状态: 正在导出 PDF 缓冲区...');
    updateLights('busy');
    startButtonEffect(btnExportPdf);

    await window.softreg.ensureOutputDir(outputDirInput.value);
    const fileName = buildFileName('程序鉴别材料.pdf');
    const outputPath = await window.softreg.generatePdf({
      outputDir: outputDirInput.value,
      fileName
    });

    await new Promise(resolve => setTimeout(resolve, 2500));
    setStatus(`成功: PDF 导出完成`);
    updateLights('success');
  } catch (err) {
    setStatus(`错误: PDF 导出失败 // ${String(err.message || err).toUpperCase()}`);
    updateLights('error');
  } finally {
    stopButtonEffect(btnExportPdf);
  }
}

async function exportBoth() {
  if (!validateInputs()) return;
  await exportDocx();
  await exportPdf();
}

// 初始化灯光
updateLights('idle');

btnSelectProject.addEventListener('click', handleSelectProject);
btnSelectOutput.addEventListener('click', handleSelectOutput);
btnScan.addEventListener('click', handleScan);
btnExportDocx.addEventListener('click', exportDocx);
btnExportPdf.addEventListener('click', exportPdf);
btnExportBoth.addEventListener('click', exportBoth);

// 外部链接跳转处理
document.getElementById('linkBilibili').addEventListener('click', (e) => {
  e.preventDefault();
  window.softreg.openExternal('https://space.bilibili.com/3099272');
});

document.getElementById('linkGithub').addEventListener('click', (e) => {
  e.preventDefault();
  window.softreg.openExternal('https://github.com/itxys/softwork-code-organizer');
});

// ==========================================
// AI Feature Logic
// ==========================================

const btnAiConfig = document.getElementById('btnAiConfig');
const btnAiManual = document.getElementById('btnAiManual');
const btnAiUploadScreenshots = document.getElementById('btnAiUploadScreenshots');
const aiScreenshotList = document.getElementById('aiScreenshotList');
const btnExportAiDocx = document.getElementById('btnExportAiDocx');
const btnExportAiPdf = document.getElementById('btnExportAiPdf');
const btnExportAiBoth = document.getElementById('btnExportAiBoth');
const btnOpenOutputDir = document.getElementById('btnOpenOutputDir');
const btnOpenOutputDirAi = document.getElementById('btnOpenOutputDirAi');
const aiConfigModal = document.getElementById('aiConfigModal');
const aiResultModal = document.getElementById('aiResultModal');
const aiProviderPreset = document.getElementById('aiProviderPreset');
const aiBaseUrl = document.getElementById('aiBaseUrl');
const aiApiKey = document.getElementById('aiApiKey');
const aiModelPreset = document.getElementById('aiModelPreset');
const aiModel = document.getElementById('aiModel');
const btnSaveAiConfig = document.getElementById('btnSaveAiConfig');
const btnCloseAiConfig = document.getElementById('btnCloseAiConfig');
const btnSaveAiManual = document.getElementById('btnSaveAiManual');
const btnCloseAiResult = document.getElementById('btnCloseAiResult');
const aiResultText = document.getElementById('aiResultText');

let aiManualMarkdown = '';
let aiScreenshots = [];
let aiGeneratingManual = false;

const AI_PROVIDER_PRESETS = [
  {
    id: 'custom',
    name: '自定义（兼容 OpenAI 接口）',
    baseUrl: '',
    models: []
  },
  {
    id: 'openai',
    name: 'OpenAI 官方',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      'anthropic/claude-3.5-sonnet',
      'google/gemini-1.5-pro',
      'meta-llama/llama-3.1-70b-instruct'
    ]
  },
  {
    id: 'siliconflow',
    name: '硅基流动（SiliconFlow）',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
      'Qwen/Qwen2.5-7B-Instruct'
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  {
    id: 'moonshot',
    name: 'Moonshot（Kimi）',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
  }
  ,
  {
    id: 'qwen',
    name: 'Qwen（阿里云 DashScope 兼容模式）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max']
  },
  {
    id: 'zhipu',
    name: 'ZhipuGLM（智谱）',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-plus', 'glm-4', 'glm-4-air']
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    models: ['abab6.5s-chat', 'abab6.5-chat']
  },
  {
    id: 'doubao',
    name: 'Doubao / Seed（火山方舟）',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['doubao-seed-1.5', 'doubao-pro-32k', 'doubao-lite-4k']
  },
  {
    id: 'modelscope',
    name: 'ModelScope（魔搭）',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    models: ['Qwen/Qwen2.5-72B-Instruct', 'Qwen/Qwen2.5-7B-Instruct']
  },
  {
    id: 'claude',
    name: 'Claude（通过 OpenRouter）',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-3.5-sonnet', 'anthropic/claude-3.5-haiku']
  },
  {
    id: 'gemini',
    name: 'Google Gemini（兼容接口）',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
  }
];

let aiPresetsInitialized = false;

function getProviderPresetById(id) {
  return AI_PROVIDER_PRESETS.find(p => p.id === id) || AI_PROVIDER_PRESETS[0];
}

function findProviderPresetIdByBaseUrl(baseUrl) {
  const normalized = String(baseUrl || '').trim().replace(/\/$/, '');
  const match = AI_PROVIDER_PRESETS.find(p => p.baseUrl && p.baseUrl.replace(/\/$/, '') === normalized);
  return match ? match.id : 'custom';
}

function setSelectOptions(selectEl, options) {
  selectEl.innerHTML = '';
  for (const opt of options) {
    const optionEl = document.createElement('option');
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    selectEl.appendChild(optionEl);
  }
}

function populateProviderPresetOptions() {
  setSelectOptions(
    aiProviderPreset,
    AI_PROVIDER_PRESETS.map(preset => ({
      value: preset.id,
      label: preset.name
    }))
  );
}

function populateModelPresetOptions(providerId) {
  const provider = getProviderPresetById(providerId);
  const modelOptions = [{ value: 'custom', label: '自定义' }].concat(
    provider.models.map(m => ({ value: m, label: m }))
  );
  setSelectOptions(aiModelPreset, modelOptions);
}

function syncProviderPresetFromBaseUrl() {
  const providerId = findProviderPresetIdByBaseUrl(aiBaseUrl.value);
  if (aiProviderPreset.value !== providerId) {
    aiProviderPreset.value = providerId;
    populateModelPresetOptions(providerId);
    syncModelPresetFromModelName();
  }
}

function syncModelPresetFromModelName() {
  const modelName = String(aiModel.value || '').trim();
  const optionExists = Array.from(aiModelPreset.options).some(o => o.value === modelName);
  aiModelPreset.value = optionExists ? modelName : 'custom';
}

function applyProviderPreset(providerId) {
  const provider = getProviderPresetById(providerId);
  populateModelPresetOptions(providerId);

  if (provider.baseUrl) {
    aiBaseUrl.value = provider.baseUrl;
  }

  if (!String(aiModel.value || '').trim() && provider.models.length > 0) {
    aiModel.value = provider.models[0];
  }

  syncModelPresetFromModelName();
}

function initAiPresetControls() {
  if (aiPresetsInitialized) return;
  aiPresetsInitialized = true;

  populateProviderPresetOptions();
  populateModelPresetOptions('custom');

  aiProviderPreset.addEventListener('change', () => {
    applyProviderPreset(aiProviderPreset.value);
  });

  aiModelPreset.addEventListener('change', () => {
    if (aiModelPreset.value === 'custom') return;
    aiModel.value = aiModelPreset.value;
  });

  aiBaseUrl.addEventListener('input', () => {
    syncProviderPresetFromBaseUrl();
  });

  aiModel.addEventListener('input', () => {
    syncModelPresetFromModelName();
  });
}

function renderAiScreenshotList() {
  if (!aiScreenshotList) return;
  aiScreenshotList.innerHTML = '';
  if (!aiScreenshots.length) return;

  let dragIndex = null;

  aiScreenshots.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'screenshot-item';
    row.draggable = true;
    row.dataset.index = String(index);

    const img = document.createElement('img');
    img.className = 'screenshot-thumb';
    img.alt = item.name || `截图 ${index + 1}`;
    img.src = item.url;

    const name = document.createElement('div');
    name.className = 'screenshot-name';
    name.textContent = `${index + 1}. ${item.name || item.path || ''}`;

    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'screenshot-note';
    noteInput.placeholder = '备注：例如 首页截图 / 目录截图';
    noteInput.value = String(item.note || '');
    noteInput.draggable = false;

    noteInput.addEventListener('input', () => {
      const idx = Number(row.dataset.index);
      if (Number.isNaN(idx) || !aiScreenshots[idx]) return;
      aiScreenshots[idx].note = noteInput.value;
    });

    row.appendChild(img);
    row.appendChild(name);
    row.appendChild(noteInput);

    row.addEventListener('dragstart', (e) => {
      if (e.target && e.target.closest && e.target.closest('input')) {
        e.preventDefault();
        return;
      }
      dragIndex = index;
      row.classList.add('dragging');
      try {
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.effectAllowed = 'move';
      } catch (_err) {}
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      try {
        e.dataTransfer.dropEffect = 'move';
      } catch (_err) {}
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      let fromIndex = dragIndex;
      const toIndex = Number(row.dataset.index);
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw !== '') fromIndex = Number(raw);
      } catch (_err) {}

      if (Number.isNaN(fromIndex) || Number.isNaN(toIndex) || fromIndex === toIndex) return;
      const next = aiScreenshots.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      aiScreenshots = next;
      renderAiScreenshotList();
    });

    aiScreenshotList.appendChild(row);
  });
}

async function loadAiConfig() {
  initAiPresetControls();
  const config = await window.softreg.ai.getConfig();
  aiBaseUrl.value = config.baseUrl;
  aiApiKey.value = config.apiKey;
  aiModel.value = config.model;
  const providerId = config.providerId || findProviderPresetIdByBaseUrl(config.baseUrl);
  aiProviderPreset.value = providerId;
  populateModelPresetOptions(providerId);
  syncModelPresetFromModelName();
}

btnAiConfig.addEventListener('click', async () => {
  initAiPresetControls();
  await loadAiConfig();
  aiConfigModal.classList.remove('hidden');
});

btnCloseAiConfig.addEventListener('click', () => {
  aiConfigModal.classList.add('hidden');
});

btnSaveAiConfig.addEventListener('click', async () => {
  const config = {
    baseUrl: aiBaseUrl.value.trim(),
    apiKey: aiApiKey.value.trim(),
    model: aiModel.value.trim()
  };
  config.providerId = aiProviderPreset.value;
  await window.softreg.ai.saveConfig(config);
  aiConfigModal.classList.add('hidden');
  setStatus('状态: AI 配置已保存');
});

async function generateAiManualMarkdown() {
  if (aiGeneratingManual) return '';
  if (!projectPathInput.value) {
    setStatus('错误: 请先选择项目目录');
    updateLights('error');
    return '';
  }
  
  const config = await window.softreg.ai.getConfig();
  if (!config.apiKey) {
    setStatus('错误: 未配置 AI API KEY');
    updateLights('error');
    await loadAiConfig();
    aiConfigModal.classList.remove('hidden');
    return '';
  }
  
  try {
    aiGeneratingManual = true;
    setStatus('状态: AI 正在分析项目并撰写说明书...');
    updateLights('busy');
    startButtonEffect(btnAiManual);
    
    aiResultText.value = '正在分析项目结构...\n正在读取关键文件...\n正在调用 AI 生成（可能需要 30-60 秒）...\n\n请稍候...';
    aiResultModal.classList.remove('hidden');
    
    const manualMarkdown = await window.softreg.ai.generateManual(
      projectPathInput.value,
      config,
      aiScreenshots.map(s => ({
        path: s.path,
        name: s.name,
        note: String(s.note || '').trim()
      }))
    );
    aiManualMarkdown = manualMarkdown;
    aiResultText.value = manualMarkdown;
    
    setStatus('状态: 说明书生成完成');
    updateLights('success');
    return manualMarkdown;
  } catch (err) {
    setStatus(`错误: 生成失败 // ${String(err.message || err).toUpperCase()}`);
    updateLights('error');
    aiResultText.value = `生成失败:\n${String(err.message || err)}`;
    return '';
  } finally {
    aiGeneratingManual = false;
    stopButtonEffect(btnAiManual);
  }
}

btnAiManual.addEventListener('click', async () => {
  await generateAiManualMarkdown();
});

btnSaveAiManual.addEventListener('click', async () => {
  await generateAiManualMarkdown();
});

btnCloseAiResult.addEventListener('click', () => {
  aiManualMarkdown = aiResultText.value;
  aiResultModal.classList.add('hidden');
  setStatus('状态: 已保存生成结果');
});

async function ensureAiManualReady() {
  if (String(aiManualMarkdown || '').trim()) return aiManualMarkdown;
  return await generateAiManualMarkdown();
}

async function exportAiDocx() {
  if (!validateInputs()) return;
  const markdown = await ensureAiManualReady();
  if (!String(markdown || '').trim()) return;

  try {
    setStatus('状态: 正在导出说明书 DOCX...');
    updateLights('busy');
    startButtonEffect(btnExportAiDocx);
    await window.softreg.ensureOutputDir(outputDirInput.value);

    const headerText = buildHeaderText();
    const fileName = `${headerText || '项目'}_软件说明书.docx`;
    await window.softreg.ai.exportManualDocx({
      outputDir: outputDirInput.value,
      fileName,
      markdown,
      screenshots: aiScreenshots.map(s => ({
        path: s.path,
        name: s.name,
        note: String(s.note || '').trim()
      })),
      softwareName: softwareNameInput.value.trim(),
      softwareVersion: softwareVersionInput.value.trim(),
      headerText
    });

    await new Promise(resolve => setTimeout(resolve, 800));
    setStatus('成功: 说明书 DOCX 已保存至磁盘');
    updateLights('success');
  } catch (err) {
    setStatus(`错误: 说明书 DOCX 导出失败 // ${String(err.message || err).toUpperCase()}`);
    updateLights('error');
  } finally {
    stopButtonEffect(btnExportAiDocx);
  }
}

async function exportAiPdf() {
  if (!validateInputs()) return;
  const markdown = await ensureAiManualReady();
  if (!String(markdown || '').trim()) return;

  try {
    setStatus('状态: 正在导出说明书 PDF...');
    updateLights('busy');
    startButtonEffect(btnExportAiPdf);
    await window.softreg.ensureOutputDir(outputDirInput.value);

    const headerText = buildHeaderText();
    const fileName = `${headerText || '项目'}_软件说明书.pdf`;
    await window.softreg.ai.exportManualPdf({
      outputDir: outputDirInput.value,
      fileName,
      markdown,
      screenshots: aiScreenshots.map(s => ({
        path: s.path,
        name: s.name,
        note: String(s.note || '').trim()
      })),
      softwareName: softwareNameInput.value.trim(),
      softwareVersion: softwareVersionInput.value.trim(),
      headerText
    });

    await new Promise(resolve => setTimeout(resolve, 800));
    setStatus('成功: 说明书 PDF 已保存至磁盘');
    updateLights('success');
  } catch (err) {
    setStatus(`错误: 说明书 PDF 导出失败 // ${String(err.message || err).toUpperCase()}`);
    updateLights('error');
  } finally {
    stopButtonEffect(btnExportAiPdf);
  }
}

async function exportAiBoth() {
  if (!validateInputs()) return;
  await exportAiDocx();
  await exportAiPdf();
}

btnExportAiDocx.addEventListener('click', exportAiDocx);
btnExportAiPdf.addEventListener('click', exportAiPdf);
btnExportAiBoth.addEventListener('click', exportAiBoth);

function openSelectedOutputDir() {
  const out = String(outputDirInput.value || '').trim();
  if (!out) {
    setStatus('错误: 缺失输出路径');
    updateLights('error');
    return;
  }
  window.softreg.openOutputDir(out);
}

btnOpenOutputDir.addEventListener('click', openSelectedOutputDir);
btnOpenOutputDirAi.addEventListener('click', openSelectedOutputDir);

btnAiUploadScreenshots.addEventListener('click', async () => {
  const items = await window.softreg.selectAiScreenshots();
  if (!Array.isArray(items) || items.length === 0) return;

  const existing = new Set(aiScreenshots.map(s => s.path));
  const merged = aiScreenshots.slice();
  for (const it of items) {
    if (!it || !it.path || existing.has(it.path)) continue;
    merged.push({ ...it, note: '' });
    existing.add(it.path);
  }
  aiScreenshots = merged;
  renderAiScreenshotList();
});


// Modal Initialization Logic
// Ensure modals are hidden on load
window.addEventListener('DOMContentLoaded', () => {
  aiConfigModal.classList.add('hidden');
  aiResultModal.classList.add('hidden');
  renderAiScreenshotList();
});
