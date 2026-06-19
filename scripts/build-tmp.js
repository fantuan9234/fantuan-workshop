const builder = require('electron-builder')
const fs = require('fs')
const path = require('path')

async function build() {
  const tmpDir = path.resolve(__dirname, '..', 'build-tmp')
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })

  try {
    const result = await builder.build({
      config: {
        appId: 'com.fantuan-workshop.app',
        productName: '饭团工坊',
        directories: { buildResources: 'build', output: tmpDir },
        win: {
	          icon: 'build/icons/icon.ico',
	          executableName: 'fantuan-workshop',
	          artifactName: 'fantuan-workshop-setup-${version}.${ext}',
	          target: [{ target: 'nsis', arch: ['x64'] }]
	        },
        nsis: {
          oneClick: false,
          perMachine: true,
          allowToChangeInstallationDirectory: true,
        },
        publish: {
          provider: 'github',
          owner: 'fantuan9234',
          repo: 'fantuan-workshop',
          releaseType: 'release'
        },
        npmRebuild: false,
        files: ['out/**/*', 'build/icons/**/*'],
        extraResources: [{
          from: 'tools/StardewXnbHack/StardewXnbHack 1.1.2 for Windows/StardewXnbHack.exe',
          to: 'tools/StardewXnbHack/StardewXnbHack.exe'
        }],
      },
      publish: 'always',
      win: ['nsis:x64']
    })
    console.log('Build success:', JSON.stringify(result, null, 2))
  } catch (err) {
    console.error('Build failed:', err.message)
    process.exit(1)
  }
}
build()