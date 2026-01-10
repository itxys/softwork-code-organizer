## 简体中文

### 项目简介

**软著鉴别材料生成器（Softwork Code Organizer）** 是一个桌面工具，用于生成软件著作权登记所需的程序鉴别材料（源程序部分）。  
应用会自动扫描项目代码，按软著常见要求抽取有效代码行，并导出为 **DOCX / PDF** 文档，默认遵循“前 30 页 + 后 30 页、每页 50 行有效代码”的规则。

### 功能特性

- 自动扫描项目代码目录，支持多种主流语言（js/ts、python、java、c/c++、c#、go、rust、php、swift、kotlin 等）
- 自动排除常见无关目录：`node_modules`、`dist`、`build`、`out`、`.git`、`vendor`、`bin`、`obj` 等
- 按软著习惯抽样：
  - 总页数 > 60 时导出前 30 页 + 后 30 页
  - 总页数 ≤ 60 时导出全部页
- 页眉格式：`软件名称 + 软件/游戏软件 + V版本号`
- 页脚显示页码（“第 X 页”）
- 行号使用 Word 行号功能（连续编号），更符合软著窗口受理习惯

### 默认规则与说明

- “有效代码行”定义为：非空行 + 非注释行  
  导出时仅保留有效代码行，尽量减少空白行占位。
- 代码抽样按文件路径排序后连续分页，不区分文件边界；  
  超长代码行会按固定列宽自动换行并计入行号。
- 若可用代码行不足 3000 行，会在前 30 页区域循环补足，保证第 3000 行仍为某个文件的结尾行，方便人工核对完整性。
- PDF 导出依赖本机安装的 Microsoft Word，用于保持行号效果与版面稳定。
- 当前版本聚焦于“程序鉴别材料”，文档鉴别材料暂未覆盖。

### 使用方法（开发 / 调试）

> 以下命令在 Windows 11 + Node.js 环境下测试通过。

1. 安装依赖

   ```bash
   npm install
   ```

2. 启动开发环境（Electron）

   ```bash
   npm start
   ```

3. 在界面中：
   - 选择项目目录；
   - 填写软件名称与版本号；
   - 选择输出目录；
   - 点击“扫描项目”；
   - 预览无误后，选择导出为 DOCX 或 PDF。

### 打包构建

项目使用 **electron-builder** 进行跨平台打包，当前已配置：

- Windows：便携式可执行文件（portable exe）
- macOS：dmg 安装包（arm64）
- Linux：AppImage 包

本地打包（Windows 下构建 Windows 版本）：

```bash
npm run dist
```

Linux / macOS 包推荐通过 GitHub Actions 在远程构建（仓库下已配置相应工作流）。

---

## English

### Overview

**Softwork Code Organizer** is a desktop tool that helps you generate the *program identification materials* (source code part) required for software copyright registration.

It scans your project source code, extracts valid code lines according to common requirements of Chinese copyright offices, and exports them as **DOCX / PDF** documents.  
By default, it follows the rule of *“first 30 pages + last 30 pages, 50 valid lines per page”*.

### Features

- Automatically scan project source directories, supporting multiple mainstream languages (js/ts, python, java, c/c++, c#, go, rust, php, swift, kotlin, etc.)
- Exclude common directories that are not relevant for soft copyright:
  - `node_modules`, `dist`, `build`, `out`, `.git`, `vendor`, `bin`, `obj`, etc.
- Sampling strategy aligned with typical practice:
  - If total pages > 60: export first 30 pages + last 30 pages
  - Otherwise: export all pages
- Header format: `SoftwareName + Software/Game Software + V<version>`
- Footer: page number (“Page X” in Chinese style)
- Uses Microsoft Word line numbers for consistent and continuous numbering

### Rules & Behavior

- A **valid code line** is defined as a non-empty and non-comment line.  
  Only valid lines are kept in the exported document to avoid wasting space on blank lines.
- Code is sorted by file path and paginated continuously without file boundaries;  
  very long lines will be wrapped at a fixed width and still counted in line numbers.
- If the total number of valid lines is less than 3000, the tool will loop content in the “first 30 pages” area to ensure that line 3000 still ends at a meaningful file boundary.
- PDF export relies on locally installed Microsoft Word to preserve layout and line-number behavior.
- Currently, only program identification materials are supported; document identification materials are out of scope for this version.

### Usage (Development)

> The following commands are tested on Windows 11 with Node.js.

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the Electron app in development mode

   ```bash
   npm start
   ```

3. In the UI:
   - Select your project root directory
   - Fill in software name and version
   - Choose an output directory
   - Click “Scan Project”
   - Export DOCX or PDF once the preview looks good

### Build & Packaging

This project uses **electron-builder** for cross-platform packaging. Current targets:

- Windows: portable executable
- macOS: dmg (arm64)
- Linux: AppImage

Local build (Windows target on Windows):

```bash
npm run dist
```

For Linux and macOS builds, it is recommended to use the GitHub Actions workflows defined in this repository (they run on Linux / macOS runners and produce AppImage / dmg artifacts).

---

## License / 许可

This project is released under the **MIT License**.  
本项目以 **MIT 协议** 开源发布，可自由用于学习、研究和商业用途，但作者不对使用本软件造成的任何直接或间接损失承担责任。
