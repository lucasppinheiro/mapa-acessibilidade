const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ignored = new Set(['node_modules', 'coverage']);

const collectJavaScript = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  if (ignored.has(entry.name)) return [];
  const fullPath = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectJavaScript(fullPath);
  return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
});

const files = collectJavaScript(path.resolve(__dirname, '..'));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.info(`Sintaxe validada em ${files.length} arquivos JavaScript.`);
