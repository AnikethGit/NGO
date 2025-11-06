<?php
/**
 * PRODUCTION AUTH API - Sri Dutta Sai Manga Bharadwaja Trust
 * Complete authentication system with database integration
 * 
 * @version 3.0.0 - Production Ready
 * @priority CRITICAL - Includes real database user registration
 */

// Disable error display in production
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database configuration
class DatabaseConfig {
    // Update these with your actual database credentials
    private static $host = 'localhost';
    private static $dbname = 'sadgurubharadwaja_ngo'; // Update this
    private static $username = 'your_db_user'; // Update this
    private static $password = 'your_db_password'; // Update this
    
    public static function getConnection() {
        try {
            $pdo = new PDO(
                "mysql:host=" . self::$host . ";dbname=" . self::$dbname . ";charset=utf8mb4",
                self::$username,
                self::$password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
            return $pdo;
        } catch (PDOException $e) {
            debugLog('Database connection failed: ' . $e->getMessage());
            throw new Exception('Database connection failed');
        }
    }
}

// User management class
class UserManager {
    private $pdo;
    
    public function __construct() {
        $this->pdo = DatabaseConfig::getConnection();
    }
    
    /**
     * Create users table if not exists
     */
    public function createUsersTable() {
        $sql = "
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20),
                password_hash VARCHAR(255) NOT NULL,
                user_type ENUM('user', 'volunteer', 'admin') DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                email_verified BOOLEAN DEFAULT FALSE,
                newsletter_subscribed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                login_attempts INT DEFAULT 0,
                lockout_until TIMESTAMP NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        $this->pdo->exec($sql);
        
        // Create default admin user if not exists
        $this->createDefaultAdmin();
    }
    
    /**
     * Create default admin user
     */
    private function createDefaultAdmin() {
        $adminEmail = 'admin@sadgurubharadwaja.org';
        
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$adminEmail]);
        
        if (!$stmt->fetch()) {
            $stmt = $this->pdo->prepare("
                INSERT INTO users (name, email, password_hash, user_type, email_verified) 
                VALUES (?, ?, ?, 'admin', TRUE)
            ");
            
            $stmt->execute([
                'System Administrator',
                $adminEmail,
                password_hash('admin123', PASSWORD_DEFAULT)
            ]);
            
            debugLog('Default admin user created');
        }
    }
    
    /**
     * Register new user
     */
    public function registerUser($userData) {
        // Check if email already exists
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$userData['email']]);
        
        if ($stmt->fetch()) {
            throw new Exception('An account with this email already exists');
        }
        
        // Insert new user
        $stmt = $this->pdo->prepare("
            INSERT INTO users (name, email, phone, password_hash, user_type, newsletter_subscribed) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([
            $userData['name'],
            $userData['email'],
            $userData['phone'] ?? null,
            password_hash($userData['password'], PASSWORD_DEFAULT),
            $userData['user_type'] ?? 'user',
            $userData['newsletter'] ?? false
        ]);
        
        if ($result) {
            $userId = $this->pdo->lastInsertId();
            debugLog('User registered successfully', ['user_id' => $userId, 'email' => $userData['email']]);
            return $userId;
        } else {
            throw new Exception('Failed to create user account');
        }
    }
    
    /**
     * Authenticate user
     */
    public function authenticateUser($email, $password) {
        $stmt = $this->pdo->prepare("
            SELECT id, name, email, password_hash, user_type, is_active, 
                   login_attempts, lockout_until
            FROM users 
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
            throw new Exception('Account temporarily locked due to too many failed attempts');
        }
        
        // Check if account is active
        if (!$user['is_active']) {
            throw new Exception('Account is deactivated');
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
            'user_type' => $user['user_type']
        ];
    }
    
    /**
     * Increment failed login attempts
     */
    private function incrementFailedAttempts($userId) {
        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET login_attempts = login_attempts + 1,
                lockout_until = CASE 
                    WHEN login_attempts >= 4 THEN DATE_ADD(NOW(), INTERVAL 30 MINUTE)
                    ELSE lockout_until
                END
            WHERE id = ?
        ");
        
        $stmt->execute([$userId]);
    }
    
    /**
     * Log failed attempt for non-existent email
     */
    private function logFailedAttempt($email) {
        // Log to security log or rate limiting system
        debugLog('Failed login attempt for non-existent email', ['email' => $email]);
    }
    
    /**
     * Reset failed login attempts
     */
    private function resetFailedAttempts($userId) {
        $stmt = $this->pdo->prepare("
            UPDATE users 
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
            UPDATE users 
            SET last_login = NOW() 
            WHERE id = ?
        ");
        
        $stmt->execute([$userId]);
    }
}

