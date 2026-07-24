<?php
session_start();
require_once '../config.php';

$error = '';
$success = '';

if (isset($_SESSION['jwt_token'])) {
    if ($_SESSION['role'] === 'Customer') {
        header("Location: customer_dashboard.php");
    } else {
        header("Location: dashboard.php");
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'login';

    if ($action === 'login') {
        $username = trim($_POST['username']);
        $password = trim($_POST['password']);

        if (!empty($username) && !empty($password)) {
            $url = BACKEND_URL . '/api/auth/login';
            $data = array('username' => $username, 'password' => $password);
            $options = array('http' => array('header'  => "Content-type: application/json\r\n", 'method'  => 'POST', 'content' => json_encode($data), 'ignore_errors' => true));
            $context  = stream_context_create($options);
            $result = @file_get_contents($url, false, $context);
            $response = $result !== FALSE ? json_decode($result, true) : null;
            
            if ($response && isset($response['success']) && $response['success'] === true) {
                $_SESSION['jwt_token'] = $response['token'];
                $_SESSION['user_id']   = $response['user']['id'];
                $_SESSION['username']  = $response['user']['username'];
                $_SESSION['fullname']  = $response['user']['full_name'];
                $_SESSION['role']      = $response['user']['role'];
                header("Location: dashboard.php");
                exit();
            } else {
                // If username is a phone number (numeric or with +), try customer login
                $isPhone = preg_match('/^\+?\d+$/', $username);
                
                if ($isPhone) {
                    $url = BACKEND_URL . '/api/auth/customer/login';
                    $data = array('phone' => $username, 'password' => $password);
                    $options = array('http' => array('header'  => "Content-type: application/json\r\n", 'method'  => 'POST', 'content' => json_encode($data), 'ignore_errors' => true));
                    $context  = stream_context_create($options);
                    $result = @file_get_contents($url, false, $context);
                    $responseCustomer = $result !== FALSE ? json_decode($result, true) : null;

                    if ($responseCustomer && isset($responseCustomer['success']) && $responseCustomer['success'] === true) {
                        $_SESSION['jwt_token'] = $responseCustomer['token'];
                        $_SESSION['user_id']   = $responseCustomer['user']['id'];
                        $_SESSION['username']  = $responseCustomer['user']['phone'];
                        $_SESSION['fullname']  = $responseCustomer['user']['name'];
                        $_SESSION['role']      = $responseCustomer['user']['role'];
                        header("Location: customer_dashboard.php");
                        exit();
                    } else {
                        $error = ($responseCustomer && isset($responseCustomer['message'])) 
                            ? $responseCustomer['message'] 
                            : 'Invalid credentials or blacklisted account';
                    }
                } else {
                    $error = ($response && isset($response['message'])) 
                        ? $response['message'] 
                        : 'Invalid credentials or inactive account';
                }
            }
        } else {
            $error = 'Please enter username/phone and password';
        }
    } else if ($action === 'register') {
        $name     = trim($_POST['name']);
        $phone    = trim($_POST['phone']);
        $email    = trim($_POST['email']);
        $password = trim($_POST['password']);

        if (!empty($name) && !empty($phone) && !empty($password)) {
            $url  = BACKEND_URL . '/api/auth/customer/register';
            $data = array('name' => $name, 'phone' => $phone, 'email' => $email ?: null, 'password' => $password);
            $options = array('http' => array('header'  => "Content-type: application/json\r\n", 'method'  => 'POST', 'content' => json_encode($data), 'ignore_errors' => true));
            $context  = stream_context_create($options);
            $result   = @file_get_contents($url, false, $context);
            if ($result !== FALSE) {
                $response = json_decode($result, true);
                if (isset($response['success']) && $response['success'] === true) {
                    $success = 'Registration successful! Please login below.';
                } else {
                    $error = isset($response['message']) ? $response['message'] : 'Registration failed';
                }
            } else {
                $error = 'Backend server is offline. Please make sure Node.js is running.';
            }
        } else {
            $error = 'Please enter name, phone number, and password';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Soleila — Portal Login</title>
  <link rel="stylesheet" href="../css/retro_wood.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    /* ─── Login page layout ─── */
    html, body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }

    .login-shell {
      width: 100%;
      max-width: 420px;
      background: #f3edd7;
      border: 2px double #d5cbb5;
      border-radius: 6px;
      box-shadow: 0 20px 60px rgba(92,64,51,0.18), 0 4px 12px rgba(92,64,51,0.1);
      overflow: hidden;
    }

    /* ─── Top hero strip ─── */
    .login-hero {
      background: linear-gradient(135deg, #5c4033 0%, #7a5443 50%, #5c4033 100%);
      padding: 36px 32px 28px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .login-hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 11px);
    }
    .login-hero-icon {
      display: inline-flex;
      width: 60px;
      height: 60px;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.08);
      border: 1.5px solid rgba(255,255,255,0.18);
      border-radius: 50%;
      margin-bottom: 14px;
      position: relative;
    }
    .login-hero-icon i {
      font-size: 26px;
      color: #e9dfc6;
    }
    .login-hero h1 {
      color: #fcfaf2;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 4px;
      text-transform: uppercase;
      font-family: 'Playfair Display', serif;
      margin-bottom: 4px;
    }
    .login-hero p {
      color: rgba(249,245,238,0.6);
      font-size: 10px;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-family: 'Playfair Display', serif;
    }

    /* ─── Tab bar ─── */
    .login-tabs {
      display: flex;
      border-bottom: 2px solid #d5cbb5;
      background: #ede2c9;
    }
    .login-tab {
      flex: 1;
      padding: 13px 0;
      background: transparent;
      border: none;
      cursor: pointer;
      font-family: 'Playfair Display', serif;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #8b7a6f;
      transition: all 0.2s;
      position: relative;
    }
    .login-tab.active {
      color: #5c4033;
    }
    .login-tab.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: #5c4033;
    }
    .login-tab:hover:not(.active) {
      color: #5e4d44;
      background: rgba(92,64,51,0.04);
    }

    /* ─── Body of the card ─── */
    .login-body {
      padding: 28px 32px 24px;
    }

    /* ─── Alert bars ─── */
    .login-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 14px;
      border-radius: 4px;
      font-size: 13px;
      margin-bottom: 20px;
      border: 1px solid;
    }
    .login-alert.error {
      background: rgba(128,43,26,0.08);
      border-color: #802b1a;
      color: #5c2010;
    }
    .login-alert.success {
      background: rgba(75,101,40,0.08);
      border-color: #4b6528;
      color: #384d1e;
    }

    /* ─── Forms ─── */
    .login-form { display: flex; flex-direction: column; gap: 18px; }
    .login-form.hidden { display: none; }

    .lf-group { display: flex; flex-direction: column; gap: 6px; }
    .lf-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #7e6c61;
      font-family: 'Playfair Display', serif;
    }
    .lf-input-wrap { position: relative; }
    .lf-input-wrap .lf-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #a19084;
      font-size: 13px;
      pointer-events: none;
    }
    .lf-input {
      width: 100%;
      padding: 11px 14px 11px 38px;
      background: #e9dfc6;
      border: 1.5px solid #d5cbb5;
      border-radius: 3px;
      color: #2d221c;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
      -webkit-appearance: none;
    }
    .lf-input::placeholder { color: #a19084; }
    .lf-input:focus {
      border-color: #5c4033;
      box-shadow: 0 0 0 3px rgba(92,64,51,0.1);
    }

    /* ─── Submit buttons ─── */
    .lf-submit {
      width: 100%;
      padding: 13px 20px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-family: 'Playfair Display', serif;
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.15s ease;
      margin-top: 4px;
    }
    .lf-submit.primary {
      background: #5c4033;
      color: #fcfaf2;
      box-shadow: 0 3px 0 #3d2314;
    }
    .lf-submit.primary:hover {
      background: #493228;
      transform: translateY(-1px);
      box-shadow: 0 4px 0 #3d2314;
    }
    .lf-submit.primary:active {
      transform: translateY(1px);
      box-shadow: 0 1px 0 #3d2314;
    }
    .lf-submit.accent {
      background: #a0522d;
      color: #fcfaf2;
      box-shadow: 0 3px 0 #7c3a1e;
    }
    .lf-submit.accent:hover {
      background: #8b4513;
      transform: translateY(-1px);
      box-shadow: 0 4px 0 #7c3a1e;
    }

    /* ─── Dev quick-login ─── */
    .dev-access {
      border-top: 1px dashed #d5cbb5;
      padding-top: 18px;
      margin-top: 4px;
    }
    .dev-access-label {
      text-align: center;
      font-size: 9px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #a19084;
      font-family: 'Playfair Display', serif;
      margin-bottom: 10px;
    }
    .dev-btns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 7px;
    }
    .dev-btn {
      padding: 8px 6px;
      border-radius: 3px;
      border: 1px solid;
      background: transparent;
      cursor: pointer;
      font-family: 'Playfair Display', serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: all 0.15s;
    }
    .dev-btn.wood   { border-color: #5c4033; color: #5c4033; }
    .dev-btn.wood:hover   { background: #5c4033; color: #fcfaf2; }
    .dev-btn.clay   { border-color: #a0522d; color: #a0522d; }
    .dev-btn.clay:hover   { background: #a0522d; color: #fcfaf2; }
    .dev-btn.brass  { border-color: #b8860b; color: #b8860b; }
    .dev-btn.brass:hover  { background: #b8860b; color: #fcfaf2; }

    /* ─── Footer strip ─── */
    .login-footer {
      border-top: 1px solid #d5cbb5;
      padding: 14px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ede2c9;
    }
    .login-footer-note {
      font-size: 10px;
      color: #a19084;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-family: 'Playfair Display', serif;
    }
    .login-footer-link {
      font-size: 11px;
      color: #a0522d;
      text-decoration: none;
      font-family: 'Playfair Display', serif;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: color 0.15s;
    }
    .login-footer-link:hover { color: #5c4033; }

    /* ─── Entrance animation ─── */
    @keyframes loginSlideIn {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .login-shell { animation: loginSlideIn 0.45s cubic-bezier(0.22,0.68,0,1.2) both; }

    @keyframes iconSpin {
      0%,100% { transform: rotate(-8deg) scale(1); }
      50%      { transform: rotate(8deg) scale(1.08); }
    }
    .login-hero-icon i { animation: iconSpin 4s ease-in-out infinite; }
  </style>
</head>
<body>

  <div class="login-shell">

    <!-- Hero -->
    <div class="login-hero">
      <div class="login-hero-icon">
        <i class="fa-solid fa-gamepad"></i>
      </div>
      <h1>Soleila</h1>
      <p>Member Portal</p>
    </div>

    <!-- Tabs -->
    <div class="login-tabs">
      <button id="tab-login"    class="login-tab active" onclick="showForm('login')">Sign In</button>
      <button id="tab-register" class="login-tab"        onclick="showForm('register')">Player Sign Up</button>
    </div>

    <!-- Body -->
    <div class="login-body">

      <?php if (!empty($error)): ?>
        <div class="login-alert error">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span><?php echo htmlspecialchars($error); ?></span>
        </div>
      <?php endif; ?>

      <?php if (!empty($success)): ?>
        <div class="login-alert success">
          <i class="fa-solid fa-circle-check"></i>
          <span><?php echo htmlspecialchars($success); ?></span>
        </div>
      <?php endif; ?>

      <!-- ── Login Form ── -->
      <form id="form-login" method="POST" action="login.php" class="login-form">
        <input type="hidden" name="action" value="login">

        <div class="lf-group">
          <label class="lf-label" for="login-username">Username or Phone</label>
          <div class="lf-input-wrap">
            <i class="fa-solid fa-user lf-icon"></i>
            <input type="text" name="username" id="login-username" required
                   class="lf-input" placeholder="e.g. attendant or +15550188"
                   autocomplete="username">
          </div>
        </div>

        <div class="lf-group">
          <label class="lf-label" for="login-password">Password / Passcode</label>
          <div class="lf-input-wrap">
            <i class="fa-solid fa-lock lf-icon"></i>
            <input type="password" name="password" id="login-password" required
                   class="lf-input" placeholder="Enter your password"
                   autocomplete="current-password">
          </div>
        </div>

        <button type="submit" class="lf-submit primary">
          Sign In <i class="fa-solid fa-arrow-right-to-bracket"></i>
        </button>

        <?php if (defined('IS_LOCALHOST') && IS_LOCALHOST === true): ?>
        <div class="dev-access">
          <p class="dev-access-label"><i class="fa-solid fa-flask-vial" style="margin-right:4px;"></i> Quick Test Access (Dev Only)</p>
          <div class="dev-btns">
            <button type="button" class="dev-btn wood"  onclick="quickLogin('admin','admin123')">SuperAdmin</button>
            <button type="button" class="dev-btn wood"  onclick="quickLogin('manager','manager123')">Manager</button>
            <button type="button" class="dev-btn brass" onclick="quickLogin('9999999999','player123')">Customer</button>
          </div>
        </div>
        <?php endif; ?>
      </form>

      <!-- ── Register Form ── -->
      <form id="form-register" method="POST" action="login.php" class="login-form hidden">
        <input type="hidden" name="action" value="register">

        <div class="lf-group">
          <label class="lf-label" for="reg-name">Full Name</label>
          <div class="lf-input-wrap">
            <i class="fa-solid fa-user lf-icon"></i>
            <input type="text" name="name" id="reg-name" required
                   class="lf-input" placeholder="e.g. Sarah Connor">
          </div>
        </div>

        <div class="lf-group">
          <label class="lf-label" for="reg-phone">Phone Number</label>
          <div class="lf-input-wrap">
            <i class="fa-solid fa-phone lf-icon"></i>
            <input type="text" name="phone" id="reg-phone" required
                   class="lf-input" placeholder="e.g. +919876543210">
          </div>
        </div>

        <div class="lf-group">
          <label class="lf-label" for="reg-email">Email Address <span style="font-weight:400;opacity:.6;">(Optional)</span></label>
          <div class="lf-input-wrap">
            <i class="fa-solid fa-envelope lf-icon"></i>
            <input type="email" name="email" id="reg-email"
                   class="lf-input" placeholder="e.g. sarah@example.com">
          </div>
        </div>

        <div class="lf-group">
          <label class="lf-label" for="reg-password">Password</label>
          <div class="lf-input-wrap">
            <i class="fa-solid fa-lock lf-icon"></i>
            <input type="password" name="password" id="reg-password" required
                   class="lf-input" placeholder="Min 6 characters">
          </div>
        </div>

        <button type="submit" class="lf-submit accent">
          Create Account <i class="fa-solid fa-user-plus"></i>
        </button>
      </form>

    </div><!-- /login-body -->

    <!-- Footer strip -->
    <div class="login-footer">
      <span class="login-footer-note"><i class="fa-solid fa-shield-halved" style="margin-right:5px;opacity:.5;"></i>Secure Login</span>
      <a href="../index.php" class="login-footer-link">
        <i class="fa-solid fa-arrow-left"></i> Back to Home
      </a>
    </div>

  </div><!-- /login-shell -->

  <script>
    function showForm(type) {
      const loginForm  = document.getElementById('form-login');
      const regForm    = document.getElementById('form-register');
      const tabLogin   = document.getElementById('tab-login');
      const tabReg     = document.getElementById('tab-register');

      if (type === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
      } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabReg.classList.add('active');
      }
    }

    function quickLogin(username, password) {
      document.getElementById('login-username').value = username;
      document.getElementById('login-password').value = password;
      showForm('login');
      document.getElementById('form-login').submit();
    }

    <?php if (isset($_POST['action']) && $_POST['action'] === 'register'): ?>
      showForm('register');
    <?php endif; ?>
  </script>

</body>
</html>
