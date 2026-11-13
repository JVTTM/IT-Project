<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function is_student(): bool
{
    return !empty($_SESSION['logged_in']) && ($_SESSION['role'] ?? '') === 'student';
}

function require_student_api(): void
{
    if (!is_student()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Please sign in to continue.']);
        exit;
    }
}
