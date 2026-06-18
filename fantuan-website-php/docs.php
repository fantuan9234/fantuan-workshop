<?php
$pageTitle='手册';
require_once __DIR__.'/header.php';
$g=[['快速开始',[['installation','安装指南'],['first-use','首次使用'],['project-basics','项目基础']]],['工具指南',[['npc-editor','NPC 编辑'],['event-editor','事件编辑'],['item-editor','物品编辑'],['map-editor','地图编辑'],['quest-editor','任务编辑'],['mail-editor','邮件管理']]],['进阶',[['export-mod','模组导出'],['faq','常见问题']]]];
?>
<style>
.docs-hero{padding:120px 0 60px;text-align:center;position:relative;overflow:hidden}
.docs-hero::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:500px;height:500px;background:radial-gradient(circle,rgba(220,180,60,0.06) 0%,transparent 70%);pointer-events:none;animation:pulse 6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}

.docs-card{padding:28px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);transition:all var(--transition);position:relative;overflow:hidden}
.docs-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);transform:scaleX(0);transition:transform var(--transition);transform-origin:center}
.docs-card:hover{border-color:var(--border-gold);transform:translateY(-4px);box-shadow:var(--shadow-md)}
.docs-card:hover::before{transform:scaleX(1)}
.docs-card-title{font-size:17px;font-weight:600;margin-bottom:8px}
.docs-card-line{width:24px;height:2px;background:linear-gradient(90deg,var(--gold),var(--accent));margin-bottom:16px;border-radius:1px}
.docs-link{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:var(--text-dim);text-decoration:none;border-bottom:1px solid var(--border);transition:all var(--transition-fast);position:relative}
.docs-link:last-child{border-bottom:none}
.docs-link:hover{color:var(--gold);padding-left:4px}
.docs-link::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:0;height:1px;background:var(--gold);transition:width var(--transition-fast)}
.docs-link:hover::before{width:8px}
.docs-arrow{color:var(--text-muted);font-size:12px;transition:all var(--transition-fast)}
.docs-link:hover .docs-arrow{color:var(--gold);transform:translateX(2px)}

@media(max-width:768px){
  .docs-hero{padding:100px 0 40px}
}
</style>

<div>
  <section class="docs-hero">
    <div class="w">
      <div class="r">
        <div class="badge" style="margin-bottom:16px">手册</div>
        <h1 class="display" style="margin-bottom:16px;background:linear-gradient(135deg,var(--text) 0%,var(--gold-light) 50%,var(--gold) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">使用手册</h1>
        <p class="p" style="font-size:16px">从入门到精通，全面掌握饭团工坊</p>
      </div>
    </div>
  </section>

  <div class="w" style="max-width:960px;margin:0 auto">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
      <?php foreach($g as $t):?>
      <div class="docs-card r">
        <h3 class="docs-card-title"><?php echo $t[0];?></h3>
        <div class="docs-card-line"></div>
        <div style="display:flex;flex-direction:column;gap:0">
          <?php foreach($t[1] as $link):?>
          <a href="/doc-detail.php?slug=<?php echo $link[0];?>" class="docs-link">
            <span><?php echo $link[1];?></span>
            <span class="docs-arrow">→</span>
          </a>
          <?php endforeach;?>
        </div>
      </div>
      <?php endforeach;?>
    </div>
  </div>
</div>
<?php require_once __DIR__.'/footer.php';?>