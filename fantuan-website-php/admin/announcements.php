<?php
defined('ADMIN_LAYOUT') || define('ADMIN_LAYOUT', true);
require_once __DIR__ . '/../backend/auth.php';
require_once __DIR__ . '/../backend/db.php';
$db = getDB();

$action = $_GET['action'] ?? '';

// 处理表单
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    if ($action === 'create') {
        $stmt = $db->prepare("INSERT INTO announcements (title, content, tags, is_pinned) VALUES (?, ?, ?, ?)");
        $stmt->execute([$_POST['title'], $_POST['content'], $_POST['tags'] ?? '', (int)($_POST['is_pinned'] ?? 0)]);
        echo '<div style="padding:12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;color:#22c55e;margin-bottom:16px;">✅ 公告已创建</div>';
    } elseif ($action === 'edit' && ($id = (int)($_POST['id'] ?? 0))) {
        $stmt = $db->prepare("UPDATE announcements SET title=?, content=?, tags=?, is_pinned=? WHERE id=?");
        $stmt->execute([$_POST['title'], $_POST['content'], $_POST['tags'] ?? '', (int)($_POST['is_pinned'] ?? 0), $id]);
        echo '<div style="padding:12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;color:#22c55e;margin-bottom:16px;">✅ 公告已更新</div>';
    } elseif ($action === 'delete' && ($id = (int)($_POST['id'] ?? 0))) {
        $db->prepare("DELETE FROM announcements WHERE id=?")->execute([$id]);
        echo '<div style="padding:12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;color:#22c55e;margin-bottom:16px;">✅ 公告已删除</div>';
    }
    // POST 处理完后继续渲染列表（确保 AJAX 响应包含完整的内容）
}

$announcements = $db->query("SELECT * FROM announcements ORDER BY is_pinned DESC, id DESC")->fetchAll();
$editItem = null;
if ($action === 'edit_form' && isset($_GET['id'])) {
    $stmt = $db->prepare("SELECT * FROM announcements WHERE id=?");
    $stmt->execute([(int)$_GET['id']]);
    $editItem = $stmt->fetch();
}
?>
<div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <h1 style="font-size:24px;font-weight:700;">公告管理</h1>
        <button class="btn btn-primary" onclick="resetModalForm('announcementForm');showModal('announcementModal')">+ 新建公告</button>
    </div>

    <?php if ($announcements): ?>
    <div class="card" style="overflow:hidden;padding:0;">
        <table>
            <thead>
                <tr><th>标题</th><th>标签</th><th>置顶</th><th>日期</th><th>操作</th></tr>
            </thead>
            <tbody>
                <?php foreach ($announcements as $a): ?>
                <tr>
                    <td style="font-weight:500;"><?php echo h($a['title']); ?></td>
                    <td><?php if ($a['tags']): foreach(explode(',',$a['tags']) as $tag): ?><span class="badge badge-green" style="margin-right:4px;"><?php echo h(trim($tag)); ?></span><?php endforeach; endif; ?></td>
                    <td><?php echo $a['is_pinned'] ? '📌' : ''; ?></td>
                    <td style="color:var(--text2);font-size:13px;"><?php echo format_cn($a['created_at']); ?></td>
                    <td>
                        <button class="btn btn-ghost" onclick="editAnnouncement(<?php echo $a['id']; ?>)">编辑</button>
                        <form method="post" data-ajax="announcements" style="display:inline;" onsubmit="return confirm('确定删除？')">
                            <?php echo csrfField(); ?>
                            <input type="hidden" name="id" value="<?php echo $a['id']; ?>">
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
        <p style="color:var(--text2);">暂无公告</p>
    </div>
    <?php endif; ?>
</div>

{{-- 创建/编辑弹窗 --}}
<div id="announcementModal" class="modal-overlay" style="display:none;">
    <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 id="modalTitle" style="font-size:18px;font-weight:600;">新建公告</h3>
            <button data-close-modal style="background:none;border:none;color:var(--text2);font-size:20px;cursor:pointer;">✕</button>
        </div>
        <form method="post" data-ajax="announcements" id="announcementForm">
            <?php echo csrfField(); ?>
            <input type="hidden" name="id" id="editId" value="">
            <input type="hidden" name="action" id="formAction" value="create">

            <div style="margin-bottom:16px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">标题</label>
                <input type="text" name="title" id="editTitle" required>
            </div>
            <div style="margin-bottom:16px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">标签（逗号分隔）</label>
                <input type="text" name="tags" id="editTags" placeholder="版本发布, 更新">
            </div>
            <div style="margin-bottom:16px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">
                    <input type="checkbox" name="is_pinned" value="1" id="editPinned"> 置顶
                </label>
            </div>
            <div style="margin-bottom:20px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">内容</label>
                <textarea name="content" id="editContent" rows="8"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">保存</button>
        </form>
    </div>
</div>

<script>
function editAnnouncement(id) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/admin/layout.php?page=announcements&action=edit_form&id=' + id, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function() {
        if (xhr.status === 200) {
            window.location.href = '/admin/announcements-edit.php?id=' + id;
        }
    };
    xhr.send();
}
</script>
