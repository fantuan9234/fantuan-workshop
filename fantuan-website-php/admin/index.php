<?php
defined('ADMIN_LAYOUT') || define('ADMIN_LAYOUT', true);
require_once __DIR__ . '/../backend/db.php';
$db = getDB();

$announcementCount = $db->query("SELECT COUNT(*) FROM announcements")->fetchColumn();
$contactCount = $db->query("SELECT COUNT(*) FROM contacts")->fetchColumn();
$versionCount = $db->query("SELECT COUNT(*) FROM versions")->fetchColumn();
$unreadCount = $db->query("SELECT COUNT(*) FROM contacts WHERE is_read = 0")->fetchColumn();
$latestVersion = $db->query("SELECT * FROM versions WHERE is_latest = 1 LIMIT 1")->fetch();
$recentContacts = $db->query("SELECT * FROM contacts ORDER BY id DESC LIMIT 5")->fetchAll();
?>
<div>
    <h1 style="font-size:24px;font-weight:700;margin-bottom:24px;">仪表盘</h1>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:32px;">
        <div class="card">
            <div style="font-size:13px;color:var(--text2);margin-bottom:8px;">已发布版本</div>
            <div style="font-size:32px;font-weight:700;"><?php echo $versionCount; ?></div>
            <?php if ($latestVersion): ?>
            <div style="font-size:13px;color:var(--text2);margin-top:4px;">最新: v<?php echo h($latestVersion['version']); ?></div>
            <?php endif; ?>
        </div>
        <div class="card">
            <div style="font-size:13px;color:var(--text2);margin-bottom:8px;">公告</div>
            <div style="font-size:32px;font-weight:700;"><?php echo $announcementCount; ?></div>
        </div>
        <div class="card">
            <div style="font-size:13px;color:var(--text2);margin-bottom:8px;">消息</div>
            <div style="font-size:32px;font-weight:700;"><?php echo $contactCount; ?></div>
            <div style="font-size:13px;color:var(--text2);margin-top:4px;">未读: <?php echo $unreadCount; ?></div>
        </div>
        <div class="card" style="border-color:rgba(212,168,67,0.3);">
            <div style="font-size:13px;color:var(--text2);margin-bottom:8px;">版本更新</div>
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:14px;"><?php echo $latestVersion ? 'v' . h($latestVersion['version']) : '无'; ?></span>
                <span class="badge badge-green">Latest</span>
            </div>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="card">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">最近消息</h3>
            <?php if ($recentContacts): ?>
            <?php foreach ($recentContacts as $c): ?>
            <div style="padding:10px 0;border-bottom:1px solid var(--border);<?php echo !$c['is_read'] ? 'border-left:3px solid var(--brand);padding-left:12px;' : ''; ?>">
                <div style="font-weight:500;font-size:14px;"><?php echo h($c['subject'] ?: '(无主题)'); ?></div>
                <div style="font-size:12px;color:var(--text2);margin-top:4px;"><?php echo h($c['name']); ?> · <?php echo format_cn($c['created_at']); ?></div>
            </div>
            <?php endforeach; ?>
            <?php else: ?>
            <p style="color:var(--text2);font-size:14px;">暂无消息</p>
            <?php endif; ?>
        </div>
        <div class="card">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">快速操作</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div onclick="loadPage('announcements')" style="cursor:pointer;padding:16px;border-radius:10px;background:rgba(255,255,255,0.03);text-align:center;transition:background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                    <div style="font-size:24px;margin-bottom:6px;">📢</div>
                    <div style="font-size:13px;">发布公告</div>
                </div>
                <div onclick="loadPage('versions')" style="cursor:pointer;padding:16px;border-radius:10px;background:rgba(255,255,255,0.03);text-align:center;transition:background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                    <div style="font-size:24px;margin-bottom:6px;">⬇️</div>
                    <div style="font-size:13px;">发布版本</div>
                </div>
                <div onclick="loadPage('contacts')" style="cursor:pointer;padding:16px;border-radius:10px;background:rgba(255,255,255,0.03);text-align:center;transition:background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                    <div style="font-size:24px;margin-bottom:6px;">✉️</div>
                    <div style="font-size:13px;">查看消息</div>
                </div>
                <div onclick="loadPage('settings')" style="cursor:pointer;padding:16px;border-radius:10px;background:rgba(255,255,255,0.03);text-align:center;transition:background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                    <div style="font-size:24px;margin-bottom:6px;">⚙️</div>
                    <div style="font-size:13px;">修改密码</div>
                </div>
            </div>
        </div>
    </div>
</div>