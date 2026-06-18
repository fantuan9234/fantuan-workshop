<?php
require_once __DIR__ . '/config.php';

function getDB(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('sqlite:' . DB_PATH, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec('PRAGMA journal_mode=WAL');
        $pdo->exec('PRAGMA foreign_keys=ON');
    }
    return $pdo;
}

function initDatabase(): void
{
    $db = getDB();

    // 公告
    $db->exec("CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at DATETIME NOT NULL DEFAULT (datetime('now','localtime'))
    )");

    // 联系消息
    $db->exec("CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        subject TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (datetime('now','localtime'))
    )");

    // 版本发布
    $db->exec("CREATE TABLE IF NOT EXISTS versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        changelog TEXT NOT NULL DEFAULT '',
        download_url TEXT NOT NULL DEFAULT '',
        file_size TEXT NOT NULL DEFAULT '',
        platform TEXT NOT NULL DEFAULT 'windows',
        sha256 TEXT NOT NULL DEFAULT '',
        is_latest INTEGER NOT NULL DEFAULT 0,
        download_count INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (datetime('now','localtime'))
    )");

    // 页面访问
    $db->exec("CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_hash TEXT NOT NULL,
        page TEXT NOT NULL DEFAULT '',
        user_agent TEXT NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT (datetime('now','localtime'))
    )");

    // 设置
    $db->exec("CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )");

    // 登录尝试
    $db->exec("CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 0,
        timestamp INTEGER NOT NULL
    )");

    // 下载记录
    $db->exec("CREATE TABLE IF NOT EXISTS downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version_id INTEGER NOT NULL,
        ip_hash TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (datetime('now','localtime'))
    )");

    $db->exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip, timestamp)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_visitors_date ON visitors(created_at)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_visitors_page ON visitors(page)");

    // 种子数据
    $seeded = $db->prepare("SELECT value FROM settings WHERE key = ?");
    $seeded->execute(['seed_data_v1']);
    if (!$seeded->fetch()) {
        $count = $db->query("SELECT COUNT(*) FROM announcements")->fetchColumn();
        if ($count == 0) {
            $stmt = $db->prepare("INSERT INTO announcements (title, content, tags, is_pinned, created_at) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute(['饭团工坊 v0.1.9 正式发布', '我们很高兴地宣布饭团工坊 v0.1.9 正式发布！本次更新带来了多项新功能和改进：\n\n- **NPC 编辑器**：全面支持 45 位 NPC 编辑\n- **事件编辑器**：可视化编排游戏事件\n- **物品配置器**：创建自定义物品\n- **地图编辑器**：创建和修改游戏地图', '版本发布,v0.1.9', 1, '2026-06-17 12:00:00']);
        }
        $db->prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")->execute(['seed_data_v1', '1']);
    }

    // 种子版本数据
    $versionSeeded = $db->prepare("SELECT value FROM settings WHERE key = ?");
    $versionSeeded->execute(['seed_version_v1']);
    if (!$versionSeeded->fetch()) {
        $count = $db->query("SELECT COUNT(*) FROM versions")->fetchColumn();
        if ($count == 0) {
            $stmt = $db->prepare("INSERT INTO versions (version, title, description, changelog, download_url, file_size, platform, is_latest, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute(['0.1.9', '饭团工坊 v0.1.9', '首个公开测试版本，包含核心编辑器功能。', "## 新增\n- NPC 编辑器\n- 事件编辑器\n- 物品配置器\n- 地图编辑器\n\n## 优化\n- 项目保存/加载性能\n- 用户界面交互", 'https://github.com/fantuan9234/fantuan-workshop/releases/tag/v0.1.9', '120MB', 'windows', 1, '2026-06-17 12:00:00']);
        }
        $db->prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")->execute(['seed_version_v1', '1']);
    }
}