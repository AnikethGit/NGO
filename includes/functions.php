<?php
// Common functions used across the application

/**
 * Send JSON response and exit
 */
function response($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

/**
 * Sanitize input data
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate email address
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate phone number (Indian format)
 */
function validatePhone($phone) {
    return preg_match('/^[6-9]\d{9}$/', $phone);
}

/**
 * Validate PAN number
 */
function validatePAN($pan) {
    return preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', strtoupper($pan));
}

/**
 * Generate random string
 */
function generateRandomString($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

/**
 * Log application events
 */
function logEvent($level, $message, $context = []) {
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? json_encode($context) : '';
    $logMessage = "[{$timestamp}] {$level}: {$message} {$contextStr}" . PHP_EOL;
    
    error_log($logMessage, 3, __DIR__ . '/../logs/app.log');
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Get current user ID
 */
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user type
 */
function getCurrentUserType() {
    return $_SESSION['user_type'] ?? null;
}

/**
 * Check if user has specific role
 */
function hasRole($role) {
    return getCurrentUserType() === $role;
}

/**
 * Check if user has any of the specified roles
 */
function hasAnyRole($roles) {
    return in_array(getCurrentUserType(), $roles);
}

/**
 * Require authentication
 */
function requireAuth($allowedRoles = []) {
    if (!isAuthenticated()) {
        response(['error' => 'Authentication required'], 401);
    }
    
    if (!empty($allowedRoles) && !hasAnyRole($allowedRoles)) {
        response(['error' => 'Insufficient permissions'], 403);
    }
}

/**
 * Format currency amount
 */
function formatCurrency($amount) {
    return '₹' . number_format($amount, 2);
}

/**
 * Format date for display
 */
function formatDate($date, $format = 'd/m/Y H:i:s') {
    return date($format, strtotime($date));
}

/**
 * Upload file with validation
 */
function uploadFile($file, $uploadDir, $allowedTypes = ['jpg', 'jpeg', 'png', 'pdf'], $maxSize = 5242880) {
    try {
        // Check if file was uploaded
        if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('File upload error');
        }
        
        // Check file size
        if ($file['size'] > $maxSize) {
            throw new Exception('File size too large. Maximum allowed: ' . formatBytes($maxSize));
        }
        
        // Get file extension
        $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        // Check allowed file types
        if (!in_array($fileExtension, $allowedTypes)) {
            throw new Exception('File type not allowed. Allowed types: ' . implode(', ', $allowedTypes));
        }
        
        // Generate unique filename
        $filename = uniqid() . '_' . time() . '.' . $fileExtension;
        
        // Ensure upload directory exists
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $targetPath = $uploadDir . $filename;
        
        // Move uploaded file
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            return $filename;
        } else {
            throw new Exception('Failed to save uploaded file');
        }
        
    } catch (Exception $e) {
        logEvent('ERROR', 'File upload failed: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Format bytes to human readable size
 */
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}

/**
 * Send email using PHPMailer (placeholder - implement actual email sending)
 */
function sendEmail($to, $subject, $body, $isHTML = true) {
    try {
        // This is a placeholder - implement actual email sending using PHPMailer
        logEvent('INFO', "Email should be sent to: {$to}, Subject: {$subject}");
        
        // For now, return true - replace with actual PHPMailer implementation
        return true;
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Email sending failed: ' . $e->getMessage());
        return false;
    }
}

/**
 * Generate secure password hash
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_ARGON2ID, [
        'memory_cost' => 65536, // 64 MB
        'time_cost' => 4,       // 4 iterations
        'threads' => 3,         // 3 threads
    ]);
}

/**
 * Verify password
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Generate pagination data
 */
function generatePagination($currentPage, $totalItems, $itemsPerPage) {
    $totalPages = ceil($totalItems / $itemsPerPage);
    
    return [
        'current_page' => $currentPage,
        'total_pages' => $totalPages,
        'total_items' => $totalItems,
        'items_per_page' => $itemsPerPage,
        'has_previous' => $currentPage > 1,
        'has_next' => $currentPage < $totalPages,
        'previous_page' => $currentPage > 1 ? $currentPage - 1 : null,
        'next_page' => $currentPage < $totalPages ? $currentPage + 1 : null
    ];
}

/**
 * Validate donation amount
 */
function validateDonationAmount($amount) {
    $amount = floatval($amount);
    return $amount >= 1 && $amount <= 1000000; // Min ₹1, Max ₹10 lakh
}

/**
 * Generate transaction ID
 */
function generateTransactionId($prefix = 'TXN') {
    return $prefix . '_' . time() . '_' . rand(1000, 9999);
}

/**
 * Clean phone number (remove spaces, dashes, etc.)
 */
function cleanPhoneNumber($phone) {
    return preg_replace('/[^0-9]/', '', $phone);
}

/**
 * Mask sensitive data for logging
 */
function maskSensitiveData($data, $fieldsToMask = ['password', 'pan', 'phone']) {
    if (is_array($data)) {
        foreach ($fieldsToMask as $field) {
            if (isset($data[$field])) {
                $data[$field] = maskString($data[$field]);
            }
        }
    }
    return $data;
}

/**
 * Mask string (show only first and last characters)
 */
function maskString($string, $maskChar = '*') {
    $length = strlen($string);
    if ($length <= 2) {
        return str_repeat($maskChar, $length);
    }
    return substr($string, 0, 1) . str_repeat($maskChar, $length - 2) . substr($string, -1);
}

/**
 * Get client IP address
 */
function getClientIP() {
    $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
    
    foreach ($ipKeys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = trim($_SERVER[$key]);
            // Handle comma-separated IPs (from proxies)
            if (strpos($ip, ',') !== false) {
                $ip = trim(explode(',', $ip)[0]);
            }
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/**
 * Check if request is from localhost
 */
function isLocalhost() {
    $ip = getClientIP();
    return in_array($ip, ['127.0.0.1', '::1', 'localhost']);
}

/**
 * Generate secure random token
 */
function generateSecureToken($length = 32) {
    try {
        return bin2hex(random_bytes($length));
    } catch (Exception $e) {
        // Fallback to less secure method
        return substr(str_shuffle(str_repeat('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil($length/62))), 1, $length);
    }
}

/**
 * Rate limiting helper
 */
function isRateLimited($identifier, $maxAttempts = 5, $timeWindow = 900) {
    $key = 'rate_limit_' . md5($identifier);
    
    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = ['attempts' => 0, 'reset_time' => time() + $timeWindow];
        return false;
    }
    
    $rateData = $_SESSION[$key];
    
    // Reset if time window has passed
    if (time() > $rateData['reset_time']) {
        $_SESSION[$key] = ['attempts' => 0, 'reset_time' => time() + $timeWindow];
        return false;
    }
    
    return $rateData['attempts'] >= $maxAttempts;
}

/**
 * Increment rate limit counter
 */
function incrementRateLimit($identifier) {
    $key = 'rate_limit_' . md5($identifier);
    
    if (isset($_SESSION[$key])) {
        $_SESSION[$key]['attempts']++;
    }
}

/**
 * Database backup utility
 */
function createDatabaseBackup($outputPath = null) {
    try {
        if (!$outputPath) {
            $outputPath = __DIR__ . '/../backups/db_backup_' . date('Y-m-d_H-i-s') . '.sql';
        }
        
        // Create backup directory if it doesn't exist
        $backupDir = dirname($outputPath);
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        $command = sprintf(
            'mysqldump -h%s -u%s -p%s %s > %s',
            escapeshellarg(DB_HOST),
            escapeshellarg(DB_USER),
            escapeshellarg(DB_PASS),
            escapeshellarg(DB_NAME),
            escapeshellarg($outputPath)
        );
        
        $output = null;
        $returnVar = null;
        exec($command, $output, $returnVar);
        
        if ($returnVar === 0) {
            logEvent('INFO', "Database backup created: {$outputPath}");
            return $outputPath;
        } else {
            throw new Exception("Database backup failed with return code: {$returnVar}");
        }
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Database backup failed: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Environment helper
 */
function isProduction() {
    return (PHONEPE_ENV ?? 'UAT') === 'PROD';
}

/**
 * Debug helper
 */
function debugLog($message, $context = []) {
    if (!isProduction()) {
        logEvent('DEBUG', $message, $context);
    }
}

?>