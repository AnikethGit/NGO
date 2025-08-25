<?php
require_once '../api/config.php';

class PhonePePayment {
    private $merchantId;
    private $saltKey;
    private $saltIndex;
    private $environment;
    private $baseUrl;
    
    public function __construct() {
        $this->merchantId = PHONEPE_MERCHANT_ID;
        $this->saltKey = PHONEPE_SALT_KEY;
        $this->saltIndex = PHONEPE_SALT_INDEX;
        $this->environment = PHONEPE_ENV;
        $this->baseUrl = PHONEPE_BASE_URL;
        
        if (empty($this->merchantId) || empty($this->saltKey)) {
            throw new Exception('PhonePe credentials not configured properly');
        }
    }
    
    /**
     * Initiate payment with PhonePe
     */
    public function initiatePayment($donationData) {
        try {
            $merchantTransactionId = 'TXN' . time() . rand(1000, 9999);
            $amount = $donationData['amount'] * 100; // Convert to paisa
            
            $paymentData = [
                'merchantId' => $this->merchantId,
                'merchantTransactionId' => $merchantTransactionId,
                'merchantUserId' => 'USER_' . time(),
                'amount' => $amount,
                'redirectUrl' => SITE_URL . '/payment-callback.php',
                'redirectMode' => 'POST',
                'callbackUrl' => SITE_URL . '/api/payment-callback.php',
                'paymentInstrument' => [
                    'type' => 'PAY_PAGE'
                ]
            ];
            
            // Add customer details if available
            if (!empty($donationData['donor_name']) || !empty($donationData['donor_phone'])) {
                $paymentData['merchantUserId'] = preg_replace('/[^a-zA-Z0-9]/', '', $donationData['donor_name'] ?? 'USER') . '_' . time();
            }
            
            // Generate X-VERIFY header
            $payload = base64_encode(json_encode($paymentData));
            $checksum = hash('sha256', $payload . '/pg/v1/pay' . $this->saltKey) . '###' . $this->saltIndex;
            
            $headers = [
                'Content-Type: application/json',
                'X-VERIFY: ' . $checksum,
                'accept: application/json'
            ];
            
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => PHONEPE_PAY_URL,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => 'POST',
                CURLOPT_POSTFIELDS => json_encode(['request' => $payload]),
                CURLOPT_HTTPHEADER => $headers,
            ]);
            
            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            
            if (curl_error($curl)) {
                throw new Exception('cURL Error: ' . curl_error($curl));
            }
            
            curl_close($curl);
            
            $responseData = json_decode($response, true);
            
            if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
                return [
                    'success' => true,
                    'merchantTransactionId' => $merchantTransactionId,
                    'paymentUrl' => $responseData['data']['instrumentResponse']['redirectInfo']['url'],
                    'amount' => $donationData['amount']
                ];
            } else {
                throw new Exception('PhonePe API Error: ' . ($responseData['message'] ?? 'Unknown error'));
            }
            
        } catch (Exception $e) {
            error_log('PhonePe Payment Initiation Error: ' . $e->getMessage());
            throw new Exception('Payment initiation failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Check payment status
     */
    public function checkPaymentStatus($merchantTransactionId) {
        try {
            $checksum = hash('sha256', "/pg/v1/status/{$this->merchantId}/{$merchantTransactionId}" . $this->saltKey) . '###' . $this->saltIndex;
            
            $headers = [
                'Content-Type: application/json',
                'X-VERIFY: ' . $checksum,
                'X-MERCHANT-ID: ' . $this->merchantId,
                'accept: application/json'
            ];
            
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => PHONEPE_STATUS_URL . "/{$this->merchantId}/{$merchantTransactionId}",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => 'GET',
                CURLOPT_HTTPHEADER => $headers,
            ]);
            
            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            
            if (curl_error($curl)) {
                throw new Exception('cURL Error: ' . curl_error($curl));
            }
            
            curl_close($curl);
            
            $responseData = json_decode($response, true);
            
            if ($httpCode === 200 && isset($responseData['success'])) {
                return [
                    'success' => $responseData['success'],
                    'code' => $responseData['code'] ?? '',
                    'message' => $responseData['message'] ?? '',
                    'data' => $responseData['data'] ?? []
                ];
            } else {
                throw new Exception('Status check failed');
            }
            
        } catch (Exception $e) {
            error_log('PhonePe Status Check Error: ' . $e->getMessage());
            throw new Exception('Status check failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Verify callback from PhonePe
     */
    public function verifyCallback($callbackData) {
        try {
            $receivedChecksum = $_SERVER['HTTP_X_VERIFY'] ?? '';
            
            if (empty($receivedChecksum)) {
                throw new Exception('Missing verification checksum');
            }
            
            $response = $callbackData['response'] ?? '';
            if (empty($response)) {
                throw new Exception('Missing response data');
            }
            
            // Calculate checksum
            $calculatedChecksum = hash('sha256', $response . $this->saltKey) . '###' . $this->saltIndex;
            
            if (!hash_equals($calculatedChecksum, $receivedChecksum)) {
                throw new Exception('Checksum verification failed');
            }
            
            // Decode response
            $decodedResponse = json_decode(base64_decode($response), true);
            
            return [
                'success' => true,
                'data' => $decodedResponse
            ];
            
        } catch (Exception $e) {
            error_log('PhonePe Callback Verification Error: ' . $e->getMessage());
            throw new Exception('Callback verification failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Get payment status from response data
     */
    public function getPaymentStatus($responseData) {
        $code = $responseData['code'] ?? '';
        
        switch ($code) {
            case 'PAYMENT_SUCCESS':
                return 'completed';
            case 'PAYMENT_ERROR':
            case 'PAYMENT_DECLINED':
            case 'PAYMENT_CANCELLED':
                return 'failed';
            case 'PAYMENT_PENDING':
            case 'INTERNAL_SERVER_ERROR':
                return 'pending';
            default:
                return 'failed';
        }
    }
}

?>