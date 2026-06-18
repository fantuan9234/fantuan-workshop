<?php
$pageTitle='关于';
require_once __DIR__.'/header.php';
?>
<style>
.about-hero{padding:120px 0 60px;text-align:center;position:relative;overflow:hidden}
.about-hero::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:500px;height:500px;background:radial-gradient(circle,rgba(220,180,60,0.06) 0%,transparent 70%);pointer-events:none;animation:pulse 6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}

.about-card{padding:36px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);transition:all var(--transition);position:relative;overflow:hidden}
.about-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);transform:scaleX(0);transition:transform var(--transition);transform-origin:center}
.about-card:hover{border-color:var(--border-gold);transform:translateY(-2px);box-shadow:var(--shadow-md)}
.about-card:hover::before{transform:scaleX(1)}
.about-text{font-size:16px;color:var(--text-dim);line-height:1.8;margin-bottom:16px}
.about-text:last-child{margin-bottom:0}

.tech-label{font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);margin-bottom:16px}
.tech-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.tech-item{padding:20px 16px;border-radius:var(--radius);background:var(--bg-alt);border:1px solid var(--border);text-align:center;transition:all var(--transition-fast);position:relative;overflow:hidden}
.tech-item::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);transform:scaleX(0);transition:transform var(--transition);transform-origin:center}
.tech-item:hover{border-color:var(--border-gold);transform:translateY(-2px);box-shadow:var(--shadow-sm)}
.tech-item:hover::before{transform:scaleX(1)}
.tech-name{font-size:15px;font-weight:600;margin-bottom:4px}
.tech-desc{font-size:12px;color:var(--text-muted)}

.about-values{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:32px}
.value-card{padding:24px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);text-align:center;transition:all var(--transition)}
.value-card:hover{border-color:var(--border-gold);transform:translateY(-2px)}
.value-icon{width:48px;height:48px;border-radius:12px;background:var(--gold-dim);border:1px solid rgba(220,180,60,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:20px}
.value-title{font-size:15px;font-weight:600;margin-bottom:6px}
.value-desc{font-size:13px;color:var(--text-dim);line-height:1.6}

@media(max-width:768px){
  .about-hero{padding:100px 0 40px}
  .about-card{padding:28px 24px}
  .tech-grid{grid-template-columns:repeat(2,1fr)}
  .about-values{grid-template-columns:1fr}
  .value-card{text-align:left;display:flex;gap:16px;align-items:flex-start}
  .value-icon{flex-shrink:0}
}
</style>

<div>
  <section class="about-hero">
    <div class="w">
      <div class="r">
        <div class="badge" style="margin-bottom:16px">关于</div>
        <h1 class="display" style="margin-bottom:16px;background:linear-gradient(135deg,var(--text) 0%,var(--gold-light) 50%,var(--gold) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">关于饭团工坊</h1>
        <p class="p" style="font-size:16px">简单、温暖、实在</p>
      </div>
    </div>
  </section>

  <div class="w-narrow">
    <div class="about-card r" style="margin-bottom:20px">
      <p class="about-text">饭团工坊诞生于对星露谷物语的热爱。作为模组玩家，我们希望有一个一体化的、干净的工具来管理 NPC、编排事件、配置物品和编辑地图。</p>
      <p class="about-text">名字"饭团"——简单、温暖、实在。就像一碗热腾腾的米饭，朴实无华却不可或缺。</p>
    </div>

    <div class="about-card r" style="margin-bottom:20px">
      <div class="tech-label">技术栈</div>
      <div class="tech-grid">
        <?php foreach([['Electron','桌面'],['React','UI'],['TypeScript','类型'],['Tailwind','样式']] as $t):?>
        <div class="tech-item">
          <div class="tech-name"><?php echo $t[0];?></div>
          <div class="tech-desc"><?php echo $t[1];?></div>
        </div>
        <?php endforeach;?>
      </div>
    </div>

    <div class="r" style="margin-top:32px">
      <div class="tech-label" style="text-align:center;margin-bottom:20px">我们的理念</div>
      <div class="about-values">
        <?php $values=[
          ['🎨','简洁至上','拒绝复杂配置，一切操作可视化'],['⚡','高效创作','从想法到成品，最快路径'],['💚','开源共享','MIT 许可，社区共建'],
        ]; foreach($values as $v):?>
        <div class="value-card">
          <div class="value-icon"><?php echo $v[0];?></div>
          <div>
            <div class="value-title"><?php echo $v[1];?></div>
            <div class="value-desc"><?php echo $v[2];?></div>
          </div>
        </div>
        <?php endforeach;?>
      </div>
    </div>
  </div>
</div>
<?php require_once __DIR__.'/footer.php';?>