# UI Scale-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enlarge the entire UI by one tier — font sizes, module dimensions, spacing, and global CSS base styles.

**Architecture:** Write a Node.js script to perform systematic find-and-replace across all .tsx/.ts/.css files in `src/renderer/src/`, applying the mappings defined in the spec. Then update `index.css` global styles. Finally build and verify.

**Tech Stack:** Node.js (for the scaling script), Tailwind CSS, React 18

---

### Task 1: Write the scaling script

**Files:**
- Create: `scripts/scale-up-ui.js`

This script reads every `.tsx`, `.ts`, and `.css` file under `src/renderer/src/`, applies the font-size, module-dimension, and spacing replacements, then writes the files back.

- [ ] **Step 1: Create the script skeleton**

```javascript
// scripts/scale-up-ui.js
/**
 * UI Scale-Up Script
 * Bumps font sizes up one tier and module dimensions by ~15-20%.
 * Run: node scripts/scale-up-ui.js
 */

const fs = require('fs');
const path = require('path');

const RENDERER_SRC = path.resolve(__dirname, '../src/renderer/src');

// Regex patterns to avoid replacing inside strings or comments (basic)
const EXTENSIONS = ['.tsx', '.ts', '.css'];

// Collect all files
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

// Mappings
const REPLACEMENTS = [
  // Font sizes - order matters: replace larger classes first to avoid double-replacement
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
  [/w-\[420px\]/g, 'w-[480px]'],   // xl map preview
  [/w-\[400px\]/g, 'w-[460px]'],   // xl property panel
  [/w-\[380px\]/g, 'w-[440px]'],   // lg map preview
  [/w-\[360px\]/g, 'w-[420px]'],   // lg editor panel
  [/w-\[320px\]/g, 'w-[360px]'],   // lg left panel
  [/w-\[280px\]/g, 'w-[320px]'],   // lg script preview
  [/h-10(?![\w-])/g, 'h-12'],      // title bar (only replaced in TSX/context of layout classes)

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
```

- [ ] **Step 2: Run the script and record results**

Run: `node scripts/scale-up-ui.js`
Expected: Script runs without errors, reports list of modified files and total count.

```bash
node scripts/scale-up-ui.js
```

---

### Task 2: Update global CSS base styles

**Files:**
- Modify: `src/renderer/src/index.css`

- [ ] **Step 1: Update `.input` base font-size and padding**

Find these lines in `index.css` and update:

```diff
.input {
-  font-size: 13px;
+  font-size: 15px;
   border-radius: 6px;
-  padding: 6px 10px;
+  padding: 8px 12px;
```

- [ ] **Step 2: Verify the change**

Read `src/renderer/src/index.css` around the `.input` block to confirm the edit was applied.

---

### Task 3: Manual review of edge cases

- [ ] **Step 1: Check the diff for suspicious replacements**

Run `git diff` to see all changes. Look for:
- `h-10` → `h-12` that should NOT have been changed (e.g. padding `py-10`, or `top-10`, or icon sizing — the regex `(?![\w-])` should prevent this, but verify a few)
- Icon-related size classes that got caught (`w-4`, `h-4` — these should be fine since they're not in the replacement list)
- Any `text-sm` that appears inside a larger class name (e.g. `text-sm` within `text-smoke` — unlikely with Tailwind syntax but verify)

Run: `git diff --stat` — should show roughly 30-40 files modified

- [ ] **Step 2: Spot-check specific files**

Run: `git diff src/renderer/src/components/Layout.tsx`
Expected: Layout sidebar widths, title bar height updated sensibly.

Run: `git diff src/renderer/src/components/Sidebar.tsx`
Expected: Sidebar width classes updated, text sizes bumped.

Run: `git diff src/renderer/src/pages/events/EventEditor.tsx`
Expected: Panel widths and text sizes bumped.

---

### Task 4: Commit

- [ ] **Step 1: Stage and commit all changes**

```bash
git add -A
git commit -m "feat: scale up UI font sizes and module dimensions by one tier"
```

---

### Task 5: Build and verify

- [ ] **Step 1: Run the dev build**

```bash
npm run dev
```

Expected: App builds without errors. Open the app and visually confirm:
- Text is noticeably larger throughout
- Sidebar, right panel, editor panels are wider
- Title bar is taller
- Input fields have larger text
- No layout breaking or overlapping elements

---

## Self-Review Checklist

1. **Spec coverage:** ✓ The plan maps every replacement rule from the design doc into the script. Global CSS updates are covered. Build verification is included.

2. **Placeholder scan:** No TODOs, TBDs, or placeholders. Every step has concrete code or commands.

3. **Type consistency:** Single script, no type/method cross-references between tasks. Consistent.