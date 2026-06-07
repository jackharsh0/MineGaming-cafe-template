<?php
session_start();

$isLoggedIn = isset($_SESSION['jwt_token']);
$role = $_SESSION['role'] ?? '';

if ($isLoggedIn) {
    if ($role === 'Customer') {
        $portalUrl = 'pages/customer_dashboard.php';
        $portalText = 'Player Dashboard';
        $portalIcon = 'fa-solid fa-crown text-neonGold';
    } else {
        $portalUrl = 'pages/dashboard.php';
        $portalText = 'Operator Dashboard';
        $portalIcon = 'fa-solid fa-user-shield text-neonCyan';
    }
} else {
    $portalUrl = 'pages/login.php';
    $portalText = 'Portal Login';
    $portalIcon = 'fa-solid fa-right-to-bracket';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Gaming Garage - Jodhpur's Premier Gaming Lounge</title>
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
  <!-- Link Cyberpunk Neon Stylesheet -->
  <link rel="stylesheet" href="css/cyberpunk.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <!-- Flatpickr (Famous DateTime Picker) CSS & JS CDN -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <style>
    @keyframes heartbeat {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.03); opacity: 0.9; }
    }
    .status-pulse-green {
      box-shadow: 0 0 12px rgba(57, 255, 20, 0.25);
      animation: heartbeat 2s infinite ease-in-out;
    }
    .status-pulse-red {
      box-shadow: 0 0 12px rgba(255, 51, 51, 0.2);
    }
    .status-pulse-yellow {
      box-shadow: 0 0 12px rgba(255, 215, 0, 0.15);
      animation: heartbeat 3s infinite ease-in-out;
    }
    .glow-panel {
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.05);
    }
  </style>
