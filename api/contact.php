<?php
/**
 * PRODUCTION Contact API - Sai Seva Foundation
 * Handles contact form submissions with comprehensive validation and security
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response(['error' => 'Method not allowed'], 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        throw new Exception('No data received');
    }
    
    // Rate limiting check
    if (!checkRateLimit($_SERVER['REMOTE_ADDR'], 'contact_form')) {
        response(['error' => 'Too many submissions. Please try again later.'], 429);
    }
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        logEvent('WARNING', 'CSRF token validation failed for contact form from IP: ' . $_SERVER['REMOTE_ADDR']);
        response(['error' => 'Invalid security token'], 403);
    }
    
    // Sanitize and validate input data
    $data = [
        'first_name' => sanitizeInput($input['first_name'] ?? ''),
        'last_name' => sanitizeInput($input['last_name'] ?? ''),
        'email' => filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL),
        'phone' => sanitizeInput($input['phone'] ?? ''),
        'subject' => sanitizeInput($input['subject'] ?? ''),
        'message' => sanitizeInput($input['message'] ?? ''),
        'category' => sanitizeInput($input['category'] ?? 'general'),
        'priority' => sanitizeInput($input['priority'] ?? 'medium'),
        'source' => sanitizeInput($input['source'] ?? 'website')
    ];
    
    // Comprehensive validation
    $errors = validateContactData($data);
    
    if (!empty($errors)) {
        response(['error' => implode('. ', $errors)], 400);
    }
    
    // Additional security checks
    if (containsSuspiciousContent($data['message']) || containsSuspiciousContent($data['subject'])) {
        logEvent('WARNING', 'Suspicious content detected in contact form from IP: ' . $_SERVER['REMOTE_ADDR']);
        response(['error' => 'Message content not allowed'], 400);
    }
    
    // Clean phone number
    if (!empty($data['phone'])) {
        $data['phone'] = preg_replace('/\D/', '', $data['phone']);
    }
    
    // Check for duplicate submissions (same email + message in last 5 minutes)
    if (isDuplicateSubmission($data['email'], $data['message'])) {
        response(['error' => 'Duplicate submission detected. Please wait before submitting again.'], 400);
    }
    
    // Prepare data for database insertion
    $contactData = [
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'],
        'email' => $data['email'],
        'phone' => $data['phone'] ?: null,
        'subject' => $data['subject'],
        'message' => $data['message'],
        'category' => $data['category'],
        'priority' => $data['priority'],
        'source' => $data['source'],
        'ip_address' => $_SERVER['REMOTE_ADDR'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'status' => 'unread',
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $db = Database::getInstance();
    
    // Insert contact message into database
    $messageId = $db->insert('contact_messages', $contactData);
    
    // Create notification record for admin
    $notificationData = [
        'type' => 'contact_message',
        'title' => 'New Contact Message',
        'message' => "New message from {$data['first_name']} {$data['last_name']} ({$data['email']})",
        'reference_id' => $messageId,
        'reference_type' => 'contact_message',
        'priority' => $data['priority'],
        'status' => 'unread',
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $db->insert('notifications', $notificationData);
    
    // Send acknowledgment email to user
    try {
        sendContactAcknowledgment($data, $messageId);
    } catch (Exception $e) {
        logEvent('WARNING', 'Failed to send contact acknowledgment email: ' . $e->getMessage());
    }
    
    // Send notification email to admin
    try {
        sendAdminNotification($data, $messageId);
    } catch (Exception $e) {
        logEvent('WARNING', 'Failed to send admin notification email: ' . $e->getMessage());
    }
    
    // Update contact statistics
    updateContactStatistics($data['category'], $data['source']);
    
    // Log successful contact submission
    logEvent('INFO', "Contact message received from: {$data['email']} | ID: {$messageId} | Subject: {$data['subject']}");
    
    // Prepare success response
    $response = [
        'success' => true,
        'message' => 'Thank you for your message! We will get back to you soon.',
        'id' => $messageId,
        'estimated_response_time' => getEstimatedResponseTime($data['priority']),
        'reference_number' => 'SSF-' . str_pad($messageId, 6, '0', STR_PAD_LEFT)
    ];
    
    response($response);
    
} catch (Exception $e) {
    logEvent('ERROR', 'Contact form error: ' . $e->getMessage());
    response(['error' => 'Failed to send message. Please try again or contact us directly.'], 500);
}

/**
 * Validate contact form data
 */
