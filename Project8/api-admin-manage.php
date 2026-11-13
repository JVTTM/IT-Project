<?php
declare(strict_types=1);

require __DIR__ . '/includes/admin-auth.php';
require_admin_api();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function text(array $in, string $key, int $max, bool $required = false): ?string
{
    $v = trim((string) ($in[$key] ?? ''));
    if ($required && $v === '') {
        throw new InvalidArgumentException(ucfirst(str_replace('_', ' ', $key)) . ' is required.');
    }
    if (mb_strlen($v) > $max) {
        throw new InvalidArgumentException(ucfirst(str_replace('_', ' ', $key)) . " must be $max characters or fewer.");
    }
    return $v === '' ? null : $v;
}

function url(array $in, string $key): ?string
{
    $v = text($in, $key, 500);
    if ($v !== null && (!preg_match('#^https?://#i', $v) || !filter_var($v, FILTER_VALIDATE_URL))) {
        throw new InvalidArgumentException('Enter a valid http(s) link for ' . str_replace('_', ' ', $key) . '.');
    }
    return $v;
}

$action = (string) ($_GET['action'] ?? '');
$in = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        out(415, ['error' => 'JSON required.']);
    }
    $in = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($in)) {
        out(400, ['error' => 'Invalid request.']);
    }
}

