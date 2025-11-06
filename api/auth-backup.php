<?php
/**
 * UPDATED WORKING AUTH API - Sai Seva Foundation
 * Enhanced version specifically for login page fixes
 * Includes better error handling and debugging
 * 
 * @version 2.1.0
 * @author Sai Seva Foundation Development Team
 */

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors in response
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

// Function to send JSON response
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Function to log debug info
function debugLog($message, $data = null) {
    $logMessage = date('[Y-m-d H:i:s] ') . $message;
    if ($data !== null) {
        $logMessage .= ' | Data: ' . json_encode($data);
    }
    error_log($logMessage);
}

// Enhanced input sanitization
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

// Validate email format
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Validate password strength
function isValidPassword($password) {
    return strlen($password) >= 6;
}

try {
    // Get action from request
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    debugLog("Auth API called", [
        'action' => $action,
        'method' => $_SERVER['REQUEST_METHOD'],
        'session_id' => session_id()
    ]);
    
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
            
        case 'debug':
            handleDebug();
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
        'error' => 'Service temporarily unavailable',
        'debug' => $e->getMessage()
    ], 500);
}

/**
 * Generate and return CSRF token
 */
function handleCSRFToken() {
    try {
        // Generate new token if not exists or expired
        if (empty($_SESSION['csrf_token']) || (time() - ($_SESSION['csrf_token_time'] ?? 0)) > 3600) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            $_SESSION['csrf_token_time'] = time();
        }
        
        debugLog('CSRF token generated/refreshed');
        
        jsonResponse([
            'success' => true,
            'csrf_token' => $_SESSION['csrf_token'],
            'expires_in' => 3600 - (time() - $_SESSION['csrf_token_time']),
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
function handleLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'POST method required'], 405);
    }
    
    // Get input data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        $input = $_POST; // Fallback to form data
    }
    
    debugLog('Login attempt', ['email' => $input['email'] ?? 'not provided']);
    
    if (empty($input)) {
        jsonResponse(['success' => false, 'error' => 'No data received'], 400);
    }
    
    // Validate input
    $email = sanitizeInput($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $userType = sanitizeInput($input['user_type'] ?? 'user');
    
    $errors = [];
    
    if (empty($email)) {
        $errors[] = 'Email is required';
    } elseif (!isValidEmail($email)) {
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
    
    // Demo authentication (replace with database lookup in production)
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
        'user@sadgurubharadwaja.org' => [
            'password' => 'user123',
            'name' => 'Regular User',
            'user_type' => 'user',
            'id' => 3
        ]
    ];
    
    if (isset($validCredentials[$email]) && $validCredentials[$email]['password'] === $password) {
        $user = $validCredentials[$email];
        
        // Set session data
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $email;
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_type'] = $user['user_type'];
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();
        
        // Determine redirect URL based on user type
        $redirectUrls = [
            'admin' => './admin-dashboard.html',
            'volunteer' => './volunteer-dashboard.html',
            'user' => './dashboard.html'
        ];
        
        debugLog('Login successful', ['email' => $email, 'user_type' => $user['user_type']]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $email,
                'user_type' => $user['user_type']
            ],
            'redirect_url' => $redirectUrls[$user['user_type']] ?? './dashboard.html',
            'session_id' => session_id()
        ]);
        
    } else {
        debugLog('Login failed', ['email' => $email, 'reason' => 'invalid_credentials']);
        
        jsonResponse([
            'success' => false,
            'error' => 'Invalid email or password',
            'available_accounts' => array_keys($validCredentials) // Remove in production
        ], 401);
    }
}

/**
 * Handle registration requests
 */
