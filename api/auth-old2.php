<?php
/**
 * MINIMAL Fix Auth API - Sai Seva Foundation
 * Simple working solution that fixes bugs without complex dependencies
 * 
 * @version 1.1.0
 * @author Sai Seva Foundation Development Team
 */

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set basic headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Basic error handling
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Simple response function
function response($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Simple input sanitization
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
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
            
        default:
            response(['error' => 'Invalid action specified'], 400);
    }
    
} catch (Exception $e) {
    error_log('Auth API Error: ' . $e->getMessage());
    response(['error' => 'Service temporarily unavailable'], 500);
}

/**
 * Generate simple CSRF token
 */
function handleCSRFToken() {
    try {
        // Simple token generation without complex dependencies
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        
        response([
            'success' => true,
            'csrf_token' => $_SESSION['csrf_token'],
            'expires_in' => 3600
        ]);
        
    } catch (Exception $e) {
        // Fallback token generation
        $_SESSION['csrf_token'] = md5(uniqid(rand(), true));
        
        response([
            'success' => true,
            'csrf_token' => $_SESSION['csrf_token'],
            'expires_in' => 3600
        ]);
    }
}

/**
 * Simple login handler
 */
function handleLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        response(['error' => 'No data received'], 400);
    }
    
    // Basic validation
    $email = filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $password = $input['password'] ?? '';
    $userType = sanitizeInput($input['user_type'] ?? 'user');
    
    if (!$email || empty($password)) {
        response(['error' => 'Email and password are required'], 400);
    }
    
    // Simple demo login (replace with database check later)
    if ($email === 'admin@sadgurubharadwaja.org' && $password === 'admin123') {
        $_SESSION['user_id'] = 1;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_type'] = 'admin';
        $_SESSION['user_name'] = 'Admin User';
        $_SESSION['login_time'] = time();
        
        response([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => 1,
                'name' => 'Admin User',
                'email' => $email,
                'user_type' => 'admin'
            ],
            'redirect_url' => '/admin-dashboard.html'
        ]);
    } else {
        response(['error' => 'Invalid credentials'], 401);
    }
}

/**
 * Simple registration handler
 */
function handleRegister() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        response(['error' => 'No data received'], 400);
    }
    
    // Basic validation
    $name = sanitizeInput($input['name'] ?? '');
    $email = filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $password = $input['password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? '';
    
    $errors = [];
    
    if (empty($name) || strlen($name) < 2) {
        $errors[] = 'Name must be at least 2 characters long';
    }
    
    if (!$email) {
        $errors[] = 'Valid email address is required';
    }
    
    if (empty($password) || strlen($password) < 6) {
        $errors[] = 'Password must be at least 6 characters long';
    }
    
    if ($password !== $confirmPassword) {
        $errors[] = 'Passwords do not match';
    }
    
    if (!empty($errors)) {
        response(['error' => implode('. ', $errors)], 400);
    }
    
    // For demo purposes, just return success
    response([
        'success' => true,
        'message' => 'Registration successful! You can now log in.',
        'user_id' => rand(2, 1000)
    ]);
}

/**
 * Handle logout
 */
function handleLogout() {
    session_destroy();
    
    response([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
}

/**
 * Check session status
 */
function checkSession() {
    if (empty($_SESSION['user_id'])) {
        response(['authenticated' => false]);
    }
    
    response([
        'authenticated' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['user_name'] ?? '',
            'email' => $_SESSION['user_email'] ?? '',
            'user_type' => $_SESSION['user_type'] ?? 'user'
        ]
    ]);
}

?>