const { rcedit } = require('rcedit')
const path = require('path')

const exePath = path.resolve(process.argv[2])
const iconPath = path.resolve('build/icons/icon.ico')

console.log('设置图标:', exePath)
console.log('图标文件:', iconPath)

rcedit(exePath, { icon: iconPath })
  .then(() => console.log('✅ 图标嵌入成功'))
  .catch(err => {
    console.error('❌ 图标嵌入失败:', err.message)
    process.exit(1)
  })
