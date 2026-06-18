<?php
/**
 * 饭团工坊 - 反馈提交 API
 * 
 * 由 Electron 桌面端 FeedbackDialog 调用，接收用户反馈并存入 contacts 表。
 * 管理员可在后台 admin/contacts.php 查看。
 * 
 * POST /api/feedback.php
 * Body: message=xxx&version=xxx&platform=xxx  或  JSON: {"message":"..."}
 */

require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/security.php';

// CORS: 允许 Electron 桌面端调用
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// 预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 只允许 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => '仅支持 POST 请求']);
    exit;
}

// 频率限制
if (!rateLimit('feedback', 10, 300)) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => '提交过于频繁，请稍后再试']);
    exit;
}

// 多种方式尝试读取输入（兼容不同服务器配置）
$message  = '';
$version  = 'unknown';
$platform = 'unknown';

// 方式1: $_GET（URL参数）
if (!empty($_GET['message'])) {
    $message  = trim($_GET['message']);
    $version  = trim($_GET['version'] ?? 'unknown');
    $platform = trim($_GET['platform'] ?? 'unknown');
}

// 方式2: $_POST（form-urlencoded）
if ($message === '' && !empty($_POST['message'])) {
    $message  = trim($_POST['message']);
    $version  = trim($_POST['version'] ?? 'unknown');
    $platform = trim($_POST['platform'] ?? 'unknown');
}

// 方式3: php://input（JSON body）
if ($message === '') {
    $raw = file_get_contents('php://input');
    if ($raw !== false && $raw !== '') {
        $input = json_decode($raw, true);
        if (!empty($input['message'])) {
            $message  = trim($input['message']);
            $version  = trim($input['version'] ?? 'unknown');
            $platform = trim($input['platform'] ?? 'unknown');
        }
    }
}

if ($message === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => '请填写反馈内容']);
    exit;
}

if (mb_strlen($message) > 5000) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => '反馈内容过长（最多 5000 字）']);
    exit;
}

// 存入 contacts 表
$subject    = "饭团工坊反馈 v{$version} ({$platform})";
$fullBody   = "版本: {$version}\n平台: {$platform}\n---\n{$message}";
$senderName = '饭团工坊用户';

$db = getDB();
$stmt = $db->prepare("INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)");
$stmt->execute([$senderName, '', $subject, $fullBody]);

echo json_encode(['ok' => true, 'error' => null]);
