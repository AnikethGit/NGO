<?php
/**
 * PRODUCTION PhonePe Webhook Handler - Sai Seva Foundation
 * Handles PhonePe payment notifications securely
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

// Load environment configuration
if (file_exists('.env')) {
    $lines = file('.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Security headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

require_once 'includes/database.php';
require_once 'includes/functions.php';

try {
    // Verify webhook authentication
    if (!verifyWebhookAuth()) {
        http_response_code(401);
        exit('Unauthorized');
    }
    
    // Get webhook payload
    $payload = json_decode(file_get_contents('php://input'), true);
    
    if (!$payload) {
        http_response_code(400);
        exit('Invalid payload');
    }
    
    // Log webhook received
    logEvent('INFO', 'Webhook received: ' . json_encode($payload));
    
    // Handle webhook based on event type
    $eventType = $payload['event'] ?? '';
    
    switch ($eventType) {
        case 'checkout.order.completed':
            handlePaymentSuccess($payload);
            break;
            
        case 'checkout.order.failed':
            handlePaymentFailure($payload);
            break;
            
        case 'pg.refund.completed':
            handleRefundCompleted($payload);
            break;
            
        case 'pg.refund.failed':
            handleRefundFailed($payload);
            break;
            
        default:
            logEvent('WARNING', 'Unknown webhook event: ' . $eventType);
    }
    
    // Acknowledge receipt
    http_response_code(200);
    echo json_encode(['status' => 'acknowledged']);
    
} catch (Exception $e) {
    logEvent('ERROR', 'Webhook processing error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Processing failed']);
}

/**
 * Verify webhook authentication using PhonePe's method
 */
function verifyWebhookAuth() {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    
    if (empty($authHeader)) {
        return false;
    }
    
    // PhonePe sends: Authorization: SHA256(username:password)
    $expectedAuth = hash('sha256', $_ENV['PHONEPE_WEBHOOK_USERNAME'] . ':' . $_ENV['PHONEPE_WEBHOOK_PASSWORD']);
    $receivedAuth = str_replace('SHA256 ', '', $authHeader);
    
    return hash_equals($expectedAuth, $receivedAuth);
}

/**
 * Handle successful payment
 */
function handlePaymentSuccess($payload) {
    $db = Database::getInstance();
    
    $merchantOrderId = $payload['payload']['merchantOrderId'] ?? '';
    $orderId = $payload['payload']['orderId'] ?? '';
    $state = $payload['payload']['state'] ?? '';
    $amount = $payload['payload']['amount'] ?? 0;
    
    if ($state !== 'COMPLETED') {
        logEvent('WARNING', 'Payment success webhook but state is not COMPLETED: ' . $state);
        return;
    }
    
    try {
        // Update donation record
        $updated = $db->execute(
            "UPDATE donations SET 
             status = 'completed',
             payment_status = 'success',
             phonepe_order_id = ?,
             completed_at = NOW(),
             webhook_processed_at = NOW()
             WHERE transaction_id = ? AND status = 'pending'",
            [$orderId, $merchantOrderId]
        );
        
        if ($updated) {
            // Get donation details for receipt
            $donation = $db->fetchOne(
                "SELECT * FROM donations WHERE transaction_id = ?",
                [$merchantOrderId]
            );
            
            if ($donation) {
                // Generate and send receipt
                generateTaxReceipt($donation);
                
                // Send thank you email
                sendThankYouEmail($donation);
                
                // Update statistics
                updateDonationStatistics($donation['cause'], $donation['amount']);
                
                logEvent('INFO', "Payment completed successfully: {$merchantOrderId} | Amount: ₹{$amount}");
            }
        } else {
            logEvent('WARNING', "No pending donation found for transaction: {$merchantOrderId}");
        }
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error updating successful payment: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Handle payment failure
 */
function handlePaymentFailure($payload) {
    $db = Database::getInstance();
    
    $merchantOrderId = $payload['payload']['merchantOrderId'] ?? '';
    $state = $payload['payload']['state'] ?? '';
    $errorCode = $payload['payload']['paymentDetails'][0]['errorCode'] ?? 'UNKNOWN';
    
    try {
        // Update donation record
        $updated = $db->execute(
            "UPDATE donations SET 
             status = 'failed',
             payment_status = 'failed',
             failure_reason = ?,
             webhook_processed_at = NOW()
             WHERE transaction_id = ? AND status = 'pending'",
            [$errorCode, $merchantOrderId]
        );
        
        if ($updated) {
            // Get donation details
            $donation = $db->fetchOne(
                "SELECT * FROM donations WHERE transaction_id = ?",
                [$merchantOrderId]
            );
            
            if ($donation) {
                // Send payment failure notification
                sendPaymentFailureEmail($donation, $errorCode);
                
                logEvent('INFO', "Payment failed: {$merchantOrderId} | Error: {$errorCode}");
            }
        }
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error updating failed payment: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Generate and send tax receipt
 */
function generateTaxReceipt($donation) {
    // Implementation for generating 80G tax receipt
    // This would create PDF and email to donor
    
    try {
        // Generate receipt PDF
        $receiptPath = generateReceiptPDF($donation);
        
        // Send email with receipt
        $subject = "Tax Receipt - Donation to Sai Seva Foundation";
        $message = "Thank you for your generous donation. Please find your 80G tax exemption receipt attached.";
        
        sendEmailWithAttachment(
            $donation['donor_email'],
            $donation['donor_name'],
            $subject,
            $message,
            $receiptPath
        );
        
        logEvent('INFO', "Tax receipt generated and sent for donation: {$donation['id']}");
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Failed to generate tax receipt: ' . $e->getMessage());
    }
}

/**
 * Send thank you email
 */
function sendThankYouEmail($donation) {
    $subject = "Thank You for Your Generous Donation - Sai Seva Foundation";
    
    $message = "Dear {$donation['donor_name']},\n\n";
    $message .= "Thank you for your generous donation of ₹" . number_format($donation['amount']) . " to Sai Seva Foundation.\n\n";
    $message .= "Your contribution will make a real difference in the lives of those we serve.\n\n";
    $message .= "Donation Details:\n";
    $message .= "Receipt Number: {$donation['receipt_number']}\n";
    $message .= "Transaction ID: {$donation['transaction_id']}\n";
    $message .= "Date: " . date('d M Y, h:i A') . "\n";
    $message .= "Cause: " . ucfirst(str_replace('-', ' ', $donation['cause'])) . "\n\n";
    $message .= "You will receive your 80G tax exemption certificate shortly.\n\n";
    $message .= "With gratitude,\nSai Seva Foundation Team";
    
    $headers = "From: " . ($_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@yourdomain.com') . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    mail($donation['donor_email'], $subject, $message, $headers);
}
?>
