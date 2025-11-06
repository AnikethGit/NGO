<?php
/**
 * PRODUCTION AUTH API - Sri Dutta Sai Manga Bharadwaja Trust
 * Complete authentication system with secure .env database integration
 * 
 * @version 3.1.0 - Production Ready with .env support
 * @priority CRITICAL - Includes real database user registration
 */

// Load environment configuration
require_once dirname(__DIR__) . '/config/env-loader.php';

// Configure error handling based on environment
error_reporting(E_ALL);
ini_set('display_errors', env('DISPLAY_ERRORS', 0));
ini_set('log_errors', 1);

// Start session with secure configuration
if (session_status() === PHP_SESSION_NONE) {
    $securityConfig = SecureEnvLoader::getSecurityConfig();
    
    // Configure session settings from .env
    ini_set('session.cookie_httponly', $securityConfig['session_cookie_httponly']);
    ini_set('session.cookie_secure', $securityConfig['session_cookie_secure']);
    ini_set('session.cookie_samesite', $securityConfig['session_cookie_samesite']);
    ini_set('session.gc_maxlifetime', $securityConfig['session_lifetime']);
    
    session_name($securityConfig['session_cookie_name']);
    session_start();
}

// Set headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . env('FRONTEND_URL', '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Database configuration using .env variables
 */
class DatabaseConfig {
    private static $connection = null;
    
    public static function getConnection() {
        if (self::$connection !== null) {
            return self::$connection;
        }
        
        try {
            // Get database configuration from .env
            $config = SecureEnvLoader::getDatabaseConfig();
            
            // Validate required database credentials
            SecureEnvLoader::requireKeys(['DB_NAME', 'DB_USER', 'DB_PASS']);
            
            $dsn = sprintf(
                "mysql:host=%s;port=%d;dbname=%s;charset=%s",
                $config['host'],
                $config['port'],
                $config['name'],
                $config['charset']
            );
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$config['charset']} COLLATE {$config['collation']}"
            ];
            
            self::$connection = new PDO($dsn, $config['user'], $config['pass'], $options);
            
