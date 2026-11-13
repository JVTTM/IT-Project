<?php
declare(strict_types=1);

$host = '127.0.0.1';
$db   = 'courses_directory';
$user = 'courses_app';

$credentials = require __DIR__ . '/local_credentials.php';
$pass = $credentials['password'] ?? '';

if ($pass === '') {
    throw new RuntimeException('Database password is not configured.');
}

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";

$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
]);
