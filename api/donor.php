<?php
/**
 * PRODUCTION Donor API - Sai Seva Foundation
 * Handles donor-specific functionality and data management
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
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    // Check authentication
    if (!isAuthenticated() || getUserType() !== 'user') {
        response(['error' => 'Unauthorized access'], 401);
    }
    
    // Rate limiting check
    if (!checkRateLimit($_SERVER['REMOTE_ADDR'], 'donor_api')) {
        response(['error' => 'Too many requests. Please try again later.'], 429);
    }
    
    // Log API access
    logEvent('INFO', "Donor API accessed: {$action} from IP: {$_SERVER['REMOTE_ADDR']}");
    
    switch ($action) {
        case 'stats':
            handleGetStats();
            break;
            
        case 'recent_donations':
            handleGetRecentDonations();
            break;
            
        case 'impact':
            handleGetImpact();
            break;
            
        case 'donations':
            handleGetDonations();
            break;
            
        case 'impact_report':
            handleGetImpactReport();
            break;
            
        case 'receipts':
            handleGetReceipts();
            break;
            
        case 'recurring_donations':
            handleGetRecurringDonations();
            break;
            
        case 'project_updates':
            handleGetProjectUpdates();
            break;
            
        case 'recognition':
            handleGetRecognition();
            break;
            
        case 'donation_details':
            handleGetDonationDetails();
            break;
            
        case 'download_receipt':
            handleDownloadReceipt();
            break;
            
        case 'tax_certificate':
            handleTaxCertificate();
            break;
            
        case 'export_donations':
            handleExportDonations();
            break;
            
        case 'setup_recurring':
            handleSetupRecurring();
            break;
            
        case 'update_profile':
            handleUpdateProfile();
            break;
            
        default:
            response(['error' => 'Invalid action specified'], 400);
    }
    
} catch (Exception $e) {
    logEvent('ERROR', 'Donor API Error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
    response(['error' => 'Donor service temporarily unavailable'], 500);
}

/**
 * Get donor statistics
 */
function handleGetStats() {
    $donorId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        // Get total donated
        $totalDonated = $db->fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM donations 
             WHERE donor_id = ? AND status = 'completed'",
            [$donorId]
        )['total'];
        
        // Get donation count
        $donationCount = $db->fetchOne(
            "SELECT COUNT(*) as count FROM donations 
             WHERE donor_id = ? AND status = 'completed'",
            [$donorId]
        )['count'];
        
        // Get lives impacted (estimate based on donations)
        $livesImpacted = calculateLivesImpacted($totalDonated);
        
        // Get tax savings (80G - 100% deduction)
        $currentYear = date('Y');
        $taxSavings = $db->fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM donations 
             WHERE donor_id = ? AND status = 'completed' 
             AND YEAR(created_at) = ?",
            [$donorId, $currentYear]
        )['total'];
        
        response([
            'success' => true,
            'stats' => [
                'total_donated' => $totalDonated,
                'donation_count' => $donationCount,
                'lives_impacted' => $livesImpacted,
                'tax_savings' => $taxSavings
            ]
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting donor stats: ' . $e->getMessage());
        response(['error' => 'Failed to load statistics'], 500);
    }
}

/**
 * Get recent donations
 */
