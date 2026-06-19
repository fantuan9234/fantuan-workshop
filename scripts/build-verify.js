const builder = require('electron-builder')
const path = require('path')
const fs = require('fs')

async function build() {
  const outDir = path.resolve(__dirname, '..', 'build-tmp')
  const electronDist = path.resolve(__dirname, '..', 'node_modules', 'electron', 'dist')

  // 清理 build-tmp
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true })

  try {
    const result = await builder.build({
      config: {
        appId: 'com.fantuan-workshop.app',
        productName: '饭团工坊',
        directories: { buildResources: 'build', output: outDir },
        win: {
          icon: 'build/icons/icon.ico',
          executableName: 'fantuan-workshop',
          artifactName: 'fantuan-workshop-setup-${version}.${ext}',
          target: [{ target: 'dir', arch: ['x64'] }]
        },
        npmRebuild: false,
        files: ['out/**/*', 'build/icons/**/*'],
        extraResources: [{
          from: 'tools/StardewXnbHack/StardewXnbHack 1.1.2 for Windows/StardewXnbHack.exe',
          to: 'tools/StardewXnbHack/StardewXnbHack.exe'
        }],
        electronDist: electronDist,
      },
      win: ['dir:x64'],
      publish: null,
    })
    console.log('Build success:', JSON.stringify(result, null, 2))
  } catch (err) {
    console.error('Build failed:', err.message)
    process.exit(1)
  }
}
build()