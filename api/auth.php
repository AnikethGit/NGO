<?php
/**
 * PRODUCTION Authentication API - Sai Seva Foundation
 * Handles user authentication, registration, and session management
 * Enhanced security with rate limiting, input validation, and comprehensive logging
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

// Start session if not already active
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Load environment configuration
if (file_exists('../.env')) {
    $lines = file('../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Set production headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_ENV['BASE_URL'] ?? 'https://sadgurubharadwaja.org'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Production error handling
ini_set('display_errors', $_ENV['DISPLAY_ERRORS'] ?? '0');
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Include required files
require_once '../includes/database.php';
require_once '../includes/functions.php';

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    // Rate limiting check
    if (!checkRateLimit($_SERVER['REMOTE_ADDR'], $action)) {
        response(['error' => 'Rate limit exceeded. Please try again later.'], 429);
    }
    
    // Log API access
    logEvent('INFO', "Auth API accessed: {$action} from IP: {$_SERVER['REMOTE_ADDR']}");
    
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
            
        case 'forgot_password':
            handleForgotPassword();
            break;
            
        case 'reset_password':
            handleResetPassword();
            break;
            
        case 'change_password':
            handleChangePassword();
            break;
            
        case 'update_profile':
            handleUpdateProfile();
            break;
            
        default:
            response(['error' => 'Invalid action specified'], 400);
    }
    
} catch (Exception $e) {
    logEvent('ERROR', 'Auth API Error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
    response(['error' => 'Authentication service temporarily unavailable'], 500);
}

/**
 * Generate and return CSRF token
 */
function handleCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    
    response([
        'success' => true,
        'csrf_token' => $_SESSION['csrf_token'],
        'expires_in' => $_ENV['SESSION_LIFETIME'] ?? 7200
    ]);
}

/**
 * Handle user login
 */
function handleLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        response(['error' => 'No data received'], 400);
    }
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        logEvent('WARNING', 'CSRF token validation failed for login attempt from IP: ' . $_SERVER['REMOTE_ADDR']);
        response(['error' => 'Invalid security token'], 403);
    }
    
    // Sanitize and validate input
    $email = filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $password = $input['password'] ?? '';
    $userType = sanitizeInput($input['user_type'] ?? '');
    $rememberMe = !empty($input['remember_me']);
    
    if (!$email || empty($password) || empty($userType)) {
        response(['error' => 'All fields are required'], 400);
    }
    
    if (!in_array($userType, ['admin', 'volunteer', 'user'])) {
        response(['error' => 'Invalid user type'], 400);
    }
    
    // Check if account is locked
    if (isAccountLocked($email)) {
        logEvent('WARNING', "Login attempt to locked account: {$email}");
        response(['error' => 'Account temporarily locked due to multiple failed login attempts'], 423);
    }
    
    try {
        $db = Database::getInstance();
        
        // Fetch user with additional security checks
        $user = $db->fetchOne(
            "SELECT id, name, email, password, user_type, status, last_login_at, failed_login_attempts, locked_until 
             FROM users 
             WHERE email = ? AND user_type = ?",
            [$email, $userType]
        );
        
        if (!$user) {
            recordFailedLogin($email);
            logEvent('WARNING', "Login attempt with non-existent email: {$email}");
            response(['error' => 'Invalid email or password'], 401);
        }
        
        if ($user['status'] !== 'active') {
            logEvent('WARNING', "Login attempt to inactive account: {$email}");
            response(['error' => 'Account is not active. Please contact administrator.'], 403);
        }
        
        // Verify password
        if (!password_verify($password, $user['password'])) {
            recordFailedLogin($email);
            logEvent('WARNING', "Failed login attempt for: {$email}");
            response(['error' => 'Invalid email or password'], 401);
        }
        
        // Reset failed login attempts on successful login
        resetFailedLogins($email);
        
        // Update last login information
        $db->execute(
            "UPDATE users SET last_login_at = NOW(), last_login_ip = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
            [$_SERVER['REMOTE_ADDR'], $user['id']]
        );
        
        // Set session data
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_type'] = $user['user_type'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['login_time'] = time();
        $_SESSION['login_ip'] = $_SERVER['REMOTE_ADDR'];
        
        // Set remember me cookie if requested
        if ($rememberMe) {
            $cookieToken = bin2hex(random_bytes(32));
            $expiry = time() + (30 * 24 * 60 * 60); // 30 days
            
            // Store remember token in database
            $db->execute(
                "UPDATE users SET remember_token = ?, remember_token_expires = FROM_UNIXTIME(?) WHERE id = ?",
                [password_hash($cookieToken, PASSWORD_DEFAULT), $expiry, $user['id']]
            );
            
            // Set secure cookie
            setcookie('remember_token', $cookieToken, $expiry, '/', '', true, true);
        }
        
        // Regenerate session ID for security
        session_regenerate_id(true);
        
        logEvent('INFO', "Successful login: {$email} as {$userType}");
        
        response([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'user_type' => $user['user_type'],
                'last_login' => $user['last_login_at']
            ],
            'redirect_url' => getUserRedirectURL($user['user_type'])
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Login error: ' . $e->getMessage());
        response(['error' => 'Login service temporarily unavailable'], 500);
    }
}

