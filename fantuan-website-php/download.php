<?php
$pageTitle='下载';
require_once __DIR__.'/backend/db.php';initDatabase();
$db=getDB();
$latest=$db->query("SELECT * FROM versions WHERE is_latest=1 LIMIT 1")->fetch();
$versions=$db->query("SELECT * FROM versions ORDER BY is_latest DESC,id DESC")->fetchAll();
require_once __DIR__.'/header.php';
?>
<style>
.download-hero{padding:120px 0 60px;text-align:center;position:relative;overflow:hidden}
.download-hero::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:500px;height:500px;background:radial-gradient(circle,rgba(220,180,60,0.06) 0%,transparent 70%);pointer-events:none;animation:pulse 6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}

.download-card{padding:48px;text-align:center;position:relative;overflow:hidden}
.download-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);transform:scaleX(0);transition:transform var(--transition);transform-origin:center}
.download-card:hover::before{transform:scaleX(1)}

.version-item{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;transition:all var(--transition-fast)}
.version-item:hover{border-color:var(--border-gold);transform:translateX(4px);box-shadow:var(--shadow-sm)}
.version-info{display:flex;align-items:center;gap:12px}
.version-num{font-family:var(--font-display);font-size:18px;font-weight:600}
.version-meta{font-size:12px;color:var(--text-muted)}
.version-actions{display:flex;gap:8px;align-items:center}
.version-log{padding:6px 12px;font-size:12px;color:var(--text-dim);background:transparent;border:1px solid var(--border);border-radius:6px;cursor:pointer;transition:all var(--transition-fast)}
.version-log:hover{border-color:var(--border-gold);color:var(--gold);background:var(--gold-dim)}
.version-dl{font-size:13px;color:var(--gold);text-decoration:none;font-weight:500;transition:all var(--transition-fast)}
.version-dl:hover{color:var(--gold-light);text-decoration:underline}

@media(max-width:768px){
  .download-hero{padding:100px 0 40px}
  .download-card{padding:32px 24px}
  .version-item{flex-direction:column;align-items:flex-start;gap:12px}
  .version-actions{width:100%;justify-content:flex-end}
}
</style>

<div>
  <section class="download-hero">
    <div class="w">
      <div class="r">
        <div class="badge" style="margin-bottom:16px">下载</div>
        <h1 class="display" style="margin-bottom:16px;background:linear-gradient(135deg,var(--text) 0%,var(--gold-light) 50%,var(--gold) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">下载工坊</h1>
        <p class="p" style="font-size:16px">免费 · 开源 · Windows 64位</p>
      </div>
    </div>
  </section>

  <div class="w-narrow">
    <?php if($latest):?>
    <div class="r surface download-card" style="margin-bottom:40px">
      <div class="badge" style="margin-bottom:16px">Latest</div>
      <div class="display-md" style="margin-bottom:12px">v<?php echo h($latest['version']);?></div>
      <?php if($latest['description']):?><p class="p" style="margin-bottom:24px;max-width:400px;margin-left:auto;margin-right:auto"><?php echo h($latest['description']);?></p><?php endif;?>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-bottom:32px;font-size:13px;color:var(--text-muted)">
        <span style="display:flex;align-items:center;gap:4px">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="8" height="8" rx="1"/><path d="M5 2v8M2 5h8"/></svg>
          SMAPI 3.18+
        </span>
        <?php if($latest['file_size']):?>
        <span style="display:flex;align-items:center;gap:4px">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v8m0 0l-3-3m3 3l3-3"/><path d="M2 8v2a1 1 0 001 1h6a1 1 0 001-1V8"/></svg>
          <?php echo h($latest['file_size']);?>
        </span>
        <?php endif;?>
        <span style="display:flex;align-items:center;gap:4px">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="5"/><path d="M4 6l2 2 2-2"/></svg>
          MIT
        </span>
      </div>
      <a href="<?php echo h($latest['download_url']);?>" target="_blank" class="btn btn-p btn-lg">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v10m0 0l-3-3m3 3l3-3"/><path d="M2 12v2a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
        下载 v<?php echo h($latest['version']);?>
      </a>
    </div>

    <?php if(count($versions)>1):?>
    <div class="r" style="margin-bottom:40px">
      <div class="label" style="margin-bottom:16px">历史版本</div>
      <?php foreach($versions as $v):if($v['is_latest'])continue;?>
      <div class="version-item">
        <div class="version-info">
          <span class="version-num">v<?php echo h($v['version']);?></span>
          <span class="version-meta"><?php echo h($v['platform']);?></span>
        </div>
        <div class="version-actions">
          <?php if($v['changelog']):?>
          <button onclick="alert('<?php echo str_replace(["'","\n","\r"],["\\'","\\n",''],strip_tags($v['changelog']));?>')" class="version-log">日志</button>
          <?php endif;?>
          <a href="<?php echo h($v['download_url']);?>" target="_blank" class="version-dl">下载</a>
        </div>
      </div>
      <?php endforeach;?>
    </div>
    <?php endif;?>
    <?php else:?>
    <div class="r surface download-card">
      <p class="p" style="margin-bottom:24px">暂无发布版本</p>
      <a href="https://github.com/fantuan9234/fantuan-workshop/releases" target="_blank" class="btn btn-p">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        前往 GitHub 下载
      </a>
    </div>
    <?php endif;?>
  </div>
</div>
<?php require_once __DIR__.'/footer.php';?>