<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('EDUADMIN');
    session_start();
}

function require_admin_api(): void
{
    if (empty($_SESSION['admin_logged_in'])) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Administrator sign-in required.']);
        exit;
    }
}
