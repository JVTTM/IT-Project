<?php
declare(strict_types=1);

require __DIR__ . '/includes/auth.php';
require_student_api();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid course.']);
    exit;
}

try {
    require __DIR__ . '/config/database.php';

    $stmt = $pdo->prepare('SELECT id, name, description, qualification, category, min_aps, career_paths
                           FROM courses WHERE id = ?');
    $stmt->execute([$id]);
    $course = $stmt->fetch();

    if (!$course) {
        http_response_code(404);
        echo json_encode(['error' => 'Course not found.']);
        exit;
    }

    $lines = preg_split('/\R/', (string) ($course['career_paths'] ?? '')) ?: [];
    $course['career_paths'] = array_slice(array_values(array_filter(array_map('trim', $lines), 'strlen')), 0, 20);
    $course['min_aps'] = $course['min_aps'] === null ? null : (int) $course['min_aps'];

    $inst = $pdo->prepare('SELECT i.id, i.name, i.province, ic.application_url
                           FROM institutions i JOIN institution_courses ic ON ic.institution_id = i.id
                           WHERE ic.course_id = ? AND i.is_accredited = 1 ORDER BY i.name');
    $inst->execute([$id]);

    $tags = $pdo->prepare('SELECT t.name FROM tags t JOIN course_tags ct ON ct.tag_id = t.id
                           WHERE ct.course_id = ? ORDER BY t.name');
    $tags->execute([$id]);

    echo json_encode(['course' => $course, 'institutions' => $inst->fetchAll(),
                      'tags' => $tags->fetchAll(PDO::FETCH_COLUMN)]);
} catch (Throwable $e) {
    error_log('api-course: ' . $e->__toString());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load course.']);
}
