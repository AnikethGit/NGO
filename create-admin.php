<?php
require_once 'includes/database.php';

$db = Database::getInstance();

// Delete existing admin
$db->query("DELETE FROM users WHERE email = ?", ['test@admin.com']);

// Create test admin
$hashedPassword = password_hash('test123', PASSWORD_DEFAULT);
$adminId = $db->insert('users', [
    'name' => 'Test Admin',
    'email' => 'test@admin.com',
    'password' => $hashedPassword,
    'user_type' => 'admin',
    'is_active' => 1
]);

echo "Admin created: test@admin.com / test123";
?>
