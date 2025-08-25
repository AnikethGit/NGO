<?php
// Working auth.php - no database dependency for basic functions
// Check if session is already active before starting
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set proper headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Turn off HTML error display to ensure clean JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'csrf_token':
            // Generate CSRF token
            if (empty($_SESSION['csrf_token'])) {
                $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            }
            
            echo json_encode([
                'success' => true,
                'csrf_token' => $_SESSION['csrf_token']
            ]);
            break;
            
        case 'test':
            echo json_encode([
                'success' => true,
                'message' => 'API is working perfectly!',
                'timestamp' => date('Y-m-d H:i:s'),
                'php_version' => PHP_VERSION,
                'session_status' => session_status() === PHP_SESSION_ACTIVE ? 'active' : 'inactive',
                'session_id' => session_id()
            ]);
            break;
            
        case 'login':
            // Basic login simulation (no database)
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (empty($input['email']) || empty($input['password'])) {
                echo json_encode(['error' => 'Email and password required']);
                break;
            }
            
            // Simple test login (replace with database later)
            if ($input['email'] === 'admin@test.com' && $input['password'] === 'admin123') {
                $_SESSION['user_id'] = 1;
                $_SESSION['user_email'] = $input['email'];
                $_SESSION['user_type'] = 'admin';
                
                echo json_encode([
                    'success' => true,
                    'user' => [
                        'id' => 1,
                        'email' => $input['email'],
                        'type' => 'admin'
                    ]
                ]);
            } else {
                echo json_encode(['error' => 'Invalid credentials']);
            }
            break;
            
        case 'logout':
            session_destroy();
            echo json_encode(['success' => true, 'message' => 'Logged out']);
            break;
            
        default:
            echo json_encode([
                'error' => 'Invalid action',
                'available_actions' => ['csrf_token', 'test', 'login', 'logout']
            ]);
    }
    
} catch (Exception $e) {
    error_log('Auth API Error: ' . $e->getMessage());
    echo json_encode([
        'error' => 'Server error occurred',
        'message' => $e->getMessage()
    ]);
}
?>