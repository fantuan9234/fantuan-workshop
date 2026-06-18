/**
 * UI Scale-Up Fix Script
 * Reverts the h-10 → h-12 over-replacement for square containers.
 * Only restores when w-10 h-12 appears together (was w-10 h-10 originally).
 *
 * Pattern: "w-10 h-12" → "w-10 h-10"
 *
 * Run: node scripts/scale-up-ui-fix.js
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

// Revert square containers: w-10 h-12 (was w-10 h-10) back to w-10 h-10
// The (?![\w-]) ensures we don't touch h-12 followed by another char like h-120 (none exists, but safety)
const FIXES = [
  // w-10 h-12 → w-10 h-10 (square container that was wrongly stretched)
  [/w-10 h-12(?![\w-])/g, 'w-10 h-10'],
];

function applyFixes(content) {
  for (const [pattern, replacement] of FIXES) {
    content = content.replace(pattern, replacement);
  }
  return content;
}

function main() {
  const files = collectFiles(RENDERER_SRC);
  console.log(`Found ${files.length} files to process.`);

  let modifiedCount = 0;
  let totalFixes = 0;
  for (const file of files) {
    const original = fs.readFileSync(file, 'utf-8');
    const updated = applyFixes(original);
    if (original !== updated) {
      const matches = original.match(/w-10 h-12(?![\w-])/g) || [];
      totalFixes += matches.length;
      fs.writeFileSync(file, updated, 'utf-8');
      const relPath = path.relative(RENDERER_SRC, file);
      console.log(`  Fixed (${matches.length}): ${relPath}`);
      modifiedCount++;
    }
  }
  console.log(`\nDone. ${modifiedCount} files fixed, ${totalFixes} square containers restored.`);
}

main();