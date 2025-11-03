<?php
/**
 * PRODUCTION Auth API - Sai Seva Foundation
 * Secure authentication with proper CSRF, database, and session management
 * 
 * @version 2.0.0
 * @author Sai Seva Foundation Development Team
 */

// Load environment configuration
require_once '../includes/config.php';
require_once '../includes/database.php';
require_once '../includes/security.php';
require_once '../includes/logger.php';

// Set production security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// CORS headers for production
$allowedOrigins = [
    'https://sadgurubharadwaja.org',
    'https://www.sadgurubharadwaja.org'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize security and session
Security::startSecureSession();
$logger = new Logger('auth');
$db = Database::getInstance();

try {
    // Rate limiting
    $rateLimiter = new RateLimiter($db);
    $clientId = Security::getClientIdentifier();
    
    if (!$rateLimiter->isAllowed($clientId, 'auth_api', 20, 900)) { // 20 requests per 15 minutes
        $logger->warning('Rate limit exceeded', ['client_id' => $clientId, 'ip' => $_SERVER['REMOTE_ADDR']]);
        response(['error' => 'Rate limit exceeded. Please try again later.'], 429);
    }
    
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    // Log API access
    $logger->info('Auth API accessed', [
        'action' => $action,
        'ip' => $_SERVER['REMOTE_ADDR'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
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
            handleCheckSession();
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
            
        case 'verify_email':
            handleEmailVerification();
            break;
            
        default:
            response(['error' => 'Invalid action specified'], 400);
    }
    
} catch (Exception $e) {
    $logger->error('Auth API Error', [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'ip' => $_SERVER['REMOTE_ADDR']
    ]);
    
    response(['error' => 'Authentication service temporarily unavailable'], 500);
}

/**
 * Generate secure CSRF token
 */
function handleCSRFToken() {
    try {
        $token = Security::generateCSRFToken();
        
        response([
            'success' => true,
            'csrf_token' => $token,
            'expires_in' => 3600 // 1 hour
        ]);
    } catch (Exception $e) {
        global $logger;
        $logger->error('CSRF token generation failed', ['error' => $e->getMessage()]);
        response(['error' => 'Failed to generate security token'], 500);
    }
}

/**
 * Handle user login with security measures
 */
function handleLogin() {
    global $db, $logger, $rateLimiter, $clientId;
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = Security::getJsonInput();
    
    // Validate CSRF token
    if (!Security::validateCSRFToken($input['csrf_token'] ?? '')) {
        $logger->warning('CSRF token validation failed', ['ip' => $_SERVER['REMOTE_ADDR']]);
        response(['error' => 'Invalid security token'], 403);
    }
    
    // Additional rate limiting for login attempts
    if (!$rateLimiter->isAllowed($clientId, 'login_attempts', 5, 300)) { // 5 attempts per 5 minutes
        $logger->warning('Login rate limit exceeded', ['ip' => $_SERVER['REMOTE_ADDR']]);
        response(['error' => 'Too many login attempts. Please try again in 5 minutes.'], 429);
    }
    
    // Validate input
    $validation = validateLoginInput($input);
    if ($validation !== true) {
        response(['error' => $validation], 400);
    }
    
    $email = strtolower(trim($input['email']));
    $password = $input['password'];
    $userType = $input['user_type'] ?? 'user';
    $rememberMe = !empty($input['remember_me']);
    
    try {
        // Get user from database
        $user = $db->fetchOne(
            "SELECT id, name, email, password_hash, user_type, status, 
                    failed_login_attempts, last_failed_login, email_verified,
                    created_at, last_login, two_factor_enabled, two_factor_secret
             FROM users 
             WHERE email = ? AND deleted_at IS NULL",
            [$email]
        );
        
        if (!$user) {
            // Prevent user enumeration - same response time as real user
            password_verify($password, '$2y$10$dummy.hash.to.prevent.timing.attacks');
            $logger->warning('Login attempt with non-existent email', ['email' => $email, 'ip' => $_SERVER['REMOTE_ADDR']]);
            response(['error' => 'Invalid credentials'], 401);
        }
        
        // Check account status
        if ($user['status'] !== 'active') {
            $logger->warning('Login attempt on inactive account', ['user_id' => $user['id'], 'status' => $user['status']]);
            response(['error' => 'Account is inactive. Please contact support.'], 403);
        }
        
        // Check email verification
        if (!$user['email_verified']) {
            response([
                'error' => 'Email not verified. Please check your email for verification link.',
                'requires_verification' => true
            ], 403);
        }
        
        // Check account lockout
        if ($user['failed_login_attempts'] >= 5) {
            $lockoutTime = strtotime($user['last_failed_login']) + (15 * 60); // 15 minutes
            if (time() < $lockoutTime) {
                $remainingTime = $lockoutTime - time();
                $logger->warning('Login attempt on locked account', ['user_id' => $user['id']]);
                response(['error' => "Account locked. Try again in {$remainingTime} seconds."], 423);
            }
        }
        
        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            // Increment failed attempts
            $db->execute(
                "UPDATE users SET failed_login_attempts = failed_login_attempts + 1, last_failed_login = NOW() WHERE id = ?",
                [$user['id']]
            );
            
            $logger->warning('Failed login attempt', ['user_id' => $user['id'], 'ip' => $_SERVER['REMOTE_ADDR']]);
            response(['error' => 'Invalid credentials'], 401);
        }
        
        // Check user type authorization
        if ($userType !== 'user' && $user['user_type'] !== $userType) {
            $logger->warning('Unauthorized user type access attempt', [
                'user_id' => $user['id'],
                'requested_type' => $userType,
                'actual_type' => $user['user_type']
            ]);
            response(['error' => 'Insufficient privileges'], 403);
        }
        
        // Check if password needs rehashing (security improvement)
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $db->execute("UPDATE users SET password_hash = ? WHERE id = ?", [$newHash, $user['id']]);
        }
        
        // Handle two-factor authentication
        if ($user['two_factor_enabled']) {
            // Generate and store 2FA challenge
            $challenge = Security::generate2FAChallenge($user['id']);
            
            response([
                'success' => true,
                'requires_2fa' => true,
                'challenge_token' => $challenge,
                'message' => 'Please enter your 2FA code'
            ]);
        }
        
        // Successful login
        loginSuccess($user, $rememberMe);
        
    } catch (Exception $e) {
        $logger->error('Login process error', ['error' => $e->getMessage(), 'email' => $email]);
        response(['error' => 'Login failed. Please try again.'], 500);
    }
}

/**
 * Handle user registration with email verification
 */
function handleRegister() {
    global $db, $logger;
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = Security::getJsonInput();
    
    // Validate CSRF token
    if (!Security::validateCSRFToken($input['csrf_token'] ?? '')) {
        response(['error' => 'Invalid security token'], 403);
    }
    
    // Validate input
    $validation = validateRegistrationInput($input);
    if ($validation !== true) {
        response(['error' => $validation], 400);
    }
    
    $name = trim($input['name']);
    $email = strtolower(trim($input['email']));
    $password = $input['password'];
    $userType = $input['user_type'] ?? 'user';
    $phone = trim($input['phone'] ?? '');
    
    try {
        // Check if email already exists
        $existingUser = $db->fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
        if ($existingUser) {
            response(['error' => 'Email address is already registered'], 409);
        }
        
        // Check if phone already exists (if provided)
        if (!empty($phone)) {
            $existingPhone = $db->fetchOne("SELECT id FROM users WHERE phone = ?", [$phone]);
            if ($existingPhone) {
                response(['error' => 'Phone number is already registered'], 409);
            }
        }
        
        // Hash password
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        
        // Generate verification token
        $verificationToken = bin2hex(random_bytes(32));
        
        // Insert user
        $userId = $db->insert('users', [
            'name' => $name,
            'email' => $email,
            'password_hash' => $passwordHash,
            'user_type' => $userType,
            'phone' => $phone,
            'status' => 'active',
            'email_verified' => false,
            'verification_token' => $verificationToken,
            'created_at' => date('Y-m-d H:i:s'),
            'ip_address' => $_SERVER['REMOTE_ADDR']
        ]);
        
        // Send verification email
        try {
            EmailService::sendVerificationEmail($email, $name, $verificationToken);
        } catch (Exception $e) {
            $logger->warning('Failed to send verification email', [
                'user_id' => $userId,
                'email' => $email,
                'error' => $e->getMessage()
            ]);
        }
        
        // Log successful registration
        $logger->info('User registered successfully', [
            'user_id' => $userId,
            'email' => $email,
            'user_type' => $userType
        ]);
        
        response([
            'success' => true,
            'message' => 'Registration successful! Please check your email to verify your account.',
            'user_id' => $userId,
            'requires_verification' => true
        ]);
        
    } catch (Exception $e) {
        $logger->error('Registration error', ['error' => $e->getMessage(), 'email' => $email]);
        response(['error' => 'Registration failed. Please try again.'], 500);
    }
}

/**
 * Handle successful login process
 */
function loginSuccess($user, $rememberMe = false) {
    global $db, $logger;
    
    // Clear failed login attempts
    $db->execute("UPDATE users SET failed_login_attempts = 0, last_login = NOW() WHERE id = ?", [$user['id']]);
    
    // Create session
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_type'] = $user['user_type'];
    $_SESSION['login_time'] = time();
    $_SESSION['csrf_token'] = Security::generateCSRFToken();
    
    // Handle "Remember Me"
    if ($rememberMe) {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $expires = date('Y-m-d H:i:s', time() + (30 * 24 * 60 * 60)); // 30 days
        
        // Store remember token in database
        $db->insert('remember_tokens', [
            'user_id' => $user['id'],
            'token_hash' => $tokenHash,
            'expires_at' => $expires,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        // Set secure cookie
        $cookieOptions = [
            'expires' => time() + (30 * 24 * 60 * 60),
            'path' => '/',
            'domain' => $_ENV['COOKIE_DOMAIN'] ?? '',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Strict'
        ];
        
        setcookie('remember_token', $token, $cookieOptions);
    }
    
    // Log successful login
    $logger->info('User logged in successfully', [
        'user_id' => $user['id'],
        'email' => $user['email'],
        'ip' => $_SERVER['REMOTE_ADDR'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
    
    // Determine redirect URL
    $redirectUrl = match($user['user_type']) {
        'admin' => '/admin-dashboard.html',
        'volunteer' => '/volunteer-dashboard.html',
        default => '/user-dashboard.html'
    };
    
    response([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'user_type' => $user['user_type'],
            'last_login' => $user['last_login']
        ],
        'redirect_url' => $redirectUrl,
        'csrf_token' => $_SESSION['csrf_token']
    ]);
}

/**
 * Handle logout with proper cleanup
 */
function handleLogout() {
    global $db, $logger;
    
    $userId = $_SESSION['user_id'] ?? null;
    
    // Clean remember token if exists
    if (!empty($_COOKIE['remember_token'])) {
        $token = $_COOKIE['remember_token'];
        $tokenHash = hash('sha256', $token);
        
        $db->execute("DELETE FROM remember_tokens WHERE token_hash = ?", [$tokenHash]);
        
        // Clear cookie
        setcookie('remember_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => $_ENV['COOKIE_DOMAIN'] ?? '',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
    }
    
    // Clear session
    session_destroy();
    session_start();
    session_regenerate_id(true);
    
    if ($userId) {
        $logger->info('User logged out', ['user_id' => $userId]);
    }
    
    response([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
}

/**
 * Validate login input
 */
function validateLoginInput($input) {
    if (empty($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        return 'Valid email address is required';
    }
    
    if (empty($input['password']) || strlen($input['password']) < 6) {
        return 'Password is required';
    }
    
    $allowedUserTypes = ['user', 'volunteer', 'admin'];
    if (!empty($input['user_type']) && !in_array($input['user_type'], $allowedUserTypes)) {
        return 'Invalid user type';
    }
    
    return true;
}

/**
 * Validate registration input
 */
function validateRegistrationInput($input) {
    if (empty($input['name']) || strlen(trim($input['name'])) < 2) {
        return 'Name must be at least 2 characters long';
    }
    
    if (empty($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        return 'Valid email address is required';
    }
    
    if (empty($input['password'])) {
        return 'Password is required';
    }
    
    if (strlen($input['password']) < 8) {
        return 'Password must be at least 8 characters long';
    }
    
    if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/', $input['password'])) {
        return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if ($input['password'] !== $input['confirm_password']) {
        return 'Passwords do not match';
    }
    
    if (!empty($input['phone'])) {
        $phone = preg_replace('/\D/', '', $input['phone']);
        if (strlen($phone) < 10 || strlen($phone) > 15) {
            return 'Invalid phone number';
        }
    }
    
    return true;
}

/**
 * Send JSON response
 */
function response($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

?>