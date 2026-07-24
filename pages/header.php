<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config.php';

$current_page = basename($_SERVER['PHP_SELF']);

// Authentication & permissions
$public_pages = ['login.php', 'customer_login.php'];

if (!in_array($current_page, $public_pages)) {
    if (!isset($_SESSION['jwt_token'])) {
        if ($current_page === 'customer_dashboard.php') {
            header("Location: customer_login.php");
        } else {
            header("Location: login.php");
        }
        exit();
    }
}

// User details
$username = isset($_SESSION['username']) ? $_SESSION['username'] : '';
$fullname = isset($_SESSION['fullname']) ? $_SESSION['fullname'] : '';
$role = isset($_SESSION['role']) ? $_SESSION['role'] : '';

// Restrict Customers to the Customer Dashboard
if ($role === 'Customer') {
    if ($current_page !== 'customer_dashboard.php' && $current_page !== 'customer_login.php' && $current_page !== 'logout.php') {
        header("Location: customer_dashboard.php");
        exit();
    }
} else {
    // Admin / Attendant roles shouldn't view Customer Dashboard
    if ($current_page === 'customer_dashboard.php') {
        header("Location: dashboard.php");
        exit();
    }
}

// Prevent Attendant from viewing restricted admin pages
if ($role === 'Attendant') {
    $restricted = ['sessions.php', 'appointments.php', 'stations.php', 'players.php', 'staff.php', 'manage_users.php', 'revenue.php', 'billing.php'];
    if (in_array($current_page, $restricted)) {
        header("Location: dashboard.php");
        exit();
    }
}

// Prevent Manager from viewing restricted admin pages
if ($role === 'Manager') {
    $restricted_manager = ['stations.php', 'billing.php', 'staff.php', 'manage_users.php', 'revenue.php', 'appointments.php', 'sessions.php'];
    if (in_array($current_page, $restricted_manager)) {
        header("Location: dashboard.php");
        exit();
    }
}

// Redirect Customer to Customer Dashboard
if ($role === 'Customer' && $current_page !== 'customer_dashboard.php' && $current_page !== 'logout.php') {
    header("Location: customer_dashboard.php");
    exit();
}

// Redirect admin roles attempting to access customer dashboard
if ($role !== 'Customer' && $current_page === 'customer_dashboard.php') {
    header("Location: dashboard.php");
    exit();
}

// Helper to determine active link
function is_active($page, $current_page) {
    return ($page === $current_page) ? 'active' : '';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo SITE_PAGE_TITLE; ?> — Admin</title>
  <meta name="description" content="<?php echo setting('system.meta_description', 'Admin panel'); ?>">
  <!-- Tailwind CSS CDN for easy utility layouts -->
  <script src="../js/tailwindcss.js"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            cream: '#fcfaf2',
            parchment: '#f3edd7',
            kraft: '#e9dfc6',
            wood: '#5c4033',
            clay: '#a0522d',
            forest: '#4b6528',
            brass: '#b8860b',
            rust: '#802b1a',
            slate: {
              50: '#1c1510',
              100: '#2d221c',
              200: '#3e322a',
              300: '#52433a',
              400: '#67564c',
              500: '#7e6c61',
              600: '#a19084',
              700: '#c5b8ad',
              800: '#dcd5cc',
              900: '#f3edd7',
              950: '#fcfaf2'
            },
            gray: {
              50: '#1c1510',
              100: '#2d221c',
              200: '#3e322a',
              300: '#52433a',
              400: '#67564c',
              500: '#7e6c61',
              600: '#a19084',
              700: '#c5b8ad',
              800: '#dcd5cc',
              900: '#f3edd7',
              950: '#fcfaf2'
            },
            zinc: {
              50: '#1c1510',
              100: '#2d221c',
              200: '#3e322a',
              300: '#52433a',
              400: '#67564c',
              500: '#7e6c61',
              600: '#a19084',
              700: '#c5b8ad',
              800: '#dcd5cc',
              900: '#f3edd7',
              950: '#fcfaf2'
            }
          }
        }
      }
    }
  </script>
  <!-- Link Retro Wood Stylesheet -->
  <link rel="stylesheet" href="../css/retro_wood.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <!-- Flatpickr (Famous DateTime Picker) CSS & JS CDN -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script>
    window.APP_SETTINGS = <?php echo json_encode($APP_SETTINGS); ?>;
    window.SITE_CURRENCY = '<?php echo SITE_CURRENCY; ?>';
  </script>
