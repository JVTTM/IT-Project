<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'Method not allowed.']);
}

$data = json_decode(file_get_contents('php://input'), true);

if (!is_array($data)) {
    respond(400, ['error' => 'Invalid request.']);
}

$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
    respond(400, ['error' => 'Invalid username.']);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) ||
    strlen($email) > 254) {
    respond(400, ['error' => 'Invalid email address.']);
}

if (!is_string($password) ||
    strlen($password) < 8 ||
    strlen($password) > 72 ||
    !preg_match('/[A-Z]/', $password) ||
    !preg_match('/[a-z]/', $password) ||
    !preg_match('/[0-9]/', $password)) {
    respond(400, ['error' => 'Password does not meet requirements.']);
}

try {
    require __DIR__ . '/config/database.php';

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$username, $email, $hash]);

    respond(201, ['message' => 'Account created successfully.']);

} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        respond(409, ['error' => 'Username or email already exists.']);
    }

    error_log($e->__toString());
    respond(500, ['error' => 'Registration failed. Please try again.']);

} catch (Throwable $e) {
    error_log($e->__toString());
    respond(500, ['error' => 'Registration failed. Please try again.']);
}