const childProcess = require('child_process');

function toEncodedCommand(script) {
  return Buffer.from(script, 'utf16le').toString('base64');
}

function escapePsPath(value) {
  return value.replace(/'/g, "''");
}

function writePdfFromDocx(docxPath, pdfPath) {
  const docx = escapePsPath(docxPath);
  const pdf = escapePsPath(pdfPath);
  const script = `
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('${docx}')
$doc.ExportAsFixedFormat('${pdf}', 17)
$doc.Close()
$word.Quit()
`;
  const encoded = toEncodedCommand(script);
  childProcess.execFileSync('powershell', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-EncodedCommand',
    encoded
  ], { stdio: 'ignore' });
}

module.exports = {
  writePdfFromDocx
};
