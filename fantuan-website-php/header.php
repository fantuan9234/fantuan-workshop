<?php
require_once __DIR__ . '/backend/config.php';
require_once __DIR__ . '/backend/security.php';
sendSecurityHeaders();
?><!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?php echo isset($pageTitle)&&$pageTitle!=='首页'?h($pageTitle).' - ':''; ?><?php echo SITE_NAME; ?></title>
<meta name="description" content="<?php echo isset($pageDesc)?h($pageDesc):'饭团工坊 - 星露谷物语模组制作工具'; ?>">
<link rel="icon" type="image/png" href="/assets/images/favicon.png">
<link rel="canonical" href="<?php echo SITE_URL.$_SERVER['REQUEST_URI']; ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
/* ── reset ── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{font-family:'DM Sans','Noto Sans SC',system-ui,sans-serif;background:#0a0a0f;color:#e8e8ed;min-height:100vh;line-height:1.65;overflow-x:hidden;letter-spacing:0.01em}
::selection{background:rgba(220,180,60,0.3);color:#f0e0a0}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:#0a0a0f}
::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#dcb43c,#a07820);border-radius:3px}

/* ── variables ── */
:root{
  --bg:#0a0a0f;--bg-alt:#0f0f16;--bg-card:#13131c;--bg-elevated:#1a1a26;
  --border:rgba(255,255,255,0.06);--border-light:rgba(255,255,255,0.12);--border-gold:rgba(220,180,60,0.2);
  --text:#eaeaf0;--text-dim:#9898aa;--text-muted:#606072;
  --gold:#dcb43c;--gold-light:#f0d060;--gold-dim:rgba(220,180,60,0.10);--gold-glow:rgba(220,180,60,0.06);
  --accent:#c49a2c;
  --radius:12px;--radius-lg:20px;--radius-xl:28px;
  --transition:0.45s cubic-bezier(0.22,1,0.36,1);--transition-fast:0.25s cubic-bezier(0.22,1,0.36,1);
  --shadow-sm:0 2px 8px rgba(0,0,0,0.2);--shadow-md:0 8px 32px rgba(0,0,0,0.3);--shadow-lg:0 16px 64px rgba(0,0,0,0.4);
  --font-display:'Playfair Display','Noto Serif SC',serif;
  --font-body:'DM Sans','Noto Sans SC',system-ui,sans-serif;
}

/* ── typography ── */
.display{font-family:var(--font-display);font-size:clamp(44px,8vw,80px);font-weight:700;line-height:1.05;letter-spacing:-0.03em}
.display-md{font-family:var(--font-display);font-size:clamp(26px,4.5vw,44px);font-weight:600;line-height:1.1;letter-spacing:-0.02em}
.h3{font-family:var(--font-body);font-size:17px;font-weight:600;letter-spacing:-0.01em}
.p{font-size:15px;color:var(--text-dim);line-height:1.75}
.p-sm{font-size:13px;color:var(--text-muted);line-height:1.6}
.label{font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold)}
.badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;background:var(--gold-dim);color:var(--gold);border:1px solid rgba(220,180,60,0.15)}
.link{color:var(--text-dim);text-decoration:none;transition:color var(--transition-fast);font-size:14px;position:relative}
.link:hover{color:var(--gold)}
.link::after{content:'';position:absolute;bottom:-2px;left:0;width:0;height:1px;background:var(--gold);transition:width var(--transition-fast)}
.link:hover::after{width:100%}

/* ── container ── */
.w{max-width:1240px;margin:0 auto;padding:0 32px}
.w-narrow{max-width:760px;margin:0 auto;padding:0 32px}
.section{padding:140px 0}
.section-sm{padding:72px 0}

