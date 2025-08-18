<?php
require_once 'includes/database.php';

$db = Database::getInstance();

// Check if admin user exists
$admin = $db->fetchOne("SELECT * FROM users WHERE email = ?", ['admin@saisevafoundation.org']);

if ($admin) {
    echo "✅ Admin user found<br>";
    echo "Email: " . $admin['email'] . "<br>";
    echo "User Type: " . $admin['user_type'] . "<br>";
    echo "Password Hash: " . $admin['password'] . "<br>";
    echo "Is Active: " . ($admin['is_active'] ? 'Yes' : 'No') . "<br>";
    
    // Test password verification
    $testPassword = 'password';
    if (password_verify($testPassword, $admin['password'])) {
        echo "✅ Password 'password' is correct<br>";
    } else {
        echo "❌ Password 'password' does not match<br>";
    }
} else {
    echo "❌ Admin user not found<br>";
}
?>
