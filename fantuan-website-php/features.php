<?php
$pageTitle='工具';
require_once __DIR__.'/header.php';
$features=[
  ['NPC 编辑器','01','管理 45 位 NPC 的肖像、行走图、对话。','45 位原版 NPC','肖像行走图双编辑','自定义角色','四季服装切换'],
  ['事件编辑器','02','拖拽编排对话、移动、动画等事件步骤。','可视化编排','条件分支与选项','实时预览','混合编排'],
  ['物品配置器','03','配置物品名称、描述、售价、类型。','多种物品类型','自定义属性','批量导入导出','SMAPI 兼容'],
  ['地图编辑器','04','修改原版地图，添加建筑、装饰、传送点。','瓦片与图层编辑','建筑装饰放置','传送点设置','季节变化'],
];
?>
<style>
/* features page */
.features-hero{padding:120px 0 60px;text-align:center;position:relative;overflow:hidden}
.features-hero::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(220,180,60,0.06) 0%,transparent 70%);pointer-events:none;animation:pulse 6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}

.feature-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;padding:48px 0;border-bottom:1px solid var(--border);position:relative}
.feature-row:last-child{border-bottom:none}
.feature-row::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:1px;background:linear-gradient(180deg,transparent,var(--border-light),transparent)}

.feature-content{padding-right:20px}
.feature-num{font-family:var(--font-display);font-size:64px;font-weight:800;color:rgba(220,180,60,0.06);line-height:1;margin-bottom:8px}
.feature-title{font-family:var(--font-display);font-size:28px;font-weight:700;margin-bottom:8px;color:var(--text)}
.feature-desc{font-size:15px;color:var(--text-dim);line-height:1.7;margin-bottom:16px}
.feature-tags{display:flex;flex-wrap:wrap;gap:6px}
.feature-tag{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:500;background:var(--bg-alt);color:var(--text-dim);border:1px solid var(--border);transition:all var(--transition-fast)}
.feature-tag:hover{border-color:var(--border-gold);color:var(--gold);background:var(--gold-dim)}

.feature-visual{position:relative;border-radius:var(--radius-lg);overflow:hidden;background:var(--bg-card);border:1px solid var(--border);transition:all var(--transition)}
.feature-visual::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(220,180,60,0.05),transparent);opacity:0;transition:opacity var(--transition)}
.feature-visual:hover{border-color:var(--border-gold);transform:translateY(-4px);box-shadow:var(--shadow-lg)}
.feature-visual:hover::before{opacity:1}
.feature-visual img{width:100%;height:100%;object-fit:cover;transition:all var(--transition)}
.feature-visual:hover img{transform:scale(1.03)}

.feature-cta{text-align:center;padding:80px 0;position:relative}
.feature-cta::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;background:radial-gradient(circle,rgba(220,180,60,0.08) 0%,transparent 70%);pointer-events:none}

/* responsive */
@media(max-width:768px){
  .feature-row{grid-template-columns:1fr;gap:24px;padding:32px 0}
  .feature-row::before{display:none}
  .feature-content{padding-right:0}
  .feature-num{font-size:48px}
  .feature-title{font-size:22px}
  .features-hero{padding:100px 0 40px}
  .feature-cta{padding:48px 0}
}
</style>

<div>
  <section class="features-hero">
    <div class="w">
      <div class="r">
        <div class="badge" style="margin-bottom:16px">工具</div>
        <h1 class="display" style="margin-bottom:16px;background:linear-gradient(135deg,var(--text) 0%,var(--gold-light) 50%,var(--gold) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">工坊工具</h1>
        <p class="p" style="max-width:480px;margin:0 auto;font-size:16px">四件核心工具，覆盖模组创作全流程。</p>
      </div>
    </div>
  </section>

  <div class="w">
    <?php foreach($features as $i=>$f):?>
    <div class="feature-row r r<?php echo min($i+1,3);?>" <?php echo $i%2==1?'style="direction:rtl"':''?>>
      <div class="feature-content" <?php echo $i%2==1?'style="direction:ltr;text-align:right;padding-right:0;padding-left:20px"':''?>>
        <div class="feature-num"><?php echo $f[1];?></div>
        <h2 class="feature-title"><?php echo $f[0];?></h2>
        <p class="feature-desc"><?php echo $f[2];?></p>
        <div class="feature-tags" <?php echo $i%2==1?'style="justify-content:flex-end"':''?>>
          <?php for($j=3;$j<count($f);$j++):?>
          <span class="feature-tag"><?php echo $f[$j];?></span>
          <?php endfor;?>
        </div>
      </div>
      <div class="feature-visual" <?php echo $i%2==1?'style="direction:ltr"':''?>>
        <div style="aspect-ratio:16/10;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-muted)">
          <img src="/assets/images/<?php echo ['npc编辑器.png','事件编辑器.png','物品编辑器.png','地图编辑器.png'][$i];?>" alt="<?php echo $f[0];?>" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.parentNode.innerHTML='[ 截图 ]'">
        </div>
      </div>
    </div>
    <?php endforeach;?>
  </div>

  <section class="feature-cta">
    <div class="w-narrow r">
      <h2 class="display-md" style="margin-bottom:12px">开始创作</h2>
      <p class="p" style="margin-bottom:28px;font-size:16px">免费下载饭团工坊，体验全新的模组制作方式。</p>
      <a href="/download.php" class="btn btn-p btn-lg">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v10m0 0l-3-3m3 3l3-3"/><path d="M2 12v2a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
        下载饭团工坊
      </a>
    </div>
  </section>
</div>
<?php require_once __DIR__.'/footer.php';?>