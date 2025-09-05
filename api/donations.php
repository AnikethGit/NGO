<?php
/**
 * PRODUCTION Donations API - Sai Seva Foundation
 * Handles donation processing, PhonePe integration, and donation management
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
    $action = $_GET['action'] ?? $_POST['action'] ?? 'create';
    
    // Rate limiting check
    if (!checkRateLimit($_SERVER['REMOTE_ADDR'], 'donations_api')) {
        response(['error' => 'Too many requests. Please try again later.'], 429);
    }
    
    // Log API access
    logEvent('INFO', "Donations API accessed: {$action} from IP: {$_SERVER['REMOTE_ADDR']}");
    
    switch ($action) {
        case 'create':
            handleCreateDonation();
            break;
            
        case 'verify':
            handleVerifyDonation();
            break;
            
        case 'status':
            handleDonationStatus();
            break;
            
        case 'receipt':
            handleGenerateReceipt();
            break;
            
        case 'list':
            handleListDonations();
            break;
            
        case 'analytics':
            handleDonationAnalytics();
            break;
            
        default:
            response(['error' => 'Invalid action specified'], 400);
    }
    
} catch (Exception $e) {
    logEvent('ERROR', 'Donations API Error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
    response(['error' => 'Donation service temporarily unavailable'], 500);
}

/**
 * Handle donation creation and PhonePe payment initiation
 */
function handleCreateDonation() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        response(['error' => 'No data received'], 400);
    }
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        logEvent('WARNING', 'CSRF token validation failed for donation from IP: ' . $_SERVER['REMOTE_ADDR']);
        response(['error' => 'Invalid security token'], 403);
    }
    
    // Validate and sanitize donation data
    $donationData = validateDonationData($input);
    
    if (isset($donationData['errors'])) {
        response(['error' => implode('. ', $donationData['errors'])], 400);
    }
    
    try {
        $db = Database::getInstance();
        
        // Check for duplicate transaction ID
        $existingDonation = $db->fetchOne(
            "SELECT id FROM donations WHERE transaction_id = ?",
            [$donationData['transaction_id']]
        );
        
        if ($existingDonation) {
            response(['error' => 'Duplicate transaction detected'], 400);
        }
        
        // Generate receipt number
        $receiptNumber = generateReceiptNumber();
        
        // Prepare donation record
        $donationRecord = [
            'transaction_id' => $donationData['transaction_id'],
            'receipt_number' => $receiptNumber,
            'donor_name' => $donationData['donor_name'],
            'donor_email' => $donationData['donor_email'],
            'donor_phone' => $donationData['donor_phone'],
            'donor_address' => $donationData['donor_address'],
            'donor_pan' => $donationData['donor_pan'],
            'amount' => $donationData['amount'],
            'cause' => $donationData['cause'],
            'frequency' => $donationData['frequency'],
            'anonymous' => $donationData['anonymous'] ? 1 : 0,
            'updates' => $donationData['updates'] ? 1 : 0,
            'status' => 'pending',
            'payment_method' => 'phonepe',
            'ip_address' => $_SERVER['REMOTE_ADDR'],
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        // Insert donation record
        $donationId = $db->insert('donations', $donationRecord);
        
        // Create PhonePe payment request
        $paymentData = createPhonePePayment($donationData, $donationId);
        
        if (!$paymentData['success']) {
            // Update donation status to failed
            $db->execute(
                "UPDATE donations SET status = 'failed', failure_reason = ? WHERE id = ?",
                [$paymentData['error'], $donationId]
            );
            
            response(['error' => 'Payment gateway error: ' . $paymentData['error']], 500);
        }
        
        // Update donation with payment details
        $db->execute(
            "UPDATE donations SET payment_id = ?, payment_url = ? WHERE id = ?",
            [$paymentData['payment_id'], $paymentData['payment_url'], $donationId]
        );
        
        // Log successful donation creation
        logEvent('INFO', "Donation created: ID {$donationId} | Amount: ₹{$donationData['amount']} | Email: {$donationData['donor_email']}");
        
        // Send confirmation email
        try {
            sendDonationConfirmation($donationData, $donationId, $receiptNumber);
        } catch (Exception $e) {
            logEvent('WARNING', 'Failed to send donation confirmation email: ' . $e->getMessage());
        }
        
        response([
            'success' => true,
            'donation_id' => $donationId,
            'receipt_number' => $receiptNumber,
            'payment_url' => $paymentData['payment_url'],
            'payment_id' => $paymentData['payment_id'],
            'expires_at' => date('Y-m-d H:i:s', strtotime('+15 minutes')),
            'message' => 'Donation created successfully. Redirecting to payment gateway.'
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Donation creation error: ' . $e->getMessage());
        response(['error' => 'Failed to process donation. Please try again.'], 500);
    }
}

/**
 * Handle donation verification after payment completion
 */
function handleVerifyDonation() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['transaction_id'])) {
        response(['error' => 'Transaction ID is required'], 400);
    }
    
    try {
        $db = Database::getInstance();
        
        // Get donation details
        $donation = $db->fetchOne(
            "SELECT * FROM donations WHERE transaction_id = ?",
            [$input['transaction_id']]
        );
        
        if (!$donation) {
            response(['error' => 'Donation not found'], 404);
        }
        
        // Verify payment with PhonePe
        $paymentStatus = verifyPhonePePayment($donation['payment_id']);
        
        if ($paymentStatus['success']) {
            // Update donation status
            $db->execute(
                "UPDATE donations SET 
                 status = 'completed', 
                 payment_status = ?, 
                 payment_reference = ?, 
                 completed_at = NOW(),
                 tax_exemption_eligible = 1
                 WHERE id = ?",
                [
                    $paymentStatus['status'],
                    $paymentStatus['reference'] ?? '',
                    $donation['id']
                ]
            );
            
            // Generate and send receipt
            try {
                generateAndSendReceipt($donation['id']);
            } catch (Exception $e) {
                logEvent('WARNING', 'Failed to generate receipt: ' . $e->getMessage());
            }
            
            // Update donation statistics
            updateDonationStatistics($donation['cause'], $donation['amount']);
            
            logEvent('INFO', "Donation completed: ID {$donation['id']} | Amount: ₹{$donation['amount']}");
            
            response([
                'success' => true,
                'status' => 'completed',
                'donation_id' => $donation['id'],
                'receipt_number' => $donation['receipt_number'],
                'message' => 'Thank you for your generous donation!'
            ]);
            
        } else {
            // Update donation status to failed
            $db->execute(
                "UPDATE donations SET status = 'failed', failure_reason = ? WHERE id = ?",
                [$paymentStatus['error'] ?? 'Payment verification failed', $donation['id']]
            );
            
            logEvent('WARNING', "Donation payment failed: ID {$donation['id']} | Reason: " . ($paymentStatus['error'] ?? 'Unknown'));
            
            response([
                'success' => false,
                'status' => 'failed',
                'error' => $paymentStatus['error'] ?? 'Payment verification failed'
            ]);
        }
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Donation verification error: ' . $e->getMessage());
        response(['error' => 'Verification service temporarily unavailable'], 500);
    }
}