            debugLog('Database connection established successfully');
            return self::$connection;
            
        } catch (Exception $e) {
            debugLog('Database connection failed: ' . $e->getMessage());
            throw new Exception('Database connection failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Test database connection
     */
    public static function testConnection() {
        try {
            $pdo = self::getConnection();
            $pdo->query('SELECT 1')->fetch();
            return true;
        } catch (Exception $e) {
            debugLog('Database connection test failed: ' . $e->getMessage());
            return false;
        }
    }
}

/**
 * Enhanced User Management with .env configuration
 */
class UserManager {
    private $pdo;
    private $tableName;
    
    public function __construct() {
        $this->pdo = DatabaseConfig::getConnection();
        $this->tableName = env('DB_USERS_TABLE', 'users');
    }
    
    /**
     * Create users table if not exists
     */
    public function createUsersTable() {
        $sql = "
            CREATE TABLE IF NOT EXISTS `{$this->tableName}` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(255) NOT NULL,
                `email` VARCHAR(255) UNIQUE NOT NULL,
                `phone` VARCHAR(20),
                `password_hash` VARCHAR(255) NOT NULL,
                `user_type` ENUM('user', 'volunteer', 'admin') DEFAULT 'user',
                `is_active` BOOLEAN DEFAULT TRUE,
                `email_verified` BOOLEAN DEFAULT FALSE,
                `email_verification_token` VARCHAR(100),
                `newsletter_subscribed` BOOLEAN DEFAULT FALSE,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                `last_login` TIMESTAMP NULL,
                `login_attempts` INT DEFAULT 0,
                `lockout_until` TIMESTAMP NULL,
                `password_reset_token` VARCHAR(100),
                `password_reset_expires` TIMESTAMP NULL,
                INDEX `idx_email` (`email`),
                INDEX `idx_user_type` (`user_type`),
                INDEX `idx_created_at` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        $this->pdo->exec($sql);
        
        // Create default admin user if not exists
        $this->createDefaultUsers();
    }
    
    /**
     * Create default system users from .env configuration
     */
    private function createDefaultUsers() {
        $adminEmail = env('ADMIN_EMAIL', 'admin@sadgurubharadwaja.org');
        $orgName = env('APP_NAME', 'Sai Seva Foundation');
        
        // Check if admin exists
        $stmt = $this->pdo->prepare("SELECT id FROM `{$this->tableName}` WHERE email = ?");
        $stmt->execute([$adminEmail]);
        
        if (!$stmt->fetch()) {
            // Create default admin
            $stmt = $this->pdo->prepare("
                INSERT INTO `{$this->tableName}` (name, email, password_hash, user_type, email_verified, is_active) 
                VALUES (?, ?, ?, 'admin', TRUE, TRUE)
            ");
            
            $stmt->execute([
                $orgName . ' Administrator',
                $adminEmail,
                password_hash('admin123', PASSWORD_DEFAULT)
            ]);
            
            debugLog('Default admin user created', ['email' => $adminEmail]);
        }
        
        // Create additional system users if specified in .env
        $supportEmail = env('SUPPORT_EMAIL');
        if ($supportEmail && $supportEmail !== $adminEmail) {
            $stmt = $this->pdo->prepare("SELECT id FROM `{$this->tableName}` WHERE email = ?");
            $stmt->execute([$supportEmail]);
            
            if (!$stmt->fetch()) {
                $stmt = $this->pdo->prepare("
                    INSERT INTO `{$this->tableName}` (name, email, password_hash, user_type, email_verified, is_active) 
                    VALUES (?, ?, ?, 'admin', TRUE, TRUE)
                ");
                
                $stmt->execute([
                    $orgName . ' Support',
                    $supportEmail,
                    password_hash('support123', PASSWORD_DEFAULT)
                ]);
                
                debugLog('Default support user created', ['email' => $supportEmail]);
            }
        }
    }
    
    /**
     * Register new user with enhanced validation
     */
    public function registerUser($userData) {
        // Check if email already exists
        $stmt = $this->pdo->prepare("SELECT id FROM `{$this->tableName}` WHERE email = ?");
        $stmt->execute([$userData['email']]);
        
        if ($stmt->fetch()) {
            throw new Exception('An account with this email already exists');
        }
        
        // Generate email verification token if email verification is enabled
        $emailVerificationToken = null;
        $emailVerified = true; // Default to true for now
        
        if (env('EMAIL_VERIFICATION_ENABLED', false)) {
            $emailVerificationToken = bin2hex(random_bytes(32));
            $emailVerified = false;
        }
        
        // Insert new user
        $stmt = $this->pdo->prepare("
            INSERT INTO `{$this->tableName}` 
            (name, email, phone, password_hash, user_type, newsletter_subscribed, email_verified, email_verification_token) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([
            $userData['name'],
            $userData['email'],
            $userData['phone'] ?? null,
            password_hash($userData['password'], PASSWORD_DEFAULT),
            $userData['user_type'] ?? 'user',
            $userData['newsletter'] ?? false,
            $emailVerified,
            $emailVerificationToken
        ]);
        
        if ($result) {
            $userId = $this->pdo->lastInsertId();
            
            debugLog('User registered successfully', [
                'user_id' => $userId,
                'email' => $userData['email'],
                'user_type' => $userData['user_type'] ?? 'user'
            ]);
            
            // TODO: Send email verification if enabled
            // if ($emailVerificationToken) {
            //     $this->sendEmailVerification($userData['email'], $emailVerificationToken);
            // }
            
            return $userId;
        } else {
            throw new Exception('Failed to create user account');
        }
    }
    
    /**
     * Authenticate user with enhanced security
     */
    public function authenticateUser($email, $password) {
        $stmt = $this->pdo->prepare("
            SELECT id, name, email, password_hash, user_type, is_active, email_verified,
                   login_attempts, lockout_until, last_login
            FROM `{$this->tableName}` 
            WHERE email = ?
        ");
        
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            $this->logFailedAttempt($email);
            throw new Exception('Invalid email or password');
        }
        
        // Check if account is locked
        if ($user['lockout_until'] && new DateTime() < new DateTime($user['lockout_until'])) {
            $lockoutMinutes = ceil((new DateTime($user['lockout_until'])->getTimestamp() - time()) / 60);
            throw new Exception("Account temporarily locked. Try again in {$lockoutMinutes} minutes.");
        }
        
        // Check if account is active
        if (!$user['is_active']) {
            throw new Exception('Account is deactivated. Please contact support.');
        }
        
        // Check email verification if enabled
        if (env('EMAIL_VERIFICATION_REQUIRED', false) && !$user['email_verified']) {
            throw new Exception('Please verify your email address before logging in.');
        }
        
        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            $this->incrementFailedAttempts($user['id']);
            throw new Exception('Invalid email or password');
        }
        
        // Successful login - reset attempts and update last login
        $this->resetFailedAttempts($user['id']);
        $this->updateLastLogin($user['id']);
        
        return [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'user_type' => $user['user_type'],
            'last_login' => $user['last_login']
        ];
    }
    
    /**
     * Increment failed login attempts with configurable limits
     */
    private function incrementFailedAttempts($userId) {
        $maxAttempts = env('LOGIN_RATE_LIMIT', 5);
        $lockoutMinutes = env('LOGIN_LOCKOUT_MINUTES', 30);
        
        $stmt = $this->pdo->prepare("
            UPDATE `{$this->tableName}` 
            SET login_attempts = login_attempts + 1,
                lockout_until = CASE 
                    WHEN login_attempts >= ? THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
                    ELSE lockout_until
                END
            WHERE id = ?
        ");
        
        $stmt->execute([$maxAttempts - 1, $lockoutMinutes, $userId]);
    }
    
    /**
     * Log failed attempt for non-existent email (rate limiting)
     */
    private function logFailedAttempt($email) {
        // This could be enhanced to implement IP-based rate limiting
        debugLog('Failed login attempt for non-existent email', [
            'email' => $email,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ]);
    }
    
    /**
     * Reset failed login attempts
     */
    private function resetFailedAttempts($userId) {
        $stmt = $this->pdo->prepare("
            UPDATE `{$this->tableName}` 
            SET login_attempts = 0, lockout_until = NULL 
            WHERE id = ?
        ");
        
        $stmt->execute([$userId]);
    }
    
    /**
     * Update last login timestamp
     */
    private function updateLastLogin($userId) {
        $stmt = $this->pdo->prepare("
            UPDATE `{$this->tableName}` 
            SET last_login = NOW() 
            WHERE id = ?
        ");
        
        $stmt->execute([$userId]);
    }
    
    /**
     * Get user statistics
     */
    public function getUserStats() {
        $stmt = $this->pdo->query("
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN user_type = 'admin' THEN 1 ELSE 0 END) as admin_users,
                SUM(CASE WHEN user_type = 'volunteer' THEN 1 ELSE 0 END) as volunteer_users,
                SUM(CASE WHEN user_type = 'user' THEN 1 ELSE 0 END) as regular_users,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified_users
            FROM `{$this->tableName}`
        ");
        
        return $stmt->fetch();
    }
}

// Helper functions
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function debugLog($message, $data = null) {
    if (env('APP_DEBUG', false)) {
        $logMessage = date('[Y-m-d H:i:s] ') . '[AUTH] ' . $message;
        if ($data !== null) {
            $logMessage .= ' | Data: ' . json_encode($data);
        }
        error_log($logMessage);
    }
}

function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function isValidPassword($password) {
    $minLength = env('PASSWORD_MIN_LENGTH', 6);
    return strlen($password) >= $minLength;
}

// Initialize database and user management
try {
    // Test database connection first
    if (!DatabaseConfig::testConnection()) {
        throw new Exception('Database connection failed');
    }
    
    $userManager = new UserManager();
    $userManager->createUsersTable();
    
    debugLog('Database and UserManager initialized successfully');
    
} catch (Exception $e) {
    debugLog('Database initialization failed: ' . $e->getMessage());
    // Fall back to demo mode if database unavailable
    $userManager = null;
    
    if (env('APP_ENV') === 'production') {
        // In production, don't expose database errors
        jsonResponse([
            'success' => false,
            'error' => 'Service temporarily unavailable. Please try again later.'
        ], 503);
    }
}

// Main request handling
try {
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    debugLog("Auth API request", [
        'action' => $action,
        'method' => $_SERVER['REQUEST_METHOD'],
        'has_database' => $userManager !== null,
        'app_env' => env('APP_ENV')
    ]);
    
    switch ($action) {
        case 'csrf_token':
            handleCSRFToken();
            break;
            
        case 'login':
            handleLogin($userManager);
            break;
            
        case 'register':
            handleRegister($userManager);
            break;
            
        case 'logout':
            handleLogout();
            break;
            
        case 'check_session':
            checkSession();
            break;
            
        case 'user_stats':
            handleUserStats($userManager);
            break;
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Invalid action specified',
                'available_actions' => ['csrf_token', 'login', 'register', 'logout', 'check_session', 'user_stats']
            ], 400);
    }
    
} catch (Exception $e) {
    debugLog('Auth API Error: ' . $e->getMessage());
    jsonResponse([
        'success' => false,
        'error' => env('APP_DEBUG', false) ? $e->getMessage() : 'Service temporarily unavailable'
    ], 500);
}

/**
 * Handle CSRF token generation with .env configuration
 */
function handleCSRFToken() {
    try {
        $tokenLifetime = env('CSRF_TOKEN_LIFETIME', 3600);
        
        if (empty($_SESSION['csrf_token']) || (time() - ($_SESSION['csrf_token_time'] ?? 0)) > $tokenLifetime) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            $_SESSION['csrf_token_time'] = time();
        }
        
        debugLog('CSRF token generated/refreshed');
        
        jsonResponse([
            'success' => true,
            'csrf_token' => $_SESSION['csrf_token'],
            'expires_in' => $tokenLifetime - (time() - $_SESSION['csrf_token_time']),
            'timestamp' => time()
        ]);
        
    } catch (Exception $e) {
        debugLog('CSRF token generation failed: ' . $e->getMessage());
        
        // Fallback token generation
        $_SESSION['csrf_token'] = md5(uniqid(rand(), true) . time());
        $_SESSION['csrf_token_time'] = time();
        
        jsonResponse([
            'success' => true,
            'csrf_token' => $_SESSION['csrf_token'],
            'expires_in' => 3600,
            'fallback' => true
        ]);
    }
}

/**
 * Handle login requests
 */
function handleLogin($userManager) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'POST method required'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    
    if (empty($input)) {
        jsonResponse(['success' => false, 'error' => 'No data received'], 400);
    }
    
    $email = sanitizeInput($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $userType = sanitizeInput($input['user_type'] ?? 'user');
    
    // Validation
    $errors = [];
    if (empty($email) || !isValidEmail($email)) {
        $errors[] = 'Valid email address is required';
    }
    if (empty($password)) {
        $errors[] = 'Password is required';
    }
    
    if (!empty($errors)) {
        jsonResponse([
            'success' => false,
            'error' => implode('. ', $errors),
            'errors' => $errors
        ], 400);
    }
    
    try {
        // Try database authentication first
        if ($userManager) {
            $user = $userManager->authenticateUser($email, $password);
        } else {
            // Fallback to demo authentication
            $user = authenticateDemo($email, $password);
        }
        
        // Set session data
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_type'] = $user['user_type'];
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();
        
        // Get redirect URLs from environment
        $redirectUrls = [
            'admin' => env('ADMIN_URL', './admin-dashboard.html'),
            'volunteer' => env('VOLUNTEER_DASHBOARD_URL', './volunteer-dashboard.html'),
            'user' => env('USER_DASHBOARD_URL', './dashboard.html')
        ];
        
        debugLog('Login successful', [
            'email' => $email,
            'user_type' => $user['user_type'],
            'user_id' => $user['id']
        ]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Login successful',
            'user' => $user,
            'redirect_url' => $redirectUrls[$user['user_type']] ?? './dashboard.html',
            'session_id' => session_id()
        ]);
        
    } catch (Exception $e) {
        debugLog('Login failed', ['email' => $email, 'error' => $e->getMessage()]);
        
        jsonResponse([
            'success' => false,
            'error' => $e->getMessage()
        ], 401);
    }
}

/**
 * Handle registration requests
 */
function handleRegister($userManager) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'POST method required'], 405);
    }
    
    // Check if registration is enabled
    if (!env('VOLUNTEER_REGISTRATION_ENABLED', true)) {
        jsonResponse([
            'success' => false,
            'error' => 'Registration is currently disabled'
        ], 403);
    }
    
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    
    if (empty($input)) {
        jsonResponse(['success' => false, 'error' => 'No data received'], 400);
    }
    
    // Sanitize and validate input
    $userData = [
        'name' => sanitizeInput($input['name'] ?? ''),
        'email' => sanitizeInput($input['email'] ?? ''),
        'phone' => sanitizeInput($input['phone'] ?? ''),
        'password' => $input['password'] ?? '',
        'confirm_password' => $input['confirm_password'] ?? '',
        'user_type' => sanitizeInput($input['user_type'] ?? 'user'),
        'newsletter' => isset($input['newsletter']) && $input['newsletter']
    ];
    
    // Validation
    $errors = [];
    $minNameLength = env('NAME_MIN_LENGTH', 2);
    
    if (empty($userData['name']) || strlen($userData['name']) < $minNameLength) {
        $errors[] = "Name must be at least {$minNameLength} characters long";
    }
    
    if (empty($userData['email']) || !isValidEmail($userData['email'])) {
        $errors[] = 'Valid email address is required';
    }
    
    if (empty($userData['password']) || !isValidPassword($userData['password'])) {
        $minLength = env('PASSWORD_MIN_LENGTH', 6);
        $errors[] = "Password must be at least {$minLength} characters long";
    }
    
    if ($userData['password'] !== $userData['confirm_password']) {
        $errors[] = 'Passwords do not match';
    }
    
    if (!empty($errors)) {
        jsonResponse([
            'success' => false,
            'error' => implode('. ', $errors),
            'errors' => $errors
        ], 400);
    }
    
    try {
        if ($userManager) {
            // Real database registration
            $userId = $userManager->registerUser($userData);
            
            debugLog('User registered successfully', [
                'user_id' => $userId,
                'email' => $userData['email'],
                'name' => $userData['name']
            ]);
            
            $message = 'Registration successful!';
            if (env('EMAIL_VERIFICATION_ENABLED', false)) {
                $message .= ' Please check your email to verify your account.';
            } else {
                $message .= ' You can now log in.';
            }
            
            jsonResponse([
                'success' => true,
                'message' => $message,
                'user_id' => $userId,
                'user_data' => [
                    'name' => $userData['name'],
                    'email' => $userData['email'],
                    'user_type' => $userData['user_type']
                ],
                'email_verification_required' => env('EMAIL_VERIFICATION_ENABLED', false)
            ]);
            
        } else {
            // Demo mode - just return success
            debugLog('Demo registration successful', $userData);
            
            jsonResponse([
                'success' => true,
                'message' => 'Registration successful! You can now log in.',
                'user_id' => rand(100, 999),
                'demo_mode' => true,
                'note' => 'Running in demo mode - no data was actually saved'
            ]);
        }
        
    } catch (Exception $e) {
        debugLog('Registration failed', ['email' => $userData['email'], 'error' => $e->getMessage()]);
        
        jsonResponse([
            'success' => false,
            'error' => $e->getMessage()
        ], 400);
    }
}

