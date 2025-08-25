<?php
require_once 'includes/database.php';
require_once 'api/config.php';
require_once 'api/phonepe-payment.php';

$db = Database::getInstance();

// Handle PhonePe callback
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input)) {
            $input = $_POST; // Fallback to POST data
        }
        
        $phonepe = new PhonePePayment();
        
        // Verify the callback
        $verification = $phonepe->verifyCallback($input);
        
        if (!$verification['success']) {
            throw new Exception('Callback verification failed');
        }
        
        $responseData = $verification['data'];
        $merchantTransactionId = $responseData['merchantTransactionId'] ?? '';
        
        if (empty($merchantTransactionId)) {
            throw new Exception('Missing transaction ID');
        }
        
        // Find the donation record
        $donation = $db->fetchOne(
            "SELECT * FROM donations WHERE transaction_id = ?", 
            [$merchantTransactionId]
        );
        
        if (!$donation) {
            throw new Exception('Donation record not found');
        }
        
        // Get payment status
        $paymentStatus = $phonepe->getPaymentStatus($responseData);
        
        // Update donation record
        $updateData = [
            'status' => $paymentStatus,
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        // Add payment method and additional details if successful
        if ($paymentStatus === 'completed') {
            $updateData['payment_method'] = 'phonepe';
            
            // Extract additional payment details if available
            if (isset($responseData['data']['paymentInstrument'])) {
                $paymentInstrument = $responseData['data']['paymentInstrument'];
                $updateData['payment_method'] = 'phonepe_' . strtolower($paymentInstrument['type'] ?? 'unknown');
            }
        }
        
        $db->update('donations', $updateData, 'id = ?', [$donation['id']]);
        
        // Send receipt email for successful payments
        if ($paymentStatus === 'completed') {
            sendDonationReceipt(
                $donation['donor_email'], 
                $donation['id'], 
                $merchantTransactionId, 
                $donation['amount']
            );
        }
        
        // Log the transaction
        error_log("Payment callback processed - Transaction: {$merchantTransactionId}, Status: {$paymentStatus}");
        
        // Respond to PhonePe
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Callback processed successfully']);
        
    } catch (Exception $e) {
        error_log('Payment callback error: ' . $e->getMessage());
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

function sendDonationReceipt($email, $donationId, $transactionId, $amount) {
    try {
        // Implement actual email sending here
        $subject = "Donation Receipt - Sai Seva Foundation";
        $message = "
        <html>
        <body>
            <h2>Thank you for your donation!</h2>
            <p>Dear Donor,</p>
            <p>Your generous donation to Sai Seva Foundation has been successfully processed.</p>
            
            <table border='1' style='border-collapse: collapse; width: 100%; margin: 20px 0;'>
                <tr>
                    <td><strong>Donation ID</strong></td>
                    <td>{$donationId}</td>
                </tr>
                <tr>
                    <td><strong>Transaction ID</strong></td>
                    <td>{$transactionId}</td>
                </tr>
                <tr>
                    <td><strong>Amount</strong></td>
                    <td>₹{$amount}</td>
                </tr>
                <tr>
                    <td><strong>Date & Time</strong></td>
                    <td>" . date('d/m/Y H:i:s') . "</td>
                </tr>
                <tr>
                    <td><strong>Payment Method</strong></td>
                    <td>PhonePe</td>
                </tr>
            </table>
            
            <p>Your contribution will make a meaningful impact in the lives of those we serve.</p>
            <p>For any queries, please contact us at support@saisevafoundation.org</p>
            
            <p>Best regards,<br>
            Sai Seva Foundation Team</p>
        </body>
        </html>
        ";
        
        // For now, just log it - replace with actual email sending using PHPMailer
        error_log("Receipt email should be sent to: {$email}");
        error_log("Subject: {$subject}");
        
        return true;
        
    } catch (Exception $e) {
        error_log('Email sending error: ' . $e->getMessage());
        return false;
    }
}

?>