/**
 * Get donation status
 */
function handleDonationStatus() {
    $transactionId = $_GET['transaction_id'] ?? '';
    
    if (empty($transactionId)) {
        response(['error' => 'Transaction ID is required'], 400);
    }
    
    try {
        $db = Database::getInstance();
        
        $donation = $db->fetchOne(
            "SELECT id, transaction_id, receipt_number, amount, status, payment_status, 
             created_at, completed_at, cause, anonymous 
             FROM donations WHERE transaction_id = ?",
            [$transactionId]
        );
        
        if (!$donation) {
            response(['error' => 'Donation not found'], 404);
        }
        
        $responseData = [
            'success' => true,
            'donation' => [
                'id' => $donation['id'],
                'transaction_id' => $donation['transaction_id'],
                'receipt_number' => $donation['receipt_number'],
                'amount' => floatval($donation['amount']),
                'cause' => $donation['cause'],
                'status' => $donation['status'],
                'payment_status' => $donation['payment_status'],
                'created_at' => $donation['created_at'],
                'completed_at' => $donation['completed_at']
            ]
        ];
        
        // Don't expose donor information for anonymous donations
        if (!$donation['anonymous']) {
            $donorInfo = $db->fetchOne(
                "SELECT donor_name, donor_email FROM donations WHERE id = ?",
                [$donation['id']]
            );
            $responseData['donation']['donor_name'] = $donorInfo['donor_name'];
            $responseData['donation']['donor_email'] = $donorInfo['donor_email'];
        }
        
        response($responseData);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Donation status error: ' . $e->getMessage());
        response(['error' => 'Status service temporarily unavailable'], 500);
    }
}

/**
 * Validate donation data
 */
