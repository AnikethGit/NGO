<?php
// Working contact.php - handles form submissions
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Turn off HTML error display
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Include helper functions
require_once '../includes/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response(['error' => 'Method not allowed'], 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        throw new Exception('No data received');
    }
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    // Sanitize input
    $data = [
        'first_name' => sanitizeInput($input['first_name'] ?? ''),
        'last_name' => sanitizeInput($input['last_name'] ?? ''),
        'email' => sanitizeInput($input['email'] ?? ''),
        'phone' => sanitizeInput($input['phone'] ?? ''),
        'subject' => sanitizeInput($input['subject'] ?? ''),
        'message' => sanitizeInput($input['message'] ?? '')
    ];
    
    // Validate required fields
    if (empty($data['first_name']) || empty($data['last_name']) || 
        empty($data['email']) || empty($data['subject']) || empty($data['message'])) {
        throw new Exception('All required fields must be filled');
    }
    
    // Validate email
    if (!validateEmail($data['email'])) {
        throw new Exception('Invalid email address');
    }
    
    // Validate phone if provided
    if (!empty($data['phone']) && !validatePhone($data['phone'])) {
        throw new Exception('Invalid phone number');
    }
    
    // Validate message length
    if (strlen($data['message']) < 10) {
        throw new Exception('Message must be at least 10 characters long');
    }
    
    // Clean phone number
    if (!empty($data['phone'])) {
        $data['phone'] = preg_replace('/\D/', '', $data['phone']);
    }
    
    $db = Database::getInstance();
    
    // Insert contact message (will be logged since database is simulated)
    $messageId = $db->insert('contact_messages', $data);
    
    // Also save to a text file for testing
    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $contactLog = $logDir . '/contact_messages.txt';
    $logEntry = sprintf(
        "[%s] ID: %d\nName: %s %s\nEmail: %s\nPhone: %s\nSubject: %s\nMessage: %s\n%s\n",
        date('Y-m-d H:i:s'),
        $messageId,
        $data['first_name'],
        $data['last_name'],
        $data['email'],
        $data['phone'] ?: 'Not provided',
        $data['subject'],
        $data['message'],
        str_repeat('-', 50)
    );
    
    file_put_contents($contactLog, $logEntry, FILE_APPEND | LOCK_EX);
    
    // Log the contact attempt
    logEvent('INFO', "Contact message received from: {$data['email']} - ID: {$messageId}");
    
    response([
        'success' => true,
        'message' => 'Message sent successfully',
        'id' => $messageId
    ]);
    
} catch (Exception $e) {
    logEvent('ERROR', 'Contact form error: ' . $e->getMessage());
    response(['error' => $e->getMessage()], 400);
}
?>