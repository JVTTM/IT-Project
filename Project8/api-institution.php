<?php
declare(strict_types=1);

require __DIR__ . '/includes/auth.php';
require_student_api();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid institution.']);
    exit;
}

try {
    require __DIR__ . '/config/database.php';

    $stmt = $pdo->prepare(
        'SELECT id, name, description, website_url, image_url, institution_type, city,
                province, is_accredited, registration_number, accreditation_details
         FROM institutions WHERE id = ? AND is_accredited = 1'
    );
    $stmt->execute([$id]);
    $inst = $stmt->fetch();

    if (!$inst) {
        http_response_code(404);
        echo json_encode(['error' => 'Institution not found.']);
        exit;
    }
    $inst['is_accredited'] = (bool) $inst['is_accredited'];

    $t = $pdo->prepare('SELECT t.name FROM tags t JOIN institution_tags it ON it.tag_id = t.id
                        WHERE it.institution_id = ? ORDER BY t.name');
    $t->execute([$id]);

    $c = $pdo->prepare('SELECT c.name, c.qualification, ic.application_url
                        FROM courses c JOIN institution_courses ic ON ic.course_id = c.id
                        WHERE ic.institution_id = ? ORDER BY c.name');
    $c->execute([$id]);

    echo json_encode(['institution' => $inst, 'tags' => $t->fetchAll(PDO::FETCH_COLUMN),
                      'courses' => $c->fetchAll()]);
} catch (Throwable $e) {
    error_log('api-institution: ' . $e->__toString());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load institution.']);
}