function validateContactData($data) {
    $errors = [];
    
    // Required field validation
    if (empty($data['first_name']) || strlen($data['first_name']) < 2) {
        $errors[] = 'First name must be at least 2 characters long';
    }
    
    if (empty($data['last_name']) || strlen($data['last_name']) < 2) {
        $errors[] = 'Last name must be at least 2 characters long';
    }
    
    if (!$data['email']) {
        $errors[] = 'Valid email address is required';
    }
    
    if (empty($data['subject']) || strlen($data['subject']) < 5) {
        $errors[] = 'Subject must be at least 5 characters long';
    }
    
    if (empty($data['message']) || strlen($data['message']) < 10) {
        $errors[] = 'Message must be at least 10 characters long';
    }
    
    // Length validation
    if (strlen($data['first_name']) > 50) {
        $errors[] = 'First name cannot exceed 50 characters';
    }
    
    if (strlen($data['last_name']) > 50) {
        $errors[] = 'Last name cannot exceed 50 characters';
    }
    
    if (strlen($data['subject']) > 200) {
        $errors[] = 'Subject cannot exceed 200 characters';
    }
    
    if (strlen($data['message']) > 2000) {
        $errors[] = 'Message cannot exceed 2000 characters';
    }
    
    // Phone validation (if provided)
    if (!empty($data['phone']) && !validatePhone($data['phone'])) {
        $errors[] = 'Invalid phone number format';
    }
    
    // Name validation (letters, spaces, hyphens, apostrophes only)
    if (!preg_match('/^[a-zA-Z\s\-\']+$/', $data['first_name'])) {
        $errors[] = 'First name contains invalid characters';
    }
    
    if (!preg_match('/^[a-zA-Z\s\-\']+$/', $data['last_name'])) {
        $errors[] = 'Last name contains invalid characters';
    }
    
    // Category validation
    $validCategories = ['general', 'volunteer', 'donation', 'partnership', 'media', 'complaint', 'suggestion'];
    if (!in_array($data['category'], $validCategories)) {
        $errors[] = 'Invalid category selected';
    }
    
    // Priority validation
    $validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!in_array($data['priority'], $validPriorities)) {
        $errors[] = 'Invalid priority level';
    }
    
    return $errors;
}

/**
 * Check for suspicious content in message
 */
