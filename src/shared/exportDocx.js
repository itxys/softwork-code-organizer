const fs = require('fs');
const {
  AlignmentType,
  Document,
  Footer,
  Header,
  LineRuleType,
  PageNumber,
  NumberFormat,
  Paragraph,
  Packer,
  TextRun,
  TabStopType,
  TabStopPosition
} = require('docx');

/**
 * 生成单行代码段落（带手动行号）
 * @param {string} line 代码行内容
 * @param {number} lineNumber 行号 (1-based)
 * @param {boolean} isFirstLineOfPage 是否是某页的第一行
 */
function lineParagraph(line, lineNumber, isFirstLineOfPage) {
  const text = line.length === 0 ? ' ' : line;
  // 格式化行号：右对齐，固定宽度
  const lineNumStr = String(lineNumber).padStart(5, ' ') + '  ';

  return new Paragraph({
    pageBreakBefore: isFirstLineOfPage,
    spacing: {
      before: 0,
      after: 0,
      line: 270,
      lineRule: LineRuleType.EXACT
    },
    children: [
      new TextRun({
        text: lineNumStr,
        font: 'Consolas',
        size: 21,
        color: '888888' // 浅灰色行号
      }),
      new TextRun({
        text,
        font: 'Consolas',
        size: 21,
        preserve: true
      })
    ]
  });
}

/**
 * 生成 Word 文档
 * @param {string} outputPath 输出路径
 * @param {Array<Array<string>>} pages 分页后的代码行
 * @param {string} headerText 页眉文字
 */
async function writeDocx(outputPath, pages, headerText) {
  const children = [];
  let globalLineNumber = 1;

  pages.forEach((pageLines, pageIndex) => {
    pageLines.forEach((line, lineIndex) => {
      const isFirstLineOfPage = (pageIndex > 0 && lineIndex === 0);
      children.push(lineParagraph(line, globalLineNumber, isFirstLineOfPage));
      globalLineNumber++;
    });
  });

  const header = new Header({
    children: [
      new Paragraph({
        children: [new TextRun({ text: headerText, font: 'Microsoft YaHei', size: 24 })],
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0 }
      })
    ]
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: '— 第 ', font: 'Microsoft YaHei', size: 20 }),
          new TextRun({
            children: [PageNumber.CURRENT]
          }),
          new TextRun({ text: ' 页 / 共 ', font: 'Microsoft YaHei', size: 20 }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES]
          }),
          new TextRun({ text: ' 页 —', font: 'Microsoft YaHei', size: 20 })
        ],
        spacing: { before: 0, after: 0 }
      })
    ]
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440, // 不再需要为Word行号预留空间，因为使用手动行号
              right: 1440,
              header: 720,
              footer: 720
            },
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL
            }
          }
        },
        headers: { default: header, first: header },
        footers: { default: footer, first: footer },
        children
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}

module.exports = {
  writeDocx
};
