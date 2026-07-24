<?php
// config.php - Smart Configuration for Soleila frontend

// Allow override via environment variable (set in server config / .htaccess)
$envBackendUrl = getenv('BACKEND_URL');

// Automatically detect if running on localhost / local development
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$hostName = parse_url($host, PHP_URL_HOST) ?: $host;

// Detect local / LAN development: localhost, private IPs, or our dev port (1000)
$isLocalhost = in_array($hostName, ['localhost', '127.0.0.1', '[::1]'])
               || (strpos($hostName, '192.168.') === 0)
               || (strpos($hostName, '10.') === 0)
               || (strpos($hostName, '127.') === 0);

if ($isLocalhost) {
    $requestIp = ($hostName !== 'localhost' && $hostName !== '127.0.0.1' && $hostName !== '[::1]')
        ? $hostName
        : '127.0.0.1';
    define('BACKEND_URL', $envBackendUrl ?: "http://{$requestIp}:8000");
    define('IS_LOCALHOST', true);
} else {
    $port = parse_url($host, PHP_URL_PORT) ?: ($_SERVER['SERVER_PORT'] ?? '');
    if ($port === '1000' || $port === '8000') {
        define('BACKEND_URL', $envBackendUrl ?: "http://{$hostName}:8000");
        define('IS_LOCALHOST', true);
    } else {
        define('BACKEND_URL', $envBackendUrl ?: 'http://127.0.0.1:8000');
        define('IS_LOCALHOST', false);
    }
}

// Settings loader
$settings_path = __DIR__ . '/backend/config/settings.json';
$APP_SETTINGS = [];

if (file_exists($settings_path)) {
    $json = file_get_contents($settings_path);
    $APP_SETTINGS = json_decode($json, true) ?: [];
}

function setting($key, $default = '') {
    global $APP_SETTINGS;
    $parts = explode('.', $key);
    $val = $APP_SETTINGS;
    foreach ($parts as $p) {
        if (!isset($val[$p])) return $default;
        $val = $val[$p];
    }
    return is_string($val) ? $val : $default;
}

function setting_bool($key, $default = false) {
    global $APP_SETTINGS;
    $parts = explode('.', $key);
    $val = $APP_SETTINGS;
    foreach ($parts as $p) {
        if (!isset($val[$p])) return $default;
        $val = $val[$p];
    }
    return (bool) $val;
}

// Convenience constants
define('SITE_NAME', setting('brand.business_name', 'Soleila'));
define('SITE_TAGLINE', setting('brand.tagline', 'Jodhpur\'s Premier Lounge'));
define('SITE_ADDRESS', setting('brand.address', ''));
define('SITE_PHONE', setting('brand.phone', ''));
define('SITE_EMAIL', setting('brand.email', ''));
define('SITE_CURRENCY', setting('brand.currency_symbol', '₹'));
define('SITE_EST_YEAR', setting('brand.est_year', '2024'));
define('SITE_RECEIPT_FOOTER', setting('brand.receipt_footer', 'Thank you!'));
define('SITE_COPYRIGHT', setting('brand.copyright_text', 'All rights reserved.'));
define('SITE_MAINTENANCE', setting_bool('system.maintenance_mode', false));
define('SITE_PAGE_TITLE', setting('system.page_title', SITE_NAME));
?>
