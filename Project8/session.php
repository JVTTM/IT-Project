<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (($_GET['scope'] ?? 'student') === 'admin') {
    session_name('EDUADMIN');
    session_start();
    echo json_encode([
        'loggedIn' => !empty($_SESSION['admin_logged_in']),
        'username' => $_SESSION['username'] ?? null,
    ]);
    exit;
}

session_start();
$in = !empty($_SESSION['logged_in']) && ($_SESSION['role'] ?? '') === 'student';
echo json_encode(['loggedIn' => $in, 'username' => $in ? $_SESSION['username'] : null]);