try {
    require __DIR__ . '/config/database.php';
    $count = fn(string $sql): int => (int) $pdo->query($sql)->fetchColumn();
    $rows  = fn(string $sql): array => $pdo->query($sql)->fetchAll();

    switch ($action) {
        case 'stats':
            out(200, ['institutions' => $count('SELECT COUNT(*) FROM institutions'),
                      'courses'      => $count('SELECT COUNT(*) FROM courses'),
                      'students'     => $count("SELECT COUNT(*) FROM users WHERE role = 'student'"),
                      'pending'      => $count('SELECT COUNT(*) FROM institutions WHERE is_accredited = 0')]);

        case 'institutions':
            $list = $rows('SELECT id, name, institution_type, province, is_accredited,
                                  registration_number, accreditation_details
                           FROM institutions ORDER BY name LIMIT 500');
            foreach ($list as &$r) { $r['is_accredited'] = (bool) $r['is_accredited']; }
            out(200, ['institutions' => $list]);

        case 'courses':
            out(200, ['courses' => $rows(
                'SELECT c.id, c.name, c.qualification, c.category, COUNT(ic.institution_id) AS institutions
                 FROM courses c LEFT JOIN institution_courses ic ON ic.course_id = c.id
                 GROUP BY c.id ORDER BY c.name LIMIT 500')]);

        case 'students':
            out(200, ['students' => $rows("SELECT id, username, email FROM users
                                           WHERE role = 'student' ORDER BY username LIMIT 1000")]);

        case 'reports':
            out(200, [
                'by_province' => $rows("SELECT COALESCE(NULLIF(province,''),'Not set') AS label, COUNT(*) AS n
                                        FROM institutions GROUP BY label ORDER BY n DESC"),
                'by_type'     => $rows("SELECT COALESCE(NULLIF(institution_type,''),'Not set') AS label, COUNT(*) AS n
                                        FROM institutions GROUP BY label ORDER BY n DESC"),
                'by_status'   => $rows("SELECT IF(is_accredited = 1,'Verified','Pending') AS label, COUNT(*) AS n
                                        FROM institutions GROUP BY label"),
                'by_category' => $rows("SELECT COALESCE(NULLIF(category,''),'Not set') AS label, COUNT(*) AS n
                                        FROM courses GROUP BY label ORDER BY n DESC LIMIT 10"),
                'bursaries'   => $rows("SELECT CASE WHEN deadline IS NULL THEN 'No deadline set'
                                               WHEN deadline < CURDATE() THEN 'Closed'
                                               WHEN deadline <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Closing within 30 days'
                                               ELSE 'Open' END AS label, COUNT(*) AS n
                                        FROM bursaries GROUP BY label ORDER BY n DESC"),
            ]);

        case 'add_institution':
            $accredited = !empty($in['is_accredited']);
            $reg = text($in, 'registration_number', 100);
            if ($accredited && $reg === null) {
                throw new InvalidArgumentException('Enter a registration number to mark an institution as verified.');
            }
            $pdo->prepare('INSERT INTO institutions
                (name, description, website_url, image_url, institution_type, city, province,
                 is_accredited, registration_number, accreditation_details)
                VALUES (?,?,?,?,?,?,?,?,?,?)')
                ->execute([text($in, 'name', 200, true), text($in, 'description', 2000), url($in, 'website_url'),
                           url($in, 'image_url'), text($in, 'institution_type', 100), text($in, 'city', 100),
                           text($in, 'province', 100), $accredited ? 1 : 0, $reg, text($in, 'accreditation_details', 2000)]);
            out(201, ['message' => 'Institution added.']);

        case 'add_course':
            $aps = text($in, 'min_aps', 3);
            if ($aps !== null && (!ctype_digit($aps) || (int) $aps > 49)) {
                throw new InvalidArgumentException('Minimum APS must be a whole number from 0 to 49.');
            }
            $pdo->beginTransaction();
            $pdo->prepare('INSERT INTO courses (name, description, qualification, category, min_aps, career_paths)
                           VALUES (?,?,?,?,?,?)')
                ->execute([text($in, 'name', 200, true), text($in, 'description', 2000),
                           text($in, 'qualification', 100), text($in, 'category', 100),
                           $aps === null ? null : (int) $aps, text($in, 'career_paths', 3000)]);
            $courseId = (int) $pdo->lastInsertId();
            $instId = filter_var($in['institution_id'] ?? null, FILTER_VALIDATE_INT);
            if ($instId) {
                $pdo->prepare('INSERT INTO institution_courses (institution_id, course_id, application_url) VALUES (?,?,?)')
                    ->execute([$instId, $courseId, url($in, 'application_url')]);
            }
            $pdo->commit();
            out(201, ['message' => 'Course added.']);

        case 'set_verification':
            $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT);
            $accredited = !empty($in['is_accredited']);
            $reg = text($in, 'registration_number', 100);
            if (!$id) {
                throw new InvalidArgumentException('Invalid institution.');
            }
            if ($accredited && $reg === null) {
                throw new InvalidArgumentException('Enter the registration number before verifying.');
            }
            $pdo->prepare('UPDATE institutions SET is_accredited = ?, registration_number = ?,
                           accreditation_details = ? WHERE id = ?')
                ->execute([$accredited ? 1 : 0, $reg, text($in, 'accreditation_details', 2000), $id]);
            out(200, ['message' => 'Verification updated.']);

        case 'change_password':
            $current = (string) ($in['current_password'] ?? '');
            $new = $in['new_password'] ?? '';
            if (!is_string($new) || strlen($new) < 8 || strlen($new) > 72 ||
                !preg_match('/[A-Z]/', $new) || !preg_match('/[a-z]/', $new) || !preg_match('/[0-9]/', $new)) {
                throw new InvalidArgumentException('New password needs 8+ characters with uppercase, lowercase and a number.');
            }
            $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ? AND role = ?');
            $stmt->execute([(int) ($_SESSION['admin_id'] ?? 0), 'admin']);
            $hash = $stmt->fetchColumn();
            if ($hash === false || !password_verify($current, $hash)) {
                out(403, ['error' => 'Current password is incorrect.']);
            }
            $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                ->execute([password_hash($new, PASSWORD_DEFAULT), (int) $_SESSION['admin_id']]);
            session_regenerate_id(true);
            out(200, ['message' => 'Password updated.']);

        case 'bursaries':
            out(200, ['bursaries' => $rows('SELECT id, name, provider, field_of_study, deadline
                                            FROM bursaries ORDER BY (deadline IS NULL), deadline, name LIMIT 500')]);

        case 'add_bursary':
            $deadline = text($in, 'deadline', 10);
            if ($deadline !== null && (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $deadline, $d)
                || !checkdate((int) $d[2], (int) $d[3], (int) $d[1]))) {
                throw new InvalidArgumentException('Enter a valid deadline date.');
            }
            $pdo->prepare('INSERT INTO bursaries
                (name, provider, description, eligibility, field_of_study, amount, deadline, application_url)
                VALUES (?,?,?,?,?,?,?,?)')
                ->execute([text($in, 'name', 200, true), text($in, 'provider', 200, true),
                           text($in, 'description', 2000), text($in, 'eligibility', 2000),
                           text($in, 'field_of_study', 100), text($in, 'amount', 100),
                           $deadline, url($in, 'application_url')]);
            out(201, ['message' => 'Bursary added.']);

        case 'add_student':
            $username = text($in, 'username', 50, true);
            $email = text($in, 'email', 254, true);
            $pass = $in['password'] ?? '';
            if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
                throw new InvalidArgumentException('Username must be 3-50 letters, numbers or underscores.');
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException('Enter a valid email address.');
            }
            if (!is_string($pass) || strlen($pass) < 8 || strlen($pass) > 72 ||
                !preg_match('/[A-Z]/', $pass) || !preg_match('/[a-z]/', $pass) || !preg_match('/[0-9]/', $pass)) {
                throw new InvalidArgumentException('Password needs 8+ characters with uppercase, lowercase and a number.');
            }
            $exists = $pdo->prepare('SELECT 1 FROM users WHERE username = ? OR email = ? LIMIT 1');
            $exists->execute([$username, $email]);
            if ($exists->fetchColumn()) {
                throw new InvalidArgumentException('That username or email is already in use.');
            }
            $pdo->prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?, 'student')")
                ->execute([$username, $email, password_hash($pass, PASSWORD_DEFAULT)]);
            out(201, ['message' => 'Student account created.']);

        case 'delete_bursary':
        case 'delete_student':
        case 'delete_course':
        case 'delete_institution':
            $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id) {
                throw new InvalidArgumentException('Invalid record.');
            }
            $pdo->beginTransaction();
            if ($action === 'delete_student') {
                $pdo->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([$id]);
                $del = $pdo->prepare("DELETE FROM users WHERE id = ? AND role = 'student'");
            } elseif ($action === 'delete_bursary') {
                $del = $pdo->prepare('DELETE FROM bursaries WHERE id = ?');
            } elseif ($action === 'delete_course') {
                $pdo->prepare('DELETE FROM course_tags WHERE course_id = ?')->execute([$id]);
                $pdo->prepare('DELETE FROM institution_courses WHERE course_id = ?')->execute([$id]);
                $del = $pdo->prepare('DELETE FROM courses WHERE id = ?');
            } else {
                $pdo->prepare('DELETE FROM institution_tags WHERE institution_id = ?')->execute([$id]);
                $pdo->prepare('DELETE FROM institution_courses WHERE institution_id = ?')->execute([$id]);
                $del = $pdo->prepare('DELETE FROM institutions WHERE id = ?');
            }
            $del->execute([$id]);
            if ($del->rowCount() === 0) {
                $pdo->rollBack();
                out(404, ['error' => 'That record no longer exists.']);
            }
            $pdo->commit();
            out(200, ['message' => 'Removed.']);

        default:
            out(404, ['error' => 'Unknown action.']);
    }
} catch (InvalidArgumentException $e) {
    out(400, ['error' => $e->getMessage()]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    error_log('api-admin-manage: ' . $e->__toString());
    $conflict = ($e->errorInfo[0] ?? '') === '23000';
    out($conflict ? 409 : 500, [
        'error' => $conflict
            ? 'This conflicts with existing data (a duplicate, or the record is still in use elsewhere).'
            : 'Something went wrong. Please try again.'
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    error_log('api-admin-manage: ' . $e->__toString());
    out(500, ['error' => 'Something went wrong. Please try again.']);
}
