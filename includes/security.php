<?php
/**
 * PRODUCTION Security Class - Sai Seva Foundation
 * Comprehensive security utilities and CSRF protection
 * 
 * @version 2.0.0
 * @author Sai Seva Foundation Development Team
 */

class Security {
    private static $csrfTokenName = 'csrf_token';
    private static $sessionTimeout = 3600; // 1 hour
    
    /**
     * Start secure session with proper configuration
     */
    public static function startSecureSession() {
        // Configure session security
        ini_set('session.cookie_httponly', 1);
        ini_set('session.cookie_secure', 1);
        ini_set('session.cookie_samesite', 'Strict');
        ini_set('session.use_strict_mode', 1);
        ini_set('session.gc_maxlifetime', self::$sessionTimeout);
        
        // Set session name
        session_name('SSFSESSID');
        
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Regenerate session ID periodically
        if (!isset($_SESSION['created'])) {
            $_SESSION['created'] = time();
        } elseif (time() - $_SESSION['created'] > 1800) { // 30 minutes
            session_regenerate_id(true);
            $_SESSION['created'] = time();
        }
        
        // Check session timeout
        if (isset($_SESSION['last_activity']) && 
            time() - $_SESSION['last_activity'] > self::$sessionTimeout) {
            session_destroy();
            session_start();
        }
        
        $_SESSION['last_activity'] = time();
    }
    
    /**
     * Generate secure CSRF token
     */
    public static function generateCSRFToken() {
        if (session_status() === PHP_SESSION_NONE) {
            self::startSecureSession();
        }
        
        $token = bin2hex(random_bytes(32));
        $_SESSION[self::$csrfTokenName] = $token;
        $_SESSION[self::$csrfTokenName . '_time'] = time();
        
        return $token;
    }
    
    /**
     * Validate CSRF token
     */
    public static function validateCSRFToken($token) {
        if (session_status() === PHP_SESSION_NONE) {
            self::startSecureSession();
        }
        
        if (empty($token) || empty($_SESSION[self::$csrfTokenName])) {
            return false;
        }
        
        // Check token age (1 hour max)
        $tokenTime = $_SESSION[self::$csrfTokenName . '_time'] ?? 0;
        if (time() - $tokenTime > 3600) {
            unset($_SESSION[self::$csrfTokenName]);
            unset($_SESSION[self::$csrfTokenName . '_time']);
            return false;
        }
        
        // Constant time comparison
        if (!hash_equals($_SESSION[self::$csrfTokenName], $token)) {
            return false;
        }
        
        // Single use token - regenerate after validation
        self::generateCSRFToken();
        
        return true;
    }
    
    /**
     * Get JSON input securely
     */
    public static function getJsonInput() {
        $input = file_get_contents('php://input');
        
        if (empty($input)) {
            throw new InvalidArgumentException('No input data received');
        }
        
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidArgumentException('Invalid JSON data: ' . json_last_error_msg());
        }
        
