<?php
require_once '../includes/database.php';
require_once '../includes/functions.php';

header('Content-Type: application/json');

$db = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';

        if ($action === 'login') {
            login($db, $input);
        } elseif ($action === 'register') {
            register($db, $input);
        } elseif ($action === 'logout') {
            logout();
        } else {
            response(['error' => 'Invalid action'], 400);
        }
        break;

    case 'GET':
        if (isset($_GET['action']) && $_GET['action'] === 'verify') {
            verifySession($db);
        } else {
            response(['error' => 'Invalid request'], 400);
        }
        break;

    default:
        response(['error' => 'Method not allowed'], 405);
}

function login($db, $data) {
    try {
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $userType = $data['user_type'] ?? '';

        if (empty($email) || empty($password) || empty($userType)) {
            response(['error' => 'All fields are required'], 400);
        }

        $user = $db->fetchOne(
            "SELECT * FROM users WHERE email = ? AND user_type = ? AND is_active = 1",
            [$email, $userType]
        );

        if (!$user || !password_verify($password, $user['password'])) {
            response(['error' => 'Invalid credentials'], 401);
        }

        // Create session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_type'] = $user['user_type'];
        $_SESSION['user_name'] = $user['name'];

        // Update last login
        $db->update('users', ['updated_at' => date('Y-m-d H:i:s')], 'id = ?', [$user['id']]);

        response([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'user_type' => $user['user_type']
            ],
            'redirect' => getDashboardUrl($user['user_type'])
        ]);

    } catch (Exception $e) {
        response(['error' => 'Login failed'], 500);
    }
}

function register($db, $data) {
    try {
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $phone = $data['phone'] ?? '';
        $password = $data['password'] ?? '';
        $userType = $data['user_type'] ?? '';

        if (empty($name) || empty($email) || empty($password) || empty($userType)) {
            response(['error' => 'All fields are required'], 400);
        }

        // Check if user already exists
        $existingUser = $db->fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
        if ($existingUser) {
            response(['error' => 'User already exists with this email'], 400);
        }

        // Create new user
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $userId = $db->insert('users', [
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password' => $hashedPassword,
            'user_type' => $userType
        ]);

        if ($userId) {
            response(['success' => true, 'message' => 'Registration successful']);
        } else {
            response(['error' => 'Registration failed'], 500);
        }

    } catch (Exception $e) {
        response(['error' => 'Registration failed'], 500);
    }
}

function logout() {
    session_destroy();
    response(['success' => true, 'message' => 'Logged out successfully']);
}

function verifySession($db) {
    if (isset($_SESSION['user_id'])) {
        $user = $db->fetchOne("SELECT id, name, email, user_type FROM users WHERE id = ?", [$_SESSION['user_id']]);
        if ($user) {
            response(['success' => true, 'user' => $user]);
        }
    }
    response(['error' => 'Not authenticated'], 401);
}

function getDashboardUrl($userType) {
    $urls = [
        'admin' => 'admin-dashboard.html',
        'volunteer' => 'volunteer-dashboard.html',
        'user' => 'user-dashboard.html'
    ];
    return $urls[$userType] ?? 'index.html';
}
?>
