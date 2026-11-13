<?php
declare(strict_types=1);

session_name('EDUADMIN');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();

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

    respond(405, [
        'error' => 'Method not allowed. Please submit the login form.'
    ]);
}

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

if (stripos($contentType, 'application/json') === 0) {
    $rawBody = file_get_contents('php://input');
    $data = json_decode($rawBody ?: '', true);

    if (!is_array($data)) {
        respond(400, [
            'error' => 'Invalid request data.'
        ]);
    }
} else {
    $data = $_POST;
}

$login = $data['username'] ?? '';
$password = $data['password'] ?? '';

if (
    !is_string($login) ||
    !is_string($password) ||
    trim($login) === '' ||
    $password === '' ||
    strlen($login) > 254 ||
    strlen($password) > 72
) {
    respond(400, [
        'error' => 'Please enter your username/email and password.'
    ]);
}

$login = trim($login);

try {
    require __DIR__ . '/config/database.php';

    $stmt = $pdo->prepare(
        'SELECT id, username, email, password_hash, role
         FROM users
         WHERE username = :username
            OR email = :email
         LIMIT 1'
    );

    $stmt->execute([
        'username' => $login,
        'email' => $login
    ]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (
        !$user ||
        $user['role'] !== 'admin' ||
        !password_verify($password, $user['password_hash'])
    ) {
        respond(401, [
            'error' => 'Invalid username/email or password.'
        ]);
    }

    if (!session_regenerate_id(true)) {
        throw new RuntimeException('Unable to regenerate session ID.');
    }

    $_SESSION['admin_id'] = (int) $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['admin_logged_in'] = true;

    if (
        password_needs_rehash(
            $user['password_hash'],
            PASSWORD_DEFAULT
        )
    ) {
        $newHash = password_hash($password, PASSWORD_DEFAULT);

        $update = $pdo->prepare(
            'UPDATE users
             SET password_hash = :hash
             WHERE id = :id'
        );

        $update->execute([
            'hash' => $newHash,
            'id' => $user['id']
        ]);
    }

    respond(200, [
        'success' => true,
        'message' => 'Login successful.',
        'redirect' => 'admin.html'
    ]);

} catch (PDOException $e) {
    error_log('Login DB error: ' . $e->__toString());
    respond(500, [
        'error' => ($e->errorInfo[0] ?? '') === '42S22'
            ? "The database is missing the users.role column. Run schema_fix.sql in phpMyAdmin."
            : 'Unable to log in. Check the database configuration and PHP error log.'
    ]);

} catch (Throwable $e) {
    error_log('Login error: ' . $e->__toString());
    respond(500, [
        'error' => 'Unable to log in. Check the database configuration and PHP error log.'
    ]);
}
