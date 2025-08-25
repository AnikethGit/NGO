<?php
// Simple database.php - works without actual database connection for testing
class Database {
    private static $instance = null;
    private $connected = false;
    
    // Database configuration
    private $host = 'localhost';
    private $database = 'ngo_management';
    private $username = 'root';
    private $password = '';
    
    private function __construct() {
        // For testing, we'll simulate database operations
        $this->connected = true;
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function testConnection() {
        return $this->connected;
    }

    // Simulate database operations for testing
    public function fetchAll($sql, $params = []) {
        // Return empty array for testing
        return [];
    }

    public function fetchOne($sql, $params = []) {
        // Return null for testing
        return null;
    }

    public function execute($sql, $params = []) {
        // Return true for testing
        return true;
    }

    public function insert($table, $data) {
        // Log the data that would be inserted
        error_log("Database Insert Simulation - Table: $table, Data: " . json_encode($data));
        
        // Return a fake ID
        return rand(1, 1000);
    }

    public function update($table, $data, $where, $whereParams = []) {
        // Log the update that would happen
        error_log("Database Update Simulation - Table: $table, Data: " . json_encode($data));
        return true;
    }

    public function count($table, $where = '1=1', $whereParams = []) {
        // Return 0 for testing
        return 0;
    }
}

// Simple functions for validation
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function validatePhone($phone) {
    $cleaned = preg_replace('/\D/', '', $phone);
    return preg_match('/^[6-9]\d{9}$/', $cleaned);
}

function logEvent($level, $message) {
    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . '/app.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message\n";
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

function response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
?>