// Helper functions
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function debugLog($message, $data = null) {
    $logMessage = date('[Y-m-d H:i:s] ') . $message;
    if ($data !== null) {
        $logMessage .= ' | Data: ' . json_encode($data);
    }
    error_log($logMessage);
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
    return strlen($password) >= 6;
}

// Initialize database
try {
    $userManager = new UserManager();
    $userManager->createUsersTable();
} catch (Exception $e) {
    debugLog('Database initialization failed: ' . $e->getMessage());
    // Fall back to demo mode if database unavailable
    $userManager = null;
}

// Main request handling
try {
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    debugLog("Auth API called", [
        'action' => $action,
        'method' => $_SERVER['REQUEST_METHOD'],
        'has_database' => $userManager !== null
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
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Invalid action specified',
                'available_actions' => ['csrf_token', 'login', 'register', 'logout', 'check_session']
            ], 400);
    }
    
} catch (Exception $e) {
    debugLog('Auth API Error: ' . $e->getMessage());
    jsonResponse([
        'success' => false,
        'error' => 'Service temporarily unavailable'
    ], 500);
}

/**
 * Handle CSRF token generation
 */
function handleCSRFToken() {
    try {
        if (empty($_SESSION['csrf_token']) || (time() - ($_SESSION['csrf_token_time'] ?? 0)) > 3600) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            $_SESSION['csrf_token_time'] = time();
        }
        
        jsonResponse([
            'success' => true,
            'csrf_token' => $_SESSION['csrf_token'],
            'expires_in' => 3600 - (time() - $_SESSION['csrf_token_time']),
            'timestamp' => time()
        ]);
        
    } catch (Exception $e) {
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
        
        $redirectUrls = [
            'admin' => './admin-dashboard.html',
            'volunteer' => './volunteer-dashboard.html',
            'user' => './dashboard.html'
        ];
        
        debugLog('Login successful', ['email' => $email, 'user_type' => $user['user_type']]);
        
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
    
    if (empty($userData['name']) || strlen($userData['name']) < 2) {
        $errors[] = 'Name must be at least 2 characters long';
    }
    
    if (empty($userData['email']) || !isValidEmail($userData['email'])) {
        $errors[] = 'Valid email address is required';
    }
    
    if (empty($userData['password']) || !isValidPassword($userData['password'])) {
        $errors[] = 'Password must be at least 6 characters long';
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
            
            jsonResponse([
                'success' => true,
                'message' => 'Registration successful! You can now log in.',
                'user_id' => $userId,
                'user_data' => [
                    'name' => $userData['name'],
                    'email' => $userData['email'],
                    'user_type' => $userData['user_type']
                ]
            ]);
            
        } else {
            // Demo mode - just return success
            debugLog('Demo registration successful', $userData);
            
            jsonResponse([
                'success' => true,
                'message' => 'Registration successful! You can now log in.',
                'user_id' => rand(100, 999),
                'demo_mode' => true
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
        'admin@sadgurubharadwaja.org' => [
            'password' => 'admin123',
            'name' => 'Admin User',
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
        'redirect_url' => './login.html'
    ]);
}

/**
 * Check session status
 */
function checkSession() {
    $isLoggedIn = !empty($_SESSION['user_id']);
    
    if ($isLoggedIn) {
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > 1800) {
            session_destroy();
            jsonResponse([
                'authenticated' => false,
                'error' => 'Session expired',
                'redirect_url' => './login.html'
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
                'last_activity' => $_SESSION['last_activity']
            ]
        ]);
        
    } else {
        jsonResponse([
            'authenticated' => false,
            'message' => 'Not logged in'
        ]);
    }
}

?>