<?php
$pageTitle='日志';
require_once __DIR__.'/backend/db.php';initDatabase();
$db=getDB();
$posts=$db->query("SELECT * FROM announcements ORDER BY is_pinned DESC,id DESC")->fetchAll();
require_once __DIR__.'/header.php';
?>
<style>
.blog-hero{padding:120px 0 60px;text-align:center;position:relative;overflow:hidden}
.blog-hero::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:500px;height:500px;background:radial-gradient(circle,rgba(220,180,60,0.06) 0%,transparent 70%);pointer-events:none;animation:pulse 6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}

.blog-card{display:block;text-decoration:none;color:inherit;padding:24px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);transition:all var(--transition);position:relative;overflow:hidden}
.blog-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);transform:scaleX(0);transition:transform var(--transition);transform-origin:center}
.blog-card:hover{border-color:var(--border-gold);transform:translateY(-2px);box-shadow:var(--shadow-md)}
.blog-card:hover::before{transform:scaleX(1)}
.blog-title{font-size:16px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.blog-pin{color:var(--gold);font-size:12px}
.blog-excerpt{font-size:14px;color:var(--text-dim);line-height:1.6;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.blog-meta{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text-muted)}
.blog-date{display:flex;align-items:center;gap:4px}
.blog-tag{padding:3px 8px;border-radius:12px;font-size:10px;font-weight:500;background:var(--bg-alt);color:var(--text-dim);border:1px solid var(--border)}
.blog-arrow{color:var(--text-muted);font-size:14px;transition:all var(--transition-fast);flex-shrink:0}
.blog-card:hover .blog-arrow{color:var(--gold);transform:translateX(2px)}

.blog-empty{padding:64px;text-align:center;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border)}

@media(max-width:768px){
  .blog-hero{padding:100px 0 40px}
  .blog-card{padding:20px}
}
</style>

<div>
  <section class="blog-hero">
    <div class="w">
      <div class="r">
        <div class="badge" style="margin-bottom:16px">日志</div>
        <h1 class="display" style="margin-bottom:16px;background:linear-gradient(135deg,var(--text) 0%,var(--gold-light) 50%,var(--gold) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">公告</h1>
        <p class="p" style="font-size:16px">了解饭团工坊的最新动态</p>
      </div>
    </div>
  </section>

  <div class="w-narrow">
    <?php if($posts):?>
    <div style="display:flex;flex-direction:column;gap:12px">
      <?php foreach($posts as $i=>$p):?>
      <a href="/blog-detail.php?id=<?php echo $p['id'];?>" class="blog-card r r<?php echo min($i+1,4);?>">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start">
          <div style="flex:1">
            <div class="blog-title">
              <?php echo h($p['title']);?>
              <?php if($p['is_pinned']):?><span class="blog-pin">📌 置顶</span><?php endif;?>
            </div>
            <div class="blog-excerpt"><?php echo mb_substr(strip_tags($p['content']),0,120);?>…</div>
            <div class="blog-meta">
              <span class="blog-date">
                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="8" height="8" rx="1"/><path d="M2 5h8M5 2v2"/></svg>
                <?php echo format_cn($p['created_at']);?>
              </span>
              <?php if($p['tags']):foreach(explode(',',$p['tags']) as $tag):?><span class="blog-tag"><?php echo h(trim($tag));?></span><?php endforeach;endif;?>
            </div>
          </div>
          <span class="blog-arrow">→</span>
        </div>
      </a>
      <?php endforeach;?>
    </div>
    <?php else:?>
    <div class="blog-empty">
      <svg width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin:0 auto 16px"><rect x="8" y="4" width="32" height="40" rx="2"/><path d="M16 12h16M16 20h16M16 28h10"/></svg>
      <p class="p" style="margin:0">暂无公告</p>
    </div>
    <?php endif;?>
  </div>
</div>
<?php require_once __DIR__.'/footer.php';?>