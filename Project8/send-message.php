<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit("Invalid request.");
}

$name = trim($_POST["name"] ?? "");
$email = trim($_POST["email"] ?? "");
$subject = trim($_POST["subject"] ?? "");
$message = trim($_POST["message"] ?? "");

if (!$name || !$email || !$subject || !$message) {
    http_response_code(400);
    exit("Please complete all fields.");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit("Invalid email address.");
}

$mail = new PHPMailer(true);

try {

    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;

    $mail->Username = 'thatomanaka59@gmail.com';
    $mail->Password = 'dtxe zvtd lcfk iaox';

    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->CharSet = 'UTF-8';

    $mail->setFrom(
        'thatomanaka59@gmail.com',
        'Website Contact Form'
    );

    $mail->addAddress('thatomanaka59@gmail.com');

    $mail->addReplyTo($email, $name);

    $mail->Subject = 'Contact Form: ' . $subject;

    $mail->Body =
        "Name: $name\n" .
        "Email: $email\n" .
        "Subject: $subject\n\n" .
        "Message:\n$message";

    $mail->send();

    echo "SUCCESS: Your message has been sent successfully!";

} catch (Exception $e) {

    error_log("Mailer Error: " . $mail->ErrorInfo);

    http_response_code(500);
    echo "ERROR: Email could not be sent. Please try again.";
}

?>
