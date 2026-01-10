const fs = require('fs');
const path = require('path');

const EXCLUDED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', '.git', 'vendor', 'bin', 'obj',
  'target', '.idea', '.vscode', '.vs', '.svn', '.hg', '.turbo', '.next',
  '.cache', '.angular', '.gradle'
]);

const EXCLUDED_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
]);

const SUPPORTED_EXTS = new Set([
  '.js', '.jsx', '.ts', '.tsx',
  '.py', '.java', '.cs', '.c', '.cpp', '.h', '.hpp',
  '.go', '.rs', '.php', '.swift', '.kt'
]);

const MAX_COLUMNS = 64;
const LINES_PER_PAGE = 50;
const TARGET_PAGES = 60;
const TARGET_LINES = LINES_PER_PAGE * TARGET_PAGES;
const END_LINE_REGEX = /(}\s*;?\s*$|end\s*;?\s*$|return\s*;?\s*$)/i;

function getCommentSyntax(ext) {
  switch (ext) {
    case '.py':
      return { line: ['#'], block: ['"""', "'''"] };
    case '.php':
      return { line: ['//', '#'], block: ['/*'] };
    case '.rb':
      return { line: ['#'], block: [] };
    case '.kt':
    case '.swift':
    case '.js':
    case '.jsx':
    case '.ts':
    case '.tsx':
    case '.java':
    case '.cs':
    case '.c':
    case '.cpp':
    case '.h':
    case '.hpp':
    case '.go':
    case '.rs':
      return { line: ['//'], block: ['/*'] };
    default:
      return { line: ['//', '#'], block: ['/*'] };
  }
}

function isSupportedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTS.has(ext)) return false;
  if (EXCLUDED_FILES.has(path.basename(filePath))) return false;
  if (filePath.endsWith('.min.js')) return false;
  return true;
}

function walkDir(root) {
  const files = [];
  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile()) {
        if (isSupportedFile(full)) files.push(full);
      }
    }
  }
  walk(root);
  return files;
}

function stripComments(line, state, syntax) {
  let output = '';
  let i = 0;

  while (i < line.length) {
    if (state.inBlock) {
      const endIdx = line.indexOf(state.blockEnd, i);
      if (endIdx === -1) {
        return { code: output, state };
      }
      i = endIdx + state.blockEnd.length;
      state.inBlock = false;
      state.blockEnd = null;
      continue;
    }

    let nextBlock = null;
    for (const start of syntax.block) {
      const idx = line.indexOf(start, i);
      if (idx !== -1) {
        if (!nextBlock || idx < nextBlock.idx) {
          nextBlock = { idx, start };
        }
      }
    }

    if (!nextBlock) {
      output += line.slice(i);
      break;
    }

    output += line.slice(i, nextBlock.idx);

    state.inBlock = true;
    state.blockEnd = nextBlock.start === '/*' ? '*/' : nextBlock.start;
    i = nextBlock.idx + nextBlock.start.length;
  }

  return { code: output, state };
}

function stripLineComment(code, syntax) {
  let earliest = -1;
  for (const marker of syntax.line) {
    const idx = code.indexOf(marker);
    if (idx !== -1) {
      if (earliest === -1 || idx < earliest) earliest = idx;
    }
  }
  if (earliest === -1) return code;
  return code.slice(0, earliest);
}

function isEffectiveLine(line, state, syntax) {
  if (line.trim().length === 0) return false;
  const blockResult = stripComments(line, state, syntax);
  const afterBlock = blockResult.code;
  const withoutLine = stripLineComment(afterBlock, syntax);
  if (withoutLine.trim().length === 0) return false;
  return true;
}

function readLines(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  } catch {
    return [];
  }
}

function paginate(lines, perPage) {
  const pages = [];
  for (let i = 0; i < lines.length; i += perPage) {
    pages.push(lines.slice(i, i + perPage));
  }
  return pages;
}

function normalizeLine(line) {
  return line.replace(/\t/g, '    ');
}

function wrapLine(line, maxCols) {
  if (line.length <= maxCols) return [line];
  const parts = [];
  for (let i = 0; i < line.length; i += maxCols) {
    parts.push(line.slice(i, i + maxCols));
  }
  return parts;
}

function scanProject(projectPath) {
  const files = walkDir(projectPath);
  const fileBlocks = [];
  let effectiveLines = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const syntax = getCommentSyntax(ext);
    const state = { inBlock: false, blockEnd: null };
    const fileLines = readLines(file);
    const effective = [];

    for (const line of fileLines) {
      const isEffective = isEffectiveLine(line, state, syntax);
      if (isEffective) {
        effective.push(normalizeLine(line));
      }
    }

    if (effective.length > 0) {
      const wrappedLines = [];
      for (const line of effective) {
        const chunks = wrapLine(line, MAX_COLUMNS);
        for (const chunk of chunks) {
          if (chunk.trim().length === 0) continue;
          wrappedLines.push(chunk);
        }
      }
      if (wrappedLines.length > 0) {
        fileBlocks.push({
          path: file,
          lines: wrappedLines,
          lastLine: wrappedLines[wrappedLines.length - 1]
        });
      }
    }
  }

  const lastFileIdx = (() => {
    for (let i = fileBlocks.length - 1; i >= 0; i -= 1) {
      if (END_LINE_REGEX.test(fileBlocks[i].lastLine)) return i;
    }
    return fileBlocks.length - 1;
  })();

  const eligibleBlocks = lastFileIdx >= 0 ? fileBlocks.slice(0, lastFileIdx + 1) : [];
  const wrappedLines = eligibleBlocks.flatMap((block) => block.lines);
  effectiveLines = wrappedLines.length;

  const pages = paginate(wrappedLines, LINES_PER_PAGE);
  const totalPages = pages.length;

  let exportLines = [];
  if (wrappedLines.length >= TARGET_LINES) {
    if (totalPages > TARGET_PAGES) {
      exportLines = pages.slice(0, 30).concat(pages.slice(-30)).flat();
    } else {
      exportLines = wrappedLines.slice(0, TARGET_LINES);
    }
  } else {
    exportLines = wrappedLines.slice();
  }

  if (wrappedLines.length === 0) {
    exportLines = [];
  } else if (exportLines.length < TARGET_LINES) {
    const paddingCount = TARGET_LINES - exportLines.length;
    const padLines = [];
    let idx = 0;
    while (padLines.length < paddingCount) {
      padLines.push(wrappedLines[idx % wrappedLines.length]);
      idx += 1;
    }
    exportLines = padLines.concat(exportLines);
  } else if (exportLines.length > TARGET_LINES) {
    exportLines = exportLines.slice(0, TARGET_LINES);
  }

  const pagesToExport = paginate(exportLines, LINES_PER_PAGE);

  return {
    projectPath,
    fileCount: files.length,
    effectiveLines,
    totalPages,
    pages,
    pagesToExport,
    selectedPages: pagesToExport.length
  };
}

module.exports = {
  scanProject
};