function handleRegister() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'error' => 'POST method required'], 405);
    }
    
    // Get input data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        $input = $_POST; // Fallback to form data
    }
    
    debugLog('Registration attempt', ['email' => $input['email'] ?? 'not provided']);
    
    if (empty($input)) {
        jsonResponse(['success' => false, 'error' => 'No data received'], 400);
    }
    
    // Validate input
    $name = sanitizeInput($input['name'] ?? '');
    $email = sanitizeInput($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? '';
    $userType = sanitizeInput($input['user_type'] ?? 'user');
    
    $errors = [];
    
    if (empty($name) || strlen($name) < 2) {
        $errors[] = 'Name must be at least 2 characters long';
    }
    
    if (empty($email)) {
        $errors[] = 'Email is required';
    } elseif (!isValidEmail($email)) {
        $errors[] = 'Valid email address is required';
    }
    
    if (empty($password)) {
        $errors[] = 'Password is required';
    } elseif (!isValidPassword($password)) {
        $errors[] = 'Password must be at least 6 characters long';
    }
    
    if ($password !== $confirmPassword) {
        $errors[] = 'Passwords do not match';
    }
    
    // Check if user already exists (demo check)
    $existingUsers = [
        'admin@sadgurubharadwaja.org',
        'volunteer@sadgurubharadwaja.org',
        'user@sadgurubharadwaja.org'
    ];
    
    if (in_array($email, $existingUsers)) {
        $errors[] = 'An account with this email already exists';
    }
    
    if (!empty($errors)) {
        jsonResponse([
            'success' => false,
            'error' => implode('. ', $errors),
            'errors' => $errors
        ], 400);
    }
    
    // In production, save to database
    // For demo, just return success
    debugLog('Registration successful', ['email' => $email, 'name' => $name]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Registration successful! You can now log in.',
        'user_id' => rand(100, 999),
        'redirect_to_login' => true
    ]);
}

/**
 * Handle logout requests
 */
function handleLogout() {
    debugLog('Logout', ['user_id' => $_SESSION['user_id'] ?? 'not logged in']);
    
    // Clear session data
    $_SESSION = [];
    
    // Destroy session cookie
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    // Destroy session
    session_destroy();
    
    jsonResponse([
        'success' => true,
        'message' => 'Logged out successfully',
        'redirect_url' => './login.html'
    ]);
}

/**
 * Check current session status
 */
function checkSession() {
    $isLoggedIn = !empty($_SESSION['user_id']);
    
    if ($isLoggedIn) {
        // Check session timeout (30 minutes)
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > 1800) {
            session_destroy();
            jsonResponse([
                'authenticated' => false,
                'error' => 'Session expired',
                'redirect_url' => './login.html'
            ]);
        }
        
        // Update last activity
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

/**
 * Debug endpoint for troubleshooting
 */
function handleDebug() {
    // Only enable in development
    $debugInfo = [
        'php_version' => phpversion(),
        'session_status' => session_status(),
        'session_id' => session_id(),
        'session_data' => $_SESSION,
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
        'input_data' => file_get_contents('php://input'),
        'get_data' => $_GET,
        'post_data' => $_POST,
        'server_time' => date('Y-m-d H:i:s'),
        'timezone' => date_default_timezone_get()
    ];
    
    debugLog('Debug info requested');
    
    jsonResponse([
        'success' => true,
        'debug_info' => $debugInfo,
        'note' => 'Remove this endpoint in production'
    ]);
}

?>

<?php
/* 
USAGE INSTRUCTIONS:

1. Save this file as 'auth.php' in your '/api/' folder
2. Make sure your web server has PHP enabled
3. Test the endpoint: yoursite.com/api/auth.php?action=csrf_token

DEFAULT LOGIN CREDENTIALS:
- Admin: admin@sadgurubharadwaja.org / admin123
- Volunteer: volunteer@sadgurubharadwaja.org / volunteer123  
- User: user@sadgurubharadwaja.org / user123

DEBUGGING:
- Check server error logs for detailed debug info
- Use ?action=debug to see system information
- Browser console will show API responses

SECURITY NOTES:
- Remove debug endpoint in production
- Replace demo authentication with database lookup
- Use proper password hashing (password_hash/password_verify)
- Implement rate limiting for login attempts
- Use HTTPS in production
*/
?>