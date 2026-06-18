<?php
defined('ADMIN_LAYOUT') || define('ADMIN_LAYOUT', true);
require_once __DIR__ . '/../backend/auth.php';
require_once __DIR__ . '/../backend/db.php';
$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    if ($_POST['action'] === 'change_password') {
        $current = $_POST['current_password'] ?? '';
        $new = $_POST['new_password'] ?? '';
        $confirm = $_POST['confirm_password'] ?? '';

        if (password_verify($current, getAdminPasswordHash())) {
            if ($new === $confirm && strlen($new) >= 6) {
                updateAdminPassword($new);
                echo '<div style="padding:12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;color:#22c55e;margin-bottom:16px;">✅ 密码已更新</div>';
            } else {
                echo '<div style="padding:12px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.2);border-radius:8px;color:#f43f5e;margin-bottom:16px;">❌ 密码不匹配或长度不足6位</div>';
            }
        } else {
            echo '<div style="padding:12px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.2);border-radius:8px;color:#f43f5e;margin-bottom:16px;">❌ 当前密码错误</div>';
        }
    }
}

$stats = [
    'announcements' => $db->query("SELECT COUNT(*) FROM announcements")->fetchColumn(),
    'versions' => $db->query("SELECT COUNT(*) FROM versions")->fetchColumn(),
    'contacts' => $db->query("SELECT COUNT(*) FROM contacts")->fetchColumn(),
    'unread' => $db->query("SELECT COUNT(*) FROM contacts WHERE is_read = 0")->fetchColumn(),
];
?>
<div>
    <h1 style="font-size:24px;font-weight:700;margin-bottom:24px;">设置</h1>

    <div class="card" style="margin-bottom:20px;">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;">站点信息</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div><span style="color:var(--text2);font-size:13px;">站点名称</span><br><?php echo SITE_NAME; ?></div>
            <div><span style="color:var(--text2);font-size:13px;">站点地址</span><br><?php echo SITE_URL; ?></div>
            <div><span style="color:var(--text2);font-size:13px;">数据版本</span><br><?php echo $stats['versions']; ?> 个版本 · <?php echo $stats['announcements']; ?> 个公告</div>
            <div><span style="color:var(--text2);font-size:13px;">消息</span><br><?php echo $stats['contacts']; ?> 条 · <?php echo $stats['unread']; ?> 条未读</div>
        </div>
    </div>

    <div class="card">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">修改密码</h3>
        <form method="post" data-ajax="settings" style="max-width:400px;">
            <?php echo csrfField(); ?>
            <input type="hidden" name="action" value="change_password">
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">当前密码</label>
                <input type="password" name="current_password" required>
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">新密码</label>
                <input type="password" name="new_password" required minlength="6">
            </div>
            <div style="margin-bottom:20px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">确认新密码</label>
                <input type="password" name="confirm_password" required minlength="6">
            </div>
            <button type="submit" class="btn btn-primary">修改密码</button>
        </form>
    </div>
</div>