/**
 * Demo authentication fallback
 */
function authenticateDemo($email, $password) {
    $validCredentials = [
        env('ADMIN_EMAIL', 'admin@sadgurubharadwaja.org') => [
            'password' => 'admin123',
            'name' => 'System Administrator',
            'user_type' => 'admin',
            'id' => 1
        ],
        'volunteer@sadgurubharadwaja.org' => [
            'password' => 'volunteer123',
            'name' => 'Volunteer User',
            'user_type' => 'volunteer',
            'id' => 2
        ],
        'donor@sadgurubharadwaja.org' => [
            'password' => 'donor123',
            'name' => 'Donor User',
            'user_type' => 'user',
            'id' => 3
        ]
    ];
    
    if (isset($validCredentials[$email]) && $validCredentials[$email]['password'] === $password) {
        return $validCredentials[$email];
    } else {
        throw new Exception('Invalid email or password');
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    debugLog('Logout', ['user_id' => $_SESSION['user_id'] ?? 'not logged in']);
    
    $_SESSION = [];
    
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    session_destroy();
    
    jsonResponse([
        'success' => true,
        'message' => 'Logged out successfully',
        'redirect_url' => env('FRONTEND_URL', './login.html')
    ]);
}

/**
 * Check session status
 */
function checkSession() {
    $isLoggedIn = !empty($_SESSION['user_id']);
    $sessionTimeout = env('SESSION_LIFETIME', 7200);
    
    if ($isLoggedIn) {
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $sessionTimeout) {
            session_destroy();
            jsonResponse([
                'authenticated' => false,
                'error' => 'Session expired',
                'redirect_url' => env('FRONTEND_URL', './login.html')
            ]);
        }
        
        $_SESSION['last_activity'] = time();
        
        jsonResponse([
            'authenticated' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'] ?? 'User',
                'email' => $_SESSION['user_email'] ?? '',
                'user_type' => $_SESSION['user_type'] ?? 'user'
            ],
            'session_info' => [
                'login_time' => $_SESSION['login_time'] ?? 0,
                'last_activity' => $_SESSION['last_activity'],
                'expires_in' => $sessionTimeout - (time() - $_SESSION['last_activity'])
            ]
        ]);
        
    } else {
        jsonResponse([
            'authenticated' => false,
            'message' => 'Not logged in'
        ]);
    }
}

/**
 * Handle user statistics (admin only)
 */
function handleUserStats($userManager) {
    if (empty($_SESSION['user_id']) || $_SESSION['user_type'] !== 'admin') {
        jsonResponse([
            'success' => false,
            'error' => 'Admin access required'
        ], 403);
    }
    
    try {
        if ($userManager) {
            $stats = $userManager->getUserStats();
            jsonResponse([
                'success' => true,
                'stats' => $stats
            ]);
        } else {
            jsonResponse([
                'success' => false,
                'error' => 'Database not available'
            ], 503);
        }
    } catch (Exception $e) {
        debugLog('User stats error: ' . $e->getMessage());
        jsonResponse([
            'success' => false,
            'error' => 'Failed to retrieve user statistics'
        ], 500);
    }
}

?>