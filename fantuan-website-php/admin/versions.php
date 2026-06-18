<?php
defined('ADMIN_LAYOUT') || define('ADMIN_LAYOUT', true);
require_once __DIR__ . '/../backend/auth.php';
require_once __DIR__ . '/../backend/db.php';
$db = getDB();

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    if ($action === 'create') {
        $stmt = $db->prepare("INSERT INTO versions (version, title, description, changelog, download_url, file_size, platform, sha256, is_latest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$_POST['version'], $_POST['title'], $_POST['description'], $_POST['changelog'], $_POST['download_url'], $_POST['file_size'], $_POST['platform'], $_POST['sha256'], (int)($_POST['is_latest'] ?? 0)]);
        echo '<div style="padding:12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;color:#22c55e;margin-bottom:16px;">✅ 版本已创建</div>';
    } elseif ($action === 'set_latest' && ($id = (int)($_POST['id'] ?? 0))) {
        $db->exec("UPDATE versions SET is_latest = 0");
        $db->prepare("UPDATE versions SET is_latest = 1 WHERE id = ?")->execute([$id]);
        echo '<div style="padding:12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;color:#22c55e;margin-bottom:16px;">✅ 已设为最新版本</div>';
    } elseif ($action === 'delete' && ($id = (int)($_POST['id'] ?? 0))) {
        $db->prepare("DELETE FROM versions WHERE id=?")->execute([$id]);
        echo '<div style="padding:12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;color:#22c55e;margin-bottom:16px;">✅ 版本已删除</div>';
    }
}

$versions = $db->query("SELECT * FROM versions ORDER BY is_latest DESC, id DESC")->fetchAll();
?>
<div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <h1 style="font-size:24px;font-weight:700;">版本管理</h1>
        <button class="btn btn-primary" onclick="document.getElementById('versionForm').reset();showModal('versionModal')">+ 新建版本</button>
    </div>

    <?php if ($versions): ?>
    <div class="card" style="overflow:hidden;padding:0;">
        <table>
            <thead>
                <tr><th>版本</th><th>标题</th><th>平台</th><th>状态</th><th>下载次数</th><th>日期</th><th>操作</th></tr>
            </thead>
            <tbody>
                <?php foreach ($versions as $v): ?>
                <tr>
                    <td style="font-weight:600;">v<?php echo h($v['version']); ?></td>
                    <td><?php echo h($v['title']); ?></td>
                    <td><span class="badge badge-green"><?php echo h($v['platform']); ?></span></td>
                    <td><?php echo $v['is_latest'] ? '<span class="badge badge-green">Latest</span>' : '<span class="badge badge-yellow">旧版</span>'; ?></td>
                    <td><?php echo $v['download_count']; ?></td>
                    <td style="color:var(--text2);font-size:13px;"><?php echo format_cn($v['created_at']); ?></td>
                    <td>
                        <?php if (!$v['is_latest']): ?>
                        <form method="post" data-ajax="versions" style="display:inline;">
                            <?php echo csrfField(); ?>
                            <input type="hidden" name="id" value="<?php echo $v['id']; ?>">
                            <input type="hidden" name="action" value="set_latest">
                            <button type="submit" class="btn btn-ghost" style="padding:4px 12px;">设为最新</button>
                        </form>
                        <?php endif; ?>
                        <form method="post" data-ajax="versions" style="display:inline;" onsubmit="return confirm('确定删除？')">
                            <?php echo csrfField(); ?>
                            <input type="hidden" name="id" value="<?php echo $v['id']; ?>">
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
        <p style="color:var(--text2);">暂无版本</p>
    </div>
    <?php endif; ?>
</div>

<div id="versionModal" class="modal-overlay" style="display:none;">
    <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="font-size:18px;font-weight:600;">新建版本</h3>
            <button data-close-modal style="background:none;border:none;color:var(--text2);font-size:20px;cursor:pointer;">✕</button>
        </div>
        <form method="post" data-ajax="versions" id="versionForm">
            <?php echo csrfField(); ?>
            <input type="hidden" name="action" value="create">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div>
                    <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">版本号</label>
                    <input type="text" name="version" required placeholder="0.2.0">
                </div>
                <div>
                    <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">标题</label>
                    <input type="text" name="title" required>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div>
                    <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">平台</label>
                    <select name="platform">
                        <option value="windows">Windows</option>
                        <option value="macos">macOS</option>
                        <option value="linux">Linux</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">文件大小</label>
                    <input type="text" name="file_size" placeholder="50MB">
                </div>
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">下载地址</label>
                <input type="url" name="download_url" required>
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">SHA256</label>
                <input type="text" name="sha256" placeholder="可选">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">简要描述</label>
                <input type="text" name="description">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block;">更新日志</label>
                <textarea name="changelog" rows="5"></textarea>
            </div>
            <div style="margin-bottom:20px;">
                <label style="font-size:13px;color:var(--text2);display:block;">
                    <input type="checkbox" name="is_latest" value="1"> 标记为最新版本
                </label>
            </div>
            <button type="submit" class="btn btn-primary">保存</button>
        </form>
    </div>
</div>

