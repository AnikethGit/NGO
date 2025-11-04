<?php
/**
 * ENHANCED SECURITY SYSTEM - Sri Dutta Sai Manga Bharadwaja Trust
 * Comprehensive security measures for the NGO website
 * 
 * @version 2.0.0
 * @priority CRITICAL - Security hardening
 */

class EnhancedSecurity {
    private static $sessionStarted = false;
    private static $csrfTokens = [];
    private static $rateLimitStore = [];
    
    /**
     * Initialize security measures
     */
    public static function init() {
        self::startSecureSession();
        self::setSecurityHeaders();
        self::initializeCSRFProtection();
        self::setupRateLimiting();
    }
    
    /**
     * Start secure session
     */
    public static function startSecureSession() {
        if (self::$sessionStarted) {
            return;
        }
        
        // Configure session security
        ini_set('session.cookie_httponly', 1);
        ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
        ini_set('session.cookie_samesite', 'Strict');
        ini_set('session.use_strict_mode', 1);
        ini_set('session.gc_maxlifetime', 1800); // 30 minutes
        
        // Generate secure session name
        session_name('NGOSESSION_' . substr(md5(__FILE__), 0, 8));
        
        session_start();
        self::$sessionStarted = true;
        
        // Regenerate session ID periodically
        if (!isset($_SESSION['last_regeneration'])) {
            $_SESSION['last_regeneration'] = time();
        } elseif (time() - $_SESSION['last_regeneration'] > 300) { // 5 minutes
            session_regenerate_id(true);
            $_SESSION['last_regeneration'] = time();
        }
    }
    
    /**
     * Set comprehensive security headers
     */
    public static function setSecurityHeaders() {
        // Prevent MIME type sniffing
        header('X-Content-Type-Options: nosniff');
        
        // XSS Protection
        header('X-XSS-Protection: 1; mode=block');
        
        // Frame options
        header('X-Frame-Options: DENY');
        
        // Content Security Policy
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self';");
        
        // Strict Transport Security (if HTTPS)
        if (isset($_SERVER['HTTPS'])) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
        
        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');
        
        // Permissions Policy
        header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    }
    
    /**
     * Initialize CSRF protection
     */
    public static function initializeCSRFProtection() {
        if (!isset($_SESSION['csrf_tokens'])) {
            $_SESSION['csrf_tokens'] = [];
        }
    }
    
    /**
     * Generate CSRF token
     */
    public static function generateCSRFToken() {
        $token = bin2hex(random_bytes(32));
        $timestamp = time();
        
        // Store token with timestamp
        $_SESSION['csrf_tokens'][$token] = $timestamp;
        
        // Clean old tokens (older than 1 hour)
        self::cleanExpiredCSRFTokens();
        
        return $token;
    }
    
    /**
     * Validate CSRF token
     */
    public static function validateCSRFToken($token) {
        if (empty($token) || !isset($_SESSION['csrf_tokens'][$token])) {
            return false;
        }
        
        $tokenTime = $_SESSION['csrf_tokens'][$token];
        $currentTime = time();
        
        // Token expires after 1 hour
        if ($currentTime - $tokenTime > 3600) {
            unset($_SESSION['csrf_tokens'][$token]);
            return false;
        }
        
        // Remove token after use (one-time use)
        unset($_SESSION['csrf_tokens'][$token]);
        return true;
    }
    
    /**
     * Clean expired CSRF tokens
     */
    private static function cleanExpiredCSRFTokens() {
        $currentTime = time();
        foreach ($_SESSION['csrf_tokens'] as $token => $timestamp) {
            if ($currentTime - $timestamp > 3600) {
                unset($_SESSION['csrf_tokens'][$token]);
            }
        }
    }
    
    /**
     * Setup rate limiting
     */
    public static function setupRateLimiting() {
        // Clean old rate limit data
        self::cleanRateLimitData();
    }
    
