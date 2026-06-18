<?php
function sendSecurityHeaders(): void
{
    // CSP
    $csp = "default-src 'self'; "
        . "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://code.jquery.com; "
        . "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; "
        . "font-src 'self' https://fonts.gstatic.com; "
        . "img-src 'self' data: https:; "
        . "connect-src 'self'; "
        . "frame-src 'none'; "
        . "object-src 'none'; "
        . "base-uri 'self';";
    header("Content-Security-Policy: " . $csp);
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: DENY");
    header("Referrer-Policy: strict-origin-when-cross-origin");

    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
    }
}

function isLoginBlocked(): bool
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $window = time() - 900;
    require_once __DIR__ . '/db.php';
    $db = getDB();
    $stmt = $db->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND success = 0 AND timestamp > ?");
    $stmt->execute([$ip, $window]);
    return $stmt->fetchColumn() >= 5;
}

function recordLoginAttempt(bool $success): void
{
    require_once __DIR__ . '/db.php';
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO login_attempts (ip, success, timestamp) VALUES (?, ?, ?)");
    $stmt->execute([$_SERVER['REMOTE_ADDR'] ?? '', $success ? 1 : 0, time()]);

    // 清理旧记录
    $cutoff = time() - 86400;
    $db->prepare("DELETE FROM login_attempts WHERE timestamp < ?")->execute([$cutoff]);
}

function clearLoginAttempts(): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    require_once __DIR__ . '/db.php';
    $db = getDB();
    $stmt = $db->prepare("DELETE FROM login_attempts WHERE ip = ?");
    $stmt->execute([$ip]);
}

function rateLimit(string $action, int $maxAttempts = 30, int $window = 60): bool
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $cutoff = time() - $window;
    require_once __DIR__ . '/db.php';
    $db = getDB();
    $db->exec("CREATE TABLE IF NOT EXISTS rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_key TEXT NOT NULL,
        timestamp INTEGER NOT NULL
    )");
    $stmt = $db->prepare("SELECT COUNT(*) FROM rate_limits WHERE action_key = ? AND timestamp > ?");
    $stmt->execute([$action . ':' . $ip, $cutoff]);
    $count = $stmt->fetchColumn();
    if ($count >= $maxAttempts) return false;

    $stmt = $db->prepare("INSERT INTO rate_limits (action_key, timestamp) VALUES (?, ?)");
    $stmt->execute([$action . ':' . $ip, time()]);

    // 清理
    $db->prepare("DELETE FROM rate_limits WHERE timestamp < ?")->execute([time() - 86400]);
    return true;
}