        return $data;
    }
    
    /**
     * Sanitize input data
     */
    public static function sanitizeInput($input) {
        if (is_array($input)) {
            return array_map([self::class, 'sanitizeInput'], $input);
        }
        
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Validate email address
     */
    public static function validateEmail($email) {
        $email = filter_var(trim($email), FILTER_VALIDATE_EMAIL);
        
        if (!$email) {
            return false;
        }
        
        // Check for disposable email domains
        $disposableDomains = [
            '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
            'mailinator.com', 'throwaway.email', 'temp-mail.org'
        ];
        
        $domain = substr(strrchr($email, "@"), 1);
        if (in_array(strtolower($domain), $disposableDomains)) {
            return false;
        }
        
        return $email;
    }
    
    /**
     * Validate phone number
     */
    public static function validatePhone($phone) {
        $phone = preg_replace('/\D/', '', $phone);
        
        // Indian phone numbers (10 digits) or international (7-15 digits)
        if (strlen($phone) >= 7 && strlen($phone) <= 15) {
            return $phone;
        }
        
        return false;
    }
    
    /**
     * Generate secure password
     */
    public static function generateSecurePassword($length = 12) {
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';
        $symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        $all = $lowercase . $uppercase . $numbers . $symbols;
        
        $password = '';
        $password .= $lowercase[random_int(0, strlen($lowercase) - 1)];
        $password .= $uppercase[random_int(0, strlen($uppercase) - 1)];
        $password .= $numbers[random_int(0, strlen($numbers) - 1)];
        $password .= $symbols[random_int(0, strlen($symbols) - 1)];
        
        for ($i = 4; $i < $length; $i++) {
            $password .= $all[random_int(0, strlen($all) - 1)];
        }
        
        return str_shuffle($password);
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
     * Generate client identifier for rate limiting
     */
    public static function getClientIdentifier() {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        return hash('sha256', $ip . '|' . $userAgent);
    }
    
    /**
     * Generate 2FA challenge token
     */
    public static function generate2FAChallenge($userId) {
        $challenge = bin2hex(random_bytes(32));
        $_SESSION['2fa_challenge'] = $challenge;
        $_SESSION['2fa_user_id'] = $userId;
        $_SESSION['2fa_expires'] = time() + 300; // 5 minutes
        
        return $challenge;
    }
    
    /**
     * Validate 2FA code
     */
    public static function validate2FACode($code, $secret) {
        require_once '../vendor/google2fa/google2fa.php';
        
        $google2fa = new Google2FA();
        return $google2fa->verifyKey($secret, $code, 2); // Allow 2 time windows
    }
    
    /**
     * Generate secure token for password reset, email verification, etc.
     */
    public static function generateSecureToken($purpose = '', $userId = null) {
        $payload = [
            'purpose' => $purpose,
            'user_id' => $userId,
            'timestamp' => time(),
            'random' => bin2hex(random_bytes(16))
        ];
        
        $data = base64_encode(json_encode($payload));
        $signature = hash_hmac('sha256', $data, $_ENV['APP_SECRET'] ?? 'fallback_secret');
        
        return $data . '.' . $signature;
    }
    
    /**
     * Validate secure token
     */
    public static function validateSecureToken($token, $purpose = '', $maxAge = 3600) {
        if (empty($token)) {
            return false;
        }
        
        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return false;
        }
        
        list($data, $signature) = $parts;
        
        // Verify signature
        $expectedSignature = hash_hmac('sha256', $data, $_ENV['APP_SECRET'] ?? 'fallback_secret');
        if (!hash_equals($expectedSignature, $signature)) {
            return false;
        }
        
        // Decode payload
        $payload = json_decode(base64_decode($data), true);
        if (!$payload) {
            return false;
        }
        
        // Check purpose
        if (!empty($purpose) && $payload['purpose'] !== $purpose) {
            return false;
        }
        
        // Check age
        if (time() - $payload['timestamp'] > $maxAge) {
            return false;
        }
        
        return $payload;
    }
    
    /**
     * Encrypt sensitive data
     */
    public static function encrypt($data, $key = null) {
        $key = $key ?? ($_ENV['ENCRYPTION_KEY'] ?? 'default_key_change_in_production');
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);
        
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * Decrypt sensitive data
     */
    public static function decrypt($encryptedData, $key = null) {
        $key = $key ?? ($_ENV['ENCRYPTION_KEY'] ?? 'default_key_change_in_production');
        $data = base64_decode($encryptedData);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        
        return openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, $iv);
    }
    
    /**
     * Log security events
     */
    public static function logSecurityEvent($event, $data = []) {
        $logger = new Logger('security');
        
        $logData = array_merge($data, [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'timestamp' => date('Y-m-d H:i:s'),
            'session_id' => session_id()
        ]);
        
        $logger->warning($event, $logData);
    }
    
    /**
     * Check if request is from allowed origin
     */
    public static function isAllowedOrigin() {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins = [
            'https://sadgurubharadwaja.org',
            'https://www.sadgurubharadwaja.org'
        ];
        
        return in_array($origin, $allowedOrigins);
    }
    
    /**
     * Get real IP address (considering proxies)
     */
    public static function getRealIpAddress() {
        $ipKeys = ['HTTP_CF_CONNECTING_IP', 'HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
}

/**
 * Rate Limiter Class
 */
class RateLimiter {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Check if action is allowed based on rate limits
     */
    public function isAllowed($identifier, $action, $maxAttempts, $timeWindow) {
        $cutoffTime = date('Y-m-d H:i:s', time() - $timeWindow);
        
        // Clean old entries
        $this->db->execute(
            "DELETE FROM rate_limits WHERE created_at < ?",
            [$cutoffTime]
        );
        
        // Count current attempts
        $currentAttempts = $this->db->fetchOne(
            "SELECT COUNT(*) as count FROM rate_limits 
             WHERE identifier = ? AND action = ? AND created_at >= ?",
            [$identifier, $action, $cutoffTime]
        );
        
        if ($currentAttempts['count'] >= $maxAttempts) {
            return false;
        }
        
        // Record this attempt
        $this->db->insert('rate_limits', [
            'identifier' => $identifier,
            'action' => $action,
            'created_at' => date('Y-m-d H:i:s'),
            'ip_address' => Security::getRealIpAddress()
        ]);
        
        return true;
    }
}

?>