<?php
date_default_timezone_set('Asia/Shanghai');

define('BASE_PATH', dirname(__DIR__));
define('DATA_DIR', BASE_PATH . '/data');
define('DB_PATH', DATA_DIR . '/site.db');

define('SITE_NAME', '饭团工坊');
define('SITE_URL', 'https://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));

define('ADMIN_USERNAME', 'admin');
define('ADMIN_DEFAULT_PASSWORD_HASH', '');

define('SESSION_LIFETIME', 3600);

if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

$htaccess = DATA_DIR . '/.htaccess';
if (!file_exists($htaccess)) {
    file_put_contents($htaccess, "Deny from all\n");
}

function h(string $str): string
{
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

function now_cn(): string
{
    return date('Y-m-d H:i:s');
}

function format_cn(?string $value): string
{
    if ($value === null || $value === '') return '';
    try {
        return (new DateTime($value))->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        return $value;
    }
}