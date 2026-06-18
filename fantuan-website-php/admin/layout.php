<?php
require_once __DIR__ . '/../backend/auth.php';
require_once __DIR__ . '/../backend/db.php';
requireLogin();
initDatabase();

$db = getDB();
$unreadCount = $db->query("SELECT COUNT(*) FROM contacts WHERE is_read = 0")->fetchColumn();

if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
    $page = $_GET['page'] ?? 'index';
    $allowed = ['index','announcements','versions','contacts','settings'];
    if (in_array($page, $allowed) && file_exists($page . '.php')) {
        include $page . '.php';
    }
    exit;
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台 - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        :root{--bg:#0c0c0e;--surface:#141416;--border:rgba(255,255,255,0.06);--text:#f0f0f0;--text2:#999;--brand:#d4a843;}
        body{font-family:'Outfit','Noto Sans SC',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}
        .sidebar{position:fixed;top:0;left:0;bottom:0;width:220px;background:var(--surface);border-right:1px solid var(--border);padding:24px 16px;z-index:10;overflow-y:auto;}
        .main{margin-left:220px;padding:32px;min-height:100vh;}
        .nav-link{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;color:var(--text2);text-decoration:none;font-size:14px;transition:all 0.2s;margin-bottom:4px;cursor:pointer;border:none;background:none;width:100%;font-family:inherit;}
        .nav-link:hover,.nav-link.active{background:rgba(255,255,255,0.05);color:var(--text);}
        .nav-link.active{color:var(--brand);}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;}
        .badge{display:inline-block;padding:2px 10px;border-radius:8px;font-size:12px;font-weight:500;}
        .badge-green{background:rgba(34,197,94,0.15);color:#22c55e;}
        .badge-yellow{background:rgba(234,179,8,0.15);color:#eab308;}
        .badge-red{background:rgba(244,63,94,0.15);color:#f43f5e;}
        input,textarea,select{width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;color:#fff;font-size:14px;outline:none;transition:border-color 0.3s;font-family:inherit;}
        input:focus,textarea:focus,select:focus{border-color:var(--brand);}
        textarea{resize:vertical;}
        select option{background:var(--surface);}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 20px;border-radius:8px;font-size:14px;font-weight:500;border:none;cursor:pointer;transition:all 0.2s;font-family:inherit;text-decoration:none;}
        .btn-primary{background:var(--brand);color:#0c0c0e;}
        .btn-primary:hover{opacity:0.9;}
        .btn-danger{background:rgba(244,63,94,0.15);color:#f43f5e;}
        .btn-danger:hover{background:rgba(244,63,94,0.25);}
        .btn-ghost{background:transparent;color:var(--text2);}
        .btn-ghost:hover{background:rgba(255,255,255,0.05);color:var(--text);}
        table{width:100%;border-collapse:collapse;}
        th{text-align:left;padding:12px 16px;font-size:13px;color:var(--text2);font-weight:500;border-bottom:1px solid var(--border);}
        td{padding:12px 16px;font-size:14px;border-bottom:1px solid var(--border);}
        .loading{text-align:center;padding:60px;color:var(--text2);}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:100;display:flex;align-items:center;justify-content:center;}
        .modal{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:32px;width:600px;max-width:90vw;max-height:80vh;overflow-y:auto;}
        @media(max-width:768px){.sidebar{width:60px;padding:16px 8px;}.sidebar .nav-text{display:none;}.main{margin-left:60px;padding:16px;}}
    </style>
</head>
<body>

<div class="sidebar">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;padding:0 4px;">
        <div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#d4a843,#b08020);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;color:#0c0c0e;flex-shrink:0;">饭</div>
        <span class="nav-text" style="font-weight:600;font-size:16px;">饭团工坊</span>
    </div>

    <?php
    $navItems = [
        'index' => ['Dashboard', '📊'],
        'announcements' => ['公告管理', '📢'],
        'versions' => ['版本管理', '⬇️'],
        'contacts' => ['消息管理', '✉️' . ($unreadCount > 0 ? ' (' . $unreadCount . ')' : '')],
        'settings' => ['设置', '⚙️'],
    ];
    foreach ($navItems as $key => $item): ?>
    <button class="nav-link <?php echo $key === 'index' ? 'active' : ''; ?>" onclick="loadPage('<?php echo $key; ?>', this)">
        <span><?php echo $item[1]; ?></span>
        <span class="nav-text"><?php echo $item[0]; ?></span>
    </button>
    <?php endforeach; ?>

    <div style="margin-top:auto;padding-top:20px;border-top:1px solid var(--border);">
        <a href="/admin/logout.php" class="nav-link">
            <span>🚪</span>
            <span class="nav-text">退出</span>
        </a>
    </div>
</div>

<div class="main" id="mainContent">
    <?php include 'index.php'; ?>
</div>

<script>
// ---- 页面加载 ----
function loadPage(page, btn) {
    document.querySelectorAll('.nav-link').forEach(function(el) { el.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    document.getElementById('mainContent').innerHTML = '<div class="loading">加载中...</div>';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/admin/layout.php?page=' + page, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function() {
        if (xhr.status === 401) {
            window.location.href = '/admin/login.php';
        } else {
            document.getElementById('mainContent').innerHTML = xhr.responseText;
        }
    };
    xhr.onerror = function() {
        document.getElementById('mainContent').innerHTML = '<div class="loading">加载失败，请刷新页面</div>';
    };
    xhr.send();
}

// ---- AJAX 表单提交 ----
function ajaxPost(form, page) {
    var data = new FormData(form);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/admin/layout.php?page=' + page, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function() {
        if (xhr.status === 200) {
            document.getElementById('mainContent').innerHTML = xhr.responseText;
        } else if (xhr.status === 401) {
            window.location.href = '/admin/login.php';
        }
    };
    xhr.send(data);
    return false;
}

// ---- 模态框 ----
function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(function(m) { m.style.display = 'none'; });
}

function showModal(id) {
    document.getElementById(id).style.display = 'flex';
}

/** 重置模态框中的表单（用于新建按钮） */
function resetModalForm(formId) {
    var f = document.getElementById(formId);
    if (f) f.reset();
    // 如果有 formAction 隐藏字段，重置为 create
    var fa = f ? f.querySelector('[name="action"]') : null;
    if (fa) fa.value = 'create';
    // 如果有 editId，清空
    var ei = document.getElementById('editId');
    if (ei) ei.value = '';
    // 如果有 modalTitle，恢复标题
    var mt = document.getElementById('modalTitle');
    if (mt) mt.textContent = '新建公告';
}

// ---- 事件委托（解决 AJAX 动态加载内容的交互问题） ----
document.addEventListener('submit', function(e) {
    var form = e.target;
    var page = form.getAttribute('data-ajax');
    if (page) {
        e.preventDefault();
        ajaxPost(form, page);
    }
});

document.addEventListener('click', function(e) {
    var el;
    // data-modal: 打开模态框
    el = e.target.closest('[data-modal]');
    if (el) { showModal(el.getAttribute('data-modal')); return; }
    // data-close-modal: 关闭模态框
    el = e.target.closest('[data-close-modal]');
    if (el) { closeModal(); return; }
    // data-modal-overlay: 点击遮罩关闭
    el = e.target.closest('.modal-overlay');
    if (el && e.target === el) { closeModal(); return; }
    // data-load-page: 页面跳转
    el = e.target.closest('[data-load-page]');
    if (el) { loadPage(el.getAttribute('data-load-page'), el); return; }
});
</script>
</body>
</html>