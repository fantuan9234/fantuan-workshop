<?php
require_once __DIR__ . '/../backend/auth.php';
require_once __DIR__ . '/../backend/db.php';
initDatabase();

if (isLoggedIn()) {
    header('Location: ' . SITE_URL . '/admin/layout.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    if ($username === ADMIN_USERNAME && login($username, $password)) {
        header('Location: ' . SITE_URL . '/admin/layout.php');
        exit;
    }
    $error = isLoginBlocked() ? '登录尝试次数过多，请 15 分钟后再试' : '用户名或密码错误';
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台 - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        :root { --bg:#0c0c0e; --surface:#141416; --border:rgba(255,255,255,0.06); --text:#f0f0f0; --text2:#999; --brand:#d4a843; }
        body { font-family: 'Outfit','Noto Sans SC',sans-serif; background:var(--bg); color:var(--text); min-height:100vh; display:flex; align-items:center; justify-content:center; }
        .login-box { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:40px; width:400px; max-width:90vw; }
        input { width:100%; padding:12px 16px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:10px; color:#fff; font-size:14px; outline:none; transition:border-color 0.3s; }
        input:focus { border-color:var(--brand); }
        .btn { width:100%; padding:12px; background:var(--brand); color:#0c0c0e; font-weight:600; border:none; border-radius:10px; cursor:pointer; font-size:15px; transition:opacity 0.3s; }
        .btn:hover { opacity:0.9; }
    </style>
</head>
<body>
    <div class="login-box">
        <div style="text-align:center;margin-bottom:28px;">
            <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#d4a843,#b08020);display:flex;align-items:center;justify-content:center;font-weight:bold;color:#0c0c0e;margin:0 auto 12px;">饭</div>
            <h1 style="font-size:20px;font-weight:700;">管理后台</h1>
            <p style="color:var(--text2);font-size:13px;margin-top:4px;">请登录以继续</p>
        </div>
        <?php if ($error): ?>
        <div style="padding:10px 12px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.2);border-radius:8px;color:#f43f5e;font-size:13px;margin-bottom:16px;"><?php echo h($error); ?></div>
        <?php endif; ?>
        <form method="post">
            <div style="margin-bottom:16px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">用户名</label>
                <input type="text" name="username" value="admin" required>
            </div>
            <div style="margin-bottom:24px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">密码</label>
                <input type="password" name="password" required>
            </div>
            <button type="submit" class="btn">登录</button>
        </form>
    </div>
</body>
</html>
