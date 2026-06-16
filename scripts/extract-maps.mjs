// 从 Steam 星露谷物语解包关键纹理目录 → PNG
import { unpackToFiles } from 'xnb'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SV = 'D:/Steam/steamapps/common/Stardew Valley/Content'
const OUT = join(__dirname, '..', 'src', 'renderer', 'public', 'assets', 'maps')

async function toBuffer(data) {
  if (!data) return null
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Blob) return Buffer.from(await data.arrayBuffer())
  return null
}

async function extractFile(fullPath, relPath) {
  const buf = await readFile(fullPath)
  const name = relPath.replace(/\\/g, '/').replace(/\.xnb$/i, '').replace(/[/\\]/g, '_')
  const outputs = await unpackToFiles(buf, { fileName: relPath })
  let saved = 0
  for (const o of outputs) {
    if (!o.extension || !['png','jpg','jpeg','gif'].includes(o.extension.toLowerCase())) continue
    const data = await toBuffer(o.data)
    if (!data) continue
    await writeFile(join(OUT, `${name}.${o.extension.toLowerCase()}`), data)
    saved++
  }
  return saved
}

async function processDir(dir, label) {
  const fullDir = join(SV, dir)
  if (!existsSync(fullDir)) { console.log(`  ⚠ 跳过 ${dir}`); return 0 }

  const entries = await readdir(fullDir, { withFileTypes: true })
  const files = entries.filter(f => f.isFile() && f.name.endsWith('.xnb'))

  console.log(`\n📦 ${label} (${files.length} 个)`)
  let count = 0
  for (const f of files) {
    try {
      count += await extractFile(join(fullDir, f.name), `${dir}/${f.name}`)
      if (count > 0 && count % 20 === 0) process.stdout.write(`  ${count} `)
    } catch { /* skip */ }
  }
  console.log(`\n  => ${count} 张`)
  return count
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const start = Date.now()
  let total = 0

  total += await processDir('TileSheets', '瓦片集纹理')
  total += await processDir('Portraits', 'NPC头像')
  total += await processDir('Characters', '角色行走图')
  total += await processDir('LooseSprites', 'UI精灵图')

  console.log(`\n✅ 总计 ${total} 张 (${((Date.now() - start) / 1000).toFixed(1)}s) → ${OUT}`)
}
main().catch(err => { console.error('❌', err.message); process.exit(1) })
