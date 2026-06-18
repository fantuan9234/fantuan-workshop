<?php
defined('ADMIN_LAYOUT') || define('ADMIN_LAYOUT', true);
require_once __DIR__ . '/../backend/auth.php';
require_once __DIR__ . '/../backend/db.php';
$db = getDB();

// 标记已读
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'mark_read') {
    requireCsrf();
    $stmt = $db->prepare("UPDATE contacts SET is_read = 1 WHERE id = ?");
    $stmt->execute([(int)$_POST['id']]);
}

// 删除
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete') {
    requireCsrf();
    $db->prepare("DELETE FROM contacts WHERE id = ?")->execute([(int)$_POST['id']]);
    echo '<div style="padding:12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;color:#22c55e;margin-bottom:16px;">✅ 消息已删除</div>';
}

$filter = $_GET['filter'] ?? 'all';
if ($filter === 'unread') {
    $contacts = $db->query("SELECT * FROM contacts WHERE is_read = 0 ORDER BY id DESC")->fetchAll();
} else {
    $contacts = $db->query("SELECT * FROM contacts ORDER BY id DESC")->fetchAll();
}
?>
<div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <h1 style="font-size:24px;font-weight:700;">消息管理</h1>
        <div style="display:flex;gap:8px;">
            <a href="#" data-load-page="contacts" class="btn btn-ghost">全部</a>
            <a href="#" data-load-page="contacts&filter=unread" class="btn btn-ghost">未读</a>
        </div>
    </div>

    <?php if ($contacts): ?>
    <div class="card" style="overflow:hidden;padding:0;">
        <table>
            <thead>
                <tr><th>姓名</th><th>邮箱</th><th>主题</th><th>状态</th><th>时间</th><th>操作</th></tr>
            </thead>
            <tbody>
                <?php foreach ($contacts as $c): ?>
                <tr style="<?php echo !$c['is_read'] ? 'background:rgba(212,168,67,0.03);' : ''; ?>">
                    <td style="font-weight:500;"><?php echo h($c['name']); ?></td>
                    <td style="color:var(--text2);font-size:13px;"><?php echo h($c['email']); ?></td>
                    <td><?php echo h(mb_substr($c['subject'] ?: '(无主题)', 0, 30)); ?></td>
                    <td><?php echo $c['is_read'] ? '<span class="badge badge-green">已读</span>' : '<span class="badge badge-yellow">未读</span>'; ?></td>
                    <td style="color:var(--text2);font-size:13px;"><?php echo format_cn($c['created_at']); ?></td>
                    <td>
                        <button class="btn btn-ghost" onclick="showContactDetail(<?php echo $c['id']; ?>)">查看</button>
                        <?php if (!$c['is_read']): ?>
                        <form method="post" data-ajax="contacts" style="display:inline;">
                            <?php echo csrfField(); ?>
                            <input type="hidden" name="id" value="<?php echo $c['id']; ?>">
                            <input type="hidden" name="action" value="mark_read">
                            <button type="submit" class="btn btn-ghost" style="padding:4px 12px;">标为已读</button>
                        </form>
                        <?php endif; ?>
                        <form method="post" data-ajax="contacts" style="display:inline;" onsubmit="return confirm('确定删除？')">
                            <?php echo csrfField(); ?>
                            <input type="hidden" name="id" value="<?php echo $c['id']; ?>">
                            <input type="hidden" name="action" value="delete">
                            <button type="submit" class="btn btn-danger" style="padding:4px 12px;">删除</button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php else: ?>
    <div class="card" style="text-align:center;padding:48px;">
        <p style="color:var(--text2);"><?php echo $filter === 'unread' ? '没有未读消息' : '暂无消息'; ?></p>
    </div>
    <?php endif; ?>
</div>

<div id="contactModal" class="modal-overlay" style="display:none;">
    <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="font-size:18px;font-weight:600;">消息详情</h3>
            <button data-close-modal style="background:none;border:none;color:var(--text2);font-size:20px;cursor:pointer;">✕</button>
        </div>
        <div id="contactDetailContent"></div>
    </div>
</div>

<script>
function showContactDetail(id) {
    // 用 AJAX 获取消息内容
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/admin/layout.php?page=contacts&action=detail&id=' + id, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function() {
        document.getElementById('contactModal').style.display = 'flex';
        document.getElementById('contactDetailContent').innerHTML = xhr.responseText || '<p>加载失败</p>';
    };
    xhr.send();
}

function closeModal() {
    document.getElementById('contactModal').style.display = 'none';
}
</script>

<?php
// 查看详情（内嵌在 contacts.php 中，通过 AJAX 加载）
if (isset($_GET['action']) && $_GET['action'] === 'detail' && isset($_GET['id'])) {
    $stmt = $db->prepare("SELECT * FROM contacts WHERE id = ?");
    $stmt->execute([(int)$_GET['id']]);
    $c = $stmt->fetch();
    if ($c) {
        // 标记已读
        $db->prepare("UPDATE contacts SET is_read = 1 WHERE id = ?")->execute([$c['id']]);
        echo '<div style="margin-bottom:16px;"><strong style="font-size:14px;">' . h($c['name']) . '</strong> <span style="color:var(--text2);font-size:13px;">&lt;' . h($c['email']) . '&gt;</span></div>';
        echo '<div style="margin-bottom:12px;font-size:13px;color:var(--text2);">主题: ' . h($c['subject'] ?: '(无主题)') . '</div>';
        echo '<div style="margin-bottom:16px;font-size:13px;color:var(--text2);">时间: ' . format_cn($c['created_at']) . '</div>';
        echo '<div style="padding:16px;border-radius:8px;background:rgba(255,255,255,0.03);line-height:1.6;font-size:14px;white-space:pre-wrap;">' . h($c['message']) . '</div>';
    } else {
        echo '<p style="color:var(--text2);">消息不存在</p>';
    }
    exit;
}
?>