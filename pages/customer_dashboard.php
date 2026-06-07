<?php
session_start();
if (!isset($_SESSION['jwt_token']) || $_SESSION['role'] !== 'Customer') {
    header("Location: customer_login.php");
    exit();
}

$fullname = $_SESSION['fullname'];
$phone = $_SESSION['username'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Gaming Garage - Customer Dashboard</title>
  <!-- Tailwind CSS CDN -->
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
  <style>
    .progress-bar-glow {
      box-shadow: 0 0 10px var(--glow-color, rgba(0, 240, 255, 0.5));
    }
    .neon-border-glow {
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.05);
    }
  </style>
</head>
<body class="bg-cyberDark text-slate-100 min-h-screen font-sans">

  <!-- Customer Hub Layout -->
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-cyberPanel/90 backdrop-blur border-b border-slate-900 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
      <div class="flex items-center gap-3">
        <a href="customer_dashboard.php" class="flex items-center gap-3 hover:opacity-80 transition duration-300">
          <i class="fa-solid fa-gamepad text-neonCyan text-2xl animate-pulse"></i>
          <span class="font-cyber text-xl font-extrabold tracking-widest text-neonCyan uppercase">The Gaming Garage</span>
        </a>
        <span class="hidden md:inline-block text-[10px] bg-slate-900 border border-neonCyan/40 text-neonCyan px-2 py-0.5 rounded font-mono">CUSTOMER PORTAL</span>
      </div>
      
      <div class="flex items-center gap-4">
        <div class="text-right">
          <span class="text-sm font-semibold text-slate-200 block"><?php echo htmlspecialchars($fullname); ?></span>
          <span class="text-[10px] text-slate-500 font-mono"><?php echo htmlspecialchars($phone); ?></span>
        </div>
        <a href="logout.php" class="flex items-center justify-center p-2 rounded bg-cyberDark border border-neonRed text-neonRed hover:bg-neonRed hover:text-cyberDark hover:shadow-[0_0_10px_rgba(255,51,51,0.5)] transition-all duration-300" title="Log Out">
          <i class="fa-solid fa-power-off text-base"></i>
        </a>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-grow p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      
      <!-- Welcome Alert / Banner -->
      <div class="bg-cyberPanel border border-neonCyan/30 rounded-lg p-6 relative overflow-hidden neon-border-glow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="absolute -right-16 -top-16 w-40 h-40 bg-neonCyan/5 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h2 class="text-2xl font-bold font-cyber text-white tracking-wider flex items-center gap-2">
            <span>WELCOME BACK, OPERATIVE</span>
          </h2>
          <p class="text-xs text-slate-400 mt-1">Ready to start playing? Check your wallet balance and loyalty status details below.</p>
        </div>
        <div>
          <a href="../index.php#book-session" class="btn btn-primary px-6 py-2.5 text-xs font-cyber tracking-wider uppercase">
            <i class="fa-solid fa-calendar-days mr-1.5"></i> Book Slot Slot
          </a>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Wallet Card -->
        <div class="bg-cyberPanel border border-slate-800 rounded-lg p-5 flex flex-col justify-between h-44 relative">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-[10px] uppercase font-cyber tracking-widest text-slate-500 block">Digital Wallet</span>
              <span class="text-2xl font-extrabold text-neonCyan font-cyber mt-1 block" id="wallet-balance">₹0.00</span>
            </div>
            <div class="p-2.5 bg-slate-900 border border-slate-800 rounded-full">
              <i class="fa-solid fa-wallet text-neonCyan text-lg"></i>
            </div>
          </div>
          <div class="border-t border-slate-850 pt-3 flex justify-between items-center text-[10px]">
            <span class="text-slate-400">Payment Status</span>
            <span class="text-neonGreen font-semibold uppercase tracking-wider">Account Active</span>
          </div>
        </div>

        <!-- Loyalty Points Card -->
        <div class="bg-cyberPanel border border-slate-800 rounded-lg p-5 flex flex-col justify-between h-44">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-[10px] uppercase font-cyber tracking-widest text-slate-500 block">Loyalty Points</span>
              <span class="text-2xl font-extrabold text-neonGold font-cyber mt-1 block" id="loyalty-points">0 PTS</span>
            </div>
            <div class="p-2.5 bg-slate-900 border border-slate-800 rounded-full">
              <i class="fa-solid fa-crown text-neonGold text-lg"></i>
            </div>
          </div>
          <div class="border-t border-slate-850 pt-3 flex justify-between items-center text-[10px]">
            <span class="text-slate-400">Current Discount Multiplier</span>
            <span class="text-neonGold font-semibold uppercase tracking-wider" id="loyalty-discount">5% Off</span>
          </div>
        </div>

        <!-- Loyalty Tier Progression Card -->
        <div class="bg-cyberPanel border border-slate-800 rounded-lg p-5 flex flex-col justify-between h-44">
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-[10px] uppercase font-cyber tracking-widest text-slate-500">Tier Progress</span>
              <span class="text-[10px] text-white font-cyber font-bold uppercase tracking-wider" id="current-tier-badge">Bronze</span>
            </div>
            <!-- Progress Bar -->
            <div class="w-full bg-slate-900 rounded-full h-3.5 border border-slate-800 overflow-hidden relative">
              <div id="tier-progress-fill" class="bg-gradient-to-r from-neonCyan to-neonGold h-full rounded-full transition-all duration-500 progress-bar-glow" style="width: 0%"></div>
            </div>
          </div>
          <div class="text-[10px] text-slate-400" id="tier-progress-text">
            Loading tier status...
          </div>
        </div>

      </div>

      <!-- History and Logs tab -->
      <div class="bg-cyberPanel border border-slate-800 rounded-lg p-6">
        <div class="flex border-b border-slate-800 mb-6 font-cyber text-xs">
          <button id="tab-btn-sessions" onclick="switchLogs('sessions')" class="pb-3 text-neonCyan border-b-2 border-neonCyan font-bold tracking-widest mr-6 transition-all duration-300">
            🕹️ GAMING LOGS
          </button>
          <button id="tab-btn-cafe" onclick="switchLogs('cafe')" class="pb-3 text-slate-500 hover:text-slate-200 tracking-widest transition-all duration-300">
            🍕 CAFE BILLS
          </button>
        </div>

        <!-- Gaming Logs Content -->
        <div id="logs-sessions" class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-900/60 border-b border-slate-800 font-cyber uppercase tracking-wider text-slate-400">
                <th class="p-3">Session ID</th>
                <th class="p-3">Station</th>
                <th class="p-3">Type</th>
                <th class="p-3">Start Time</th>
                <th class="p-3">End Time</th>
                <th class="p-3 text-right">Total Cost</th>
                <th class="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody id="sessions-log-body" class="divide-y divide-slate-850">
              <tr>
                <td colspan="7" class="p-8 text-center text-slate-500 font-cyber">
                  <i class="fa-solid fa-spinner fa-spin mr-2"></i> Syncing game history...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Cafe Bills Content -->
        <div id="logs-cafe" class="overflow-x-auto hidden">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-900/60 border-b border-slate-800 font-cyber uppercase tracking-wider text-slate-400">
                <th class="p-3">Sale ID</th>
                <th class="p-3">Items Summary</th>
                <th class="p-3">Method</th>
                <th class="p-3">Date</th>
                <th class="p-3 text-right">Total</th>
                <th class="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody id="cafe-log-body" class="divide-y divide-slate-850">
              <tr>
                <td colspan="6" class="p-8 text-center text-slate-500 font-cyber">
                  <i class="fa-solid fa-spinner fa-spin mr-2"></i> Syncing snack purchases...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

    </main>

    <!-- Footer -->
    <footer class="bg-slate-950 border-t border-slate-900 py-6 text-center text-[10px] text-slate-500">
      <p>© 2026 The Gaming Garage. Member terminal connection active.</p>
    </footer>
  </div>

  <!-- Client-side script to fetch data dynamically -->
  <script>
    window.BACKEND_URL = 'http://127.0.0.1:8000/api';
    window.JWT_TOKEN = '<?php echo $_SESSION["jwt_token"]; ?>';
    
    document.addEventListener('DOMContentLoaded', () => {
      loadProfileData();
      loadHistoryData();
    });

    async function apiFetch(endpoint) {
      const response = await fetch(`${window.BACKEND_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.JWT_TOKEN}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      return data;
    }

    async function loadProfileData() {
      try {
        const data = await apiFetch('/players/profile/me');
        if (data.success && data.player) {
          const p = data.player;
          
          document.getElementById('wallet-balance').innerText = `₹${parseFloat(p.wallet_balance).toFixed(2)}`;
          document.getElementById('loyalty-points').innerText = `${p.loyalty_points} PTS`;
          
          // Loyalty Tier logic
          const tier = p.loyalty_tier;
          document.getElementById('current-tier-badge').innerText = tier;
          
          let discount = '5% Off';
          if (tier === 'Gold') discount = '15% Off';
          else if (tier === 'Silver') discount = '10% Off';
          document.getElementById('loyalty-discount').innerText = discount;
          
          // Badge color classes
          const badge = document.getElementById('current-tier-badge');
          const progressFill = document.getElementById('tier-progress-fill');
          
          badge.className = 'text-[10px] px-2 py-0.5 rounded font-cyber font-bold uppercase tracking-wider ';
          if (tier === 'Gold') {
            badge.className += 'bg-neonGold/10 border border-neonGold text-neonGold';
            progressFill.style.setProperty('--glow-color', 'rgba(255, 215, 0, 0.6)');
            progressFill.className = 'bg-gradient-to-r from-neonGold to-yellow-500 h-full rounded-full transition-all duration-500 progress-bar-glow';
            progressFill.style.width = '100%';
            document.getElementById('tier-progress-text').innerText = '🔥 Maximum Gold tier achieved!';
          } else if (tier === 'Silver') {
            badge.className += 'bg-neonCyan/10 border border-neonCyan text-neonCyan';
            progressFill.style.setProperty('--glow-color', 'rgba(0, 240, 255, 0.6)');
            progressFill.className = 'bg-gradient-to-r from-neonCyan to-cyan-500 h-full rounded-full transition-all duration-500 progress-bar-glow';
            
            const toGold = 300 - p.loyalty_points;
            const silverProgress = ((p.loyalty_points - 100) / 200) * 100;
            progressFill.style.width = `${Math.min(100, Math.max(0, silverProgress))}%`;
            document.getElementById('tier-progress-text').innerText = `🏆 Unlocked Silver Tier. Next goal: ${toGold} points to Gold!`;
          } else {
            badge.className += 'bg-neonPink/10 border border-neonPink text-neonPink';
            progressFill.style.setProperty('--glow-color', 'rgba(255, 0, 127, 0.6)');
            progressFill.className = 'bg-gradient-to-r from-neonPink to-pink-500 h-full rounded-full transition-all duration-500 progress-bar-glow';
            
            const toSilver = 100 - p.loyalty_points;
            const bronzeProgress = (p.loyalty_points / 100) * 100;
            progressFill.style.width = `${Math.min(100, Math.max(0, bronzeProgress))}%`;
            document.getElementById('tier-progress-text').innerText = `✨ Bronze Tier. Need ${toSilver} more points to reach Silver!`;
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function loadHistoryData() {
      const sessBody = document.getElementById('sessions-log-body');
      const cafeBody = document.getElementById('cafe-log-body');

      try {
        const data = await apiFetch('/players/profile/history');
        if (data.success) {
          // Render game sessions
          sessBody.innerHTML = '';
          if (data.sessions.length === 0) {
            sessBody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-500 italic">No game sessions logged yet.</td></tr>';
          } else {
            data.sessions.forEach(s => {
              const start = new Date(s.start_time).toLocaleString();
              const end = s.end_time ? new Date(s.end_time).toLocaleString() : '--';
              const cost = parseFloat(s.total_cost).toFixed(2);
              
              let badgeClass = 'badge-green';
              if (s.status === 'Active') badgeClass = 'bg-neonGreen/10 border border-neonGreen text-neonGreen animate-pulse';
              else if (s.status === 'Paused') badgeClass = 'bg-neonGold/10 border border-neonGold text-neonGold';
              else if (s.status === 'Cancelled') badgeClass = 'badge-red';
              else badgeClass = 'bg-slate-900 border border-slate-800 text-slate-400';

              const row = document.createElement('tr');
              row.className = 'hover:bg-slate-900/30';
              row.innerHTML = `
                <td class="p-3 font-mono text-neonCyan font-bold">#SESS-${s.id}</td>
                <td class="p-3 text-white font-cyber">${s.station_name}</td>
                <td class="p-3"><span class="text-[10px] px-2 py-0.5 rounded border border-slate-800 bg-slate-950 font-mono">${s.session_type}</span></td>
                <td class="p-3 text-slate-400">${start}</td>
                <td class="p-3 text-slate-400">${end}</td>
                <td class="p-3 text-right text-neonCyan font-bold font-cyber">₹${cost}</td>
                <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${badgeClass}">${s.status}</span></td>
              `;
              sessBody.appendChild(row);
            });
          }

          // Render cafe bills
          cafeBody.innerHTML = '';
          if (data.transactions.length === 0) {
            cafeBody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-500 italic">No cafe purchases logged yet.</td></tr>';
          } else {
            data.transactions.forEach(t => {
              const date = new Date(t.created_at).toLocaleString();
              const total = parseFloat(t.total).toFixed(2);
              
              let statusBadge = t.status === 'Paid' ? 'bg-neonGreen/10 border border-neonGreen text-neonGreen' : 'bg-neonRed/10 border border-neonRed text-neonRed';

              const row = document.createElement('tr');
              row.className = 'hover:bg-slate-900/30';
              row.innerHTML = `
                <td class="p-3 font-mono text-neonPink font-bold">#SALE-${t.id}</td>
                <td class="p-3 text-slate-350">${t.sale_type === 'Direct' ? 'Direct Counter Purchase' : 'Added to Session Bill'}</td>
                <td class="p-3 font-mono">${t.payment_method}</td>
                <td class="p-3 text-slate-400">${date}</td>
                <td class="p-3 text-right text-neonPink font-bold font-cyber">₹${total}</td>
                <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${statusBadge}">${t.status}</span></td>
              `;
              cafeBody.appendChild(row);
            });
          }
        }
      } catch (err) {
        sessBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-neonRed">Error loading logs: ${err.message}</td></tr>`;
        cafeBody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-neonRed">Error loading logs: ${err.message}</td></tr>`;
      }
    }

    function switchLogs(type) {
      const sessTab = document.getElementById('logs-sessions');
      const cafeTab = document.getElementById('logs-cafe');
      const sessBtn = document.getElementById('tab-btn-sessions');
      const cafeBtn = document.getElementById('tab-btn-cafe');

      if (type === 'sessions') {
        sessTab.classList.remove('hidden');
        cafeTab.classList.add('hidden');
        sessBtn.className = 'pb-3 text-neonCyan border-b-2 border-neonCyan font-bold tracking-widest mr-6 transition-all duration-300';
        cafeBtn.className = 'pb-3 text-slate-500 hover:text-slate-200 tracking-widest transition-all duration-300';
      } else {
        sessTab.classList.add('hidden');
        cafeTab.classList.remove('hidden');
        sessBtn.className = 'pb-3 text-slate-500 hover:text-slate-200 tracking-widest mr-6 transition-all duration-300';
        cafeBtn.className = 'pb-3 text-neonCyan border-b-2 border-neonCyan font-bold tracking-widest transition-all duration-300';
      }
    }
  </script>

</body>
</html>