/* ── nav ── */
.nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:0 32px;height:72px;display:flex;align-items:center;justify-content:center;transition:all var(--transition)}
.nav-inner{width:100%;max-width:1240px;display:flex;align-items:center;justify-content:space-between}
.nav.scrolled{background:rgba(10,10,15,0.92);backdrop-filter:blur(24px) saturate(1.2);-webkit-backdrop-filter:blur(24px) saturate(1.2);border-bottom:1px solid var(--border);height:64px;box-shadow:0 4px 24px rgba(0,0,0,0.2)}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text);font-weight:700;font-size:16px;transition:all var(--transition-fast)}
.nav-logo:hover{transform:translateY(-1px)}
.nav-logo-mark{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--gold),var(--accent));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#0a0a0f;box-shadow:0 2px 12px rgba(220,180,60,0.25);transition:all var(--transition-fast)}
.nav-logo:hover .nav-logo-mark{box-shadow:0 4px 20px rgba(220,180,60,0.35);transform:scale(1.05)}
.nav-l{display:flex;align-items:center;gap:4px}
.nav-l a{padding:8px 14px;border-radius:8px;color:var(--text-dim);text-decoration:none;font-size:13px;font-weight:500;transition:all var(--transition-fast);position:relative}
.nav-l a:hover{color:var(--text);background:rgba(255,255,255,0.04)}
.nav-l a.active{color:var(--gold);background:var(--gold-dim)}
.nav-social{display:flex;align-items:center;gap:2px;margin-left:8px;padding-left:12px;border-left:1px solid var(--border)}
.nav-social a{padding:6px 8px;border-radius:6px;color:var(--text-muted);text-decoration:none;font-size:12px;transition:all var(--transition-fast);display:inline-flex;align-items:center}
.nav-social a:hover{transform:translateY(-1px)}

/* ── buttons ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 32px;font-size:14px;font-weight:600;border-radius:var(--radius);cursor:pointer;text-decoration:none;border:none;transition:all var(--transition);font-family:var(--font-body);position:relative;overflow:hidden}
.btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.1),transparent);opacity:0;transition:opacity var(--transition-fast)}
.btn:hover::before{opacity:1}
.btn:active{transform:scale(0.97)}
.btn-p{background:linear-gradient(135deg,var(--gold),var(--accent));color:#0a0a0f;box-shadow:0 4px 24px rgba(220,180,60,0.25),inset 0 1px 0 rgba(255,255,255,0.15)}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 8px 40px rgba(220,180,60,0.35),inset 0 1px 0 rgba(255,255,255,0.2)}
.btn-o{background:transparent;color:var(--text);border:1px solid var(--border-light);backdrop-filter:blur(8px)}
.btn-o:hover{border-color:var(--border-gold);background:var(--gold-dim);color:var(--gold);transform:translateY(-2px);box-shadow:0 4px 20px rgba(220,180,60,0.1)}
.btn-gh{padding:8px 14px;color:var(--text-dim);background:transparent;font-size:13px;border-radius:8px}
.btn-gh:hover{color:var(--text);background:rgba(255,255,255,0.04)}
.btn-lg{padding:16px 40px;font-size:15px;border-radius:14px}

/* ── surface ── */
.surface{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);transition:all var(--transition);position:relative;overflow:hidden}
.surface::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(220,180,60,0.2),transparent);opacity:0;transition:opacity var(--transition)}
.surface:hover{border-color:var(--border-gold);box-shadow:var(--shadow-md)}
.surface:hover::before{opacity:1}

/* ── line ── */
.line{height:1px;background:linear-gradient(90deg,transparent,var(--border-light),var(--gold-dim),var(--border-light),transparent)}

/* ── reveal ── */
.r{opacity:0;transform:translateY(32px);transition:all 0.8s cubic-bezier(0.22,1,0.36,1)}
.r.v{opacity:1;transform:translateY(0)}
.r1{transition-delay:0.06s}.r2{transition-delay:0.12s}.r3{transition-delay:0.2s}.r4{transition-delay:0.28s}

/* ── grid ── */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.ga{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}

/* ── glow effects ── */
.glow-gold{position:relative}
.glow-gold::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:200%;height:200%;background:radial-gradient(circle,rgba(220,180,60,0.06) 0%,transparent 60%);pointer-events:none;opacity:0;transition:opacity var(--transition)}
.glow-gold:hover::after{opacity:1}

