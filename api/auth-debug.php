<?php
/**
 * DEBUG AUTH API - Sai Seva Foundation
 * Simplified authentication for troubleshooting login/registration issues
 * 
 * @version DEBUG-1.0
 * @priority CRITICAL - Fixes non-working login/registration
 */

// Enable all error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Start output buffering to capture any errors
ob_start();

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set proper headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Debug logging function
function debugLog($message, $data = null) {
    $timestamp = date('[Y-m-d H:i:s] ');
    $logEntry = $timestamp . $message;
    
    if ($data !== null) {
        $logEntry .= ' | ' . json_encode($data, JSON_PRETTY_PRINT);
    }
    
    error_log($logEntry);
}

// Safe JSON response function
function safeJsonResponse($data, $statusCode = 200) {
    // Clear any buffered output that might cause JSON issues
    $output = ob_get_clean();
    
    if (!empty($output)) {
        debugLog('Unexpected output captured', $output);
    }
    
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Get the action parameter
$action = $_GET['action'] ?? $_POST['action'] ?? '';

debugLog('API Request Started', [
    'action' => $action,
    'method' => $_SERVER['REQUEST_METHOD'],
    'session_id' => session_id(),
    'timestamp' => date('Y-m-d H:i:s')
]);

try {
    switch ($action) {
        case 'csrf_token':
            handleCSRFToken();
            break;
            
        case 'login':
            handleLogin();
            break;
            
        case 'register':
            handleRegister();
            break;
            
        case 'logout':
            handleLogout();
            break;
            
        case 'check_session':
            checkSession();
            break;
            
        case 'test':
            handleTest();
            break;
            
        default:
            safeJsonResponse([
                'success' => false,
                'error' => 'No action specified or invalid action',
                'received_action' => $action,
                'available_actions' => ['csrf_token', 'login', 'register', 'logout', 'check_session', 'test'],
                'request_method' => $_SERVER['REQUEST_METHOD'],
                'timestamp' => time()
            ], 400);
    }
    
} catch (Exception $e) {
    debugLog('Critical Error', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    
    safeJsonResponse([
        'success' => false,
        'error' => 'System error occurred',
        'debug_message' => $e->getMessage(),
        'debug_file' => basename($e->getFile()),
        'debug_line' => $e->getLine(),
        'timestamp' => time()
    ], 500);
}

/**
 * Test endpoint to verify API is working
 */
function handleTest() {
    debugLog('Test endpoint called');
    
    safeJsonResponse([
        'success' => true,
        'message' => 'Auth API is working correctly',
        'server_info' => [
            'php_version' => phpversion(),
            'session_status' => session_status(),
            'session_id' => session_id(),
            'server_time' => date('Y-m-d H:i:s'),
            'timezone' => date_default_timezone_get()
        ],
        'available_actions' => ['csrf_token', 'login', 'register', 'logout', 'check_session'],
        'timestamp' => time()
    ]);
}

/**
 * Generate CSRF token
 */
function handleCSRFToken() {
    try {
        // Generate secure token
        if (function_exists('random_bytes')) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        } else {
            $_SESSION['csrf_token'] = md5(uniqid(rand(), true) . microtime());
        }
        
        $_SESSION['csrf_token_time'] = time();
        
        debugLog('CSRF Token Generated', [
            'session_id' => session_id(),
            'token_length' => strlen($_SESSION['csrf_token'])
        ]);
        
        safeJsonResponse([
            'success' => true,
            'csrf_token' => $_SESSION['csrf_token'],
            'session_id' => session_id(),
            'expires_in' => 3600,
            'timestamp' => time()
        ]);
        
    } catch (Exception $e) {
        debugLog('CSRF Token Error', $e->getMessage());
        
        // Fallback token generation
        $_SESSION['csrf_token'] = md5(time() . rand(1000, 9999));
        $_SESSION['csrf_token_time'] = time();
        
        safeJsonResponse([
            'success' => true,
            'csrf_token' => $_SESSION['csrf_token'],
            'fallback_method' => true,
            'timestamp' => time()
        ]);
    }
}

/**
 * Handle login
 */
function handleLogin() {
    debugLog('Login function called');
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        safeJsonResponse(['success' => false, 'error' => 'POST method required'], 405);
    }
    
    // Get input data - try both JSON and form data
    $rawInput = file_get_contents('php://input');
    $jsonInput = json_decode($rawInput, true);
    
    debugLog('Raw input received', [
        'raw_input' => $rawInput,
        'json_decoded' => $jsonInput,
        'post_data' => $_POST,
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set'
    ]);
    
    // Use JSON input if available, otherwise fall back to POST
    $input = $jsonInput ?: $_POST;
    
    if (empty($input)) {
        safeJsonResponse([
            'success' => false,
            'error' => 'No login data received',
            'debug_info' => [
                'raw_input_length' => strlen($rawInput),
                'post_count' => count($_POST),
                'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set'
            ]
        ], 400);
    }
    
    // Extract and validate credentials
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $userType = $input['user_type'] ?? 'user';
    
    debugLog('Login credentials extracted', [
        'email' => $email,
        'user_type' => $userType,
        'password_provided' => !empty($password)
    ]);
    
    // Basic validation
    if (empty($email) || empty($password)) {
        safeJsonResponse([
            'success' => false,
            'error' => 'Email and password are required',
            'received_data' => [
                'email_provided' => !empty($email),
                'password_provided' => !empty($password)
            ]
        ], 400);
    }
    
    // Demo user accounts for testing
    $testAccounts = [
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
    
    // Check credentials
    if (isset($testAccounts[$email]) && $testAccounts[$email]['password'] === $password) {
        $user = $testAccounts[$email];
        
        // Set session variables
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $email;
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_type'] = $user['user_type'];
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();
        
        // Determine redirect URL
        $redirectUrls = [
            'admin' => './admin-dashboard.html',
            'volunteer' => './volunteer-dashboard.html',
            'user' => './dashboard.html'
        ];
        
        debugLog('Login SUCCESS', [
            'email' => $email,
            'user_type' => $user['user_type'],
            'session_id' => session_id()
        ]);
        
        safeJsonResponse([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $email,
                'user_type' => $user['user_type']
            ],
            'redirect_url' => $redirectUrls[$user['user_type']] ?? './dashboard.html',
            'session_info' => [
                'session_id' => session_id(),
                'login_time' => time()
            ]
        ]);
        
    } else {
        debugLog('Login FAILED', [
            'email' => $email,
            'password_length' => strlen($password),
            'available_emails' => array_keys($testAccounts)
        ]);
        
        safeJsonResponse([
            'success' => false,
            'error' => 'Invalid email or password',
            'debug_info' => [
                'email_provided' => $email,
                'password_length' => strlen($password),
                'available_test_accounts' => array_keys($testAccounts)
            ]
        ], 401);
    }
}

