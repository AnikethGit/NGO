<?php
echo "<h2>Debug Information</h2>";
echo "<p><strong>Current Directory:</strong> " . __DIR__ . "</p>";
echo "<p><strong>Document Root:</strong> " . $_SERVER['DOCUMENT_ROOT'] . "</p>";
echo "<p><strong>Request URI:</strong> " . $_SERVER['REQUEST_URI'] . "</p>";

echo "<h3>File Checks:</h3>";
echo "<p>api/auth.php exists: " . (file_exists('api/auth.php') ? 'YES' : 'NO') . "</p>";
echo "<p>includes/database.php exists: " . (file_exists('includes/database.php') ? 'YES' : 'NO') . "</p>";

echo "<h3>API Directory Contents:</h3>";
if (is_dir('api')) {
    $files = scandir('api');
    foreach ($files as $file) {
        if ($file != '.' && $file != '..') {
            echo "<p>- $file</p>";
        }
    }
} else {
    echo "<p>API directory does not exist!</p>";
}
?>
