<?php
declare(strict_types=1);

require __DIR__ . '/includes/admin-auth.php';
require_admin_api();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    require __DIR__ . '/config/database.php';

    $count = fn(string $sql): int => (int) $pdo->query($sql)->fetchColumn();

    $stats = [
        'institutions' => $count('SELECT COUNT(*) FROM institutions'),
        'courses'      => $count('SELECT COUNT(*) FROM courses'),
        'students'     => $count("SELECT COUNT(*) FROM users WHERE role = 'student'"),
        'pending'      => $count('SELECT COUNT(*) FROM institutions WHERE is_accredited = 0'),
    ];

    $institutions = [];
    foreach ($pdo->query(
        'SELECT name, institution_type, province, is_accredited
         FROM institutions ORDER BY id DESC LIMIT 10'
    )->fetchAll() as $r) {
        $institutions[] = [
            'name'     => $r['name'],
            'type'     => $r['institution_type'] ?: '—',
            'province' => $r['province'] ?: '—',
            'status'   => $r['is_accredited'] ? 'Verified' : 'Pending',
        ];
    }

    $activities = [
        ['action' => $stats['pending'] . ' institution(s) awaiting verification', 'time' => 'Now'],
        ['action' => $stats['students'] . ' student account(s) registered',        'time' => 'Now'],
        ['action' => $stats['courses'] . ' course(s) listed',                      'time' => 'Now'],
    ];

    echo json_encode([
        'adminName'    => $_SESSION['username'] ?? 'Admin',
        'stats'        => $stats,
        'institutions' => $institutions,
        'activities'   => $activities,
    ]);
} catch (Throwable $e) {
    error_log('api-admin: ' . $e->__toString());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load dashboard data.']);
}