    /**
     * Check rate limit for specific action
     */
    public static function checkRateLimit($action, $maxRequests = 5, $timeWindow = 300) {
        $clientIP = self::getClientIP();
        $key = $action . '_' . $clientIP;
        $currentTime = time();
        
        // Initialize if not exists
        if (!isset(self::$rateLimitStore[$key])) {
            self::$rateLimitStore[$key] = [];
        }
        
        // Remove old requests outside time window
        self::$rateLimitStore[$key] = array_filter(
            self::$rateLimitStore[$key],
            function($timestamp) use ($currentTime, $timeWindow) {
                return ($currentTime - $timestamp) < $timeWindow;
            }
        );
        
        // Check if limit exceeded
        if (count(self::$rateLimitStore[$key]) >= $maxRequests) {
            return false;
        }
        
        // Add current request
        self::$rateLimitStore[$key][] = $currentTime;
        
        return true;
    }
    
    /**
     * Clean old rate limit data
     */
    private static function cleanRateLimitData() {
        $currentTime = time();
        foreach (self::$rateLimitStore as $key => $requests) {
            self::$rateLimitStore[$key] = array_filter(
                $requests,
                function($timestamp) use ($currentTime) {
                    return ($currentTime - $timestamp) < 3600; // Keep 1 hour
                }
            );
        }
    }
    
    /**
     * Get client IP address
     */
    public static function getClientIP() {
        $ip_keys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                        return $ip;
                    }
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    
    /**
     * Sanitize input data
     */
    public static function sanitizeInput($data) {
        if (is_array($data)) {
            return array_map([self::class, 'sanitizeInput'], $data);
        }
        
        // Remove dangerous characters
        $data = trim($data);
        $data = stripslashes($data);
        $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
        
        return $data;
    }
    
    /**
     * Sanitize email
     */
    public static function sanitizeEmail($email) {
        return filter_var(trim($email), FILTER_SANITIZE_EMAIL);
    }
    
    /**
     * Validate and sanitize phone number
     */
    public static function validatePhone($phone) {
        $phone = preg_replace('/\D/', '', $phone);
        
        if (strlen($phone) === 10 && preg_match('/^[6-9]/', $phone)) {
            return $phone;
        }
        
        return false;
    }
    
    /**
     * Validate PAN number
     */
    public static function validatePAN($pan) {
        $pan = strtoupper(trim($pan));
        
        if (preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', $pan)) {
            return $pan;
        }
        
        return false;
    }
    
    /**
     * Hash password securely
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3
        ]);
    }
    
    /**
     * Verify password
     */
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    /**
     * Generate secure random token
     */
    public static function generateSecureToken($length = 32) {
        return bin2hex(random_bytes($length));
    }
    
    /**
     * Log security event
     */
    public static function logSecurityEvent($event, $details = []) {
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => self::getClientIP(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'event' => $event,
            'details' => $details
        ];
        
        // Write to security log file
        $logFile = '../logs/security.log';
        $logEntry = json_encode($logData) . "\n";
        
        if (!file_exists('../logs')) {
            mkdir('../logs', 0755, true);
        }
        
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Validate uploaded file
     */
    public static function validateUploadedFile($file, $allowedTypes = [], $maxSize = 5242880) {
        if (!isset($file['error']) || is_array($file['error'])) {
            throw new Exception('Invalid file upload');
        }
        
        switch ($file['error']) {
            case UPLOAD_ERR_OK:
                break;
            case UPLOAD_ERR_NO_FILE:
                throw new Exception('No file was uploaded');
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                throw new Exception('File size exceeds limit');
            default:
                throw new Exception('Unknown file upload error');
        }
        
        // Check file size
        if ($file['size'] > $maxSize) {
            throw new Exception('File size too large');
        }
        
        // Check file type
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        
        if (!empty($allowedTypes) && !in_array($mimeType, $allowedTypes)) {
            throw new Exception('Invalid file type');
        }
        
        return true;
    }
    
    /**
     * Generate secure filename
     */
    public static function generateSecureFilename($originalName, $prefix = '') {
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $filename = $prefix . date('Ymd_His') . '_' . bin2hex(random_bytes(8));
        
        return $filename . '.' . $extension;
    }
    
    /**
     * Check if user is authenticated
     */
    public static function isAuthenticated() {
        return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
    }
    
    /**
     * Check if user has specific role
     */
    public static function hasRole($requiredRole) {
        if (!self::isAuthenticated()) {
            return false;
        }
        
        $userRole = $_SESSION['user_type'] ?? 'user';
        
        $roleHierarchy = [
            'user' => 1,
            'volunteer' => 2,
            'admin' => 3
        ];
        
        $requiredLevel = $roleHierarchy[$requiredRole] ?? 1;
        $userLevel = $roleHierarchy[$userRole] ?? 1;
        
        return $userLevel >= $requiredLevel;
    }
    
    /**
     * Require authentication
     */
    public static function requireAuth($redirectUrl = '/login.html') {
        if (!self::isAuthenticated()) {
            if (self::isAjaxRequest()) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Authentication required']);
                exit;
            } else {
                header('Location: ' . $redirectUrl);
                exit;
            }
        }
    }
    