/**
 * Handle user registration
 */
function handleRegister() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        response(['error' => 'No data received'], 400);
    }
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        response(['error' => 'Invalid security token'], 403);
    }
    
    // Sanitize and validate input
    $name = sanitizeInput($input['name'] ?? '');
    $email = filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $phone = sanitizeInput($input['phone'] ?? '');
    $password = $input['password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? '';
    $userType = sanitizeInput($input['user_type'] ?? '');
    $agreeTerms = !empty($input['agree_terms']);
    $agreePrivacy = !empty($input['agree_privacy']);
    
    // Comprehensive validation
    $errors = [];
    
    if (empty($name) || strlen($name) < 2) {
        $errors[] = 'Name must be at least 2 characters long';
    }
    
    if (!$email) {
        $errors[] = 'Valid email address is required';
    }
    
    if (!empty($phone) && !validatePhone($phone)) {
        $errors[] = 'Invalid phone number format';
    }
    
    if (empty($password)) {
        $errors[] = 'Password is required';
    } elseif (!isStrongPassword($password)) {
        $errors[] = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    }
    
    if ($password !== $confirmPassword) {
        $errors[] = 'Passwords do not match';
    }
    
    if (!in_array($userType, ['user', 'volunteer'])) {
        $errors[] = 'Invalid user type';
    }
    
    if (!$agreeTerms) {
        $errors[] = 'You must agree to the terms and conditions';
    }
    
    if (!$agreePrivacy) {
        $errors[] = 'You must agree to the privacy policy';
    }
    
    if (!empty($errors)) {
        response(['error' => implode('. ', $errors)], 400);
    }
    
    try {
        $db = Database::getInstance();
        
        // Check if email already exists
        $existingUser = $db->fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
        if ($existingUser) {
            response(['error' => 'An account with this email already exists'], 400);
        }
        
        // Check if phone number already exists (if provided)
        if (!empty($phone)) {
            $cleanPhone = preg_replace('/\D/', '', $phone);
            $existingPhone = $db->fetchOne("SELECT id FROM users WHERE phone = ?", [$cleanPhone]);
            if ($existingPhone) {
                response(['error' => 'An account with this phone number already exists'], 400);
            }
            $phone = $cleanPhone;
        }
        
        // Hash password with Argon2ID (most secure)
        $hashedPassword = password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3
        ]);
        
        // Generate email verification token
        $verificationToken = bin2hex(random_bytes(32));
        
        // Insert new user
        $userId = $db->insert('users', [
            'name' => $name,
            'email' => $email,
            'phone' => $phone ?: null,
            'password' => $hashedPassword,
            'user_type' => $userType,
            'status' => 'active', // Change to 'pending' if email verification is required
            'email_verification_token' => $verificationToken,
            'created_at' => date('Y-m-d H:i:s'),
            'registration_ip' => $_SERVER['REMOTE_ADDR']
        ]);
        
        // Create additional records based on user type
        if ($userType === 'volunteer') {
            $db->insert('volunteers', [
                'user_id' => $userId,
                'status' => 'pending',
                'skills' => $input['skills'] ?? null,
                'availability' => $input['availability'] ?? null,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
        
        // Send welcome email (implement email service)
        try {
            sendWelcomeEmail($email, $name, $verificationToken);
        } catch (Exception $e) {
            logEvent('WARNING', 'Failed to send welcome email to: ' . $email . ' | Error: ' . $e->getMessage());
        }
        
        logEvent('INFO', "New user registered: {$email} as {$userType}");
        
        response([
            'success' => true,
            'message' => 'Registration successful! Welcome to Sai Seva Foundation.',
            'user_id' => $userId,
            'next_step' => $userType === 'volunteer' ? 'complete_volunteer_profile' : 'explore_website'
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Registration error: ' . $e->getMessage());
        response(['error' => 'Registration service temporarily unavailable'], 500);
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    if (!empty($_SESSION['user_id'])) {
        logEvent('INFO', "User logged out: {$_SESSION['user_email']}");
    }
    
    // Clear remember me cookie
    if (isset($_COOKIE['remember_token'])) {
        setcookie('remember_token', '', time() - 3600, '/', '', true, true);
        
        // Remove remember token from database
        if (!empty($_SESSION['user_id'])) {
            try {
                $db = Database::getInstance();
                $db->execute(
                    "UPDATE users SET remember_token = NULL, remember_token_expires = NULL WHERE id = ?",
                    [$_SESSION['user_id']]
                );
            } catch (Exception $e) {
                logEvent('ERROR', 'Error clearing remember token: ' . $e->getMessage());
            }
        }
    }
    
    // Destroy session
    session_destroy();
    
    response([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
}

/**
 * Check current session status
 */
function checkSession() {
    if (empty($_SESSION['user_id'])) {
        response(['authenticated' => false]);
    }
    
    // Check session timeout
    $sessionLifetime = $_ENV['SESSION_LIFETIME'] ?? 7200;
    if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > $sessionLifetime) {
        session_destroy();
        response(['authenticated' => false, 'reason' => 'Session expired']);
    }
    
    // Verify user still exists and is active
    try {
        $db = Database::getInstance();
        $user = $db->fetchOne(
            "SELECT id, name, email, user_type, status FROM users WHERE id = ? AND status = 'active'",
            [$_SESSION['user_id']]
        );
        
        if (!$user) {
            session_destroy();
            response(['authenticated' => false, 'reason' => 'User account not found']);
        }
        
        response([
            'authenticated' => true,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'user_type' => $user['user_type']
            ],
            'session_expires_in' => $sessionLifetime - (time() - $_SESSION['login_time'])
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Session check error: ' . $e->getMessage());
        response(['authenticated' => false, 'reason' => 'Session verification failed']);
    }
}

/**
 * Handle forgot password request
 */
function handleForgotPassword() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['email'])) {
        response(['error' => 'Email address is required'], 400);
    }
    
    $email = filter_var(trim($input['email']), FILTER_VALIDATE_EMAIL);
    
    if (!$email) {
        response(['error' => 'Valid email address is required'], 400);
    }
    
    try {
        $db = Database::getInstance();
        
        // Check if user exists
        $user = $db->fetchOne(
            "SELECT id, name, email FROM users WHERE email = ? AND status = 'active'",
            [$email]
        );
        
        // Always return success for security (don't reveal if email exists)
        if ($user) {
            // Generate reset token
            $resetToken = bin2hex(random_bytes(32));
            $resetExpiry = date('Y-m-d H:i:s', strtotime('+1 hour'));
            
            // Store reset token
            $db->execute(
                "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?",
                [$resetToken, $resetExpiry, $user['id']]
            );
            
            // Send reset email
            try {
                sendPasswordResetEmail($user['email'], $user['name'], $resetToken);
                logEvent('INFO', "Password reset requested for: {$email}");
            } catch (Exception $e) {
                logEvent('ERROR', 'Failed to send password reset email: ' . $e->getMessage());
            }
        } else {
            logEvent('WARNING', "Password reset requested for non-existent email: {$email}");
        }
        
        response([
            'success' => true,
            'message' => 'If an account with this email exists, you will receive a password reset link shortly.'
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Forgot password error: ' . $e->getMessage());
        response(['error' => 'Password reset service temporarily unavailable'], 500);
    }
}

/**
 * Helper function to get user redirect URL based on user type
 */
function getUserRedirectURL($userType) {
    switch ($userType) {
        case 'admin':
            return '/admin-dashboard.html';
        case 'volunteer':
            return '/volunteer-dashboard.html';
        default:
            return '/';
    }
}

/**
 * Send welcome email to new users
 */
function sendWelcomeEmail($email, $name, $verificationToken) {
    $subject = "Welcome to Sai Seva Foundation!";
    $message = "Dear {$name},\n\nWelcome to Sai Seva Foundation! Thank you for joining our community.\n\n";
    $message .= "Your account has been created successfully. You can now log in and explore our services.\n\n";
    $message .= "Best regards,\nSai Seva Foundation Team";
    
    $headers = "From: " . ($_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@sadgurubharadwaja.org') . "\r\n";
    $headers .= "Reply-To: " . ($_ENV['SUPPORT_EMAIL'] ?? 'support@sadgurubharadwaja.org') . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    // Use mail() function or integrate with proper email service (SMTP)
    if (!mail($email, $subject, $message, $headers)) {
        throw new Exception('Failed to send email');
    }
}

/**
 * Send password reset email
 */
function sendPasswordResetEmail($email, $name, $resetToken) {
    $resetUrl = ($_ENV['BASE_URL'] ?? 'https://sadgurubharadwaja.org') . "/reset-password.html?token={$resetToken}";
    
    $subject = "Password Reset - Sai Seva Foundation";
    $message = "Dear {$name},\n\n";
    $message .= "You have requested to reset your password. Click the link below to create a new password:\n\n";
    $message .= "{$resetUrl}\n\n";
    $message .= "This link will expire in 1 hour. If you did not request this reset, please ignore this email.\n\n";
    $message .= "Best regards,\nSai Seva Foundation Team";
    
    $headers = "From: " . ($_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@sadgurubharadwaja.org') . "\r\n";
    $headers .= "Reply-To: " . ($_ENV['SUPPORT_EMAIL'] ?? 'support@sadgurubharadwaja.org') . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    if (!mail($email, $subject, $message, $headers)) {
        throw new Exception('Failed to send password reset email');
    }
}

?>