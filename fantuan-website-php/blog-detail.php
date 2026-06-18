<?php
$id=(int)($_GET['id']??0);
require_once __DIR__.'/backend/db.php';initDatabase();
$db=getDB();
$s=$db->prepare("SELECT * FROM announcements WHERE id=?");$s->execute([$id]);$p=$s->fetch();
if(!$p){header('Location: /blog.php');exit;}
$pageTitle=h($p['title']).' - 日志';
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

.detail-meta{display:flex;align-items:center;gap:12px;font-size:13px;color:var(--text-muted);margin-bottom:16px}
.detail-date{display:flex;align-items:center;gap:4px}
.detail-tag{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;background:var(--bg-alt);color:var(--text-dim);border:1px solid var(--border)}
.detail-title{font-family:var(--font-display);font-size:clamp(24px,4vw,32px);font-weight:700;margin-bottom:24px;line-height:1.2}
.detail-content{font-size:15px;color:var(--text-dim);line-height:1.8;white-space:pre-wrap}

@media(max-width:768px){
  .detail-hero{padding:100px 0 24px}
  .detail-card{padding:28px 24px}
}
</style>

<div>
  <section class="detail-hero">
    <div class="w-narrow">
      <a href="/blog.php" class="back-link r">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 2L4 7l5 5"/></svg>
        返回日志
      </a>
    </div>
  </section>

  <div class="w-narrow">
    <article class="detail-card r">
      <div class="detail-meta">
        <span class="detail-date">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="8" height="8" rx="1"/><path d="M2 5h8M5 2v2"/></svg>
          <?php echo format_cn($p['created_at']);?>
        </span>
        <?php if($p['tags']):foreach(explode(',',$p['tags']) as $tag):?><span class="detail-tag"><?php echo h(trim($tag));?></span><?php endforeach;endif;?>
      </div>
      <h1 class="detail-title"><?php echo h($p['title']);?></h1>
      <div class="detail-content"><?php echo h($p['content']);?></div>
    </article>
  </div>
</div>
<?php require_once __DIR__.'/footer.php';?>