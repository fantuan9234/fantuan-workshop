# -*- coding: utf-8 -*-
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

filepath = r'D:\aaaawagjunhao\stardew-mod-studio\src\renderer\src\pages\npc\NPCDetailPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ---- 1. Add $b format help entry ----
old_help = '''  { syntax: '$h $l $u $k', desc: '切换肖像表情（开心/伤心/独特/亲吻）', example: '$h太好了！' },
  { syntax: 'break', desc: '换行', example: '第一行break第二行' },'''  # note: 2-space indent

new_help = '''  { syntax: '$h $l $u $k', desc: '切换肖像表情（开心/伤心/独特/亲吻）', example: '$h太好了！' },
  { syntax: '$b', desc: '分拆为多个对话气泡依次弹出（每段后可加一个$b进入下一段）', example: '你好！$b今天天气真好！' },
  { syntax: 'break', desc: '换行', example: '第一行break第二行' },'''

if old_help in content:
    content = content.replace(old_help, new_help, 1)
    print("✔ Format help updated")
else:
    print("✘ Format help: NOT FOUND")
    idx = content.find("$h $l $u $k")
    if idx >= 0:
        print("  Found at", idx)
        print(repr(content[idx-5:idx+120]))

# ---- 2. Find DialogueItem closing and insert preview + component ----
# Find the textarea closing and the </div> after it
old_item_end = '''      />
    </div>
  )
}

// 可折叠的对话分组'''

new_item_end = '''      />
      <DialogueBPreview text={value} textareaRef={textareaRef} />
    </div>
  )
}

// $b 多段对话预览组件
function DialogueBPreview({ text, textareaRef }: { text: string; textareaRef: React.RefObject<HTMLTextAreaElement | null> }): JSX.Element | null {
  if (!text.includes('$b')) return null

  const segments = text.split('$b')
  const offsets: Array<{ start: number; end: number }> = []
  let cursor = 0
  for (const seg of segments) {
    offsets.push({ start: cursor, end: cursor + seg.length })
    cursor += seg.length + 2
  }

  const jumpToSegment = (idx: number) => {
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    const { start, end } = offsets[idx]
    ta.setSelectionRange(start, end)
  }

  const emotionLabels: Record<string, { label: string; color: string }> = {
    '$h': { label: '开心', color: 'text-yellow-300' },
    '$s': { label: '悲伤', color: 'text-blue-300' },
    '$l': { label: '大笑', color: 'text-green-300' },
    '$a': { label: '生气', color: 'text-red-300' },
    '$u': { label: '惊讶', color: 'text-purple-300' },
    '$k': { label: '亲吻', color: 'text-pink-300' },
  }

  const renderSegment = (segText: string, idx: number, total: number) => {
    const trimmed = segText.trim()
    let emotionBadge = null
    let displayText = trimmed

    for (const [code, info] of Object.entries(emotionLabels)) {
      if (displayText.startsWith(code)) {
        emotionBadge = <span className={"text-xs mr-1.5 font-medium " + info.color}>{info.label}</span>
        displayText = displayText.slice(code.length).trimStart()
        break
      }
    }

    let prefixBadge = null
    if (displayText.startsWith('$q')) {
      prefixBadge = <span className="text-xs mr-1.5 px-1 py-0.5 rounded bg-amber-900/40 text-amber-300">提问</span>
    } else if (displayText.startsWith('$r')) {
      prefixBadge = <span className="text-xs mr-1.5 px-1 py-0.5 rounded bg-purple-900/40 text-purple-300">回答</span>
    }

    return (
      <div key={idx}>
        {idx > 0 && (
          <div className="flex items-center gap-2 py-0.5">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-xs text-gray-500 shrink-0">↳ $b 下一段</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>
        )}
        <div
          onClick={() => jumpToSegment(idx)}
          className="flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[#2a2a2a] transition-colors group"
        >
          <span className="text-xs text-gray-500 shrink-0 mt-0.5 font-mono">{idx + 1}/{total}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-300 leading-relaxed break-words">
              {emotionBadge}
              {prefixBadge}
              {displayText || <span className="text-gray-600 italic">[空段]</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 bg-[#0f1a1a] border border-emerald-900/30 rounded-lg overflow-hidden">
      <div className="px-2.5 py-1.5 bg-emerald-950/30 border-b border-emerald-900/20">
        <span className="text-xs text-emerald-400 font-medium">游戏内 $b 分段预览</span>
        <span className="text-xs text-gray-500 ml-2">{total} 段</span>
      </div>
      <div className="px-1 py-1">
        {segments.map((seg, i) => renderSegment(seg, i, segments.length))}
      </div>
    </div>
  )
}

// 可折叠的对话分组'''

if old_item_end in content:
    content = content.replace(old_item_end, new_item_end, 1)
    print("✔ DialogueBPreview component inserted")
else:
    print("✘ DialogueItem end: NOT FOUND")
    idx = content.find('// 可折叠的对话分组')
    if idx >= 0:
        print(f"  Found 'Collapsible' comment at {idx}")
        print(repr(content[idx-150:idx]))

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✔ Write complete")