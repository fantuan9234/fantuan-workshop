<?php
require_once __DIR__ . '/../backend/auth.php';
logout();
header('Location: ' . SITE_URL . '/admin/login.php');
exit;