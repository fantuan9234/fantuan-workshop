</main>

<style>
/* footer */
.footer{border-top:1px solid var(--border);margin-top:100px;position:relative;overflow:hidden}
.footer::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:600px;height:1px;background:linear-gradient(90deg,transparent,var(--gold-dim),transparent)}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px}
.footer-brand{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.footer-brand-mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--gold),var(--accent));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#0a0a0f;box-shadow:0 2px 12px rgba(220,180,60,0.2)}
.footer-brand-text{font-weight:700;font-size:17px}
.footer-desc{font-size:14px;color:var(--text-dim);line-height:1.7;max-width:300px;margin-bottom:20px}
.footer-social{display:flex;gap:8px}
.footer-social a{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:var(--bg-alt);border:1px solid var(--border);color:var(--text-muted);text-decoration:none;font-size:12px;font-weight:600;transition:all var(--transition-fast)}
.footer-social a:hover{transform:translateY(-2px);box-shadow:var(--shadow-sm)}
.footer-section-title{font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);margin-bottom:16px}
.footer-links{display:flex;flex-direction:column;gap:8px}
.footer-link{color:var(--text-dim);text-decoration:none;font-size:14px;transition:all var(--transition-fast);position:relative;padding-left:0}
.footer-link:hover{color:var(--gold);padding-left:4px}
.footer-link::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:0;height:1px;background:var(--gold);transition:width var(--transition-fast)}
.footer-link:hover::before{width:8px}
.footer-bottom{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;padding-top:24px;border-top:1px solid var(--border)}
.footer-copy{font-size:13px;color:var(--text-muted)}
.footer-note{font-size:13px;color:var(--text-muted);text-align:right}

/* responsive */
@media(max-width:768px){
  .footer-grid{grid-template-columns:1fr 1fr;gap:32px}
  .footer-brand{grid-column:span 2}
  .footer-bottom{flex-direction:column;text-align:center}
  .footer-note{text-align:center}
}
@media(max-width:480px){
  .footer-grid{grid-template-columns:1fr}
  .footer-brand{grid-column:span 1}
}
</style>

<footer class="footer">
  <div class="w" style="padding-top:64px;padding-bottom:32px">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <img src="/assets/images/favicon.png" alt="" class="footer-brand-mark" style="object-fit:cover">
          <span class="footer-brand-text">饭团工坊</span>
        </div>
        <p class="footer-desc">星露谷物语模组制作工具。可视化编辑 NPC、事件、物品、地图。</p>
        <div class="footer-social">
          <a href="https://space.bilibili.com/3546621436496190" target="_blank" title="B站" onmouseover="this.style.color='#fb7299';this.style.borderColor='rgba(251,114,153,0.3)'" onmouseout="this.style.color='';this.style.borderColor=''">B</a>
          <a href="https://www.douyin.com/user/self?from_tab_name=main" target="_blank" title="抖音" onmouseover="this.style.color='#00f2ea';this.style.borderColor='rgba(0,242,234,0.3)'" onmouseout="this.style.color='';this.style.borderColor=''">抖</a>
          <a href="https://github.com/fantuan9234/fantuan-workshop" target="_blank" title="GitHub" onmouseover="this.style.color='var(--text)';this.style.borderColor='var(--border-light)'" onmouseout="this.style.color='';this.style.borderColor=''">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
        </div>
      </div>
      <div>
        <div class="footer-section-title">导航</div>
        <div class="footer-links">
          <?php foreach([['features.php','工具'],['download.php','下载'],['docs.php','手册'],['blog.php','日志'],['about.php','关于']] as $lk):?><a href="/<?php echo $lk[0];?>" class="footer-link"><?php echo $lk[1];?></a><?php endforeach;?>
        </div>
      </div>
      <div>
        <div class="footer-section-title">相关</div>
        <div class="footer-links">
          <a href="https://stardewvalleywiki.com" target="_blank" class="footer-link">星露谷 Wiki</a>
          <a href="https://nexusmods.com/stardewvalley" target="_blank" class="footer-link">Nexus Mods</a>
          <a href="https://github.com/Pathoschild/SMAPI" target="_blank" class="footer-link">SMAPI</a>
        </div>
      </div>
      <div>
        <div class="footer-section-title">支持</div>
        <div class="footer-links">
          <a href="/docs.php" class="footer-link">使用手册</a>
          <a href="https://github.com/fantuan9234/fantuan-workshop/issues" target="_blank" class="footer-link">提交问题</a>
          <a href="/about.php" class="footer-link">关于我们</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="footer-copy">&copy; <?php echo date('Y');?> 饭团工坊 · MIT 许可证</span>
      <span class="footer-note">非官方粉丝项目 · Stardew Valley &copy; ConcernedApe</span>
    </div>
  </div>
</footer>

</body>
</html>