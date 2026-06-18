<?php
$slug=$_GET['slug']??'installation';
$docs=[
  'installation'=>['title'=>'安装指南','body'=>'<h3 style="margin:20px 0 8px;font-weight:600">系统要求</h3><ul style="padding-left:16px;color:var(--text-dim);font-size:14px;line-height:1.8"><li><strong>操作系统</strong>：Windows 10/11 64位</li><li><strong>内存</strong>：4GB 以上</li><li><strong>硬盘</strong>：200MB 以上</li><li><strong>依赖</strong>：SMAPI 3.18+</li></ul><h3 style="margin:20px 0 8px;font-weight:600">安装</h3><ol style="padding-left:16px;color:var(--text-dim);font-size:14px;line-height:1.8"><li>下载安装包</li><li>双击运行</li><li>按向导完成安装</li></ol>'],
  'first-use'=>['title'=>'首次使用','body'=>'<h3 style="margin:20px 0 8px;font-weight:600">欢迎页</h3><p style="color:var(--text-dim);font-size:14px;line-height:1.7">首次启动看到欢迎页面，可选择游戏目录、新建或打开项目。</p><h3 style="margin:20px 0 8px;font-weight:600">界面</h3><ol style="padding-left:16px;color:var(--text-dim);font-size:14px;line-height:1.8"><li>左侧栏 — 导航</li><li>中央区 — 编辑</li><li>顶栏 — 操作</li></ol>'],
  'project-basics'=>['title'=>'项目基础','body'=>'<p style="color:var(--text-dim);font-size:14px;line-height:1.7">项目以 <code style="background:var(--bg-alt);padding:2px 6px;border-radius:3px;font-size:13px">.fantuan</code> 格式保存。</p><ul style="padding-left:16px;color:var(--text-dim);font-size:14px;line-height:1.8;margin-top:12px"><li><strong>新建</strong> — 首页点击"新建"</li><li><strong>保存</strong> — Ctrl+S</li><li><strong>打开</strong> — Ctrl+O</li></ul>'],
  'npc-editor'=>['title'=>'NPC 编辑','body'=>'<p style="color:var(--text-dim);font-size:14px;line-height:1.7">管理 NPC 的肖像、行走图、对话。支持 45 位原版 NPC 和自定义角色。</p>'],
  'event-editor'=>['title'=>'事件编辑','body'=>'<p style="color:var(--text-dim);font-size:14px;line-height:1.7">可视化编排事件。支持对话、移动、动画、选项等类型。</p>'],
  'item-editor'=>['title'=>'物品编辑','body'=>'<p style="color:var(--text-dim);font-size:14px;line-height:1.7">创建和修改物品，配置名称、描述、类型、售价等属性。</p>'],
  'map-editor'=>['title'=>'地图编辑','body'=>'<p style="color:var(--text-dim);font-size:14px;line-height:1.7">创建和修改游戏地图。支持加载原版地图、图层管理。</p>'],
  'quest-editor'=>['title'=>'任务编辑','body'=>'<p style="color:var(--text-dim);font-size:14px;line-height:1.7">创建和管理任务。支持收集、送达、对话、钓鱼等类型。</p>'],
  'mail-editor'=>['title'=>'邮件管理','body'=>'<p style="color:var(--text-dim);font-size:14px;line-height:1.7">编辑游戏内邮件，支持自定义标题、正文、发件人、附件。</p>'],
  'export-mod'=>['title'=>'模组导出','body'=>'<ol style="padding-left:16px;color:var(--text-dim);font-size:14px;line-height:1.8"><li>保存内容</li><li>点击"导出"</li><li>选择位置</li><li>完成</li></ol>'],
  'faq'=>['title'=>'常见问题','body'=>'<dl style="color:var(--text-dim);font-size:14px;line-height:1.8"><dt style="font-weight:500;color:var(--text);margin-top:12px">需要 SMAPI？</dt><dd>编辑器不需要，导出模组需要。</dd><dt style="font-weight:500;color:var(--text);margin-top:12px">支持 Mac 吗？</dt><dd>目前仅 Windows 64 位。</dd><dt style="font-weight:500;color:var(--text);margin-top:12px">报告 Bug？</dt><dd>通过联系我们或 GitHub Issues。</dd></dl>'],
];
$doc=$docs[$slug]??['title'=>'未找到','body'=>'<p>该文档暂未上线</p>'];
$pageTitle=$doc['title'].' - 手册';
require_once __DIR__.'/header.php';
?>
<style>
.detail-hero{padding:120px 0 40px;position:relative;overflow:hidden}
.detail-hero::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:500px;height:500px;background:radial-gradient(circle,rgba(220,180,60,0.06) 0%,transparent 70%);pointer-events:none;animation:pulse 6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}

.back-link{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text-dim);text-decoration:none;margin-bottom:20px;transition:all var(--transition-fast)}
.back-link:hover{color:var(--gold);transform:translateX(-4px)}

.detail-card{padding:40px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);position:relative;overflow:hidden}
.detail-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}

.doc-content h3{font-size:17px;font-weight:600;margin:24px 0 12px;color:var(--text)}
.doc-content p,.doc-content li{color:var(--text-dim);font-size:15px;line-height:1.8}
.doc-content ul,.doc-content ol{padding-left:20px;margin:12px 0}
.doc-content li{margin-bottom:6px}
.doc-content strong{color:var(--text);font-weight:600}
.doc-content dt{font-weight:600;color:var(--text);margin-top:16px;font-size:15px}
.doc-content dd{margin:4px 0 0 0;color:var(--text-dim);font-size:15px;line-height:1.7}

@media(max-width:768px){
  .detail-hero{padding:100px 0 24px}
  .detail-card{padding:28px 24px}
}
</style>

<div>
  <section class="detail-hero">
    <div class="w-narrow">
      <a href="/docs.php" class="back-link r">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 2L4 7l5 5"/></svg>
        返回手册
      </a>
    </div>
  </section>

  <div class="w-narrow">
    <article class="detail-card r">
      <h1 class="display-md" style="font-size:clamp(24px,4vw,32px);margin-bottom:24px"><?php echo $doc['title'];?></h1>
      <div class="doc-content"><?php echo $doc['body'];?></div>
    </article>
  </div>
</div>
<?php require_once __DIR__.'/footer.php';?>