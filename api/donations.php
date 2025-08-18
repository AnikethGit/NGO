<?php
require_once '../includes/database.php';
require_once '../includes/functions.php';

header('Content-Type: application/json');

$db = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getDonation($db, $_GET['id']);
        } else {
            getDonations($db, $_GET);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        createDonation($db, $input);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        updateDonation($db, $input);
        break;

    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);
        deleteDonation($db, $input['id']);
        break;

    default:
        response(['error' => 'Method not allowed'], 405);
}

function getDonations($db, $params) {
    try {
        $page = $params['page'] ?? 1;
        $limit = $params['limit'] ?? 20;
        $offset = ($page - 1) * $limit;
        
        $where = "1=1";
        $whereParams = [];
        
        if (!empty($params['cause'])) {
            $where .= " AND cause = ?";
            $whereParams[] = $params['cause'];
        }
        
        if (!empty($params['status'])) {
            $where .= " AND status = ?";
            $whereParams[] = $params['status'];
        }
        
        if (!empty($params['date_from'])) {
            $where .= " AND DATE(created_at) >= ?";
            $whereParams[] = $params['date_from'];
        }
        
        if (!empty($params['date_to'])) {
            $where .= " AND DATE(created_at) <= ?";
            $whereParams[] = $params['date_to'];
        }

        $donations = $db->fetchAll(
            "SELECT * FROM donations WHERE {$where} ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}",
            $whereParams
        );

        $total = $db->fetchOne("SELECT COUNT(*) as count FROM donations WHERE {$where}", $whereParams);
        
        response([
            'success' => true,
            'data' => $donations,
            'total' => $total['count'],
            'page' => $page,
            'totalPages' => ceil($total['count'] / $limit)
        ]);

    } catch (Exception $e) {
        response(['error' => 'Failed to fetch donations'], 500);
    }
}

function getDonation($db, $id) {
    try {
        $donation = $db->fetchOne("SELECT * FROM donations WHERE id = ?", [$id]);
        
        if (!$donation) {
            response(['error' => 'Donation not found'], 404);
        }
        
        response(['success' => true, 'data' => $donation]);
        
    } catch (Exception $e) {
        response(['error' => 'Failed to fetch donation'], 500);
    }
}

function createDonation($db, $data) {
    try {
        // Validate required fields
        $required = ['donor_name', 'donor_email', 'amount', 'cause'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                response(['error' => "Field {$field} is required"], 400);
            }
        }

        // Generate transaction ID
        $transactionId = 'TXN' . time() . rand(1000, 9999);

        $donationData = [
            'donor_name' => $data['donor_name'],
            'donor_email' => $data['donor_email'],
            'donor_phone' => $data['donor_phone'] ?? null,
            'donor_address' => $data['donor_address'] ?? null,
            'donor_pan' => $data['donor_pan'] ?? null,
            'amount' => $data['amount'],
            'cause' => $data['cause'],
            'frequency' => $data['frequency'] ?? 'one-time',
            'transaction_id' => $transactionId,
            'status' => 'completed' // In real implementation, this would be 'pending' until payment confirmation
        ];

        $donationId = $db->insert('donations', $donationData);

        if ($donationId) {
            // Send receipt email (implement email function)
            sendDonationReceipt($data['donor_email'], $donationId, $transactionId, $data['amount']);
            
            response([
                'success' => true,
                'donation_id' => $donationId,
                'transaction_id' => $transactionId,
                'message' => 'Donation successful'
            ]);
        } else {
            response(['error' => 'Failed to process donation'], 500);
        }

    } catch (Exception $e) {
        response(['error' => 'Donation processing failed'], 500);
    }
}

function updateDonation($db, $data) {
    try {
        requireAuth(['admin']);
        
        $id = $data['id'] ?? null;
        if (!$id) {
            response(['error' => 'Donation ID is required'], 400);
        }

        unset($data['id']);
        $data['updated_at'] = date('Y-m-d H:i:s');

        $db->update('donations', $data, 'id = ?', [$id]);
        
        response(['success' => true, 'message' => 'Donation updated successfully']);

    } catch (Exception $e) {
        response(['error' => 'Failed to update donation'], 500);
    }
}

function sendDonationReceipt($email, $donationId, $transactionId, $amount) {
    // Implement email sending functionality
    // This is a placeholder for email implementation
    return true;
}
?>