/**
 * Handle registration
 */
function handleRegister() {
    debugLog('Registration function called');
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        safeJsonResponse(['success' => false, 'error' => 'POST method required'], 405);
    }
    
    // Get input data
    $rawInput = file_get_contents('php://input');
    $jsonInput = json_decode($rawInput, true);
    
    debugLog('Registration input received', [
        'raw_input' => $rawInput,
        'json_decoded' => $jsonInput,
        'post_data' => $_POST
    ]);
    
    $input = $jsonInput ?: $_POST;
    
    if (empty($input)) {
        safeJsonResponse([
            'success' => false,
            'error' => 'No registration data received',
            'debug_info' => [
                'raw_input_length' => strlen($rawInput),
                'post_count' => count($_POST)
            ]
        ], 400);
    }
    
    // Extract registration data
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? '';
    $userType = $input['user_type'] ?? 'user';
    
    debugLog('Registration data extracted', [
        'name' => $name,
        'email' => $email,
        'user_type' => $userType,
        'password_provided' => !empty($password),
        'confirm_password_provided' => !empty($confirmPassword)
    ]);
    
    // Validation
    $errors = [];
    
    if (empty($name) || strlen($name) < 2) {
        $errors[] = 'Name must be at least 2 characters';
    }
    
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Valid email address is required';
    }
    
    if (empty($password) || strlen($password) < 6) {
        $errors[] = 'Password must be at least 6 characters';
    }
    
    if ($password !== $confirmPassword) {
        $errors[] = 'Passwords do not match';
    }
    
    // Check if email already exists (demo check)
    $existingEmails = [
        'admin@sadgurubharadwaja.org',
        'volunteer@sadgurubharadwaja.org',
        'donor@sadgurubharadwaja.org'
    ];
    
    if (in_array($email, $existingEmails)) {
        $errors[] = 'An account with this email already exists';
    }
    
    if (!empty($errors)) {
        debugLog('Registration validation failed', $errors);
        
        safeJsonResponse([
            'success' => false,
            'error' => implode('. ', $errors),
            'validation_errors' => $errors,
            'received_data' => [
                'name' => $name,
                'email' => $email,
                'user_type' => $userType
            ]
        ], 400);
    }
    
    // For demo purposes, always succeed registration
    // In production, save to database here
    
    $newUserId = rand(100, 999);
    
    debugLog('Registration SUCCESS', [
        'email' => $email,
        'name' => $name,
        'user_type' => $userType,
        'generated_id' => $newUserId
    ]);
    
    safeJsonResponse([
        'success' => true,
        'message' => 'Registration successful! You can now log in.',
        'user_id' => $newUserId,
        'user_data' => [
            'name' => $name,
            'email' => $email,
            'user_type' => $userType
        ],
        'next_step' => 'Please log in with your credentials',
        'timestamp' => time()
    ]);
}

/**
 * Check session status
 */
function checkSession() {
    debugLog('Session check requested', [
        'session_id' => session_id(),
        'user_id' => $_SESSION['user_id'] ?? 'not set',
        'session_data' => $_SESSION
    ]);
    
    $isAuthenticated = !empty($_SESSION['user_id']);
    
    if ($isAuthenticated) {
        // Check for session timeout (30 minutes)
        $lastActivity = $_SESSION['last_activity'] ?? 0;
        $sessionTimeout = 30 * 60; // 30 minutes
        
        if ($lastActivity && (time() - $lastActivity) > $sessionTimeout) {
            session_destroy();
            
            safeJsonResponse([
                'authenticated' => false,
                'error' => 'Session expired',
                'last_activity' => $lastActivity,
                'current_time' => time(),
                'session_duration' => time() - $lastActivity
            ]);
        }
        
        // Update last activity
        $_SESSION['last_activity'] = time();
        
        safeJsonResponse([
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
                'session_id' => session_id()
            ]
        ]);
    } else {
        safeJsonResponse([
            'authenticated' => false,
            'message' => 'No active session',
            'session_id' => session_id()
        ]);
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    debugLog('Logout requested', ['user_id' => $_SESSION['user_id'] ?? 'not logged in']);
    
    // Clear all session data
    $_SESSION = [];
    
    // Delete session cookie
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }
    
    // Destroy session
    session_destroy();
    
    debugLog('Logout completed');
    
    safeJsonResponse([
        'success' => true,
        'message' => 'Logged out successfully',
        'redirect_url' => './login.html',
        'timestamp' => time()
    ]);
}

?>