</head>
<body class="bg-cream text-slate-100 min-h-screen">

<?php if ($current_page !== 'login.php' && $current_page !== 'customer_login.php' && $current_page !== 'customer_dashboard.php'): ?>
<div class="app-container">
  <!-- Sidebar -->
  <aside class="sidebar">
    <a href="dashboard.php" class="sidebar-brand hover:opacity-80 transition duration-300">
      <i class="fa-solid fa-gamepad text-wood" style="animation: swivel-3d 6s ease-in-out infinite;"></i>
      <span>Soleila</span>
    </a>
    
    <nav class="flex-grow">
      <ul class="sidebar-nav">
        <?php if ($role === 'Attendant'): ?>
          <li>
            <a href="dashboard.php" class="sidebar-link <?php echo is_active('dashboard.php', $current_page); ?>">
              <i class="fa-solid fa-desktop text-wood"></i>
              <span>Seating Status</span>
            </a>
          </li>
          <li>
            <a href="pos.php" class="sidebar-link <?php echo is_active('pos.php', $current_page); ?>">
              <i class="fa-solid fa-cookie-bite text-clay"></i>
              <span>Food Options</span>
            </a>
          </li>
          <li>
            <a href="food_tables.php" class="sidebar-link <?php echo is_active('food_tables.php', $current_page); ?>">
              <i class="fa-solid fa-utensils text-clay"></i>
              <span>Food Tables</span>
            </a>
          </li>
          <!-- Pricing Rules link removed for Attendants -->
        <?php else: ?>
          <!-- Main Menu -->
          <li>
            <a href="dashboard.php" class="sidebar-link <?php echo is_active('dashboard.php', $current_page); ?>">
              <i class="fa-solid fa-gauge"></i>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a href="food_tables.php" class="sidebar-link <?php echo is_active('food_tables.php', $current_page); ?>">
              <i class="fa-solid fa-utensils text-clay"></i>
              <span>Food Tables</span>
            </a>
          </li>
          <?php if ($role !== 'Manager'): ?>
          <li>
            <a href="appointments.php" class="sidebar-link <?php echo is_active('appointments.php', $current_page); ?>">
              <i class="fa-solid fa-calendar-check text-wood"></i>
              <span>Appointments</span>
            </a>
          </li>
          <?php endif; ?>
          <li>
            <a href="pos.php" class="sidebar-link <?php echo is_active('pos.php', $current_page); ?>">
              <i class="fa-solid fa-cart-shopping"></i>
              <span>Cafe POS</span>
            </a>
          </li>
          <li>
            <a href="players.php" class="sidebar-link <?php echo is_active('players.php', $current_page); ?>">
              <i class="fa-solid fa-users"></i>
              <span>Players</span>
            </a>
          </li>
          <?php if ($role !== 'Manager'): ?>
          <li>
            <a href="revenue.php" class="sidebar-link <?php echo is_active('revenue.php', $current_page); ?>">
              <i class="fa-solid fa-chart-line text-forest"></i>
              <span>Revenue Analytics</span>
            </a>
          </li>
          <?php endif; ?>

          <!-- Stations & Sessions Group -->
          <?php if ($role !== 'Manager'): ?>
          <li class="border-t border-wood/25 my-2 pt-2"></li>
          <li>
            <a href="stations.php" class="sidebar-link <?php echo is_active('stations.php', $current_page); ?>">
              <i class="fa-solid fa-desktop"></i>
              <span>Stations</span>
            </a>
          </li>
          <li>
            <a href="billing.php" class="sidebar-link <?php echo is_active('billing.php', $current_page); ?>">
              <i class="fa-solid fa-file-invoice-dollar"></i>
              <span>Billing & Rates</span>
            </a>
          </li>
          <li>
            <a href="sessions.php" class="sidebar-link <?php echo is_active('sessions.php', $current_page); ?>">
              <i class="fa-solid fa-stopwatch"></i>
              <span>Live Sessions</span>
            </a>
          </li>
          <?php endif; ?>

          <!-- Administration Group -->
          <?php if ($role !== 'Manager' || $role === 'SuperAdmin'): ?>
          <li class="border-t border-wood/25 my-2 pt-2"></li>
          <li>
            <a href="whatsapp.php" class="sidebar-link <?php echo is_active('whatsapp.php', $current_page); ?>">
              <i class="fa-brands fa-whatsapp text-forest"></i>
              <span>WhatsApp Billing</span>
            </a>
          </li>
          <?php if ($role !== 'Manager'): ?>
          <li>
            <a href="staff.php" class="sidebar-link <?php echo is_active('staff.php', $current_page); ?>">
              <i class="fa-solid fa-user-shield"></i>
              <span>System Audits</span>
            </a>
          </li>
          <?php endif; ?>
          <?php if ($role === 'SuperAdmin'): ?>
          <li>
            <a href="manage_users.php" class="sidebar-link <?php echo is_active('manage_users.php', $current_page); ?>">
              <i class="fa-solid fa-user-gear text-wood"></i>
              <span>Staff Accounts</span>
            </a>
          </li>
          <li>
            <a href="settings.php" class="sidebar-link <?php echo is_active('settings.php', $current_page); ?>">
              <i class="fa-solid fa-sliders text-brass"></i>
              <span>Settings</span>
            </a>
          </li>
          <?php endif; ?>
          <?php endif; ?>
        <?php endif; ?>
      </ul>
    </nav>
    
    <!-- Sidebar footer removed, user and logout relocated to top-nav -->
  </aside>

  <!-- Main Wrapper -->
  <div class="main-wrapper">
    <!-- Top Navigation -->
    <header class="top-nav">
      <div class="page-title text-2xl font-bold flex items-center gap-2">
        <i class="fa-solid fa-angle-right text-wood"></i>
        <span>
          <?php 
            switch ($current_page) {
                case 'dashboard.php': echo 'Dashboard Grid'; break;
                case 'sessions.php': echo 'Live Sessions & Timers'; break;
                case 'appointments.php': echo 'Appointment Booking Scheduler'; break;
                case 'stations.php': echo 'Station & Device Management'; break;
                case 'players.php': echo 'Player Membership'; break;
                case 'pos.php': echo 'Integrated Point of Sale'; break;
                case 'billing.php': echo 'Billing & pricing'; break;
                case 'staff.php': echo 'Security logs & backups'; break;
                case 'manage_users.php': echo 'Staff User Accounts'; break;
                case 'food_tables.php': echo 'Food Tables Management'; break;
                case 'revenue.php': echo 'Revenue & Transactions Analytics'; break;
                case 'settings.php': echo 'System Settings'; break;
                default: echo 'Admin Panel';
            }
          ?>
        </span>
      </div>
      
      <div class="nav-actions flex items-center gap-4">
        <div class="hidden md:flex flex-col text-right">
          <span class="text-sm font-semibold text-slate-100"><?php echo htmlspecialchars($fullname ?? ''); ?></span>
          <span class="text-xs text-wood font-bold tracking-wider uppercase"><?php echo htmlspecialchars($role ?? ''); ?></span>
        </div>
        <a href="../index.php" class="flex items-center justify-center p-2 rounded bg-cream border border-wood text-wood hover:bg-wood hover:text-cream transition-all duration-300 hover-3d-float" title="Landing Page">
          <i class="fa-solid fa-house text-base"></i>
        </a>
        <a href="logout.php" class="flex items-center justify-center p-2 rounded bg-cream border border-rust text-rust hover:bg-rust hover:text-cream transition-all duration-300 hover-3d-push" title="Log Out">
          <i class="fa-solid fa-power-off text-lg"></i>
        </a>
      </div>
    </header>

    <!-- Content Area -->
    <main class="main-content">
<?php endif; ?>
