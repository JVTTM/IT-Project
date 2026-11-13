<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'Method not allowed.']);
}

$data     = json_decode(file_get_contents('php://input') ?: '', true);
$token    = is_array($data) ? (string) ($data['token'] ?? '') : '';
$password = is_array($data) ? ($data['password'] ?? '') : '';

if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    respond(400, ['error' => 'This reset link is invalid.']);
}

// Same rules as signup.php
if (!is_string($password) || strlen($password) < 8 || strlen($password) > 72 ||
    !preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) ||
    !preg_match('/[0-9]/', $password)) {
    respond(400, ['error' => 'Password does not meet requirements.']);
}

try {
    require __DIR__ . '/config/database.php';

    $stmt = $pdo->prepare(
        'SELECT user_id FROM password_resets
         WHERE token_hash = ? AND expires_at > NOW() LIMIT 1'
    );
    $stmt->execute([hash('sha256', $token)]);
    $userId = $stmt->fetchColumn();

    if ($userId === false) {
        respond(400, ['error' => 'This reset link is invalid or has expired.']);
    }

    $pdo->beginTransaction();
    $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $userId]);
    $pdo->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([$userId]);
    $pdo->commit();

    respond(200, ['message' => 'Password updated.']);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('reset-password error: ' . $e->__toString());
    respond(500, ['error' => 'Unable to reset password. Please try again.']);
}