function handleGetRecentDonations() {
    $donorId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        $donations = $db->fetchAll(
            "SELECT * FROM donations 
             WHERE donor_id = ? 
             ORDER BY created_at DESC 
             LIMIT 5",
            [$donorId]
        );
        
        response([
            'success' => true,
            'donations' => $donations
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting recent donations: ' . $e->getMessage());
        response(['error' => 'Failed to load recent donations'], 500);
    }
}

/**
 * Get impact data
 */
function handleGetImpact() {
    $donorId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        // Get total donated this month
        $totalThisMonth = $db->fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM donations 
             WHERE donor_id = ? AND status = 'completed' 
             AND MONTH(created_at) = MONTH(CURDATE()) 
             AND YEAR(created_at) = YEAR(CURDATE())",
            [$donorId]
        )['total'];
        
        // Calculate impact based on donation amounts
        $impact = [
            'meals_provided' => floor($totalThisMonth / 25), // ₹25 per meal
            'students_supported' => floor($totalThisMonth / 500), // ₹500 per student per month
            'medical_aid' => floor($totalThisMonth / 200), // ₹200 per medical consultation
            'families_helped' => floor($totalThisMonth / 1000) // ₹1000 per family support
        ];
        
        response([
            'success' => true,
            'impact' => $impact
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting impact data: ' . $e->getMessage());
        response(['error' => 'Failed to load impact data'], 500);
    }
}

/**
 * Get all donations with filters
 */
function handleGetDonations() {
    $donorId = getUserId();
    $year = $_GET['year'] ?? 'all';
    $status = $_GET['status'] ?? 'all';
    $cause = $_GET['cause'] ?? 'all';
    
    try {
        $db = Database::getInstance();
        
        $whereConditions = ['donor_id = ?'];
        $params = [$donorId];
        
        if ($year !== 'all') {
            $whereConditions[] = 'YEAR(created_at) = ?';
            $params[] = $year;
        }
        
        if ($status !== 'all') {
            $whereConditions[] = 'status = ?';
            $params[] = $status;
        }
        
        if ($cause !== 'all') {
            $whereConditions[] = 'cause = ?';
            $params[] = $cause;
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        $donations = $db->fetchAll(
            "SELECT * FROM donations 
             WHERE {$whereClause} 
             ORDER BY created_at DESC",
            $params
        );
        
        response([
            'success' => true,
            'donations' => $donations
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting donations: ' . $e->getMessage());
        response(['error' => 'Failed to load donations'], 500);
    }
}

/**
 * Get impact report with charts data
 */
function handleGetImpactReport() {
    $donorId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        // Get cause distribution
        $causeDistribution = $db->fetchAll(
            "SELECT cause, SUM(amount) as total 
             FROM donations 
             WHERE donor_id = ? AND status = 'completed' 
             GROUP BY cause",
            [$donorId]
        );
        
        // Get monthly trend (last 12 months)
        $monthlyTrend = $db->fetchAll(
            "SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                SUM(amount) as total 
             FROM donations 
             WHERE donor_id = ? AND status = 'completed' 
             AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month",
            [$donorId]
        );
        
        // Get total impact value
        $totalDonated = $db->fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM donations 
             WHERE donor_id = ? AND status = 'completed'",
            [$donorId]
        )['total'];
        
        // Prepare chart data
        $chartData = [
            'cause_distribution' => [
                'labels' => array_column($causeDistribution, 'cause'),
                'data' => array_column($causeDistribution, 'total')
            ],
            'monthly_trend' => [
                'labels' => array_column($monthlyTrend, 'month'),
                'data' => array_column($monthlyTrend, 'total')
            ]
        ];
        
        response([
            'success' => true,
            'report' => [
                'total_impact_value' => $totalDonated * 3, // Estimated 3x impact multiplier
                'cause_distribution' => $causeDistribution,
                'monthly_trend' => $monthlyTrend
            ],
            'chart_data' => $chartData
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting impact report: ' . $e->getMessage());
        response(['error' => 'Failed to load impact report'], 500);
    }
}

/**
 * Get tax receipts
 */
function handleGetReceipts() {
    $donorId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        // Get current year and previous year totals
        $currentYear = date('Y');
        $previousYear = $currentYear - 1;
        
        $currentYearTotal = $db->fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM donations 
             WHERE donor_id = ? AND status = 'completed' 
             AND YEAR(created_at) = ?",
            [$donorId, $currentYear]
        )['total'];
        
        $previousYearTotal = $db->fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM donations 
             WHERE donor_id = ? AND status = 'completed' 
             AND YEAR(created_at) = ?",
            [$donorId, $previousYear]
        )['total'];
        
        // Get individual receipts
        $receipts = $db->fetchAll(
            "SELECT id, amount, receipt_number, created_at, cause 
             FROM donations 
             WHERE donor_id = ? AND status = 'completed' 
             AND receipt_number IS NOT NULL
             ORDER BY created_at DESC",
            [$donorId]
        );
        
        response([
            'success' => true,
            'tax_summary' => [
                'current_year' => $currentYearTotal,
                'previous_year' => $previousYearTotal
            ],
            'receipts' => $receipts
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting receipts: ' . $e->getMessage());
        response(['error' => 'Failed to load receipts'], 500);
    }
}

/**
 * Download tax certificate
 */
function handleTaxCertificate() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        response(['error' => 'Invalid security token'], 403);
    }
    
    $donorId = getUserId();
    $year = $_GET['year'] ?? date('Y');
    
    try {
        // Generate tax certificate
        $certificateUrl = generateTaxCertificate($donorId, $year);
        
        response([
            'success' => true,
            'certificate_url' => $certificateUrl
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error generating tax certificate: ' . $e->getMessage());
        response(['error' => 'Failed to generate tax certificate'], 500);
    }
}

/**
 * Export donations
 */
function handleExportDonations() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        response(['error' => 'Invalid security token'], 403);
    }
    
    $donorId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        $donations = $db->fetchAll(
            "SELECT 
                DATE(created_at) as date,
                amount,
                cause,
                status,
                receipt_number,
                transaction_id
             FROM donations 
             WHERE donor_id = ? 
             ORDER BY created_at DESC",
            [$donorId]
        );
        
        // Generate CSV
        $csvContent = "Date,Amount,Cause,Status,Receipt Number,Transaction ID\n";
        foreach ($donations as $donation) {
            $csvContent .= implode(',', [
                $donation['date'],
                $donation['amount'],
                $donation['cause'],
                $donation['status'],
                $donation['receipt_number'] ?? '',
                $donation['transaction_id']
            ]) . "\n";
        }
        
        // Save CSV file
        $filename = "donations_" . $donorId . "_" . date('Y-m-d') . ".csv";
        $filepath = $_ENV['UPLOAD_PATH'] . 'exports/' . $filename;
        
        if (!is_dir(dirname($filepath))) {
            mkdir(dirname($filepath), 0755, true);
        }
        
        file_put_contents($filepath, $csvContent);
        
        $downloadUrl = $_ENV['BASE_URL'] . '/uploads/exports/' . $filename;
        
        logEvent('INFO', "Donations exported for donor {$donorId}");
        
        response([
            'success' => true,
            'download_url' => $downloadUrl
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error exporting donations: ' . $e->getMessage());
        response(['error' => 'Failed to export donations'], 500);
    }
}

/**
 * Setup recurring donation
 */
function handleSetupRecurring() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        response(['error' => 'No data received'], 400);
    }
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        response(['error' => 'Invalid security token'], 403);
    }
    
    $donorId = getUserId();
    
    // Validate input
    $errors = validateRecurringData($input);
    if (!empty($errors)) {
        response(['error' => implode('. ', $errors)], 400);
    }
    
    try {
        $db = Database::getInstance();
        
        $recurringData = [
            'donor_id' => $donorId,
            'amount' => floatval($input['amount']),
            'cause' => sanitizeInput($input['cause']),
            'frequency' => 'monthly',
            'start_date' => $input['start_date'],
            'status' => 'active',
            'created_at' => date('Y-m-d H:i:s'),
            'ip_address' => $_SERVER['REMOTE_ADDR']
        ];
        
        $recurringId = $db->insert('recurring_donations', $recurringData);
        
        logEvent('INFO', "Recurring donation setup by donor {$donorId}: ₹{$recurringData['amount']} monthly");
        
        response([
            'success' => true,
            'recurring_id' => $recurringId,
            'message' => 'Recurring donation set up successfully!'
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error setting up recurring donation: ' . $e->getMessage());
        response(['error' => 'Failed to setup recurring donation'], 500);
    }
}

/**
 * Update donor profile
 */
function handleUpdateProfile() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        response(['error' => 'No data received'], 400);
    }
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        response(['error' => 'Invalid security token'], 403);
    }
    
    $donorId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        // Update main user record
        $userData = [
            'name' => sanitizeInput($input['full_name']),
            'phone' => sanitizeInput($input['phone'] ?? ''),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $db->update('users', $userData, ['id' => $donorId]);
        
        // Update donor-specific data
        $donorData = [
            'address' => sanitizeInput($input['address'] ?? ''),
            'pan_number' => sanitizeInput($input['pan_number'] ?? ''),
            'preferred_causes' => json_encode($input['preferred_causes'] ?? []),
            'communication_preferences' => json_encode($input['communication_preferences'] ?? []),
            'anonymous_donations' => !empty($input['anonymous_donations']),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        // Check if donor profile exists
        $existingProfile = $db->fetchOne(
            "SELECT id FROM donor_profiles WHERE user_id = ?",
            [$donorId]
        );
        
        if ($existingProfile) {
            $db->update('donor_profiles', $donorData, ['user_id' => $donorId]);
        } else {
            $donorData['user_id'] = $donorId;
            $donorData['created_at'] = date('Y-m-d H:i:s');
            $db->insert('donor_profiles', $donorData);
        }
        
        logEvent('INFO', "Donor profile updated: {$donorId}");
        
        response([
            'success' => true,
            'message' => 'Profile updated successfully!'
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error updating donor profile: ' . $e->getMessage());
        response(['error' => 'Failed to update profile'], 500);
    }
}

/**
 * Calculate lives impacted based on total donations
 */
function calculateLivesImpacted($totalDonated) {
    // Estimate based on average impact per rupee
    // Assuming ₹100 impacts 1 life significantly
    return floor($totalDonated / 100);
}

/**
 * Generate tax certificate
 */
function generateTaxCertificate($donorId, $year) {
    try {
        $db = Database::getInstance();
        
        // Get donor info
        $donor = $db->fetchOne(
            "SELECT u.name, u.email, dp.pan_number, dp.address 
             FROM users u 
             LEFT JOIN donor_profiles dp ON u.id = dp.user_id 
             WHERE u.id = ?",
            [$donorId]
        );
        
        // Get donations for the year
        $donations = $db->fetchAll(
            "SELECT * FROM donations 
             WHERE donor_id = ? AND status = 'completed' 
             AND YEAR(created_at) = ?
             ORDER BY created_at",
            [$donorId, $year]
        );
        
        $totalAmount = array_sum(array_column($donations, 'amount'));
        
        // Generate certificate PDF (implement PDF generation)
        $certificateFilename = "tax_certificate_{$donorId}_{$year}.pdf";
        $certificatePath = $_ENV['DONATION_RECEIPTS_PATH'] . $certificateFilename;
        
        // Here you would implement PDF generation
        // For now, creating a placeholder
        generateTaxCertificatePDF($donor, $donations, $totalAmount, $year, $certificatePath);
        
        return $_ENV['BASE_URL'] . '/uploads/receipts/' . $certificateFilename;
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error generating tax certificate: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Generate tax certificate PDF (placeholder)
 */
function generateTaxCertificatePDF($donor, $donations, $totalAmount, $year, $filepath) {
    // This is a placeholder - implement actual PDF generation
    $content = "TAX EXEMPTION CERTIFICATE\n";
    $content .= "Sai Seva Foundation\n";
    $content .= "80G Registration: " . ($_ENV['ORG_80G_NUMBER'] ?? 'DIT(E)/2020-21/NGO/123') . "\n\n";
    $content .= "Donor: {$donor['name']}\n";
    $content .= "PAN: {$donor['pan_number']}\n";
    $content .= "Year: {$year}\n";
    $content .= "Total Donated: ₹{$totalAmount}\n";
    $content .= "Tax Deduction: ₹{$totalAmount} (100% under Section 80G)\n\n";
    $content .= "This certificate is generated electronically.";
    
    if (!is_dir(dirname($filepath))) {
        mkdir(dirname($filepath), 0755, true);
    }
    
    file_put_contents($filepath, $content);
}

/**
 * Validate recurring donation data
 */
function validateRecurringData($data) {
    $errors = [];
    
    if (empty($data['amount']) || floatval($data['amount']) < 100) {
        $errors[] = 'Minimum recurring amount is ₹100';
    }
    
    if (empty($data['cause'])) {
        $errors[] = 'Cause is required';
    }
    
    if (empty($data['start_date']) || !validateDate($data['start_date'])) {
        $errors[] = 'Valid start date is required';
    }
    
    return $errors;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !empty($_SESSION['user_id']);
}

/**
 * Get current user ID
 */
function getUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user type
 */
function getUserType() {
    return $_SESSION['user_type'] ?? null;
}

/**
 * Validate date format
 */
function validateDate($date, $format = 'Y-m-d') {
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

?>