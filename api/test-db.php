<?php
require_once 'includes/database.php';

try {
    $db = Database::getInstance();
    echo "✅ Database connection successful!";
    
    // Test query
    $result = $db->fetchOne("SELECT COUNT(*) as count FROM users");
    echo "<br>✅ Users table accessible: " . $result['count'] . " users found";
    
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage();
}
?>
