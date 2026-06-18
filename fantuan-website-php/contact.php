<?php
$pageTitle='联系';
require_once __DIR__.'/backend/db.php';initDatabase();
require_once __DIR__.'/header.php';
$done=false;
if($_SERVER['REQUEST_METHOD']==='POST'){
  require_once __DIR__.'/backend/security.php';
  if(!rateLimit('contact',5,300)){$err='频繁';}
  else{$n=trim($_POST['name']??'');$e=trim($_POST['email']??'');$s=trim($_POST['subject']??'');$m=trim($_POST['message']??'');
  if($n&&$e&&$s&&$m){getDB()->prepare("INSERT INTO contacts(name,email,subject,message)VALUES(?,?,?,?)")->execute([$n,$e,$s,$m]);$done=true;}else{$err='请填写全部';}}
}
?>
<style>
.contact-hero{padding:120px 0 60px;text-align:center;position:relative;overflow:hidden}
.contact-hero::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:500px;height:500px;background:radial-gradient(circle,rgba(220,180,60,0.06) 0%,transparent 70%);pointer-events:none;animation:pulse 6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}

.contact-card{padding:40px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);position:relative;overflow:hidden}
.contact-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}

.form-group{margin-bottom:20px}
.form-label{display:block;font-size:13px;font-weight:500;color:var(--text-dim);margin-bottom:6px}
.form-input{width:100%;padding:12px 16px;background:var(--bg-alt);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:15px;font-family:inherit;outline:none;transition:all var(--transition-fast)}
.form-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(220,180,60,0.1)}
.form-input::placeholder{color:var(--text-muted)}
textarea.form-input{resize:vertical;min-height:120px}

.form-error{padding:12px 16px;background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.15);border-radius:var(--radius);color:#f43f5e;font-size:14px;margin-bottom:20px;display:flex;align-items:center;gap:8px}

.form-success{text-align:center;padding:64px 32px}
.form-success-icon{width:64px;height:64px;border-radius:50%;background:var(--gold-dim);border:2px solid rgba(220,180,60,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;color:var(--gold)}

@media(max-width:768px){
  .contact-hero{padding:100px 0 40px}
  .contact-card{padding:28px 24px}
}
</style>

<div>
  <section class="contact-hero">
    <div class="w">
      <div class="r">
        <div class="badge" style="margin-bottom:16px">联系</div>
        <h1 class="display" style="margin-bottom:16px;background:linear-gradient(135deg,var(--text) 0%,var(--gold-light) 50%,var(--gold) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">联系我们</h1>
        <p class="p" style="font-size:16px">有任何问题或建议，欢迎与我们联系</p>
      </div>
    </div>
  </section>

  <div class="w-narrow">
    <?php if($done):?>
    <div class="contact-card r">
      <div class="form-success">
        <div class="form-success-icon">✓</div>
        <h2 class="display-md" style="font-size:24px;margin-bottom:8px">发送成功</h2>
        <p class="p">感谢您的反馈，我们会尽快回复。</p>
      </div>
    </div>
    <?php else:?>
    <div class="contact-card r">
      <?php if(isset($err)):?>
      <div class="form-error">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 10v.5"/></svg>
        <?php echo h($err);?>
      </div>
      <?php endif;?>
      
      <form method="post">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group">
            <label class="form-label">姓名</label>
            <input type="text" name="name" required class="form-input" placeholder="请输入您的姓名">
          </div>
          <div class="form-group">
            <label class="form-label">邮箱</label>
            <input type="email" name="email" required class="form-input" placeholder="请输入您的邮箱">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">主题</label>
          <input type="text" name="subject" required class="form-input" placeholder="请输入主题">
        </div>
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea name="message" rows="4" required class="form-input" placeholder="请输入您想说的话..."></textarea>
        </div>
        <button type="submit" class="btn btn-p btn-lg" style="width:100%;justify-content:center">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8l5 5L14 3"/></svg>
          发送消息
        </button>
      </form>
    </div>
    <?php endif;?>
  </div>
</div>
<?php require_once __DIR__.'/footer.php';?>