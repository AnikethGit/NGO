<?php

function response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function requireAuth($allowedTypes = []) {
    if (!isset($_SESSION['user_id'])) {
        response(['error' => 'Authentication required'], 401);
    }
    
    if (!empty($allowedTypes) && !in_array($_SESSION['user_type'], $allowedTypes)) {
        response(['error' => 'Access denied'], 403);
    }
    
    return $_SESSION;
}

function sanitize($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function generateSecureToken() {
    return bin2hex(random_bytes(32));
}

function uploadFile($file, $directory = 'uploads/') {
    if (!is_dir($directory)) {
        mkdir($directory, 0755, true);
    }
    
    $filename = time() . '_' . basename($file['name']);
    $targetPath = $directory . $filename;
    
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        return $filename;
    }
    
    return false;
}

function sendEmail($to, $subject, $body, $from = SMTP_USER) {
    // Implement email sending using PHPMailer or similar
    // This is a placeholder
    return true;
}

function logActivity($action, $details = '') {
    $db = Database::getInstance();
    $userId = $_SESSION['user_id'] ?? null;
    
    $db->insert('activity_logs', [
        'user_id' => $userId,
        'action' => $action,
        'details' => $details,
        'ip_address' => $_SERVER['REMOTE_ADDR'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT']
    ]);
}
?>
