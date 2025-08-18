<?php
require_once __DIR__ . '/../includes/database.php';

$db = Database::getInstance();
$user = $db->fetchOne("SELECT * FROM users WHERE email = ?", ['admin@saisevafoundation.org']);

echo json_encode([
    'success' => true,
    'user_exists' => $user ? true : false,
    'user_data' => $user ? [
        'id' => $user['id'],
        'email' => $user['email'],
        'user_type' => $user['user_type'],
        'is_active' => $user['is_active']
    ] : null
]);
?>
