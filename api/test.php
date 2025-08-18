<?php
require_once '../includes/database.php';
require_once '../includes/functions.php';

header('Content-Type: application/json');

// Debug information
$debug = [
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'query_params' => $_GET,
    'post_data' => $_POST,
    'raw_input' => file_get_contents('php://input'),
    'headers' => getallheaders(),
    'session_active' => session_status() === PHP_SESSION_ACTIVE
];

echo json_encode([
    'success' => true,
    'message' => 'API is accessible',
    'debug' => $debug
]);
?>
