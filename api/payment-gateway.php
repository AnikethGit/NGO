<?php
/**
 * PAYMENT GATEWAY SYSTEM - Sri Dutta Sai Manga Bharadwaja Trust
 * PhonePe Payment Gateway Integration Preparation
 * 
 * @version 1.0.0
 * @priority MEDIUM - Payment gateway preparation
 */

require_once 'config/database.php';
require_once 'config/security.php';

class PaymentGateway {
    private $db;
    private $phonepe_merchant_id;
    private $phonepe_salt_key;
    private $phonepe_salt_index;
    private $phonepe_base_url;
    
    public function __construct() {
        $this->db = Database::getConnection();
        $this->initializePhonePeConfig();
    }
    
    /**
     * Initialize PhonePe configuration from environment
     */
    private function initializePhonePeConfig() {
        // Load from .env file or environment variables
        $this->phonepe_merchant_id = $_ENV['PHONEPE_MERCHANT_ID'] ?? '';
        $this->phonepe_salt_key = $_ENV['PHONEPE_SALT_KEY'] ?? '';
        $this->phonepe_salt_index = $_ENV['PHONEPE_SALT_INDEX'] ?? 1;
        $this->phonepe_base_url = $_ENV['PHONEPE_BASE_URL'] ?? 'https://api.phonepe.com/apis/hermes';
        
        // Check if configuration is complete
        if (empty($this->phonepe_merchant_id) || empty($this->phonepe_salt_key)) {
            error_log('PhonePe configuration incomplete in .env file');
        }
    }
    
