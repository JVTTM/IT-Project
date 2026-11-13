<?php
declare(strict_types=1);

require __DIR__ . '/includes/auth.php';
require_student_api();

header('Content-Type: application/json; charset=utf-8');

try {
    require __DIR__ . '/config/database.php';

    $query = trim($_GET['q'] ?? '');

    if (mb_strlen($query) > 100) {
        http_response_code(400);
        echo json_encode(['error' => 'Search is too long.']);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT DISTINCT c.id, c.name, c.description,
               c.qualification, c.category, c.min_aps
        FROM courses c
        LEFT JOIN course_tags ct ON ct.course_id = c.id
        LEFT JOIN tags t ON t.id = ct.tag_id
        WHERE :q = ''
           OR c.name LIKE :name
           OR c.description LIKE :description
           OR c.category LIKE :category
           OR t.name LIKE :tag
        ORDER BY c.name
        LIMIT 100
    ");

    $stmt->execute([
        'q' => $query,
        'name' => "%$query%",
        'description' => "%$query%",
        'category' => "%$query%",
        'tag' => "%$query%"
    ]);

    $courses = $stmt->fetchAll();

    foreach ($courses as &$course) {
        $tags = $pdo->prepare("
            SELECT t.name
            FROM tags t
            JOIN course_tags ct ON ct.tag_id = t.id
            WHERE ct.course_id = ?
        ");
        $tags->execute([$course['id']]);
        $course['tags'] = $tags->fetchAll(PDO::FETCH_COLUMN);

        $institutions = $pdo->prepare("
            SELECT i.id, i.name, ic.application_url
            FROM institutions i
            JOIN institution_courses ic ON ic.institution_id = i.id
            WHERE ic.course_id = ?
              AND i.is_accredited = 1
            ORDER BY i.name
        ");
        $institutions->execute([$course['id']]);
        $course['institutions'] = $institutions->fetchAll();
    }
    unset($course);

    echo json_encode(['courses' => $courses]);

} catch (Throwable $e) {
    error_log($e->__toString());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load courses.']);
}