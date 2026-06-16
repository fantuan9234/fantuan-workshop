const fs = require('fs')
const path = require('path')

const files = [
  'src/renderer/src/pages/AboutPage.tsx',
  'src/renderer/src/pages/ExportPage.tsx',
  'src/renderer/src/pages/XnbPreviewPage.tsx',
  'src/renderer/src/pages/events/EventEditor.tsx',
  'src/renderer/src/components/RightPanel.tsx',
  'src/renderer/src/components/SettingsModal.tsx',
  'src/renderer/src/components/Sidebar.tsx',
]

for (const rel of files) {
  const full = path.join('d:/aaaawagjunhao/stardew-mod-studio', rel)
  if (!fs.existsSync(full)) { console.log('SKIP (missing):', rel); continue }
  let c = fs.readFileSync(full, 'utf8')
  const before = c

  // Add asString to import if missing
  if (!c.includes('asString') && c.includes("from '../i18n'")) {
    c = c.replace(/useT(\s+}\s+from\s+'\.\.\/i18n')/, `useT, asString$1`)
  }
  if (!c.includes('asString') && c.includes("from '../../i18n'")) {
    c = c.replace(/useT(\s+}\s+from\s+'\.\.\/\.\.\/i18n')/, `useT, asString$1`)
  }

  // Add ts helper if missing
  if (!/const\s+ts\s*=/.test(c)) {
    c = c.replace(/(const\s+t\s*=\s*useT\(\)\s*\n)/, `$1  const ts = (k: string): string => asString(t, k)\n`)
  }

  // Replace {t('...')} in JSX text with {ts('...')}
  c = c.replace(/\{t\('([^']+)'\)\}/g, `{ts('$1')}`)
  // Replace attribute values `={t('...')}` with `={asString(t, '...')}`
  c = c.replace(/=\{t\('([^']+)'\)\}/g, "={asString(t, '$1')}")
  c = c.replace(/=\{t\("([^"]+)"\)\}/g, "={asString(t, '$1')}")
  // Template literal interpolation: ${t('...')} → ${asString(t, '...')}
  c = c.replace(/\$\{t\('([^']+)'\)\}/g, "${asString(t, '$1')}")
  c = c.replace(/\$\{t\("([^"]+)"\)\}/g, "${asString(t, '$1')}")

  if (c !== before) {
    fs.writeFileSync(full, c, 'utf8')
    console.log('UPDATED:', rel)
  } else {
    console.log('UNCHANGED:', rel)
  }
}
console.log('Done.')