function containsSuspiciousContent($text) {
    $suspiciousPatterns = [
        '/\b(?:viagra|cialis|casino|poker|loan|mortgage|crypto|bitcoin)\b/i',
        '/\b(?:click here|act now|limited time|urgent|guaranteed)\b/i',
        '/(?:https?:\/\/[^\s]+){3,}/', // Multiple URLs
        '/\$\d+.*(?:million|billion|guaranteed|winner)/i',
        '/(?:forex|trading|investment).*(?:profit|return|guaranteed)/i'
    ];
    
    foreach ($suspiciousPatterns as $pattern) {
        if (preg_match($pattern, $text)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Check for duplicate submissions
 */
function isDuplicateSubmission($email, $message) {
    try {
        $db = Database::getInstance();
        
        $recentSubmission = $db->fetchOne(
            "SELECT id FROM contact_messages 
             WHERE email = ? AND message = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)",
            [$email, $message]
        );
        
        return !empty($recentSubmission);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error checking duplicate submission: ' . $e->getMessage());
        return false; // Don't block on error
    }
}

/**
 * Send acknowledgment email to contact form submitter
 */
function sendContactAcknowledgment($data, $messageId) {
    $subject = "Thank you for contacting Sai Seva Foundation";
    $referenceNumber = 'SSF-' . str_pad($messageId, 6, '0', STR_PAD_LEFT);
    
    $message = "Dear {$data['first_name']} {$data['last_name']},\n\n";
    $message .= "Thank you for reaching out to Sai Seva Foundation. We have received your message and will respond as soon as possible.\n\n";
    $message .= "Message Details:\n";
    $message .= "Reference Number: {$referenceNumber}\n";
    $message .= "Subject: {$data['subject']}\n";
    $message .= "Category: " . ucfirst($data['category']) . "\n";
    $message .= "Estimated Response Time: " . getEstimatedResponseTime($data['priority']) . "\n\n";
    $message .= "Your Message:\n{$data['message']}\n\n";
    $message .= "If this is urgent, you can also call us at [Your Phone Number] or email us directly at " . ($_ENV['SUPPORT_EMAIL'] ?? 'support@sadgurubharadwaja.org') . ".\n\n";
    $message .= "Thank you for supporting our mission to serve the community.\n\n";
    $message .= "Best regards,\n";
    $message .= "Sai Seva Foundation Team\n";
    $message .= ($_ENV['BASE_URL'] ?? 'https://sadgurubharadwaja.org');
    
    $headers = "From: " . ($_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@sadgurubharadwaja.org') . "\r\n";
    $headers .= "Reply-To: " . ($_ENV['SUPPORT_EMAIL'] ?? 'support@sadgurubharadwaja.org') . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    if (!mail($data['email'], $subject, $message, $headers)) {
        throw new Exception('Failed to send acknowledgment email');
    }
}

/**
 * Send notification email to admin
 */
function sendAdminNotification($data, $messageId) {
    $adminEmail = $_ENV['ADMIN_EMAIL'] ?? 'admin@sadgurubharadwaja.org';
    $subject = "New Contact Message - Priority: " . ucfirst($data['priority']);
    $referenceNumber = 'SSF-' . str_pad($messageId, 6, '0', STR_PAD_LEFT);
    
    $message = "New contact message received:\n\n";
    $message .= "Reference Number: {$referenceNumber}\n";
    $message .= "From: {$data['first_name']} {$data['last_name']}\n";
    $message .= "Email: {$data['email']}\n";
    $message .= "Phone: " . ($data['phone'] ?: 'Not provided') . "\n";
    $message .= "Category: " . ucfirst($data['category']) . "\n";
    $message .= "Priority: " . ucfirst($data['priority']) . "\n";
    $message .= "Source: " . ucfirst($data['source']) . "\n";
    $message .= "IP Address: {$_SERVER['REMOTE_ADDR']}\n";
    $message .= "Submitted: " . date('Y-m-d H:i:s') . "\n\n";
    $message .= "Subject: {$data['subject']}\n\n";
    $message .= "Message:\n{$data['message']}\n\n";
    $message .= "---\n";
    $message .= "Manage this message: " . ($_ENV['BASE_URL'] ?? 'https://sadgurubharadwaja.org') . "/admin-dashboard.html?view=contacts&id={$messageId}";
    
    $headers = "From: " . ($_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@sadgurubharadwaja.org') . "\r\n";
    $headers .= "Reply-To: {$data['email']}\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    if (!mail($adminEmail, $subject, $message, $headers)) {
        throw new Exception('Failed to send admin notification email');
    }
}

/**
 * Get estimated response time based on priority
 */
function getEstimatedResponseTime($priority) {
    switch ($priority) {
        case 'urgent':
            return '2-4 hours';
        case 'high':
            return '4-8 hours';
        case 'medium':
            return '1-2 business days';
        case 'low':
            return '2-3 business days';
        default:
            return '1-2 business days';
    }
}

/**
 * Update contact form statistics
 */
function updateContactStatistics($category, $source) {
    try {
        $db = Database::getInstance();
        
        // Update or insert category statistics
        $db->execute(
            "INSERT INTO contact_statistics (category, count, last_updated) 
             VALUES (?, 1, NOW()) 
             ON DUPLICATE KEY UPDATE count = count + 1, last_updated = NOW()",
            [$category]
        );
        
        // Update or insert source statistics
        $db->execute(
            "INSERT INTO contact_sources (source, count, last_updated) 
             VALUES (?, 1, NOW()) 
             ON DUPLICATE KEY UPDATE count = count + 1, last_updated = NOW()",
            [$source]
        );
        
    } catch (Exception $e) {
        logEvent('WARNING', 'Failed to update contact statistics: ' . $e->getMessage());
    }
}

?>