function validateDonationData($input) {
    $errors = [];
    $data = [];
    
    // Transaction ID
    $data['transaction_id'] = sanitizeInput($input['transaction_id'] ?? '');
    if (empty($data['transaction_id'])) {
        $errors[] = 'Transaction ID is required';
    }
    
    // Donor information
    $data['donor_name'] = sanitizeInput($input['donor_name'] ?? '');
    if (empty($data['donor_name']) || strlen($data['donor_name']) < 2) {
        $errors[] = 'Donor name must be at least 2 characters long';
    }
    
    $data['donor_email'] = filter_var(trim($input['donor_email'] ?? ''), FILTER_VALIDATE_EMAIL);
    if (!$data['donor_email']) {
        $errors[] = 'Valid email address is required';
    }
    
    // Phone validation (optional)
    $data['donor_phone'] = sanitizeInput($input['donor_phone'] ?? '');
    if (!empty($data['donor_phone'])) {
        $data['donor_phone'] = preg_replace('/\D/', '', $data['donor_phone']);
        if (!validatePhone($data['donor_phone'])) {
            $errors[] = 'Invalid phone number format';
        }
    }
    
    // PAN validation (optional)
    $data['donor_pan'] = strtoupper(sanitizeInput($input['donor_pan'] ?? ''));
    if (!empty($data['donor_pan']) && !validatePAN($data['donor_pan'])) {
        $errors[] = 'Invalid PAN number format';
    }
    
    // Address (optional)
    $data['donor_address'] = sanitizeInput($input['donor_address'] ?? '');
    
    // Amount validation
    $data['amount'] = floatval($input['amount'] ?? 0);
    if ($data['amount'] < 1 || $data['amount'] > 1000000) {
        $errors[] = 'Donation amount must be between ₹1 and ₹10,00,000';
    }
    
    // Cause validation
    $validCauses = ['general', 'poor-feeding', 'education', 'medical', 'disaster'];
    $data['cause'] = sanitizeInput($input['cause'] ?? 'general');
    if (!in_array($data['cause'], $validCauses)) {
        $errors[] = 'Invalid cause selected';
    }
    
    // Frequency validation
    $validFrequencies = ['one-time', 'monthly', 'yearly'];
    $data['frequency'] = sanitizeInput($input['frequency'] ?? 'one-time');
    if (!in_array($data['frequency'], $validFrequencies)) {
        $errors[] = 'Invalid frequency selected';
    }
    
    // Boolean fields
    $data['anonymous'] = !empty($input['anonymous']);
    $data['updates'] = !empty($input['updates']);
    
    if (!empty($errors)) {
        return ['errors' => $errors];
    }
    
    return $data;
}

/**
 * Create PhonePe payment request
 */
