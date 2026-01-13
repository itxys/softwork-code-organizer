const fs = require('fs');
const path = require('path');

const EXCLUDED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', '.git', 'vendor', 'bin', 'obj',
  'target', '.idea', '.vscode', '.vs', '.svn', '.hg', '.turbo', '.next',
  '.cache', '.angular', '.gradle'
]);

const SUPPORTED_EXTS = new Set([
  '.js', '.jsx', '.ts', '.tsx',
  '.py', '.java', '.cs', '.c', '.cpp', '.h', '.hpp',
  '.go', '.rs', '.php', '.swift', '.kt', '.json', '.md', '.txt'
]);

// Helper to check if file is text/code
function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTS.has(ext) || ext === '';
}

// Generate directory tree structure
function getProjectStructure(root, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return '';
  
  let output = '';
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (e) {
    return '';
  }

  // Sort: Directories first, then files
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const indent = '  '.repeat(depth);
  
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // Skip dotfiles
    
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        output += `${indent}├── ${entry.name}/\n`;
      } else {
        output += `${indent}├── ${entry.name}/\n`;
        output += getProjectStructure(path.join(root, entry.name), depth + 1, maxDepth);
      }
    } else {
      output += `${indent}├── ${entry.name}\n`;
    }
  }
  return output;
}

function getFileContent(filePath, maxLines = 100) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    if (lines.length > maxLines) {
      return lines.slice(0, maxLines).join('\n') + '\n... (truncated)';
    }
    return content;
  } catch (e) {
    return `Error reading file: ${e.message}`;
  }
}

function scanProjectForAI(projectPath) {
  const context = {
    structure: '',
    readme: '',
    packageJson: '',
    sourceSnippets: []
  };

  // 1. Get Structure
  context.structure = getProjectStructure(projectPath);

  // 2. Get README
  const readmeNames = ['README.md', 'readme.md', 'README.txt', 'readme.txt'];
  for (const name of readmeNames) {
    const p = path.join(projectPath, name);
    if (fs.existsSync(p)) {
      context.readme = getFileContent(p, 200); // Read up to 200 lines of README
      break;
    }
  }

  // 3. Get package.json or requirements.txt
  const configFiles = ['package.json', 'requirements.txt', 'pom.xml', 'go.mod', 'Cargo.toml'];
  for (const name of configFiles) {
    const p = path.join(projectPath, name);
    if (fs.existsSync(p)) {
      context.packageJson += `--- ${name} ---\n${getFileContent(p, 100)}\n\n`;
    }
  }

  // 4. Get Source Snippets (Heuristic: Top 5 files in root or src)
  // Simple traversal to find first 5 supported code files
  const snippets = [];
  let fileCount = 0;
  const MAX_FILES = 5;

  function walkAndPick(current) {
    if (fileCount >= MAX_FILES) return;
    
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch { return; }

    for (const entry of entries) {
      if (fileCount >= MAX_FILES) return;
      
      const fullPath = path.join(current, entry.name);
      
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walkAndPick(fullPath);
        }
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        // Skip configs we already read, skip non-code
        if (['.json', '.md', '.txt', '.lock'].includes(ext)) continue; 
        
        if (SUPPORTED_EXTS.has(ext)) {
          snippets.push({
            path: path.relative(projectPath, fullPath),
            content: getFileContent(fullPath, 50) // First 50 lines
          });
          fileCount++;
        }
      }
    }
  }

  // Try to look into 'src' first if it exists, otherwise root
  const srcPath = path.join(projectPath, 'src');
  if (fs.existsSync(srcPath)) {
    walkAndPick(srcPath);
  }
  if (fileCount < MAX_FILES) {
    walkAndPick(projectPath);
  }

  context.sourceSnippets = snippets;

  return context;
}

module.exports = {
  scanProjectForAI
};
