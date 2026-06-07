<?php
session_start();

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
            // 1. Try Operator Admin Login first
            $url = 'http://127.0.0.1:8000/api/auth/login';
            $data = array('username' => $username, 'password' => $password);
            
            $options = array(
                'http' => array(
                    'header'  => "Content-type: application/json\r\n",
                    'method'  => 'POST',
                    'content' => json_encode($data),
                    'ignore_errors' => true
                )
            );

            $context  = stream_context_create($options);
            $result = @file_get_contents($url, false, $context);
            $response = $result !== FALSE ? json_decode($result, true) : null;
            
            if ($response && isset($response['success']) && $response['success'] === true) {
                // Operator login success!
                $_SESSION['jwt_token'] = $response['token'];
                $_SESSION['user_id'] = $response['user']['id'];
                $_SESSION['username'] = $response['user']['username'];
                $_SESSION['fullname'] = $response['user']['full_name'];
                $_SESSION['role'] = $response['user']['role'];
                
                header("Location: dashboard.php");
                exit();
            } else {
                // 2. Try Customer Login (using same credentials: username acts as phone number)
                $url = 'http://127.0.0.1:8000/api/auth/customer/login';
                $data = array('phone' => $username, 'password' => $password);
                
                $options = array(
                    'http' => array(
                        'header'  => "Content-type: application/json\r\n",
                        'method'  => 'POST',
                        'content' => json_encode($data),
                        'ignore_errors' => true
                    )
                );

                $context  = stream_context_create($options);
                $result = @file_get_contents($url, false, $context);
                $responseCustomer = $result !== FALSE ? json_decode($result, true) : null;

                if ($responseCustomer && isset($responseCustomer['success']) && $responseCustomer['success'] === true) {
                    // Customer login success!
                    $_SESSION['jwt_token'] = $responseCustomer['token'];
                    $_SESSION['user_id'] = $responseCustomer['user']['id'];
                    $_SESSION['username'] = $responseCustomer['user']['phone'];
                    $_SESSION['fullname'] = $responseCustomer['user']['full_name'];
                    $_SESSION['role'] = $responseCustomer['user']['role'];
                    
                    header("Location: customer_dashboard.php");
                    exit();
                } else {
                    // Both login types failed
                    if ($responseCustomer && isset($responseCustomer['message'])) {
                        $error = $responseCustomer['message'];
                    } else if ($response && isset($response['message'])) {
                        $error = $response['message'];
                    } else {
                        $error = 'Invalid credentials or inactive account';
                    }
                }
            }
        } else {
            $error = 'Please enter username/phone and password';
        }
    } else if ($action === 'register') {
        $name = trim($_POST['name']);
        $phone = trim($_POST['phone']);
        $email = trim($_POST['email']);
        $password = trim($_POST['password']);

        if (!empty($name) && !empty($phone) && !empty($password)) {
            // Contact Node.js Backend API
            $url = 'http://127.0.0.1:8000/api/auth/customer/register';
            
            $data = array('name' => $name, 'phone' => $phone, 'email' => $email ?: null, 'password' => $password);
            $options = array(
                'http' => array(
                    'header'  => "Content-type: application/json\r\n",
                    'method'  => 'POST',
                    'content' => json_encode($data),
                    'ignore_errors' => true
                )
            );

            $context  = stream_context_create($options);
            $result = @file_get_contents($url, false, $context);
            
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
  <title>The Gaming Garage - Portal Login</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            cyberDark: '#0a0b10',
            cyberPanel: '#11131c',
            neonCyan: '#00f0ff',
            neonPink: '#ff007f',
            neonGreen: '#39ff14'
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" href="../css/cyberpunk.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-cyberDark flex items-center justify-center min-h-screen p-4">

  <div class="w-full max-w-md p-6 bg-cyberPanel border border-slate-800 rounded-lg shadow-2xl relative overflow-hidden">
    <!-- Neon glowing outline -->
    <div class="absolute -inset-0.5 bg-gradient-to-r from-neonCyan to-neonPink rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
    
    <div class="relative bg-cyberPanel p-2 rounded-lg">
      <div class="text-center mb-6">
        <div class="inline-flex p-3 bg-slate-900 border border-neonCyan rounded-full mb-3 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          <i class="fa-solid fa-gamepad text-neonCyan text-2xl animate-pulse"></i>
        </div>
        <h2 class="text-2xl font-extrabold text-neonCyan tracking-wider uppercase font-cyber">The Gaming Garage</h2>
        <p class="text-slate-400 text-xs mt-1 uppercase tracking-widest font-cyber">Portal Gateway</p>
      </div>

      <!-- Tab Switcher -->
      <div class="flex border-b border-slate-800 mb-6 font-cyber text-sm">
        <button id="tab-login" onclick="showForm('login')" class="flex-1 pb-3 text-center text-neonCyan border-b-2 border-neonCyan font-bold transition-all duration-300">
          SIGN IN
        </button>
        <button id="tab-register" onclick="showForm('register')" class="flex-1 pb-3 text-center text-slate-500 hover:text-slate-200 transition-all duration-300">
          PLAYER SIGN UP
        </button>
      </div>

      <?php if (!empty($error)): ?>
        <div class="bg-red-500/10 border border-red-500 text-red-200 text-sm px-4 py-3 rounded mb-6 flex items-center gap-2">
          <i class="fa-solid fa-triangle-exclamation text-neonRed text-lg"></i>
          <span><?php echo htmlspecialchars($error); ?></span>
        </div>
      <?php endif; ?>

      <?php if (!empty($success)): ?>
        <div class="bg-green-500/10 border border-neonGreen text-green-200 text-sm px-4 py-3 rounded mb-6 flex items-center gap-2">
          <i class="fa-solid fa-circle-check text-neonGreen text-lg"></i>
          <span><?php echo htmlspecialchars($success); ?></span>
        </div>
      <?php endif; ?>

      <!-- Login Form -->
      <form id="form-login" method="POST" action="login.php" class="space-y-5">
        <input type="hidden" name="action" value="login">
        
        <div>
          <label class="form-label text-slate-400 text-xs block mb-1 font-cyber" for="login-username">Username or Phone</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <i class="fa-solid fa-user"></i>
            </span>
            <input type="text" name="username" id="login-username" required 
                   class="form-control pl-10 block w-full bg-slate-950 border-slate-800 rounded-md focus:border-neonCyan focus:ring-neonCyan text-white text-sm py-2.5" 
                   placeholder="e.g. attendant or +15550188">
          </div>
        </div>

        <div>
          <label class="form-label text-slate-400 text-xs block mb-1 font-cyber" for="login-password">Password / Passcode</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <i class="fa-solid fa-lock"></i>
            </span>
            <input type="password" name="password" id="login-password" required 
                   class="form-control pl-10 block w-full bg-slate-950 border-slate-800 rounded-md focus:border-neonCyan focus:ring-neonCyan text-white text-sm py-2.5" 
                   placeholder="••••••••">
          </div>
        </div>

        <button type="submit" class="w-full btn btn-primary flex justify-center py-3 font-cyber text-base uppercase mt-6">
          Establish Connection <i class="fa-solid fa-arrow-right ml-2 text-xs"></i>
        </button>
      </form>

      <!-- Register Form (Customers only) -->
      <form id="form-register" method="POST" action="login.php" class="space-y-5 hidden">
        <input type="hidden" name="action" value="register">
        
        <div>
          <label class="form-label text-slate-400 text-xs block mb-1 font-cyber" for="reg-name">Full Name</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <i class="fa-solid fa-user"></i>
            </span>
            <input type="text" name="name" id="reg-name" required 
                   class="form-control pl-10 block w-full bg-slate-950 border-slate-800 rounded-md focus:border-neonCyan focus:ring-neonCyan text-white text-sm py-2.5" 
                   placeholder="e.g. Sarah Connor">
          </div>
        </div>

        <div>
          <label class="form-label text-slate-400 text-xs block mb-1 font-cyber" for="reg-phone">Phone Number</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <i class="fa-solid fa-phone"></i>
            </span>
            <input type="text" name="phone" id="reg-phone" required 
                   class="form-control pl-10 block w-full bg-slate-950 border-slate-800 rounded-md focus:border-neonCyan focus:ring-neonCyan text-white text-sm py-2.5" 
                   placeholder="e.g. +15550188">
          </div>
        </div>

        <div>
          <label class="form-label text-slate-400 text-xs block mb-1 font-cyber" for="reg-email">Email Address (Optional)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <i class="fa-solid fa-envelope"></i>
            </span>
            <input type="email" name="email" id="reg-email" 
                   class="form-control pl-10 block w-full bg-slate-950 border-slate-800 rounded-md focus:border-neonCyan focus:ring-neonCyan text-white text-sm py-2.5" 
                   placeholder="e.g. sarah@skynet.com">
          </div>
        </div>

        <div>
          <label class="form-label text-slate-400 text-xs block mb-1 font-cyber" for="reg-password">Password</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <i class="fa-solid fa-lock"></i>
            </span>
            <input type="password" name="password" id="reg-password" required 
                   class="form-control pl-10 block w-full bg-slate-950 border-slate-800 rounded-md focus:border-neonCyan focus:ring-neonCyan text-white text-sm py-2.5" 
                   placeholder="Min 6 characters">
          </div>
        </div>

        <button type="submit" class="w-full btn btn-accent flex justify-center py-3 font-cyber text-base uppercase mt-6">
          Initialize Account <i class="fa-solid fa-user-plus ml-2 text-xs"></i>
        </button>
      </form>
      
      <div class="mt-6 text-center text-[10px] text-slate-500">
        All activity on this node is monitored.
      </div>
      
      <div class="mt-4 text-center">
        <a href="../index.php" class="text-xs text-neonPink hover:underline font-cyber">
          <i class="fa-solid fa-arrow-left mr-1"></i> Back to Landing Page
        </a>
      </div>
    </div>
  </div>

  <script>
    function showForm(type) {
      const loginForm = document.getElementById('form-login');
      const regForm = document.getElementById('form-register');
      const tabLogin = document.getElementById('tab-login');
      const tabReg = document.getElementById('tab-register');

      if (type === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        
        tabLogin.className = 'flex-1 pb-3 text-center text-neonCyan border-b-2 border-neonCyan font-bold transition-all duration-300';
        tabReg.className = 'flex-1 pb-3 text-center text-slate-500 hover:text-slate-200 transition-all duration-300';
      } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        
        tabLogin.className = 'flex-1 pb-3 text-center text-slate-500 hover:text-slate-200 transition-all duration-300';
        tabReg.className = 'flex-1 pb-3 text-center text-neonCyan border-b-2 border-neonCyan font-bold transition-all duration-300';
      }
    }

    // Auto switch to register if error or register action was chosen
    <?php if (isset($_POST['action']) && $_POST['action'] === 'register'): ?>
      showForm('register');
    <?php endif; ?>
  </script>

</body>
</html>
