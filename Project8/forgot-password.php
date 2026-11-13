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

$data  = json_decode(file_get_contents('php://input') ?: '', true);
$email = is_array($data) ? trim((string) ($data['email'] ?? '')) : '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    respond(400, ['error' => 'Enter a valid email address.']);
}

$genericReply = [
    'message' => 'If an account exists for that email, a reset link has been sent. '
               . 'The link expires in 1 hour.'
];

try {
    require __DIR__ . '/config/database.php';

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $userId = $stmt->fetchColumn();

    if ($userId === false) {
        respond(200, $genericReply);
    }

    $token = bin2hex(random_bytes(32));
    $hash  = hash('sha256', $token);

    $pdo->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([$userId]);
    $pdo->prepare(
        'INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))'
    )->execute([$userId, $hash]);

    $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $dir    = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
    $link   = "$scheme://$host$dir/reset-password.html?token=$token";

    $body = "We received a request to reset your Courses Directory password.\r\n\r\n"
          . "Reset it here (valid for 1 hour):\r\n$link\r\n\r\n"
          . "If you didn't ask for this, you can ignore this email.";

    $sent = @mail($email, 'Reset your password', $body,
                  "From: no-reply@$host\r\nContent-Type: text/plain; charset=utf-8");

    if (!$sent && preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/', $host)) {
        @file_put_contents(__DIR__ . '/reset-links.log',
            date('c') . " $email $link\n", FILE_APPEND | LOCK_EX);
    }

    respond(200, $genericReply);

} catch (Throwable $e) {
    error_log('forgot-password error: ' . $e->__toString());
    respond(500, ['error' => 'Unable to process your request. Please try again.']);
}
