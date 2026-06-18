<?php require_once __DIR__.'/header.php';?>
<style>
/* ═══ Stardew Valley Style Cursor ═══ */
canvas, a, button, .btn, .tool-item, .nav-l a, .strip-item, .surface, .link, .badge { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='32' viewBox='0 0 28 32'%3E%3Cpath d='M4 2L4 28L10 22L15 28L17 27L12 21L20 18Z' fill='%23dcb43c' stroke='%23b08820' stroke-width='1'/%3E%3Ccircle cx='8' cy='8' r='1.5' fill='%23fff' opacity='0.8'/%3E%3C/svg%3E") 6 4, auto; }
body { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='26' viewBox='0 0 22 26'%3E%3Cpath d='M3 2L3 22L8 17L12 22L14 21L10 16L17 14Z' fill='%23d4a843' stroke='%23a07820' stroke-width='1'/%3E%3Ccircle cx='6' cy='6' r='1' fill='%23fff' opacity='0.6'/%3E%3C/svg%3E") 4 3, auto; }

/* hero */
.hero{min-height:100vh;display:flex;align-items:center;position:relative;overflow:hidden;padding:120px 0 60px}
.hero-bg{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.hero-bg::before{content:'';position:absolute;top:-30%;left:-20%;width:70%;height:80%;background:radial-gradient(ellipse at center,rgba(220,180,60,0.05) 0%,transparent 65%);animation:heroGlow 8s ease-in-out infinite alternate}
.hero-bg::after{content:'';position:absolute;bottom:-15%;right:-15%;width:60%;height:60%;background:radial-gradient(ellipse at center,rgba(220,180,60,0.03) 0%,transparent 60%);animation:heroGlow 10s ease-in-out infinite alternate-reverse}
@keyframes heroGlow{0%{opacity:0.6;transform:scale(1)}100%{opacity:1;transform:scale(1.1)}}
.hero-img{width:100%;border-radius:14px;border:1px solid var(--border);transition:all var(--transition);display:block;box-shadow:var(--shadow-lg)}
.hero-img:hover{border-color:var(--border-gold);box-shadow:0 12px 48px rgba(0,0,0,0.5),0 0 0 1px rgba(220,180,60,0.1)}
.hero-badge{animation:float 3s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}

/* tool list compact */
.tl{display:flex;flex-direction:column;gap:4px}
.tl-item{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:var(--radius);transition:all var(--transition);text-decoration:none;color:inherit;position:relative;overflow:hidden;border:1px solid transparent}
.tl-item::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(220,180,60,0.03),transparent);opacity:0;transition:opacity var(--transition-fast)}
.tl-item:hover{background:var(--bg-card);border-color:var(--border);transform:translateX(4px)}
.tl-item:hover::before{opacity:1}
.tl-num{font-size:11px;color:var(--text-muted);font-weight:600;min-width:28px;font-feature-settings:"tnum";font-family:var(--font-display)}
.tl-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;background:linear-gradient(135deg,var(--gold-dim),rgba(220,180,60,0.05));color:var(--gold);border:1px solid rgba(220,180,60,0.1);transition:all var(--transition-fast)}
.tl-item:hover .tl-icon{background:linear-gradient(135deg,rgba(220,180,60,0.2),rgba(220,180,60,0.1));border-color:rgba(220,180,60,0.2);transform:scale(1.05)}

/* gallery */
.gallery-item{position:relative;border-radius:var(--radius-lg);overflow:hidden;background:var(--bg-card);border:1px solid var(--border);transition:all var(--transition)}
.gallery-item::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,rgba(0,0,0,0.6));z-index:1;opacity:0;transition:opacity var(--transition)}
.gallery-item:hover{border-color:var(--border-gold);transform:translateY(-4px);box-shadow:var(--shadow-lg)}
.gallery-item:hover::before{opacity:1}
.gallery-item img{width:100%;height:100%;object-fit:cover;transition:all var(--transition)}
.gallery-item:hover img{transform:scale(1.05)}
.gallery-label{position:absolute;bottom:12px;left:12px;right:12px;z-index:2;color:var(--text);font-size:12px;font-weight:500;opacity:0;transform:translateY(8px);transition:all var(--transition)}
.gallery-item:hover .gallery-label{opacity:1;transform:translateY(0)}

