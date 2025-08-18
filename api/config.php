<?php
// Local development configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'ngo_management');
define('DB_USER', 'root');
define('DB_PASS', '');

// Local site configuration
define('SITE_URL', 'http://localhost/ngo-website');
define('UPLOAD_DIR', 'uploads/');

// Development email settings (use MailHog or similar)
define('SMTP_HOST', 'localhost');
define('SMTP_USER', 'test@localhost');
define('SMTP_PASS', '');
define('SMTP_PORT', 1025);

// Disable payment gateway for testing
define('PAYMENT_GATEWAY_KEY', 'test_key');
define('PAYMENT_GATEWAY_SECRET', 'test_secret');

session_start();

// Development error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'error.log');

date_default_timezone_set('Asia/Kolkata');

// CORS for local development
header('Access-Control-Allow-Origin: http://localhost:*');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit(0);
}
?>
