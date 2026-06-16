// 追加提取 Maps 目录中的瓦片集纹理 (outdoor tilesheets etc.)
import { unpackToFiles } from 'xnb'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SV = 'D:/Steam/steamapps/common/Stardew Valley/Content/Maps'
const OUT = join(__dirname, '..', 'src', 'renderer', 'public', 'assets', 'maps')

async function toBuffer(data) {
  if (!data) return null
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Blob) return Buffer.from(await data.arrayBuffer())
  return null
}

async function main() {
  const entries = await readdir(SV, { withFileTypes: true })
  // 只提取 tilesheet .xnb，跳过地图数据文件和语言变体
  const files = entries.filter(f => 
    f.isFile() && 
    f.name.endsWith('.xnb') && 
    f.name.toLowerCase().includes('tilesheet') &&
    !f.name.match(/\.[a-z]{2}-[A-Z]{2}\.xnb$/) // 跳过语言变体
  )
  
  console.log(`📦 Maps目录瓦片集 (${files.length} 个)`)
  let count = 0

  for (const f of files) {
    try {
      const buf = await readFile(join(SV, f.name))
      if (buf.length < 1000) continue // 跳过极小文件

      const name = 'Maps_' + f.name.replace(/\.xnb$/i, '')
      const outputs = await unpackToFiles(buf, { fileName: f.name })
      for (const o of outputs) {
        if (!o.extension || !['png','jpg','jpeg','gif'].includes(o.extension.toLowerCase())) continue
        const data = await toBuffer(o.data)
        if (!data) continue
        await writeFile(join(OUT, `${name}.${o.extension.toLowerCase()}`), data)
        count++
      }
      if (count > 0 && count % 10 === 0) console.log(`  ${count} 张...`)
    } catch (e) {
      // skip
    }
  }
  console.log(`  => ${count} 张`)
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
