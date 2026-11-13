<?php
declare(strict_types=1);

require __DIR__ . '/includes/auth.php';
require_student_api();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    require __DIR__ . '/config/database.php';

    $q     = trim((string) ($_GET['q'] ?? ''));
    $field = trim((string) ($_GET['field'] ?? ''));
    if (mb_strlen($q) > 100 || mb_strlen($field) > 100) {
        http_response_code(400);
        echo json_encode(['error' => 'Search is too long.']);
        exit;
    }

    $fields = $pdo->query(
        "SELECT DISTINCT field_of_study FROM bursaries
         WHERE field_of_study IS NOT NULL AND field_of_study <> '' ORDER BY field_of_study"
    )->fetchAll(PDO::FETCH_COLUMN);

    $stmt = $pdo->prepare(
        "SELECT id, name, provider, description, eligibility, field_of_study,
                amount, deadline, application_url
         FROM bursaries
         WHERE (:q = '' OR name LIKE :n OR provider LIKE :p OR description LIKE :d OR eligibility LIKE :e)
           AND (:f = '' OR field_of_study = :f2)
         ORDER BY (deadline IS NULL), deadline ASC, name ASC LIMIT 100"
    );
    $like = '%' . $q . '%';
    $stmt->execute(['q' => $q, 'n' => $like, 'p' => $like, 'd' => $like, 'e' => $like,
                    'f' => $field, 'f2' => $field]);

    echo json_encode(['fields' => $fields, 'bursaries' => $stmt->fetchAll()]);
} catch (Throwable $e) {
    error_log('api-bursaries: ' . $e->__toString());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load bursaries.']);
}
