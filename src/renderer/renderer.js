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
document.querySelector('.external-link').addEventListener('click', (e) => {
  e.preventDefault();
  const url = e.target.getAttribute('data-url');
  if (url) window.softreg.openExternal(url);
});