    /**
     * Require specific role
     */
    public static function requireRole($requiredRole, $redirectUrl = '/login.html') {
        self::requireAuth($redirectUrl);
        
        if (!self::hasRole($requiredRole)) {
            if (self::isAjaxRequest()) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Insufficient privileges']);
                exit;
            } else {
                header('Location: ' . $redirectUrl);
                exit;
            }
        }
    }
    
    /**
     * Check if request is AJAX
     */
    public static function isAjaxRequest() {
        return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
               strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }
    
    /**
     * Validate input against SQL injection
     */
    public static function validateSQLInput($input) {
        // Check for common SQL injection patterns
        $dangerous_patterns = [
            '/\bunion\b.*\bselect\b/i',
            '/\bselect\b.*\bfrom\b/i',
            '/\binsert\b.*\binto\b/i',
            '/\bupdate\b.*\bset\b/i',
            '/\bdelete\b.*\bfrom\b/i',
            '/\bdrop\b.*\btable\b/i',
            '/\balter\b.*\btable\b/i',
            '/\bcreate\b.*\btable\b/i',
            '/\bexec\b|\bexecute\b/i',
            '/\bsp_\w+/i',
            '/\bxp_\w+/i'
        ];
        
        foreach ($dangerous_patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                self::logSecurityEvent('sql_injection_attempt', [
                    'input' => substr($input, 0, 100),
                    'pattern' => $pattern
                ]);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Validate input against XSS
     */
    public static function validateXSSInput($input) {
        // Check for common XSS patterns
        $dangerous_patterns = [
            '/<script[^>]*>.*?<\/script>/is',
            '/<iframe[^>]*>.*?<\/iframe>/is',
            '/javascript:/i',
            '/on\w+\s*=/i',
            '/<\w+[^>]*\son\w+/i'
        ];
        
        foreach ($dangerous_patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                self::logSecurityEvent('xss_attempt', [
                    'input' => substr($input, 0, 100),
                    'pattern' => $pattern
                ]);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Comprehensive input sanitization
     */
    public static function sanitizeInput($input, $type = 'general') {
        if (is_array($input)) {
            return array_map(function($item) use ($type) {
                return self::sanitizeInput($item, $type);
            }, $input);
        }
        
        // Basic sanitization
        $input = trim($input);
        
        switch ($type) {
            case 'email':
                return filter_var($input, FILTER_SANITIZE_EMAIL);
                
            case 'phone':
                return preg_replace('/\D/', '', $input);
                
            case 'pan':
                return strtoupper(preg_replace('/[^A-Z0-9]/', '', $input));
                
            case 'amount':
                return floatval(preg_replace('/[^0-9.]/', '', $input));
                
            case 'name':
                return preg_replace('/[^a-zA-Z\s\-\.]/', '', $input);
                
            case 'alphanumeric':
                return preg_replace('/[^a-zA-Z0-9]/', '', $input);
                
            case 'general':
            default:
                // Remove potentially dangerous characters
                $input = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
                $input = strip_tags($input);
                return $input;
        }
    }
    
    /**
     * Validate and sanitize all input data
     */
    public static function processInput($data) {
        $processed = [];
        
        foreach ($data as $key => $value) {
            // Skip empty values
            if ($value === '' || $value === null) {
                $processed[$key] = $value;
                continue;
            }
            
            // SQL injection check
            if (!self::validateSQLInput($value)) {
                throw new Exception('Invalid input detected: ' . $key);
            }
            
            // XSS check
            if (!self::validateXSSInput($value)) {
                throw new Exception('Potentially dangerous input detected: ' . $key);
            }
            
            // Sanitize based on field type
            $processed[$key] = self::sanitizeByFieldName($key, $value);
        }
        
        return $processed;
    }
    
    /**
     * Sanitize based on field name
     */
    private static function sanitizeByFieldName($fieldName, $value) {
        if (strpos($fieldName, 'email') !== false) {
            return self::sanitizeInput($value, 'email');
        } elseif (strpos($fieldName, 'phone') !== false) {
            return self::sanitizeInput($value, 'phone');
        } elseif (strpos($fieldName, 'pan') !== false) {
            return self::sanitizeInput($value, 'pan');
        } elseif (strpos($fieldName, 'amount') !== false) {
            return self::sanitizeInput($value, 'amount');
        } elseif (strpos($fieldName, 'name') !== false) {
            return self::sanitizeInput($value, 'name');
        } else {
            return self::sanitizeInput($value, 'general');
        }
    }
    
    /**
     * Generate secure password reset token
     */
    public static function generatePasswordResetToken($userId) {
        $token = bin2hex(random_bytes(32));
        $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        // Store in database
        $db = Database::getConnection();
        $stmt = $db->prepare("
            INSERT INTO password_reset_tokens (user_id, token, expires_at) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)
        ");
        $stmt->execute([$userId, hash('sha256', $token), $expiry]);
        
        return $token;
    }
    
    /**
     * Validate password reset token
     */
    public static function validatePasswordResetToken($token) {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT user_id FROM password_reset_tokens 
            WHERE token = ? AND expires_at > NOW()
        ");
        $stmt->execute([hash('sha256', $token)]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            // Delete used token
            $stmt = $db->prepare("DELETE FROM password_reset_tokens WHERE token = ?");
            $stmt->execute([hash('sha256', $token)]);
            
            return $result['user_id'];
        }
        
        return false;
    }
    
    /**
     * Log security event
     */
    public static function logSecurityEvent($event, $details = []) {
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => self::getClientIP(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'user_id' => $_SESSION['user_id'] ?? null,
            'event' => $event,
            'details' => $details
        ];
        
        // Create logs directory if it doesn't exist
        if (!file_exists('../logs')) {
            mkdir('../logs', 0755, true);
        }
        
        // Write to security log
        $logFile = '../logs/security.log';
        $logEntry = json_encode($logData) . "\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Check for suspicious activity
     */
    public static function detectSuspiciousActivity() {
        $clientIP = self::getClientIP();
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        $suspicious = false;
        $reasons = [];
        
        // Check for suspicious user agents
        $suspiciousAgents = ['bot', 'crawler', 'spider', 'scraper'];
        foreach ($suspiciousAgents as $agent) {
            if (stripos($userAgent, $agent) !== false) {
                $suspicious = true;
                $reasons[] = 'suspicious_user_agent';
                break;
            }
        }
        
        // Check for rapid requests
        if (!self::checkRateLimit('general_access', 30, 60)) {
            $suspicious = true;
            $reasons[] = 'rapid_requests';
        }
        
        if ($suspicious) {
            self::logSecurityEvent('suspicious_activity', [
                'reasons' => $reasons,
                'user_agent' => $userAgent
            ]);
        }
        
        return $suspicious;
    }
}

// Initialize security when file is included
EnhancedSecurity::init();

?>