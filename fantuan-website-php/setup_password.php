<?php
/**
 * 一次性密码设置脚本 - 运行后请删除此文件！
 */
require_once __DIR__ . '/backend/config.php';
require_once __DIR__ . '/backend/db.php';
initDatabase();

$db = getDB();
$newPassword = 'wangjunhao9234';
$hash = password_hash($newPassword, PASSWORD_BCRYPT);

// 更新数据库中的密码
$db->prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password_hash', ?)")->execute([$hash]);

// 同时更新 config.php 中的默认哈希（供新安装使用）
$configFile = __DIR__ . '/backend/config.php';
$configContent = file_get_contents($configFile);
$configContent = str_replace(
    "define('ADMIN_DEFAULT_PASSWORD_HASH', '');",
    "define('ADMIN_DEFAULT_PASSWORD_HASH', '" . addslashes($hash) . "');",
    $configContent
);
file_put_contents($configFile, $configContent);

?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>密码设置成功</title>
    <style>
        body{font-family:system-ui;background:#0c0c0e;color:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
        .box{background:#141416;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:40px;text-align:center;max-width:400px}
        h1{color:#22c55e;margin-bottom:12px}
        p{color:#999;font-size:14px;line-height:1.6}
        .pw{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 16px;font-family:monospace;font-size:16px;color:#d4a843;margin:16px 0}
        a{color:#d4a843;text-decoration:none}
        .warn{color:#f43f5e;font-size:13px;margin-top:20px}
    </style>
</head>
<body>
    <div class="box">
        <h1>✓ 密码已设置</h1>
        <p>新密码：</p>
        <div class="pw">wangjunhao9234</div>
        <p>用户名：<strong>admin</strong></p>
        <p><a href="/admin/login.php">→ 前往登录</a></p>
        <p class="warn">⚠️ 请立即删除此文件 (setup_password.php)</p>
    </div>
</body>
</html>
