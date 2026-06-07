<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$current_page = basename($_SERVER['PHP_SELF']);

// 1. Route authentication & permissions checks
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
    $restricted = ['sessions.php', 'appointments.php', 'stations.php', 'players.php', 'staff.php', 'manage_users.php', 'revenue.php'];
    if (in_array($current_page, $restricted)) {
        header("Location: dashboard.php");
        exit();
    }
}

// Prevent Manager from viewing restricted admin pages
if ($role === 'Manager') {
    $restricted_manager = ['stations.php', 'billing.php', 'staff.php', 'manage_users.php'];
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
  <title>The Gaming Garage Management Admin</title>
  <!-- Tailwind CSS CDN for easy utility layouts -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            cyberDark: '#0a0b10',
            cyberPanel: '#11131c',
            cyberCard: '#171926',
            neonCyan: '#00f0ff',
            neonPink: '#ff007f',
            neonGreen: '#39ff14',
            neonGold: '#ffd700',
            neonRed: '#ff3333'
          }
        }
      }
    }
  </script>
  <!-- Cyberpunk Custom Stylesheet -->
  <link rel="stylesheet" href="../css/cyberpunk.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <!-- Flatpickr (Famous DateTime Picker) CSS & JS CDN -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
</head>
<body class="bg-cyberDark text-slate-100 min-h-screen">

<?php if ($current_page !== 'login.php' && $current_page !== 'customer_login.php' && $current_page !== 'customer_dashboard.php'): ?>
<div class="app-container">
  <!-- Sidebar -->
  <aside class="sidebar">
    <a href="dashboard.php" class="sidebar-brand hover:opacity-80 transition duration-300">
      <i class="fa-solid fa-gamepad text-neonCyan animate-pulse"></i>
      <span>The Gaming Garage</span>
    </a>
    
    <nav class="flex-grow">
      <ul class="sidebar-nav">
        <?php if ($role === 'Attendant'): ?>
          <li>
            <a href="dashboard.php" class="sidebar-link <?php echo is_active('dashboard.php', $current_page); ?>">
              <i class="fa-solid fa-desktop text-neonCyan"></i>
              <span>Seating Status</span>
            </a>
          </li>
          <li>
            <a href="pos.php" class="sidebar-link <?php echo is_active('pos.php', $current_page); ?>">
              <i class="fa-solid fa-cookie-bite text-neonPink"></i>
              <span>Food Options</span>
            </a>
          </li>
          <li>
            <a href="billing.php" class="sidebar-link <?php echo is_active('billing.php', $current_page); ?>">
              <i class="fa-solid fa-hand-holding-dollar text-neonGold"></i>
              <span>Pricing Rules</span>
            </a>
          </li>
        <?php else: ?>
          <li>
            <a href="dashboard.php" class="sidebar-link <?php echo is_active('dashboard.php', $current_page); ?>">
              <i class="fa-solid fa-gauge"></i>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a href="revenue.php" class="sidebar-link <?php echo is_active('revenue.php', $current_page); ?>">
              <i class="fa-solid fa-chart-line text-neonGreen"></i>
              <span>Revenue Analytics</span>
            </a>
          </li>
          <li>
            <a href="sessions.php" class="sidebar-link <?php echo is_active('sessions.php', $current_page); ?>">
              <i class="fa-solid fa-stopwatch"></i>
              <span>Live Sessions</span>
            </a>
          </li>
          <li>
            <a href="appointments.php" class="sidebar-link <?php echo is_active('appointments.php', $current_page); ?>">
              <i class="fa-solid fa-calendar-check text-neonCyan"></i>
              <span>Appointments</span>
            </a>
          </li>
          <?php if ($role !== 'Manager'): ?>
          <li>
            <a href="stations.php" class="sidebar-link <?php echo is_active('stations.php', $current_page); ?>">
              <i class="fa-solid fa-desktop"></i>
              <span>Stations</span>
            </a>
          </li>
          <?php endif; ?>
          <li>
            <a href="players.php" class="sidebar-link <?php echo is_active('players.php', $current_page); ?>">
              <i class="fa-solid fa-users"></i>
              <span>Players</span>
            </a>
          </li>
          <li>
            <a href="pos.php" class="sidebar-link <?php echo is_active('pos.php', $current_page); ?>">
              <i class="fa-solid fa-cart-shopping"></i>
              <span>Cafe POS</span>
            </a>
          </li>
          <?php if ($role !== 'Manager'): ?>
          <li>
            <a href="billing.php" class="sidebar-link <?php echo is_active('billing.php', $current_page); ?>">
              <i class="fa-solid fa-file-invoice-dollar"></i>
              <span>Billing & Rates</span>
            </a>
          </li>
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
              <i class="fa-solid fa-user-gear text-neonCyan"></i>
              <span>Staff Accounts</span>
            </a>
          </li>
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
        <i class="fa-solid fa-angle-right text-neonCyan"></i>
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
                case 'revenue.php': echo 'Revenue & Transactions Analytics'; break;
                default: echo 'The Gaming Garage Admin';
            }
          ?>
        </span>
      </div>
      
      <div class="nav-actions flex items-center gap-4">
        <div class="hidden md:flex flex-col text-right">
          <span class="text-sm font-semibold text-slate-200"><?php echo htmlspecialchars($fullname); ?></span>
          <span class="text-xs text-neonCyan font-bold tracking-wider uppercase"><?php echo htmlspecialchars($role); ?></span>
        </div>
        <a href="logout.php" class="flex items-center justify-center p-2 rounded bg-cyberDark border border-neonRed text-neonRed hover:bg-neonRed hover:text-cyberDark hover:shadow-[0_0_10px_rgba(255,51,51,0.5)] transition-all duration-300" title="Log Out">
          <i class="fa-solid fa-power-off text-lg"></i>
        </a>
      </div>
    </header>

    <!-- Content Area -->
    <main class="main-content">
<?php endif; ?>