/* download */
.download-card{text-align:center;padding:48px 40px;position:relative}
.download-card::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:300px;background:radial-gradient(circle,rgba(220,180,60,0.08) 0%,transparent 70%);pointer-events:none}

/* section divider */
.section-divider{height:1px;background:linear-gradient(90deg,transparent 0%,var(--border-light) 20%,var(--gold-dim) 50%,var(--border-light) 80%,transparent 100%);margin:0 auto;max-width:600px}

/* features grid */
.feature-card{padding:28px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);transition:all var(--transition);position:relative;overflow:hidden}
.feature-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);transform:scaleX(0);transition:transform var(--transition);transform-origin:center}
.feature-card:hover{border-color:var(--border-gold);transform:translateY(-4px);box-shadow:var(--shadow-md)}
.feature-card:hover::before{transform:scaleX(1)}
.feature-num{font-family:var(--font-display);font-size:48px;font-weight:800;color:rgba(220,180,60,0.08);position:absolute;top:16px;right:20px;line-height:1}

/* responsive */
@media(max-width:768px){
  .hero{min-height:auto;padding:120px 0 60px}
  .hero-grid{grid-template-columns:1fr!important;gap:40px!important}
  .tools-grid{grid-template-columns:1fr!important}
  .gallery-grid{grid-template-columns:repeat(2,1fr)!important}
  .feature-card{padding:24px 20px}
  .feature-num{font-size:36px}
}
@media(min-width:769px)and (max-width:1024px){
  .hero-grid{gap:32px!important}
  .gallery-grid{grid-template-columns:repeat(2,1fr)!important}
}
</style>

<!-- ═══ HERO ═══ -->
<section class="hero">
  <div class="hero-bg"></div>
  <div class="w" style="position:relative;z-index:1">
    <div class="hero-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center">
      <div class="r">
        <div class="hero-badge badge" style="margin-bottom:20px">✦ v0.1.9</div>
        <h1 class="display" style="margin-bottom:16px;background:linear-gradient(135deg,var(--text) 0%,var(--gold-light) 50%,var(--gold) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">饭团工坊</h1>
        <p style="font-size:17px;color:var(--text-dim);line-height:1.8;margin-bottom:32px;max-width:420px">
          星露谷物语模组制作工具。管理 NPC、事件、物品、地图，一键导出。让模组创作变得简单而优雅。
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:12px">
          <a href="/download.php" class="btn btn-p btn-lg">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v10m0 0l-3-3m3 3l3-3"/><path d="M2 12v2a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            下载工坊
          </a>
          <a href="/features.php" class="btn btn-o btn-lg">浏览工具</a>
        </div>
        <div style="display:flex;align-items:center;gap:16px;margin-top:32px;padding-top:24px;border-top:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:6px">
            <svg width="14" height="14" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="7" cy="7" r="6"/><path d="M4.5 7l2 2 3.5-3.5"/></svg>
            <span class="p-sm">免费开源</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <svg width="14" height="14" fill="none" stroke="var(--gold)" stroke-width="2"><rect x="2" y="2" width="10" height="10" rx="1"/><path d="M5 2v10M2 5h10"/></svg>
            <span class="p-sm">Windows 64位</span>
          </div>
        </div>
      </div>
      <div class="r r2">
        <div style="position:relative">
          <div style="position:absolute;inset:-1px;border-radius:15px;background:linear-gradient(135deg,rgba(220,180,60,0.2),transparent,rgba(220,180,60,0.1));z-index:-1;filter:blur(1px)"></div>
          <div style="aspect-ratio:16/10;border-radius:14px;background:var(--bg-card);border:1px solid var(--border);overflow:hidden;position:relative">
            <img src="/assets/images/npc编辑器.png" alt="饭团工坊界面截图" class="hero-img" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.innerHTML='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;font-size:13px;color:var(--text-muted)\'>饭团工坊</div>'">
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ TOOLS ═══ -->
<section class="section-sm" style="padding-top:0">
  <div class="w">
    <div class="r" style="margin-bottom:28px">
      <span class="label">工具一览</span>
    </div>
    <div class="tools-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div class="r">
        <?php $tools=[
          ['01','◈','NPC 编辑器','管理肖像、行走图、对话'],
          ['02','◈','事件编排器','拖拽编排事件流程'],
          ['03','◈','物品配置器','配置属性、售价'],
        ]; foreach($tools as $t):?>
        <a href="/features.php" class="tl-item glow-gold">
          <span class="tl-num"><?php echo $t[0];?></span>
          <span class="tl-icon"><?php echo $t[1];?></span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600;margin-bottom:2px"><?php echo $t[2];?></div>
            <div class="p-sm"><?php echo $t[3];?></div>
          </div>
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="color:var(--text-muted);flex-shrink:0"><path d="M5 3l4 4-4 4"/></svg>
        </a>
        <?php endforeach;?>
      </div>
      <div class="r r2">
        <?php $tools2=[
          ['04','◈','地图编辑器','修改地形、添加装饰'],
          ['05','◈','任务系统','设计任务链与奖励'],
          ['06','◈','邮件管理','编辑游戏内邮件'],
        ]; foreach($tools2 as $t):?>
        <a href="/features.php" class="tl-item glow-gold">
          <span class="tl-num"><?php echo $t[0];?></span>
          <span class="tl-icon"><?php echo $t[1];?></span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600;margin-bottom:2px"><?php echo $t[2];?></div>
            <div class="p-sm"><?php echo $t[3];?></div>
          </div>
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="color:var(--text-muted);flex-shrink:0"><path d="M5 3l4 4-4 4"/></svg>
        </a>
        <?php endforeach;?>
      </div>
    </div>
  </div>
