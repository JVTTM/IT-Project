<?php

declare(strict_types=1);

require __DIR__ . '/includes/auth.php';
require_student_api();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $data): never
{
    http_response_code($status);

    echo json_encode(
        $data,
        JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    );

    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    respond(405, ['error' => 'Only GET requests are allowed.']);
}

try {
    require __DIR__ . '/config/database.php';

    if (!isset($pdo) || !$pdo instanceof PDO) {
        throw new RuntimeException(
            'config/database.php did not create a PDO connection.'
        );
    }

    $query = trim((string) ($_GET['q'] ?? ''));

    if (strlen($query) > 400) {
        respond(400, ['error' => 'Search query is too long.']);
    }

    $sql = "
        SELECT
            i.id,
            i.name,
            i.description,
            i.website_url,
            i.image_url,
            i.institution_type,
            i.city,
            i.province,
            i.is_accredited
        FROM institutions AS i
        WHERE i.is_accredited = 1
          AND (
            :empty_query = ''
            OR i.name LIKE :name
            OR i.description LIKE :description
            OR i.institution_type LIKE :type
            OR i.city LIKE :city
            OR i.province LIKE :province
            OR EXISTS (
                SELECT 1
                FROM institution_tags AS it
                INNER JOIN tags AS t ON t.id = it.tag_id
                WHERE it.institution_id = i.id
                  AND t.name LIKE :tag
            )
        )
        ORDER BY i.name ASC
        LIMIT 100
    ";

    $stmt = $pdo->prepare($sql);

    $pattern = '%' . $query . '%';

    $stmt->execute([
        'empty_query' => $query,
        'name' => $pattern,
        'description' => $pattern,
        'type' => $pattern,
        'city' => $pattern,
        'province' => $pattern,
        'tag' => $pattern
    ]);

    $institutions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $tagStmt = $pdo->prepare("
        SELECT t.name
        FROM tags AS t
        INNER JOIN institution_tags AS it
            ON it.tag_id = t.id
        WHERE it.institution_id = ?
        ORDER BY t.name ASC
    ");

    foreach ($institutions as &$institution) {
        $tagStmt->execute([(int) $institution['id']]);

        $institution['tags'] = $tagStmt->fetchAll(PDO::FETCH_COLUMN);
        $institution['is_accredited'] =
            (bool) $institution['is_accredited'];
    }

    unset($institution);

    respond(200, [
        'institutions' => $institutions
    ]);

} catch (Throwable $e) {
    error_log('search.php error: ' . $e->__toString());

    $debug = (
        ($_SERVER['HTTP_HOST'] ?? '') === 'localhost' ||
        str_starts_with($_SERVER['HTTP_HOST'] ?? '', 'localhost:')
    );

    respond(500, [
        'error' => 'Unable to load institutions.',
        'debug' => $debug ? $e->getMessage() : null
    ]);
}
