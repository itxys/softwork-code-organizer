const fs = require('fs');
const { nativeImage } = require('electron');
const path = require('path');
const {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  NumberFormat,
  PageNumber,
  Paragraph,
  Packer,
  TableOfContents,
  TextRun
} = require('docx');

function normalizeScreenshotKey(value) {
  return String(value || '').trim().toLowerCase();
}

function buildScreenshotEntry(raw) {
  if (typeof raw === 'string') {
    return { path: raw, name: path.basename(raw), note: '' };
  }
  const p = String(raw?.path || '').trim();
  return {
    path: p,
    name: String(raw?.name || (p ? path.basename(p) : '')).trim(),
    note: String(raw?.note || '').trim()
  };
}

function buildScreenshotKey(entry) {
  return normalizeScreenshotKey(entry.note || entry.name || entry.path);
}

function scaleImageSize(original, maxWidth, maxHeight) {
  const width = Math.max(1, Number(original?.width || 1));
  const height = Math.max(1, Number(original?.height || 1));

  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio, 1);

  return {
    width: Math.max(1, Math.floor(width * ratio)),
    height: Math.max(1, Math.floor(height * ratio))
  };
}

function imageParagraphForScreenshot(entry) {
  const img = nativeImage.createFromPath(entry.path);
  const size = img.getSize();
  const scaled = scaleImageSize(size, 520, 700);
  const data = fs.readFileSync(entry.path);

  const children = [
    new ImageRun({
      data,
      transformation: scaled
    })
  ];

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children,
    spacing: { after: 200 }
  });
}

function markdownToDocChildren(markdown, screenshots) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const children = [];
  let inCodeBlock = false;
  const screenshotEntries = (Array.isArray(screenshots) ? screenshots : []).map(buildScreenshotEntry);
  const screenshotByKey = new Map(screenshotEntries.map(e => [buildScreenshotKey(e), e]));
  const usedScreenshotKeys = new Set();

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.length === 0 ? ' ' : line,
              font: 'Consolas',
              size: 21,
              preserve: true
            })
          ]
        })
      );
      continue;
    }

    const shot = line.match(/^\[\[SCREENSHOT:(.+?)\]\]\s*$/);
    if (shot) {
      const key = normalizeScreenshotKey(shot[1]);
      const entry = screenshotByKey.get(key);
      if (entry) {
        try {
          children.push(imageParagraphForScreenshot(entry));
          usedScreenshotKeys.add(key);
        } catch (_err) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `截图加载失败：${entry.path}`,
                  font: 'Microsoft YaHei',
                  size: 22
                })
              ]
            })
          );
        }
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `未找到匹配截图：${shot[1]}`,
                font: 'Microsoft YaHei',
                size: 22
              })
            ]
          })
        );
      }
      continue;
    }

    if (line.trim().length === 0) {
      children.push(new Paragraph({ text: '' }));
      continue;
    }

    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      children.push(new Paragraph({ text: h3[1].trim(), heading: HeadingLevel.HEADING_3 }));
      continue;
    }

    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      children.push(new Paragraph({ text: h2[1].trim(), heading: HeadingLevel.HEADING_2 }));
      continue;
    }

    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) {
      children.push(new Paragraph({ text: h1[1].trim(), heading: HeadingLevel.HEADING_1 }));
      continue;
    }

    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, font: 'Microsoft YaHei', size: 24 })]
      })
    );
  }

  const unused = screenshotEntries.filter(e => !usedScreenshotKeys.has(buildScreenshotKey(e)));
  return { children, unused };
}

function buildHeaderFooter(headerText) {
  const header = new Header({
    children: [
      new Paragraph({
        children: [new TextRun({ text: headerText || '', font: 'Microsoft YaHei', size: 24 })],
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
          new TextRun({ children: [PageNumber.CURRENT] }),
          new TextRun({ text: ' 页 / 共 ', font: 'Microsoft YaHei', size: 20 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
          new TextRun({ text: ' 页 —', font: 'Microsoft YaHei', size: 20 })
        ],
        spacing: { before: 0, after: 0 }
      })
    ]
  });

  return { header, footer };
}

async function writeManualDocx(outputPath, options) {
  const softwareName = String(options?.softwareName || '').trim();
  const softwareVersion = String(options?.softwareVersion || '').trim();
  const headerText = String(options?.headerText || '').trim();
  const markdown = String(options?.markdown || '');
  const screenshots = Array.isArray(options?.screenshots) ? options.screenshots : [];

  const { header, footer } = buildHeaderFooter(headerText);

  const coverTitle = softwareName ? `${softwareName} 软件说明书` : '软件说明书';
  const coverSubtitle = softwareVersion ? `版本：${softwareVersion}` : '';

  const coverChildren = [
    new Paragraph({ text: '', spacing: { after: 400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: coverTitle, font: 'Microsoft YaHei', size: 56, bold: true })],
      spacing: { before: 2400, after: 500 }
    })
  ];

  if (coverSubtitle) {
    coverChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: coverSubtitle, font: 'Microsoft YaHei', size: 28 })],
        spacing: { before: 200, after: 2000 }
      })
    );
  }

  const bodyChildren = [];
  bodyChildren.push(new Paragraph({ text: '目录', heading: HeadingLevel.HEADING_1 }));
  bodyChildren.push(
    new TableOfContents('目录', {
      hyperlink: true,
      headingStyleRange: '1-3'
    })
  );

  bodyChildren.push(new Paragraph({ pageBreakBefore: true, text: '正文', heading: HeadingLevel.HEADING_1 }));
  const parsed = markdownToDocChildren(markdown, screenshots);
  bodyChildren.push(...parsed.children);

  if (parsed.unused.length > 0) {
    bodyChildren.push(new Paragraph({ pageBreakBefore: true, text: '截图（未引用）', heading: HeadingLevel.HEADING_1 }));
    for (const entry of parsed.unused) {
      try {
        bodyChildren.push(imageParagraphForScreenshot(entry));
      } catch (_err) {
        bodyChildren.push(
          new Paragraph({
            children: [new TextRun({ text: `截图加载失败：${entry.path}`, font: 'Microsoft YaHei', size: 22 })]
          })
        );
      }
    }
  }

  const doc = new Document({
    features: { updateFields: true },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        children: coverChildren
      },
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
              header: 720,
              footer: 720
            },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
          }
        },
        headers: { default: header, first: header },
        footers: { default: footer, first: footer },
        children: bodyChildren
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}

module.exports = {
  writeManualDocx
};