/* ── mobile nav ── */
.nav-toggle{display:none;background:none;border:none;color:var(--text);cursor:pointer;padding:8px;border-radius:8px;transition:all var(--transition-fast)}
.nav-toggle:hover{background:rgba(255,255,255,0.04)}
@media(max-width:768px){
  .nav-toggle{display:flex}
  .nav-l{position:fixed;top:72px;left:0;right:0;background:rgba(10,10,15,0.98);backdrop-filter:blur(24px);border-bottom:1px solid var(--border);flex-direction:column;padding:16px;gap:4px;transform:translateY(-100%);opacity:0;pointer-events:none;transition:all var(--transition)}
  .nav-l.open{transform:translateY(0);opacity:1;pointer-events:auto}
  .nav-social{border-left:none;padding-left:0;margin-left:0;padding-top:12px;border-top:1px solid var(--border);width:100%;justify-content:center}
  .g2,.g3{grid-template-columns:1fr}
  .section{padding:80px 0}
  .section-sm{padding:48px 0}
  .w{padding:0 20px}
  .display{font-size:clamp(36px,10vw,56px)}
}
@media(min-width:769px)and (max-width:1024px){
  .display{font-size:clamp(40px,7vw,64px)}
  .section{padding:100px 0}
}
</style>
</head>
<body>

<nav class="nav" id="nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo"><img src="/assets/images/favicon.png" alt="" class="nav-logo-mark" style="object-fit:cover">饭团工坊</a>
    <button class="nav-toggle" id="navToggle" aria-label="菜单">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h14M3 10h14M3 14h14"/></svg>
    </button>
    <div class="nav-l" id="navLinks">
      <a href="/" class="<?php echo basename($_SERVER['PHP_SELF'])==='index.php'?'active':''; ?>">首页</a>
      <a href="/features.php" class="<?php echo basename($_SERVER['PHP_SELF'])==='features.php'?'active':''; ?>">工具</a>
      <a href="/download.php" class="<?php echo basename($_SERVER['PHP_SELF'])==='download.php'?'active':''; ?>">下载</a>
      <a href="/docs.php" class="<?php echo basename($_SERVER['PHP_SELF'])==='docs.php'||basename($_SERVER['PHP_SELF'])==='doc-detail.php'?'active':''; ?>">手册</a>
      <a href="/blog.php" class="<?php echo basename($_SERVER['PHP_SELF'])==='blog.php'||basename($_SERVER['PHP_SELF'])==='blog-detail.php'?'active':''; ?>">日志</a>
      <a href="/about.php" class="<?php echo basename($_SERVER['PHP_SELF'])==='about.php'?'active':''; ?>">关于</a>
      <div class="nav-social">
        <a href="https://space.bilibili.com/3546621436496190" target="_blank" title="B站" onmouseover="this.style.color='#fb7299'" onmouseout="this.style.color=''">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.124.929.373.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/></svg>
        </a>
        <a href="https://www.douyin.com/user/self?from_tab_name=main" target="_blank" title="抖音" onmouseover="this.style.color='#00f2ea'" onmouseout="this.style.color=''">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.16 8.16 0 005.58 2.2v-3.45a4.85 4.85 0 01-3.77-1.54V6.69h3.77z"/></svg>
        </a>
        <a href="https://github.com/fantuan9234/fantuan-workshop" target="_blank" title="GitHub" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color=''">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        </a>
      </div>
    </div>
  </div>
</nav>

<script>
(function(){
  var n=document.getElementById('nav'),t=document.getElementById('navToggle'),l=document.getElementById('navLinks');
  window.addEventListener('scroll',function(){n.classList.toggle('scrolled',window.scrollY>40)});
  if(t){t.addEventListener('click',function(){l.classList.toggle('open')})}
  document.addEventListener('DOMContentLoaded',function(){
    var o=new IntersectionObserver(function(e){e.forEach(function(e){if(e.isIntersecting)e.target.classList.add('v')})},{threshold:0.08,rootMargin:'0px 0px -40px 0px'});
    document.querySelectorAll('.r').forEach(function(e){o.observe(e)});
    document.querySelectorAll('.r').forEach(function(e,i){e.style.transitionDelay=(i%4)*0.08+'s'});
  });
})();
</script>
<main>