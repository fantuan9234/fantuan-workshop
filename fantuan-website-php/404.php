<?php $pageTitle='404';require_once __DIR__.'/header.php';?>
<style>
.error-page{min-height:80vh;display:flex;align-items:center;justify-content:center;padding:120px 0 60px;position:relative;overflow:hidden}
.error-page::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(220,180,60,0.06) 0%,transparent 70%);pointer-events:none;animation:pulse 6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}

.error-code{font-family:var(--font-display);font-size:clamp(80px,15vw,160px);font-weight:800;letter-spacing:-0.05em;line-height:1;background:linear-gradient(135deg,rgba(220,180,60,0.15) 0%,rgba(220,180,60,0.05) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:16px}
.error-text{font-size:18px;color:var(--text-dim);margin-bottom:32px}

@media(max-width:768px){
  .error-page{padding:100px 0 40px}
}
</style>

<div class="error-page">
  <div class="r" style="text-align:center;position:relative;z-index:1">
    <div class="error-code">404</div>
    <p class="error-text">没有这个页面</p>
    <a href="/" class="btn btn-p btn-lg">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8l5 5L14 3"/></svg>
      回首页
    </a>
  </div>
</div>
<?php require_once __DIR__.'/footer.php';?>