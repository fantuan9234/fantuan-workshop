/**
 * UI Scale-Up Script
 * Bumps font sizes up one tier and module dimensions by ~15-20%.
 * Run: node scripts/scale-up-ui.js
 */

const fs = require('fs');
const path = require('path');

const RENDERER_SRC = path.resolve(__dirname, '../src/renderer/src');

const EXTENSIONS = ['.tsx', '.ts', '.css'];

function collectFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'assets') {
      files.push(...collectFiles(full));
    } else if (entry.isFile() && EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const REPLACEMENTS = [
  // Font sizes - order matters: replace larger classes first
  [/text-2xl(?![\w-])/g, 'text-3xl'],
  [/text-xl(?![\w-])/g, 'text-2xl'],
  [/text-lg(?![\w-])/g, 'text-xl'],
  [/text-base(?![\w-])/g, 'text-lg'],
  [/text-sm(?![\w-])/g, 'text-base'],
  [/text-xs(?![\w-])/g, 'text-sm'],
  [/text-\[11px\]/g, 'text-sm'],
  [/text-\[10px\]/g, 'text-xs'],
  [/text-\[9px\]/g, 'text-[11px]'],

  // Module dimensions
  [/w-\[56px\]/g, 'w-[64px]'],
  [/w-\[180px\]/g, 'w-[220px]'],
  [/w-\[260px\]/g, 'w-[300px]'],
  [/min-w-\[56px\]/g, 'min-w-[64px]'],
  [/min-w-\[180px\]/g, 'min-w-[220px]'],
  [/min-w-\[260px\]/g, 'min-w-[300px]'],
  [/w-\[420px\]/g, 'w-[480px]'],
  [/w-\[400px\]/g, 'w-[460px]'],
  [/w-\[380px\]/g, 'w-[440px]'],
  [/w-\[360px\]/g, 'w-[420px]'],
  [/w-\[320px\]/g, 'w-[360px]'],
  [/w-\[280px\]/g, 'w-[320px]'],
  [/h-10(?![\w-])/g, 'h-12'],

  // Spacing
  [/gap-2(?![\w-])/g, 'gap-3'],
];

function applyReplacements(content) {
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }
  return content;
}

function main() {
  const files = collectFiles(RENDERER_SRC);
  console.log(`Found ${files.length} files to process.`);

  let modifiedCount = 0;
  for (const file of files) {
    const original = fs.readFileSync(file, 'utf-8');
    const updated = applyReplacements(original);
    if (original !== updated) {
      fs.writeFileSync(file, updated, 'utf-8');
      const relPath = path.relative(RENDERER_SRC, file);
      console.log(`  Modified: ${relPath}`);
      modifiedCount++;
    }
  }
  console.log(`\nDone. ${modifiedCount} files modified.`);
}

main();