    /**
     * Initiate payment process
     */
    public function initiatePayment($donationData) {
        try {
            // Validate donation data
            $validatedData = $this->validateDonationData($donationData);
            
            // Generate transaction ID
            $transactionId = $this->generateTransactionId();
            
            // Store donation record
            $donationId = $this->storeDonationRecord($validatedData, $transactionId);
            
            // Prepare PhonePe payment request
            $paymentRequest = $this->preparePhonePeRequest($validatedData, $transactionId);
            
            // Return payment initiation response
            return [
                'success' => true,
                'donation_id' => $donationId,
                'transaction_id' => $transactionId,
                'payment_url' => $paymentRequest['payment_url'],
                'message' => 'Payment initiated successfully'
            ];
            
        } catch (Exception $e) {
            error_log('Payment initiation failed: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Validate donation data
     */
    private function validateDonationData($data) {
        $required_fields = ['amount', 'donor_name', 'donor_email', 'cause'];
        
        foreach ($required_fields as $field) {
            if (empty($data[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }
        
        // Validate amount
        $amount = floatval($data['amount']);
        if ($amount < 1) {
            throw new Exception('Invalid donation amount');
        }
        
        // Validate email
        if (!filter_var($data['donor_email'], FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email address');
        }
        
        // Validate phone (if provided)
        if (!empty($data['donor_phone'])) {
            $phone = preg_replace('/\D/', '', $data['donor_phone']);
            if (strlen($phone) !== 10 || !preg_match('/^[6-9]/', $phone)) {
                throw new Exception('Invalid phone number');
            }
            $data['donor_phone'] = $phone;
        }
        
        // Sanitize inputs
        $data['donor_name'] = Security::sanitizeInput($data['donor_name']);
        $data['donor_email'] = Security::sanitizeEmail($data['donor_email']);
        $data['cause'] = Security::sanitizeInput($data['cause']);
        $data['amount'] = $amount;
        
        return $data;
    }
    
    /**
     * Generate unique transaction ID
     */
    private function generateTransactionId() {
        return 'TXN_' . date('YmdHis') . '_' . strtoupper(bin2hex(random_bytes(4)));
    }
    
    /**
     * Store donation record in database
     */
    private function storeDonationRecord($data, $transactionId) {
        $stmt = $this->db->prepare("
            INSERT INTO donations (
                transaction_id, donor_name, donor_email, donor_phone, 
                amount, cause, frequency, status, created_at,
                donor_pan, donor_address, anonymous, updates_consent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $transactionId,
            $data['donor_name'],
            $data['donor_email'],
            $data['donor_phone'] ?? null,
            $data['amount'],
            $data['cause'],
            $data['frequency'] ?? 'one-time',
            $data['donor_pan'] ?? null,
            $data['donor_address'] ?? null,
            $data['anonymous'] ?? false,
            $data['updates'] ?? false
        ]);
        
        return $this->db->lastInsertId();
    }
    
    /**
     * Prepare PhonePe payment request
     */
    private function preparePhonePeRequest($data, $transactionId) {
        $amount = intval($data['amount'] * 100); // Convert to paise
        
        $paymentData = [
            'merchantId' => $this->phonepe_merchant_id,
            'merchantTransactionId' => $transactionId,
            'merchantUserId' => 'USER_' . md5($data['donor_email']),
            'amount' => $amount,
            'redirectUrl' => $this->getBaseURL() . '/api/payment-callback.php',
            'redirectMode' => 'POST',
            'callbackUrl' => $this->getBaseURL() . '/api/payment-webhook.php',
            'paymentInstrument' => [
                'type' => 'PAY_PAGE'
            ]
        ];
        
        // Encode payload
        $payload = base64_encode(json_encode($paymentData));
        
        // Generate checksum
        $checksum = hash('sha256', $payload . '/pg/v1/pay' . $this->phonepe_salt_key) . '###' . $this->phonepe_salt_index;
        
        // Prepare request headers
        $headers = [
            'Content-Type: application/json',
            'X-VERIFY: ' . $checksum
        ];
        
        // Return payment URL (this will be used when PG is ready)
        return [
            'payment_url' => $this->phonepe_base_url . '/pg/v1/pay',
            'payload' => $payload,
            'checksum' => $checksum,
            'headers' => $headers
        ];
    }
    
    /**
     * Handle payment callback
     */
    public function handlePaymentCallback($callbackData) {
        try {
            // Verify callback authenticity
            if (!$this->verifyCallback($callbackData)) {
                throw new Exception('Invalid callback signature');
            }
            
            // Extract transaction details
            $transactionId = $callbackData['transactionId'];
            $status = $callbackData['code'] === 'PAYMENT_SUCCESS' ? 'completed' : 'failed';
            
            // Update donation status
            $this->updateDonationStatus($transactionId, $status, $callbackData);
            
            // Send confirmation email
            if ($status === 'completed') {
                $this->sendDonationReceipt($transactionId);
            }
            
            return [
                'success' => true,
                'status' => $status,
                'transaction_id' => $transactionId
            ];
            
        } catch (Exception $e) {
            error_log('Payment callback error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Update donation status
     */
    private function updateDonationStatus($transactionId, $status, $callbackData) {
        $stmt = $this->db->prepare("
            UPDATE donations 
            SET status = ?, 
                payment_response = ?,
                completed_at = ?,
                updated_at = NOW()
            WHERE transaction_id = ?
        ");
        
        $stmt->execute([
            $status,
            json_encode($callbackData),
            $status === 'completed' ? date('Y-m-d H:i:s') : null,
            $transactionId
        ]);
    }
    
    /**
     * Send donation receipt via email
     */
    private function sendDonationReceipt($transactionId) {
        // Get donation details
        $stmt = $this->db->prepare("SELECT * FROM donations WHERE transaction_id = ?");
        $stmt->execute([$transactionId]);
        $donation = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$donation) {
            throw new Exception('Donation record not found');
        }
        
        // Generate receipt
        $receiptData = $this->generateReceipt($donation);
        
        // Send email (implement email sending logic)
        $this->sendReceiptEmail($donation, $receiptData);
    }
    
    /**
     * Generate donation receipt
     */
    private function generateReceipt($donation) {
        return [
            'receipt_number' => 'RCP_' . $donation['id'] . '_' . date('Y'),
            'donation_id' => $donation['id'],
            'transaction_id' => $donation['transaction_id'],
            'donor_name' => $donation['donor_name'],
            'amount' => $donation['amount'],
            'cause' => $donation['cause'],
            'date' => $donation['completed_at'],
            'tax_exemption' => $donation['amount'] * 0.5 // 50% tax exemption
        ];
    }
    
    /**
     * Send receipt email
     */
    private function sendReceiptEmail($donation, $receipt) {
        // Email template for receipt
        $subject = 'Donation Receipt - Sai Seva Foundation';
        $message = $this->getReceiptEmailTemplate($donation, $receipt);
        
        // Use your existing email configuration
        // mail($donation['donor_email'], $subject, $message, $headers);
        
        // Log for now (remove when email is configured)
        error_log('Receipt email prepared for: ' . $donation['donor_email']);
    }
    
    /**
     * Get receipt email template
     */
    private function getReceiptEmailTemplate($donation, $receipt) {
        return "
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .receipt { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .details { background: #f8f9fa; padding: 20px; border-radius: 8px; }
                    .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
                </style>
            </head>
            <body>
                <div class='receipt'>
                    <div class='header'>
                        <h2>Sri Dutta Sai Manga Bharadwaja Trust</h2>
                        <p>Donation Receipt</p>
                    </div>
                    <div class='details'>
                        <p><strong>Receipt Number:</strong> {$receipt['receipt_number']}</p>
                        <p><strong>Donor Name:</strong> {$donation['donor_name']}</p>
                        <p><strong>Amount:</strong> ₹{$donation['amount']}</p>
                        <p><strong>Cause:</strong> {$donation['cause']}</p>
                        <p><strong>Date:</strong> {$donation['completed_at']}</p>
                        <p><strong>Transaction ID:</strong> {$donation['transaction_id']}</p>
                        <p><strong>Tax Exemption (80G):</strong> ₹{$receipt['tax_exemption']}</p>
                    </div>
                    <div class='footer'>
                        <p>Thank you for your generous contribution!</p>
                        <p>This receipt is valid for tax exemption under Section 80G.</p>
                    </div>
                </div>
            </body>
            </html>
        ";
    }
    
    /**
     * Verify payment callback signature
     */
    private function verifyCallback($callbackData) {
        // Implement PhonePe signature verification
        // This is crucial for security
        return true; // Placeholder - implement actual verification
    }
    
    /**
     * Get base URL for callbacks
     */
    private function getBaseURL() {
        $protocol = isset($_SERVER['HTTPS']) ? 'https' : 'http';
        return $protocol . '://' . $_SERVER['HTTP_HOST'];
    }
    
    /**
     * Check payment gateway configuration
     */
    public function checkConfiguration() {
        $config = [
            'merchant_id_configured' => !empty($this->phonepe_merchant_id),
            'salt_key_configured' => !empty($this->phonepe_salt_key),
            'database_connected' => $this->db !== null,
            'ssl_enabled' => isset($_SERVER['HTTPS']),
            'required_tables_exist' => $this->checkRequiredTables()
        ];
        
        $config['ready_for_production'] = array_reduce($config, function($carry, $item) {
            return $carry && $item;
        }, true);
        
        return $config;
    }
    
    /**
     * Check if required database tables exist
     */
    private function checkRequiredTables() {
        $required_tables = ['donations', 'users'];
        
        foreach ($required_tables as $table) {
            $stmt = $this->db->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$table]);
            if (!$stmt->fetch()) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get donation statistics for admin
     */
    public function getDonationStats() {
        $stats = [];
        
        // Total donations
        $stmt = $this->db->prepare("SELECT SUM(amount) as total FROM donations WHERE status = 'completed'");
        $stmt->execute();
        $stats['total_donations'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;
        
        // Monthly donations
        $stmt = $this->db->prepare("SELECT SUM(amount) as monthly FROM donations WHERE status = 'completed' AND DATE(created_at) >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
        $stmt->execute();
        $stats['monthly_donations'] = $stmt->fetch(PDO::FETCH_ASSOC)['monthly'] ?? 0;
        
        // Count by status
        $stmt = $this->db->prepare("SELECT status, COUNT(*) as count FROM donations GROUP BY status");
        $stmt->execute();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $stats['count_' . $row['status']] = $row['count'];
        }
        
        return $stats;
    }
    
    /**
     * Get recent donations
     */
    public function getRecentDonations($limit = 10) {
        $stmt = $this->db->prepare("
            SELECT id, donor_name, amount, cause, status, created_at,
                   CASE WHEN anonymous = 1 THEN 'Anonymous' ELSE donor_name END as display_name
            FROM donations 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    // CSRF protection
    if (!Security::validateCSRFToken($_POST['csrf_token'] ?? '')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Invalid CSRF token']);
        exit;
    }
    
    $paymentGW = new PaymentGateway();
    $action = $_GET['action'] ?? 'initiate';
    
    switch ($action) {
        case 'initiate':
            $donationData = json_decode(file_get_contents('php://input'), true);
            $result = $paymentGW->initiatePayment($donationData);
            break;
            
        case 'check_config':
            $result = $paymentGW->checkConfiguration();
            break;
            
        case 'stats':
            $result = $paymentGW->getDonationStats();
            break;
            
        case 'recent':
            $limit = intval($_GET['limit'] ?? 10);
            $result = ['success' => true, 'data' => $paymentGW->getRecentDonations($limit)];
            break;
            
        default:
            $result = ['success' => false, 'error' => 'Invalid action'];
    }
    
    echo json_encode($result);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json');
    
    $paymentGW = new PaymentGateway();
    $action = $_GET['action'] ?? 'check_config';
    
    switch ($action) {
        case 'check_config':
            $result = $paymentGW->checkConfiguration();
            break;
            
        case 'stats':
            $result = $paymentGW->getDonationStats();
            break;
            
        case 'recent':
            $limit = intval($_GET['limit'] ?? 10);
            $result = ['success' => true, 'data' => $paymentGW->getRecentDonations($limit)];
            break;
            
        default:
            $result = ['success' => false, 'error' => 'Invalid action'];
    }
    
    echo json_encode($result);
}
?>