<?php
// config.php - Smart Configuration for The Gaming Garage frontend

// Automatically detect if running on localhost / local development
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$isLocalhost = in_array(parse_url($host, PHP_URL_HOST) ?: $host, ['localhost', '127.0.0.1', '[::1]']) 
               || (strpos($host, '192.168.') === 0)
               || (strpos($host, '10.') === 0)
               || (strpos($host, '127.') === 0);

if ($isLocalhost) {
    // ----------------------------------------------------
    // LOCAL DEVELOPMENT SETTINGS
    // ----------------------------------------------------
    define('BACKEND_URL', 'http://127.0.0.1:8000');
} else {
    // ----------------------------------------------------
    // LIVE PRODUCTION SETTINGS
    // ----------------------------------------------------
    // Replace this with your actual hosted Node.js backend URL when you deploy
    define('BACKEND_URL', 'https://your-node-backend.onrender.com');
}
?>