</section>

<!-- ═══ DIVIDER ═══ -->
<div class="w"><div class="section-divider"></div></div>

<!-- ═══ GALLERY ═══ -->
<section class="section-sm">
  <div class="w">
    <div class="r" style="margin-bottom:24px">
      <span class="label">界面预览</span>
    </div>
    <div class="gallery-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px" class="r r2">
      <?php $imgs=[
        ['npc编辑器.png','NPC 编辑器'],
        ['事件编辑器.png','事件编辑器'],
        ['物品编辑器.png','物品配置器'],
        ['地图编辑器.png','地图编辑器'],
      ]; foreach($imgs as $img):?>
      <div class="gallery-item" style="aspect-ratio:16/9">
        <img src="/assets/images/<?php echo $img[0];?>" alt="<?php echo $img[1];?>" onerror="this.parentNode.innerHTML='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;color:var(--text-muted)\'>[<?php echo $img[1];?>]</div>'">
        <div class="gallery-label"><?php echo $img[1];?></div>
      </div>
      <?php endforeach;?>
    </div>
  </div>
</section>

<!-- ═══ FEATURES HIGHLIGHT ═══ -->
<section class="section-sm">
  <div class="w">
    <div class="r" style="text-align:center;margin-bottom:40px">
      <span class="label" style="display:block;margin-bottom:12px">为什么选择饭团工坊</span>
      <h2 class="display-md">为模组创作者而生</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px" class="r r2">
      <?php $highlights=[
        ['可视化编辑','所见即所得的编辑体验，告别繁琐的代码配置'],
        ['一键导出','自动处理模组打包，支持直接发布到 Nexus Mods'],
        ['持续更新','紧跟游戏版本，定期添加新功能与优化'],
      ]; foreach($highlights as $i=>$h):?>
      <div class="feature-card">
        <span class="feature-num"><?php echo str_pad($i+1,2,'0',STR_PAD_LEFT);?></span>
        <h3 style="font-size:18px;font-weight:600;margin-bottom:8px;position:relative;z-index:1"><?php echo $h[0];?></h3>
        <p class="p-sm" style="position:relative;z-index:1;line-height:1.7"><?php echo $h[1];?></p>
      </div>
      <?php endforeach;?>
    </div>
  </div>
</section>

<?php require_once __DIR__.'/footer.php';?>