function createPhonePePayment($donationData, $donationId) {
    try {
        $merchantId = $_ENV['PHONEPE_MERCHANT_ID'] ?? '';
        $saltKey = $_ENV['PHONEPE_SALT_KEY'] ?? '';
        $saltIndex = $_ENV['PHONEPE_SALT_INDEX'] ?? 1;
        $environment = $_ENV['PHONEPE_ENV'] ?? 'UAT';
        
        if (empty($merchantId) || empty($saltKey)) {
            throw new Exception('PhonePe configuration not found');
        }
        
        // Prepare payment request
        $paymentData = [
            'merchantId' => $merchantId,
            'merchantTransactionId' => $donationData['transaction_id'],
            'merchantUserId' => 'USER_' . substr(md5($donationData['donor_email']), 0, 10),
            'amount' => intval($donationData['amount'] * 100), // Convert to paise
            'redirectUrl' => ($_ENV['CALLBACK_URL'] ?? 'https://sadgurubharadwaja.org/payment-callback.php'),
            'redirectMode' => 'POST',
            'callbackUrl' => ($_ENV['CALLBACK_URL'] ?? 'https://sadgurubharadwaja.org/payment-callback.php'),
            'paymentInstrument' => [
                'type' => 'PAY_PAGE'
            ]
        ];
        
        // Encode payload
        $payload = base64_encode(json_encode($paymentData));
        $checksum = hash('sha256', $payload . '/pg/v1/pay' . $saltKey) . '###' . $saltIndex;
        
        // API endpoint
        $apiUrl = $environment === 'PROD' 
            ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
            : 'https://api-preprod.phonepe.com/apis/hermes/pg/v1/pay';
        
        // Make API request
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => json_encode([
                'request' => $payload
            ]),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-VERIFY: ' . $checksum,
                'accept: application/json'
            ],
        ]);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $curlError = curl_error($curl);
        curl_close($curl);
        
        if ($curlError) {
            throw new Exception('Payment gateway connection error: ' . $curlError);
        }
        
        if ($httpCode !== 200) {
            throw new Exception('Payment gateway returned HTTP ' . $httpCode);
        }
        
        $responseData = json_decode($response, true);
        
        if (!$responseData || !$responseData['success']) {
            throw new Exception('Payment gateway error: ' . ($responseData['message'] ?? 'Unknown error'));
        }
        
        return [
            'success' => true,
            'payment_id' => $donationData['transaction_id'],
            'payment_url' => $responseData['data']['instrumentResponse']['redirectInfo']['url']
        ];
        
    } catch (Exception $e) {
        logEvent('ERROR', 'PhonePe payment creation error: ' . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Verify PhonePe payment status
 */
function verifyPhonePePayment($paymentId) {
    try {
        $merchantId = $_ENV['PHONEPE_MERCHANT_ID'] ?? '';
        $saltKey = $_ENV['PHONEPE_SALT_KEY'] ?? '';
        $saltIndex = $_ENV['PHONEPE_SALT_INDEX'] ?? 1;
        $environment = $_ENV['PHONEPE_ENV'] ?? 'UAT';
        
        // Create checksum for verification
        $checksum = hash('sha256', "/pg/v1/status/{$merchantId}/{$paymentId}" . $saltKey) . '###' . $saltIndex;
        
        // API endpoint
        $apiUrl = $environment === 'PROD' 
            ? "https://api.phonepe.com/apis/hermes/pg/v1/status/{$merchantId}/{$paymentId}"
            : "https://api-preprod.phonepe.com/apis/hermes/pg/v1/status/{$merchantId}/{$paymentId}";
        
        // Make API request
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'GET',
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-VERIFY: ' . $checksum,
                'X-MERCHANT-ID: ' . $merchantId,
                'accept: application/json'
            ],
        ]);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $curlError = curl_error($curl);
        curl_close($curl);
        
        if ($curlError) {
            throw new Exception('Payment verification connection error: ' . $curlError);
        }
        
        $responseData = json_decode($response, true);
        
        if ($responseData && $responseData['success'] && $responseData['data']['state'] === 'COMPLETED') {
            return [
                'success' => true,
                'status' => 'completed',
                'reference' => $responseData['data']['transactionId'] ?? ''
            ];
        } else {
            return [
                'success' => false,
                'error' => $responseData['message'] ?? 'Payment not completed'
            ];
        }
        
    } catch (Exception $e) {
        logEvent('ERROR', 'PhonePe payment verification error: ' . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Generate unique receipt number
 */
function generateReceiptNumber() {
    $year = date('Y');
    $month = date('m');
    $day = date('d');
    $random = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
    
    return "SSF{$year}{$month}{$day}{$random}";
}

/**
 * Send donation confirmation email
 */
function sendDonationConfirmation($donationData, $donationId, $receiptNumber) {
    $subject = "Donation Confirmation - Sai Seva Foundation";
    
    $message = "Dear {$donationData['donor_name']},\n\n";
    $message .= "Thank you for your generous donation to Sai Seva Foundation!\n\n";
    $message .= "Donation Details:\n";
    $message .= "Receipt Number: {$receiptNumber}\n";
    $message .= "Amount: ₹" . number_format($donationData['amount'], 2) . "\n";
    $message .= "Cause: " . ucfirst(str_replace('-', ' ', $donationData['cause'])) . "\n";
    $message .= "Transaction ID: {$donationData['transaction_id']}\n";
    $message .= "Date: " . date('d M Y, h:i A') . "\n\n";
    $message .= "Your donation is being processed. You will receive a tax exemption receipt once the payment is confirmed.\n\n";
    $message .= "Thank you for supporting our mission to serve the community.\n\n";
    $message .= "Best regards,\n";
    $message .= "Sai Seva Foundation Team\n";
    $message .= ($_ENV['BASE_URL'] ?? 'https://sadgurubharadwaja.org');
    
    $headers = "From: " . ($_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@sadgurubharadwaja.org') . "\r\n";
    $headers .= "Reply-To: " . ($_ENV['SUPPORT_EMAIL'] ?? 'support@sadgurubharadwaja.org') . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    if (!mail($donationData['donor_email'], $subject, $message, $headers)) {
        throw new Exception('Failed to send donation confirmation email');
    }
}

/**
 * Update donation statistics
 */
function updateDonationStatistics($cause, $amount) {
    try {
        $db = Database::getInstance();
        
        // Update cause-wise statistics
        $db->execute(
            "INSERT INTO donation_statistics (cause, total_amount, total_count, last_updated) 
             VALUES (?, ?, 1, NOW()) 
             ON DUPLICATE KEY UPDATE 
             total_amount = total_amount + VALUES(total_amount), 
             total_count = total_count + 1, 
             last_updated = NOW()",
            [$cause, $amount]
        );
        
        // Update monthly statistics
        $month = date('Y-m');
        $db->execute(
            "INSERT INTO monthly_donation_stats (month, total_amount, total_count, last_updated) 
             VALUES (?, ?, 1, NOW()) 
             ON DUPLICATE KEY UPDATE 
             total_amount = total_amount + VALUES(total_amount), 
             total_count = total_count + 1, 
             last_updated = NOW()",
            [$month, $amount]
        );
        
    } catch (Exception $e) {
        logEvent('WARNING', 'Failed to update donation statistics: ' . $e->getMessage());
    }
}

?>