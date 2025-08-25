<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../includes/database.php';
require_once '../includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response(['error' => 'Method not allowed'], 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    // Process donation (integrate with PhonePe)
    $db = Database::getInstance();
    
    $donationData = [
        'transaction_id' => $input['transaction_id'],
        'donor_name' => sanitizeInput($input['donor_name']),
        'donor_email' => sanitizeInput($input['donor_email']),
        'donor_phone' => sanitizeInput($input['donor_phone']),
        'amount' => floatval($input['amount']),
        'cause' => $input['cause'],
        'frequency' => $input['frequency'] ?? 'one-time',
        'status' => 'pending'
    ];
    
    $donationId = $db->insert('donations', $donationData);
    
    // Generate PhonePe payment URL (simplified)
    $paymentUrl = "https://checkout.phonepe.com/payment/initiate"; // Replace with actual PhonePe integration
    
    response([
        'success' => true,
        'donation_id' => $donationId,
        'payment_url' => $paymentUrl
    ]);
    
} catch (Exception $e) {
    response(['error' => $e->getMessage()], 400);
}
?>