</head>
<body class="bg-cyberDark text-slate-100 font-sans selection:bg-neonPink selection:text-white">

  <!-- Header -->
  <header class="sticky top-0 z-50 bg-cyberDark/90 backdrop-blur border-b border-slate-900 py-4 px-6 md:px-12 flex justify-between items-center">
    <a href="index.php" class="flex items-center gap-3 hover:opacity-80 transition duration-300">
      <i class="fa-solid fa-gamepad text-neonCyan text-3xl animate-pulse"></i>
      <span class="font-cyber text-2xl font-extrabold tracking-widest text-neonCyan uppercase">The Gaming Garage</span>
    </a>
    
    <nav class="hidden lg:flex gap-6 font-cyber uppercase tracking-wider text-xs">
      <a href="#stations" class="hover:text-neonCyan transition">Stations</a>
      <a href="#live-status" class="hover:text-neonCyan transition text-neonCyan font-bold"><i class="fa-solid fa-desktop mr-1"></i> Live Status</a>
      <a href="#rates" class="hover:text-neonCyan transition">Pricing</a>
      <a href="#book-session" class="hover:text-neonCyan transition text-neonPink font-bold"><i class="fa-solid fa-calendar-days mr-1"></i> Book Slot</a>
    </nav>
    
    <div>
      <a href="<?php echo $portalUrl; ?>" class="btn btn-primary py-2 px-6 tracking-wide flex items-center gap-2 border-neonCyan text-sm">
        <i class="<?php echo $portalIcon; ?>"></i>
        <span><?php echo $portalText; ?></span>
      </a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative min-h-[80vh] flex items-center justify-center py-20 px-6 overflow-hidden">
    <!-- Glowing background decorative circles -->
    <div class="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neonCyan/10 rounded-full blur-[100px] pointer-events-none"></div>
    <div class="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-neonPink/10 rounded-full blur-[100px] pointer-events-none"></div>
    
    <div class="max-w-4xl text-center z-10 space-y-6">
      <div class="inline-block px-4 py-1.5 bg-slate-900/65 border border-neonCyan/40 rounded-full text-xs font-cyber tracking-widest uppercase text-neonCyan mb-4 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
        ⚡ Jodhpur's Premier High-Spec Gaming Lounge
      </div>
      <h1 class="text-4xl md:text-7xl font-extrabold font-cyber tracking-wider uppercase leading-none">
        Enter the Next Level <br>
        of <span class="text-neonCyan text-shadow-cyan">Cyber Gaming</span>
      </h1>
      <p class="text-slate-400 text-base md:text-xl max-w-2xl mx-auto font-light">
        High-performance RTX 4080 PCs, PlayStation 5 consoles, and immersive Meta Quest VR booths. Experience lag-free esports play with dedicated fiber internet.
      </p>
      
      <div class="pt-8 flex flex-wrap gap-4 justify-center">
        <a href="#book-session" class="btn btn-accent px-8 py-3.5 text-base tracking-wide shadow-[0_0_15px_rgba(255,0,127,0.3)] font-cyber">
          <i class="fa-solid fa-calendar-check mr-2"></i> Book Session Slot
        </a>
        <a href="#live-status" class="btn btn-secondary px-8 py-3.5 text-base tracking-wide border-slate-700 hover:border-neonCyan">
          <i class="fa-solid fa-desktop mr-1"></i> Seating Status
        </a>
      </div>
    </div>
  </section>

  <!-- Stations Showcase -->
  <section id="stations" class="py-24 px-6 md:px-12 bg-cyberPanel border-t border-slate-900 relative">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16 space-y-2">
        <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-neonCyan">The Battle Stations</h2>
        <p class="text-slate-400 max-w-md mx-auto text-sm">Engineered for competitive gaming and maximum immersion.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Station 1: Pro PC -->
        <div class="bg-cyberCard border border-slate-800 rounded-lg p-6 hover:border-neonCyan transition duration-300 flex flex-col justify-between">
          <div class="space-y-4">
            <div class="text-4xl">🖥️</div>
            <h3 class="text-xl font-bold font-cyber text-white">Elite Esports PC</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              RTX 4080 GPU, Intel i9 CPU, 32GB DDR5 RAM, and 240Hz esports gaming monitors. Customized Blue mechanical keyboards and gaming mice.
            </p>
          </div>
          <div class="border-t border-slate-800 pt-4 mt-6 flex justify-between items-center text-xs">
            <span class="text-slate-500 font-cyber uppercase">Regular Rate</span>
            <span class="text-neonCyan font-bold font-cyber text-sm">₹5.00 / Hour</span>
          </div>
        </div>

        <!-- Station 2: PS5 -->
        <div class="bg-cyberCard border border-slate-800 rounded-lg p-6 hover:border-neonPink transition duration-300 flex flex-col justify-between">
          <div class="space-y-4">
            <div class="text-4xl">🎮</div>
            <h3 class="text-xl font-bold font-cyber text-white">PlayStation 5 / Xbox Series X</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              4K gaming on huge 55" HDR TVs. Play with friends with up to 4 DualSense wireless controllers. FIFA, Call of Duty, and Tekken ready.
            </p>
          </div>
          <div class="border-t border-slate-800 pt-4 mt-6 flex justify-between items-center text-xs">
            <span class="text-slate-500 font-cyber uppercase">Regular Rate</span>
            <span class="text-neonPink font-bold font-cyber text-sm">₹6.00 / Hour</span>
          </div>
        </div>

        <!-- Station 3: VR -->
        <div class="bg-cyberCard border border-slate-800 rounded-lg p-6 hover:border-neonGold transition duration-300 flex flex-col justify-between">
          <div class="space-y-4">
            <div class="text-4xl">🕶️</div>
            <h3 class="text-xl font-bold font-cyber text-white">Quest 3 VR Booth</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              Spacious ceiling-tethered VR booths. Play Beat Saber, Superhot, and Half-Life: Alyx with maximum freedom of movement.
            </p>
          </div>
          <div class="border-t border-slate-800 pt-4 mt-6 flex justify-between items-center text-xs">
            <span class="text-slate-500 font-cyber uppercase">Regular Rate</span>
            <span class="text-neonGold font-bold font-cyber text-sm">₹12.00 / Hour</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Live Seat Status Board Section -->
  <section id="live-status" class="py-24 px-6 md:px-12 bg-cyberDark relative border-t border-slate-900">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-12 space-y-2">
        <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-neonCyan">Terminal Status Board</h2>
        <p class="text-slate-400 text-sm max-w-xl mx-auto">Check real-time seating and console availability. Statuses sync live with our lounge database.</p>
      </div>

      <!-- Live Sync indicator & Stats Counters -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 border-b border-slate-900 pb-6">
        <div class="flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-neonGreen animate-ping"></span>
          <span class="text-xs uppercase font-mono text-neonGreen tracking-widest">Live Sync Active</span>
        </div>
        
        <div class="flex flex-wrap gap-3 text-xs font-cyber tracking-widest uppercase">
          <div class="bg-cyberPanel border border-slate-800 px-4 py-2 rounded flex items-center gap-2">
            <span class="text-slate-500">Total Seats:</span>
            <span id="total-count" class="font-bold text-white">0</span>
          </div>
          <div class="bg-cyberPanel border border-slate-800 px-4 py-2 rounded flex items-center gap-2">
            <span class="text-neonGreen">Available:</span>
            <span id="available-count" class="font-bold text-neonGreen">0</span>
          </div>
          <div class="bg-cyberPanel border border-slate-800 px-4 py-2 rounded flex items-center gap-2">
            <span class="text-neonRed">Busy:</span>
            <span id="occupied-count" class="font-bold text-neonRed">0</span>
          </div>
          <div class="bg-cyberPanel border border-slate-800 px-4 py-2 rounded flex items-center gap-2">
            <span class="text-neonGold">Offline:</span>
            <span id="maintenance-count" class="font-bold text-neonGold">0</span>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
        <button type="button" onclick="filterStations('ALL')" id="filter-ALL" class="filter-btn px-4 py-2 bg-neonCyan text-black font-cyber font-bold text-xs uppercase tracking-wider rounded transition">
          All Terminals
        </button>
        <button type="button" onclick="filterStations('PC')" id="filter-PC" class="filter-btn px-4 py-2 bg-cyberPanel border border-slate-800 text-slate-300 hover:border-neonCyan font-cyber font-bold text-xs uppercase tracking-wider rounded transition">
          PCs
        </button>
        <button type="button" onclick="filterStations('PS5')" id="filter-PS5" class="filter-btn px-4 py-2 bg-cyberPanel border border-slate-800 text-slate-300 hover:border-neonCyan font-cyber font-bold text-xs uppercase tracking-wider rounded transition">
          PS5
        </button>
        <button type="button" onclick="filterStations('Xbox')" id="filter-Xbox" class="filter-btn px-4 py-2 bg-cyberPanel border border-slate-800 text-slate-300 hover:border-neonCyan font-cyber font-bold text-xs uppercase tracking-wider rounded transition">
          Xbox
        </button>
        <button type="button" onclick="filterStations('VR')" id="filter-VR" class="filter-btn px-4 py-2 bg-cyberPanel border border-slate-800 text-slate-300 hover:border-neonCyan font-cyber font-bold text-xs uppercase tracking-wider rounded transition">
          VR Booths
        </button>
      </div>

      <!-- Loading / Error states -->
      <div id="status-message" class="text-center py-12">
        <i class="fa-solid fa-spinner fa-spin text-3xl text-neonCyan mb-2"></i>
        <p class="font-cyber text-slate-400 text-xs tracking-wider">CONNECTING TO lounge GATEWAY...</p>
      </div>

      <div id="error-message" class="bg-neonRed/10 border border-neonRed rounded p-6 max-w-md mx-auto text-center hidden">
        <i class="fa-solid fa-triangle-exclamation text-neonRed text-3xl mb-3"></i>
        <h3 class="font-cyber font-bold text-white text-base">SYNC FAILED</h3>
        <p class="text-slate-400 text-xs mt-1">Unable to stream terminal occupancy data. Check Node server status.</p>
      </div>

      <!-- Stations Grid -->
      <div id="stations-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 hidden">
        <!-- Generated status cards -->
      </div>
    </div>
  </section>

  <!-- Pricing Rules & Timings -->
  <section id="rates" class="py-24 px-6 md:px-12 relative border-t border-slate-900 bg-cyberPanel">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-16 space-y-2">
        <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-neonPink">Pricing Matrix</h2>
        <p class="text-slate-400 text-sm">Flexible pricing connected live to lounge database rules.</p>
      </div>

      <div class="bg-cyberDark border border-slate-800 rounded-lg overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-900/60 border-b border-slate-800 font-cyber uppercase text-xs text-slate-400">
              <th class="p-6">Station Category</th>
              <th class="p-6">Hourly Rate</th>
              <th class="p-6">Controller Add-ons</th>
            </tr>
          </thead>
          <tbody id="pricing-matrix-body" class="divide-y divide-slate-800 text-sm">
            <tr>
              <td colspan="3" class="p-6 text-center text-slate-500 font-cyber">
                <i class="fa-solid fa-spinner fa-spin mr-2"></i> Syncing pricing rules...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded text-center text-xs text-slate-400 font-light">
        📢 <span class="font-bold text-white uppercase">Loyalty Perk Note:</span> Registered members automatically receive loyalty discounts (Gold: **15%**, Silver: **10%**, Bronze: **5%**) on all session charges!
      </div>
    </div>
  </section>

  <!-- Book Session Booking Form Section -->
  <section id="book-session" class="py-24 px-6 md:px-12 bg-cyberDark border-t border-slate-900 relative">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-12 space-y-2">
        <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-neonPink">Reserve Your Battle Station</h2>
        <p class="text-slate-400 text-sm max-w-xl mx-auto">Skip the lines and pre-book your PC or console slot. Reservations are reviewed instantly.</p>
      </div>

      <div class="bg-cyberPanel border border-slate-800 rounded-lg p-6 md:p-8 glow-panel max-w-2xl mx-auto">
        <form id="form-public-booking" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-group">
              <label class="form-label text-neonCyan text-xs uppercase tracking-wider block mb-2 font-cyber">Player Full Name</label>
              <input type="text" id="booking-name" class="form-control bg-slate-950 border border-slate-800 text-slate-100 w-full p-3 rounded focus:outline-none focus:border-neonCyan transition" placeholder="e.g. Sarah Connor" required>
            </div>
            <div class="form-group">
              <label class="form-label text-neonCyan text-xs uppercase tracking-wider block mb-2 font-cyber">Contact Phone</label>
              <input type="text" id="booking-phone" class="form-control bg-slate-950 border border-slate-800 text-slate-100 w-full p-3 rounded focus:outline-none focus:border-neonCyan transition" placeholder="e.g. +15550188" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label text-neonCyan text-xs uppercase tracking-wider block mb-2 font-cyber">Assign Station / Console</label>
            <select id="booking-station" class="form-control bg-slate-950 border border-slate-800 text-slate-100 w-full p-3 rounded focus:outline-none focus:border-neonCyan transition" required>
              <option value="">-- Choose Terminal --</option>
            </select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-group">
              <label class="form-label text-neonCyan text-xs uppercase tracking-wider block mb-2 font-cyber">Start Date & Time</label>
              <input type="text" id="booking-start" class="form-control bg-slate-950 border border-slate-800 text-slate-100 w-full p-3 rounded focus:outline-none focus:border-neonCyan transition" placeholder="Select Start Date & Time" required>
            </div>
            <div class="form-group">
              <label class="form-label text-neonCyan text-xs uppercase tracking-wider block mb-2 font-cyber">End Date & Time</label>
              <input type="text" id="booking-end" class="form-control bg-slate-950 border border-slate-800 text-slate-100 w-full p-3 rounded focus:outline-none focus:border-neonCyan transition" placeholder="Select End Date & Time" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label text-neonCyan text-xs uppercase tracking-wider block mb-2 font-cyber">Special Requests & Notes</label>
            <textarea id="booking-notes" class="form-control bg-slate-950 border border-slate-800 text-slate-100 w-full p-3 rounded h-24 focus:outline-none focus:border-neonCyan transition" placeholder="e.g. Need extra gamepads, mechanical switches preference..."></textarea>
          </div>

          <div class="pt-4">
            <button type="submit" class="w-full btn btn-accent py-4 tracking-widest text-base font-cyber uppercase">
              <i class="fa-solid fa-calendar-check mr-2"></i> Submit Appointment Request
            </button>
          </div>
        </form>
      </div>

      <div class="mt-8 p-4 bg-slate-900/40 border border-slate-800 rounded text-center text-xs text-slate-400 max-w-2xl mx-auto">
        📢 <span class="font-bold text-white uppercase font-cyber">Note:</span> Public reservations default to **Pending** status. A lounge attendant will review the schedule and confirm/cancel depending on real-time availability.
      </div>
    </div>
  </section>

  <!-- Loyalty Member perks -->
  <section id="loyalty" class="py-24 px-6 md:px-12 bg-cyberPanel border-t border-slate-900 relative">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-16 space-y-2">
        <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-neonGold">Loyalty Membership</h2>
        <p class="text-slate-400 text-sm">Earn points while playing and unlock tier discounts.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Bronze -->
        <div class="bg-cyberDark border border-slate-800 p-6 rounded-lg text-center space-y-3">
          <span class="badge badge-pink font-cyber text-xs">Bronze Tier</span>
          <div class="text-slate-500 text-xs">Standard level upon registration</div>
          <div class="text-3xl font-extrabold font-cyber text-white">5% OFF</div>
          <p class="text-xs text-slate-400 leading-relaxed">Applies automatically to all gaming hours. Load digital wallet for quick play check-ins.</p>
        </div>

        <!-- Silver -->
        <div class="bg-cyberDark border border-neonCyan p-6 rounded-lg text-center space-y-3 shadow-[0_0_15px_rgba(0,240,255,0.15)] relative">
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-neonCyan text-black font-cyber text-[10px] font-bold px-3 py-0.5 rounded-full uppercase">Popular</div>
          <span class="badge badge-cyan font-cyber text-xs">Silver Tier</span>
          <div class="text-slate-400 text-xs">Unlocked at 100 loyalty points</div>
          <div class="text-3xl font-extrabold font-cyber text-neonCyan">10% OFF</div>
          <p class="text-xs text-slate-400 leading-relaxed">Gain 2 points per ₹100 spent. Unlocks advanced bookings & priority console queues.</p>
        </div>

        <!-- Gold -->
        <div class="bg-cyberDark border border-neonGold p-6 rounded-lg text-center space-y-3 shadow-[0_0_15px_rgba(255,215,0,0.15)]">
          <span class="badge badge-gold font-cyber text-xs">Gold Tier</span>
          <div class="text-slate-400 text-xs">Unlocked at 300 loyalty points</div>
          <div class="text-3xl font-extrabold font-cyber text-neonGold">15% OFF</div>
          <p class="text-xs text-slate-400 leading-relaxed">Get maximum hourly discounts, free tournament entry passes, and priority seat choices.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Cafe inventory menu -->
  <section id="cafe" class="py-24 px-6 md:px-12 relative border-t border-slate-900 bg-cyberDark">
    <div class="max-w-4xl mx-auto text-center space-y-8">
      <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-neonCyan">The Gamer Fuel Bar</h2>
      <p class="text-slate-400 max-w-lg mx-auto text-sm">
        Need energy? Order snacks, cold energy drinks, and hot ramen directly to your station console through the lounge attendant.
      </p>
      
      <div class="flex flex-wrap justify-center gap-4 text-xs font-mono text-slate-400">
        <span class="px-4 py-2 bg-slate-900/60 border border-slate-800 rounded">🥤 Monster & Red Bull</span>
        <span class="px-4 py-2 bg-slate-900/60 border border-slate-800 rounded">🍜 Spicy Shin Ramyun Cup</span>
        <span class="px-4 py-2 bg-slate-900/60 border border-slate-800 rounded">🍿 Chips & Chocolates</span>
        <span class="px-4 py-2 bg-slate-900/60 border border-slate-800 rounded">👕 Premium Gaming Tees</span>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-slate-950 border-t border-slate-900 py-12 px-6 text-center text-xs text-slate-500 space-y-4">
    <div class="flex justify-center items-center gap-3">
      <i class="fa-solid fa-gamepad text-neonCyan text-xl"></i>
      <span class="font-cyber text-base font-extrabold tracking-widest text-white uppercase">The Gaming Garage</span>
    </div>
    <p>© 2026 The Gaming Garage. All rights reserved. Secure terminal connection monitoring active.</p>
  </footer>

  <!-- Toast Notification Container -->
  <div id="toast-container" class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"></div>

  <!-- Real-time Status Board and Appointment Booking Script -->
  <script>
    const HOST = window.location.hostname;
    const PUBLIC_STATUS_API = `http://${HOST}:8000/api/stations/public-status`;
    const APPOINTMENTS_API = `http://${HOST}:8000/api/appointments`;

    let allStations = [];
    let currentFilter = 'ALL';
    let fpStart, fpEnd;

    const typeIcons = {
      'PC': 'fa-solid fa-desktop text-neonCyan',
      'PS5': 'fa-solid fa-gamepad text-neonPink',
      'Xbox': 'fa-solid fa-gamepad text-neonPink',
      'VR': 'fa-solid fa-vr-cardboard text-neonGold',
      'Other': 'fa-solid fa-terminal text-slate-400'
    };

    document.addEventListener('DOMContentLoaded', () => {
      // Setup Appointment Date/Time inputs with Flatpickr
      if (document.getElementById('booking-start')) {
        fpStart = flatpickr("#booking-start", {
          enableTime: true,
          dateFormat: "Y-m-d H:i",
          time_24hr: true,
          minDate: "today",
          theme: "dark",
          defaultDate: new Date()
        });
      }
      if (document.getElementById('booking-end')) {
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1);
        fpEnd = flatpickr("#booking-end", {
          enableTime: true,
          dateFormat: "Y-m-d H:i",
          time_24hr: true,
          minDate: "today",
          theme: "dark",
          defaultDate: nextHour
        });
      }

      // Initial Fetch
      loadStatusAndBooking();
      setInterval(loadStatusAndBooking, 10000); // refresh status grid every 10s
    });

    async function loadStatusAndBooking() {
      const grid = document.getElementById('stations-grid');
      const loader = document.getElementById('status-message');
      const errBox = document.getElementById('error-message');
      const select = document.getElementById('booking-station');

      try {
        const response = await fetch(PUBLIC_STATUS_API);
        if (!response.ok) throw new Error('Network response failed');
        const data = await response.json();
        
        if (data.success && data.stations) {
          allStations = data.stations;
          loader.classList.add('hidden');
          grid.classList.remove('hidden');
          errBox.classList.add('hidden');
          
          updateCounters();
          renderStations();
          populateBookingDropdown(select);
          
          if (data.rates) {
            renderPricingMatrix(data.rates);
          }
        } else {
          throw new Error('API reported unsuccessful response');
        }
      } catch (err) {
        console.error('Failed to sync seat status feed:', err);
        loader.classList.add('hidden');
        grid.classList.add('hidden');
        errBox.classList.remove('hidden');
      }
    }

    function renderPricingMatrix(rates) {
      const tbody = document.getElementById('pricing-matrix-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      
      const friendlyNames = {
        'PC': 'Elite Esports PC',
        'PS5': 'PlayStation 5 Console',
        'Xbox': 'Xbox Series X Console',
        'VR': 'Immersive VR Booth',
        'Other': 'Other Terminals'
      };

      const colorClasses = {
        'PC': 'text-neonCyan',
        'PS5': 'text-neonPink',
        'Xbox': 'text-neonPink',
        'VR': 'text-neonGold',
        'Other': 'text-slate-400'
      };

      // Order rates logically
      const order = ['PC', 'PS5', 'Xbox', 'VR', 'Other'];
      const sortedRates = [...rates].sort((a, b) => order.indexOf(a.station_type) - order.indexOf(b.station_type));

      sortedRates.forEach(rate => {
        const row = document.createElement('tr');
        const name = friendlyNames[rate.station_type] || rate.station_type;
        const color = colorClasses[rate.station_type] || 'text-white';
        const rateVal = parseFloat(rate.hourly_rate).toFixed(2);
        
        let addonText = 'N/A';
        if (parseFloat(rate.controller_addon_rate) > 0) {
          addonText = `+₹${parseFloat(rate.controller_addon_rate).toFixed(2)} / hr per extra pad`;
        }

        row.innerHTML = `
          <td class="p-6 font-bold font-cyber text-white">${name}</td>
          <td class="p-6 ${color}">₹${rateVal} / hr</td>
          <td class="p-6 text-slate-300 font-cyber text-xs">${addonText}</td>
        `;
        tbody.appendChild(row);
      });
    }

    function updateCounters() {
      document.getElementById('total-count').innerText = allStations.length;
      document.getElementById('available-count').innerText = allStations.filter(s => s.status === 'Available').length;
      document.getElementById('occupied-count').innerText = allStations.filter(s => s.status === 'Occupied').length;
      document.getElementById('maintenance-count').innerText = allStations.filter(s => s.status === 'Maintenance').length;
    }

    function renderStations() {
      const grid = document.getElementById('stations-grid');
      grid.innerHTML = '';

      const filtered = currentFilter === 'ALL' 
        ? allStations 
        : allStations.filter(s => s.type === currentFilter);

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full text-center py-10 text-slate-500 font-cyber text-xs">
            NO STATIONS FOUND FOR CATEGORY: ${currentFilter}
          </div>
        `;
        return;
      }

      filtered.forEach(station => {
        const iconClass = typeIcons[station.type] || typeIcons['Other'];
        
        let statusClass = 'border-slate-800';
        let statusBadgeClass = 'badge-cyan';
        let statusPulseClass = '';
        let statusLabel = 'UNKNOWN';

        if (station.status === 'Available') {
          statusClass = 'border-neonGreen/30 hover:border-neonGreen';
          statusBadgeClass = 'bg-neonGreen/10 border border-neonGreen text-neonGreen';
          statusPulseClass = 'status-pulse-green';
          statusLabel = 'Available';
        } else if (station.status === 'Occupied') {
          statusClass = 'border-neonRed/30 hover:border-neonRed';
          statusBadgeClass = 'bg-neonRed/10 border border-neonRed text-neonRed';
          statusPulseClass = 'status-pulse-red';
          statusLabel = 'Busy';
        } else if (station.status === 'Maintenance') {
          statusClass = 'border-neonGold/30 hover:border-neonGold';
          statusBadgeClass = 'bg-neonGold/10 border border-neonGold text-neonGold';
          statusPulseClass = 'status-pulse-yellow';
          statusLabel = 'Offline';
        }

        const card = document.createElement('div');
        card.className = `bg-cyberCard border rounded-lg p-5 flex flex-col justify-between items-center text-center transition-all duration-300 ${statusClass} ${statusPulseClass}`;
        
        card.innerHTML = `
          <div class="w-12 h-12 rounded-full bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-3 text-lg">
            <i class="${iconClass}"></i>
          </div>
          <div>
            <h3 class="font-bold text-white font-cyber text-sm tracking-wide mb-1 leading-tight">${station.name}</h3>
            <span class="text-[9px] tracking-widest uppercase font-mono text-slate-500">${station.type}</span>
          </div>
          <div class="mt-4">
            <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass}">
              ${statusLabel}
            </span>
          </div>
        `;
        
        grid.appendChild(card);
      });
    }

    function filterStations(type) {
      currentFilter = type;

      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = 'filter-btn px-4 py-2 bg-cyberPanel border border-slate-800 text-slate-300 hover:border-neonCyan font-cyber font-bold text-xs uppercase tracking-wider rounded transition';
      });

      const activeBtn = document.getElementById('filter-' + type);
      if (activeBtn) {
        activeBtn.className = 'filter-btn px-4 py-2 bg-neonCyan text-black font-cyber font-bold text-xs uppercase tracking-wider rounded transition';
      }

      renderStations();
    }

    function populateBookingDropdown(select) {
      if (!select) return;
      const cachedValue = select.value;
      select.innerHTML = '<option value="">-- Choose Terminal --</option>';
      
      allStations.forEach(station => {
        const opt = document.createElement('option');
        opt.value = station.id;
        opt.innerText = `${station.name} (${station.type}) - ${station.status}`;
        select.appendChild(opt);
      });

      if (cachedValue) {
        select.value = cachedValue;
      }
    }

    // Submit Booking Request
    document.getElementById('form-public-booking').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const playerName = document.getElementById('booking-name').value.trim();
      const playerPhone = document.getElementById('booking-phone').value.trim();
      const stationId = parseInt(document.getElementById('booking-station').value);
      const startVal = document.getElementById('booking-start').value;
      const endVal = document.getElementById('booking-end').value;
      const notes = document.getElementById('booking-notes').value.trim();

      const startTime = startVal.includes('T') ? startVal : startVal.replace(' ', 'T') + ':00';
      const endTime = endVal.includes('T') ? endVal : endVal.replace(' ', 'T') + ':00';

      if (new Date(startTime) >= new Date(endTime)) {
        showToast('Start time must be before end time', 'error');
        return;
      }

      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting Request...';

      try {
        const response = await fetch(APPOINTMENTS_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            playerName,
            playerPhone,
            stationId,
            startTime,
            endTime,
            notes
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          showToast('Appointment requested successfully! Pending operator review.', 'success');
          document.getElementById('form-public-booking').reset();
          if (fpStart) fpStart.setDate(new Date());
          if (fpEnd) {
            const nextHour = new Date();
            nextHour.setHours(nextHour.getHours() + 1);
            fpEnd.setDate(nextHour);
          }
        } else {
          throw new Error(data.message || 'Failed to submit booking');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-calendar-check mr-2"></i> Submit Appointment Request';
      }
    });

    // Toast Alerts
    function showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `p-4 rounded border shadow-lg flex items-center gap-3 max-w-sm pointer-events-auto transition duration-300 transform translate-y-2 opacity-0`;
      
      let icon = '<i class="fa-solid fa-circle-info text-neonCyan"></i>';
      let styleClasses = 'border-neonCyan bg-cyberPanel text-white';

      if (type === 'success') {
        icon = '<i class="fa-solid fa-circle-check text-neonGreen"></i>';
        styleClasses = 'border-neonGreen bg-cyberPanel text-white';
      } else if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-exclamation text-neonRed"></i>';
        styleClasses = 'border-neonRed bg-cyberPanel text-white';
      }

      toast.className += ` ${styleClasses}`;
      toast.innerHTML = `
        <div class="text-lg">${icon}</div>
        <div class="text-sm font-semibold flex-grow">${message}</div>
        <button class="text-slate-400 hover:text-white" onclick="this.parentElement.remove()">&times;</button>
      `;

      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      }, 10);

      setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
      }, 5000);
    }
  </script>
</body>
</html>
