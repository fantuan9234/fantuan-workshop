const builder = require('electron-builder')
const path = require('path')

async function build() {
  try {
    const result = await builder.build({
      config: {
        appId: 'com.fantuan-workshop.app',
        productName: '饭团工坊',
        directories: { buildResources: 'build', output: 'dist' },
        win: {
          icon: 'build/icons/icon.ico',
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
        electronDownload: {
          version: '28.3.3',
          platform: 'win32',
          arch: 'x64',
          mirror: 'https://github.com/electron/electron/releases/download/v'
        }
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