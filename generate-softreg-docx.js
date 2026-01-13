const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer,
  AlignmentType, PageOrientation, HeadingLevel, TableOfContents,
  LevelFormat, PageNumber
} = require('docx');

const outPath = path.join(__dirname, 'softreg-doc-v1.0-cn.docx');
const uiImagePath = path.join(__dirname, 'screenshot-app-ui.png');
const exportImagePath = path.join(__dirname, 'screenshot-export-doc.png');

const makeCenter = (text) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 120 },
  children: [new TextRun({ text, size: 28 })]
});

const makeParagraph = (text) => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text, size: 24 })]
});

const makeBullet = (text) => new Paragraph({
  numbering: { reference: 'bullet-list', level: 0 },
  children: [new TextRun({ text, size: 24 })]
});

const makeStep = (text) => new Paragraph({
  numbering: { reference: 'step-list', level: 0 },
  children: [new TextRun({ text, size: 24 })]
});

const scaleToWidth = (w, h, targetW) => {
  const ratio = targetW / w;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
};

const addImageBlock = (title, imagePath, size, altText) => {
  const data = fs.readFileSync(imagePath);
  return [
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: title, bold: true, size: 24 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new ImageRun({
        type: 'png',
        data,
        transformation: { width: size.width, height: size.height, rotation: 0 },
        altText: { title: altText, description: altText, name: altText }
      })]
    })
  ];
};

const uiSize = scaleToWidth(939, 1547, 420);
const exportSize = scaleToWidth(927, 1291, 420);

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'SimSun', size: 24 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal',
        run: { size: 56, bold: true, color: '000000', font: 'Microsoft YaHei' },
        paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: '000000', font: 'Microsoft YaHei' },
        paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, color: '000000', font: 'Microsoft YaHei' },
        paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 1 } }
    ]
  },
  numbering: {
    config: [
      {
        reference: 'bullet-list',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: 'step-list',
        levels: [{
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        size: { orientation: PageOrientation.PORTRAIT },
        pageNumbers: { start: 1, formatType: 'decimal' }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: '软著鉴别材料整理器软件v1.0 说明书', size: 20 })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: [PageNumber.CURRENT] })]
        })]
      })
    },
    children: [
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('软件说明书')] }),
      makeCenter('软件名称：软著鉴别材料整理器软件v1.0'),
      makeCenter(`编制日期：${new Date().toISOString().slice(0, 10)}`),
      makeCenter('适用范围：软著鉴别材料（软件说明与鉴别材料整理）'),
      new Paragraph({ children: [new TextRun({ text: '', size: 24 })], pageBreakBefore: true }),

      new TableOfContents('目录', { hyperlink: true, headingStyleRange: '1-3' }),
      new Paragraph({ children: [new TextRun({ text: '', size: 24 })], pageBreakBefore: true }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('1 软件概述')] }),
      makeParagraph('软著鉴别材料整理器软件v1.0用于自动化整理软著登记所需的说明与鉴别材料，支持对软件信息、功能模块、界面截图、生成文档等内容进行统一管理与输出。'),
      makeParagraph('软件定位：面向需要提交软著材料的开发者、代理机构或企业，通过规范化模板提升材料完整性与一致性。'),
      makeParagraph('主要特点：'),
      makeBullet('统一模板：内置说明书模板与结构化字段，确保格式规范。'),
      makeBullet('材料集中管理：截图、功能描述、版本信息集中归档。'),
      makeBullet('一键生成：自动输出Word文档，减少人工整理成本。'),
      makeBullet('可追溯：生成记录与版本信息可回溯，便于复用。'),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('2 运行环境与部署')] }),
      makeParagraph('支持操作系统：Windows 10/11。'),
      makeParagraph('运行依赖：本地安装Microsoft Word或兼容的文档查看器（用于查看生成的docx）。'),
      makeParagraph('部署方式：应用安装包本地安装，无需联网。'),
      makeParagraph('启动方式：双击应用图标启动，进入主界面。'),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('3 系统架构与模块')] }),
      makeParagraph('系统采用模块化结构，核心模块如下：'),
      makeBullet('资料管理模块：录入软件名称、版本、用途、开发环境等基础信息。'),
      makeBullet('截图管理模块：导入界面截图、输出示例图，支持排序与说明。'),
      makeBullet('说明书生成模块：按模板生成包含封面、目录、正文的说明文档。'),
      makeBullet('导出与校验模块：导出Word文档并校验完整性。'),
      makeBullet('设置与日志模块：保存用户配置与生成记录。'),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('4 功能说明')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.1 资料采集与整理')] }),
      makeParagraph('提供字段化信息录入，包括软件名称、版本号、运行环境、功能描述、适用范围等。'),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.2 界面截图管理')] }),
      makeParagraph('支持导入界面截图与输出示例图，自动归类并生成插图说明。'),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.3 说明书自动生成')] }),
      makeParagraph('按软著登记要求生成包含封面、目录、正文与截图的Word说明文档。'),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.4 导出与打包')] }),
      makeParagraph('支持一键导出docx文件，便于后续打印或提交。'),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.5 日志与版本信息')] }),
      makeParagraph('记录每次生成的时间、版本和素材变更，便于追溯。'),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('5 操作流程')] }),
      makeParagraph('标准操作流程如下：'),
      makeStep('启动软件并进入主界面。'),
      makeStep('录入软件基础信息与功能说明。'),
      makeStep('导入界面截图与输出示例截图。'),
      makeStep('选择模板并生成说明书。'),
      makeStep('导出docx文档并进行检查。'),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('6 数据结构与存储')] }),
      makeParagraph('软件在本地保存项目数据，包含基础信息、截图素材与生成结果。数据不上传网络，默认保存于用户工作目录。'),
      makeParagraph('数据结构包括：项目信息、截图列表、生成记录、导出文档。'),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('7 安全与权限')] }),
      makeParagraph('软件为本地离线工具，默认不进行网络通信。'),
      makeParagraph('数据仅保存在本地，遵循操作系统文件权限控制。'),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('8 兼容性与限制')] }),
      makeParagraph('输出文档格式为docx，需在Microsoft Word或兼容软件中打开。'),
      makeParagraph('部分排版效果在不同版本的Word中可能存在细微差异。'),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('9 运行与维护')] }),
      makeParagraph('建议定期备份项目数据与导出文档。'),
      makeParagraph('版本升级时可保留旧版本说明书以便比对。'),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('10 附录：截图')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('10.1 软件界面截图')] }),
      ...addImageBlock('图1 软件主界面（UI截图）', uiImagePath, uiSize, '软件主界面截图'),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('10.2 导出文档示例')] }),
      ...addImageBlock('图2 导出文档示例', exportImagePath, exportSize, '导出文档示例截图')
    ]
  }]
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log(`Generated: ${outPath}`);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
