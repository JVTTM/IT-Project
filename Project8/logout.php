<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST only.']);
    exit;
}

$data = json_decode(file_get_contents('php://input') ?: '', true);
if (is_array($data) && ($data['scope'] ?? '') === 'admin') {
    session_name('EDUADMIN');
}

session_start();
$_SESSION = [];
$p = session_get_cookie_params();
setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
session_destroy();
echo json_encode(['success' => true]);
