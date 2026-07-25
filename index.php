<?php
session_start();
require_once 'config.php';

// Maintenance mode check
if (SITE_MAINTENANCE && !isset($_SESSION['jwt_token'])) {
    header('HTTP/1.1 503 Service Temporarily Unavailable');
    ?>
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?php echo SITE_NAME; ?> — Coming Back Soon</title>
    <script src="js/tailwindcss.js"></script></head>
    <body class="bg-cream text-slate-100 min-h-screen flex items-center justify-center"><div class="text-center space-y-4 p-8">
    <i class="fa-solid fa-wrench text-6xl text-wood mb-4"></i>
    <h1 class="text-3xl font-bold font-cyber text-wood">Under Maintenance</h1>
    <p class="text-slate-400">We'll be back shortly.</p>
    </div></body></html>
    <?php
    exit();
}

$isLoggedIn = isset($_SESSION['jwt_token']);
$role = $_SESSION['role'] ?? '';

if ($isLoggedIn) {
    if ($role === 'Customer') {
        $portalUrl = 'pages/customer_dashboard.php';
        $portalText = 'Player Dashboard';
        $portalIcon = 'fa-solid fa-crown text-brass';
    } else {
        $portalUrl = 'pages/dashboard.php';
        $portalText = 'Operator Dashboard';
        $portalIcon = 'fa-solid fa-user-shield text-wood';
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
  <title><?php echo SITE_PAGE_TITLE; ?></title>
  <meta name="description" content="<?php echo setting('system.meta_description', 'Premium gaming lounge'); ?>">
  <script src="js/tailwindcss.js"></script>
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
            }
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" href="css/retro_wood.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <style>
    @keyframes heartbeat {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.03); opacity: 0.9; }
    }
    .status-pulse-green {
      box-shadow: 0 0 12px rgba(75, 101, 40, 0.2);
      animation: heartbeat 2s infinite ease-in-out;
    }
    .status-pulse-red {
      box-shadow: 0 0 12px rgba(128, 43, 26, 0.15);
    }
    .status-pulse-yellow {
      box-shadow: 0 0 12px rgba(184, 134, 11, 0.12);
      animation: heartbeat 3s infinite ease-in-out;
    }
    /* Scroll-triggered 3D reveal animations */
    .reveal {
      opacity: 0;
      transition: all 0.8s cubic-bezier(0.22, 0.61, 0.36, 1);
    }
    .reveal-up { transform: translateY(60px); }
    .reveal-left { transform: translateX(-60px); }
    .reveal-right { transform: translateX(60px); }
    .reveal-scale { transform: scale(0.9); }
    .reveal-3d { transform: perspective(800px) rotateY(15deg) translateZ(-40px); }
    .reveal.visible {
      opacity: 1;
      transform: translateY(0) translateX(0) scale(1) rotateY(0) translateZ(0);
    }
    /* Parallax hero orbs */
    .parallax-orb {
      will-change: transform;
      transition: transform 0.1s linear;
    }
    /* Floating scroll indicator */
    .scroll-indicator {
      animation: bounce-down 2s ease-in-out infinite;
    }
    @keyframes bounce-down {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(10px); }
    }
  </style>
</head>
<body class="bg-cream text-slate-100 font-sans selection:bg-clay selection:text-cream">

  <!-- Header -->
  <header class="sticky top-0 z-50 bg-cream/90 backdrop-blur border-b border-slate-900 py-4 px-6 md:px-12 flex justify-between items-center">
    <a href="index.php" class="flex items-center gap-3 hover:opacity-80 transition duration-300 anim-swivel" style="display: inline-flex;">
      <i class="fa-solid fa-dice-d6 text-wood text-3xl" style="animation: swivel-3d 6s ease-in-out infinite;"></i>
      <span class="font-cyber text-2xl font-extrabold tracking-widest text-wood uppercase"><?php echo SITE_NAME; ?></span>
    </a>
    
    <nav class="hidden lg:flex gap-6 font-cyber uppercase tracking-wider text-xs">
      <a href="#live-status" class="hover:text-wood transition text-wood font-bold"><i class="fa-solid fa-signal mr-1"></i> Live Status</a>
      <a href="#rates" class="hover:text-wood transition text-slate-500">Pricing</a>
      <a href="#book-slot" class="hover:text-wood transition text-clay font-bold"><i class="fa-solid fa-calendar-days mr-1"></i> Book Slot</a>
    </nav>
    
    <div>
      <a href="<?php echo $portalUrl; ?>" class="btn btn-primary py-2 px-6 tracking-wide flex items-center gap-2 border-wood text-sm">
        <i class="<?php echo $portalIcon; ?>"></i>
        <span><?php echo $portalText; ?></span>
      </a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative min-h-[85dvh] flex items-center justify-center py-20 px-6 overflow-hidden perspective-container-800" id="hero">
    <div class="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-wood/10 rounded-full blur-[120px] pointer-events-none parallax-orb" data-parallax="0.3"></div>
    <div class="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-clay/8 rounded-full blur-[120px] pointer-events-none parallax-orb" data-parallax="-0.2"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brass/5 rounded-full blur-[150px] pointer-events-none parallax-orb" data-parallax="0.15"></div>
    
    <div class="max-w-4xl text-center z-10 space-y-6 reveal reveal-up">
      <div class="vintage-stamp mx-auto mb-4" style="transition-delay: 0.1s">Est. <?php echo SITE_EST_YEAR; ?></div>
      <div class="inline-block px-4 py-1.5 bg-parchment/90 border border-wood/50 rounded-full text-xs font-cyber tracking-widest uppercase text-wood mb-4 shadow-[0_2px_10px_rgba(92,64,51,0.08)]" style="transition-delay: 0.2s">
        <?php echo SITE_TAGLINE; ?>
      </div>
      <h1 class="text-4xl md:text-7xl font-extrabold font-cyber tracking-wider uppercase leading-none anim-float" style="transition-delay: 0.3s">
        <?php echo nl2br(htmlspecialchars(setting('website.hero_title', "Where Console Meets the Felt"))); ?>
      </h1>
      <p class="text-slate-400 text-base md:text-xl max-w-2xl mx-auto font-light">
        <?php echo setting('website.hero_subtitle', 'PlayStation 5, Xbox Series X, and professional pool tables. Grab a drink, rack \'em up, and play all night.'); ?>
      </p>
      
      <div class="pt-8 flex flex-wrap gap-4 justify-center">
        <a href="#book-slot" class="btn btn-accent px-8 py-3.5 text-base tracking-wide font-cyber hover-3d-lift">
          <i class="fa-solid fa-calendar-check mr-2"></i> Book a Table
        </a>
        <a href="#live-status" class="btn btn-secondary px-8 py-3.5 text-base tracking-wide border-slate-700 hover:border-wood hover-3d-float">
          <i class="fa-solid fa-gamepad mr-1"></i> Live Status
        </a>
      </div>
    </div>
  </section>

  <!-- Live Seat Status Board Section -->
  <section id="live-status" class="py-24 px-6 md:px-12 bg-parchment relative border-t border-slate-900">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-12 space-y-2 reveal reveal-up">
        <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-wood">Live Status Board</h2>
        <p class="text-slate-400 text-sm max-w-xl mx-auto">Check real-time seating and console availability.</p>
      </div>

      <div class="flex flex-col md:flex-row items-center justify-center gap-8 mb-8 border-b border-slate-900 pb-6 text-center">
        <div class="flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-forest vintage-flicker"></span>
          <span class="text-xs uppercase font-mono text-forest tracking-widest">Live Sync Active</span>
        </div>
        
        <div class="flex flex-wrap gap-3 text-xs font-cyber tracking-widest uppercase">
          <div class="bg-cream border border-slate-800 px-4 py-2 rounded flex items-center gap-2">
            <span class="text-slate-400">Total:</span>
            <span id="total-count" class="font-bold text-slate-100">0</span>
          </div>
          <div class="bg-cream border border-slate-800 px-4 py-2 rounded flex items-center gap-2">
            <span class="text-forest">Free:</span>
            <span id="available-count" class="font-bold text-forest">0</span>
          </div>
          <div class="bg-cream border border-slate-800 px-4 py-2 rounded flex items-center gap-2">
            <span class="text-rust">In Use:</span>
            <span id="occupied-count" class="font-bold text-rust">0</span>
          </div>
          <div class="bg-cream border border-slate-800 px-4 py-2 rounded flex items-center gap-2">
            <span class="text-brass">Offline:</span>
            <span id="maintenance-count" class="font-bold text-brass">0</span>
          </div>
        </div>
      </div>

      <!-- Filters Container -->
      <div class="flex flex-wrap gap-2 mb-8 justify-center items-center w-full" id="filter-container">
        <button type="button" onclick="filterStations('ALL')" id="filter-ALL" class="filter-btn px-4 py-2 bg-wood text-cream font-cyber font-bold text-xs uppercase tracking-wider rounded transition hover-3d-push">
          All
        </button>
      </div>

      <div id="status-message" class="text-center py-12">
        <i class="fa-solid fa-spinner fa-spin text-3xl text-wood mb-2"></i>
        <p class="font-cyber text-slate-400 text-xs tracking-wider">Loading live data...</p>
      </div>

      <div id="error-message" class="bg-rust/10 border border-rust rounded p-6 max-w-md mx-auto text-center hidden">
        <i class="fa-solid fa-triangle-exclamation text-rust text-3xl mb-3"></i>
        <h3 class="font-cyber font-bold text-slate-100 text-base">Connection Error</h3>
        <p class="text-slate-400 text-xs mt-1">Unable to load live data.</p>
      </div>

      <div id="stations-grid" class="flex flex-wrap justify-center gap-6 hidden stagger-3d perspective-container"></div>
    </div>
  </section>

  <!-- Food & Drinks Quick Order Modal -->
  <div id="food-modal" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-container max-w-lg">
      <div class="modal-header">
        <h3 class="modal-title text-wood"><i class="fa-solid fa-utensils mr-2 text-clay"></i>Fuel Bar - Quick Order</h3>
        <button class="btn-modal-close" onclick="closeFoodModal()">&times;</button>
      </div>
      <div class="modal-body space-y-4">
        <p class="text-xs text-slate-400">Select items to order. Your request will be sent to the lounge attendant.</p>
        
        <!-- Table/Seat input -->
        <div class="form-group mb-4">
          <label class="form-label text-wood text-xs uppercase tracking-wider block mb-1 font-cyber" for="food-order-location">Your Table Number / Seat / Name</label>
          <input type="text" id="food-order-location" class="form-control bg-kraft border border-slate-700 text-slate-100 w-full p-2 rounded text-xs focus:outline-none focus:border-wood transition" placeholder="e.g. Table-02 or John" required>
        </div>

        <div class="grid grid-cols-2 gap-3" id="food-items-grid">
          <?php
          $food_items = $APP_SETTINGS['website']['default_food_items'] ?? [];
          if (empty($food_items)):
          ?>
          <div class="col-span-2 text-center text-slate-500 text-xs py-4">No food items configured in Settings.</div>
          <?php else:
            foreach ($food_items as $item):
              $name = htmlspecialchars($item['name'] ?? '');
              $price = number_format(floatval($item['price'] ?? 0), 2);
              $icon = htmlspecialchars($item['icon'] ?? '🥤');
          ?>
          <div class="food-item bg-kraft border border-slate-800 rounded p-3 flex flex-col items-center text-center cursor-pointer hover:border-clay transition hover-3d-float" data-name="<?php echo $name; ?>" data-price="<?php echo $price; ?>" data-icon="<?php echo $icon; ?>">
            <span class="text-2xl"><?php echo $icon; ?></span>
            <span class="text-xs font-bold text-slate-100 mt-1"><?php echo $name; ?></span>
            <span class="text-[10px] text-clay font-bold"><?php echo SITE_CURRENCY; ?><?php echo $price; ?></span>
          </div>
          <?php endforeach; endif; ?>
        </div>

        <div class="border-t border-slate-800 pt-4">
          <h4 class="text-xs font-bold text-wood uppercase tracking-wider mb-2">Your Order</h4>
          <div id="food-cart" class="space-y-1 min-h-[40px]">
            <p class="text-xs text-slate-400 italic">Click items above to add to your order.</p>
          </div>
          <div class="flex justify-between items-center mt-3 pt-3 border-t border-slate-800">
            <span class="text-xs font-bold text-slate-100">Total: ₹<span id="food-cart-total">0.00</span></span>
            <button onclick="clearFoodCart()" class="text-[10px] text-rust hover:underline">Clear</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeFoodModal()">Cancel</button>
        <button type="button" onclick="submitFoodOrder()" class="btn btn-accent hover-3d-lift" id="submit-food-btn">
          <i class="fa-solid fa-paper-plane mr-1"></i> Send Order
        </button>
      </div>
    </div>
  </div>

  <!-- Pricing Rules & Timings -->
  <section id="rates" class="py-24 px-6 md:px-12 relative border-t border-slate-900 bg-cream">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-16 space-y-2 reveal reveal-up">
        <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-clay">Pricing</h2>
        <p class="text-slate-400 text-sm">Live rates synced from our system.</p>
      </div>

      <div class="bg-parchment border border-slate-800 rounded-lg overflow-hidden reveal reveal-scale" style="transition-delay: 0.15s">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-900/60 border-b border-slate-800 font-cyber uppercase text-xs text-slate-400">
              <th class="p-6">Category</th>
              <th class="p-6">Hourly Rate</th>
              <th class="p-6">Extras</th>
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
        Registered members automatically receive loyalty discounts (Gold: <?php echo setting('pricing.discount_gold', '15'); ?>%, Silver: <?php echo setting('pricing.discount_silver', '10'); ?>%, Bronze: <?php echo setting('pricing.discount_bronze', '5'); ?>%) on all charges!
      </div>
    </div>
  </section>

  <!-- Book Session Booking Form Section -->
  <section id="book-slot" class="py-24 px-6 md:px-12 bg-parchment border-t border-slate-900 relative">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-12 space-y-2 reveal reveal-up">
        <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-clay">Reserve Your Spot</h2>
        <p class="text-slate-400 text-sm max-w-xl mx-auto">Pre-book a console or pool table. Reservations reviewed instantly.</p>
      </div>

      <div class="bg-cream border border-slate-800 rounded-lg p-6 md:p-8 max-w-2xl mx-auto hover-3d-float aged-card card-corner reveal reveal-scale" style="transition-delay: 0.15s">
        <div class="filigree mb-4">&#9670; &#9671; &#9670;</div>
        <form id="form-public-booking" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-group">
              <label class="form-label text-wood text-xs uppercase tracking-wider block mb-2 font-cyber">Your Name</label>
              <input type="text" id="booking-name" class="form-control bg-kraft border border-slate-700 text-slate-100 w-full p-3 rounded focus:outline-none focus:border-wood transition" placeholder="e.g. Sarah Connor" required>
            </div>
            <div class="form-group">
              <label class="form-label text-wood text-xs uppercase tracking-wider block mb-2 font-cyber">Contact Phone</label>
              <input type="text" id="booking-phone" class="form-control bg-kraft border border-slate-700 text-slate-100 w-full p-3 rounded focus:outline-none focus:border-wood transition" placeholder="e.g. +15550188" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label text-wood text-xs uppercase tracking-wider block mb-3 font-cyber">What do you want to reserve?</label>
            <div class="grid grid-cols-3 gap-3">
              <button type="button" class="category-btn bg-kraft border border-slate-700 rounded-lg p-3 text-center hover:border-wood transition duration-300 focus:outline-none" data-category="console" onclick="selectCategory('console', this)">
                <span class="text-2xl block mb-1">🎮</span>
                <span class="text-xs font-cyber text-slate-100 uppercase tracking-wider">Console</span>
                <span class="block text-[10px] text-slate-400">PS5 · PS4 · Xbox · PC</span>
              </button>
              <button type="button" class="category-btn bg-kraft border border-slate-700 rounded-lg p-3 text-center hover:border-wood transition duration-300 focus:outline-none" data-category="pool" onclick="selectCategory('pool', this)">
                <span class="text-2xl block mb-1">🎱</span>
                <span class="text-xs font-cyber text-slate-100 uppercase tracking-wider">Pool Table</span>
                <span class="block text-[10px] text-slate-400">Professional Felt</span>
              </button>
              <button type="button" class="category-btn bg-kraft border border-slate-700 rounded-lg p-3 text-center hover:border-wood transition duration-300 focus:outline-none" data-category="dining" onclick="selectCategory('dining', this)">
                <span class="text-2xl block mb-1">🍽️</span>
                <span class="text-xs font-cyber text-slate-100 uppercase tracking-wider">Table</span>
                <span class="block text-[10px] text-slate-400">Dining · Hangout</span>
              </button>
            </div>
          </div>

          <div class="form-group" id="booking-station-container">
            <label class="form-label text-wood text-xs uppercase tracking-wider block mb-2 font-cyber">Select Station / Table</label>
            <select id="booking-station" class="form-control bg-kraft border border-slate-700 text-slate-100 w-full p-3 rounded focus:outline-none focus:border-wood transition" required>
              <option value="">-- Choose a category first --</option>
            </select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-group">
              <label class="form-label text-wood text-xs uppercase tracking-wider block mb-2 font-cyber">Start Date & Time</label>
              <input type="text" id="booking-start" class="form-control bg-kraft border border-slate-700 text-slate-100 w-full p-3 rounded focus:outline-none focus:border-wood transition" placeholder="Select Start" required>
            </div>
            <div class="form-group">
              <label class="form-label text-wood text-xs uppercase tracking-wider block mb-2 font-cyber">End Date & Time</label>
              <input type="text" id="booking-end" class="form-control bg-kraft border border-slate-700 text-slate-100 w-full p-3 rounded focus:outline-none focus:border-wood transition" placeholder="Select End" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label text-wood text-xs uppercase tracking-wider block mb-2 font-cyber">Special Requests</label>
            <textarea id="booking-notes" class="form-control bg-kraft border border-slate-700 text-slate-100 w-full p-3 rounded h-24 focus:outline-none focus:border-wood transition" placeholder="e.g. Need extra gamepads, specific pool table..."></textarea>
          </div>

          <div class="pt-4">
            <button type="submit" class="w-full btn btn-accent py-4 tracking-widest text-base font-cyber uppercase hover-3d-lift">
              <i class="fa-solid fa-calendar-check mr-2"></i> Submit Reservation
            </button>
          </div>
        </form>
      </div>

      <div class="mt-8 p-4 bg-slate-900/40 border border-slate-800 rounded text-center text-xs text-slate-400 max-w-2xl mx-auto">
        Reservations default to pending status. A lounge attendant will confirm based on availability.
      </div>
    </div>
  </section>

  <!-- Loyalty Member perks -->
  <section id="loyalty" class="py-24 px-6 md:px-12 bg-cream border-t border-slate-900 relative">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-16 space-y-2 reveal reveal-up">
        <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-brass">Loyalty Membership</h2>
        <p class="text-slate-400 text-sm">Earn points while playing and unlock tier discounts.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-3d perspective-container reveal reveal-up" style="transition-delay: 0.2s">
        <div class="bg-parchment border border-slate-800 p-6 rounded-lg text-center space-y-3 hover-3d-float aged-card card-corner">
          <span class="badge badge-pink font-cyber text-xs">Bronze Tier</span>
          <div class="text-slate-500 text-xs"><?php echo htmlspecialchars(setting('website.loyalty_tier_descriptions.bronze', 'Standard level upon registration')); ?></div>
          <div class="text-3xl font-extrabold font-cyber text-slate-100"><?php echo setting('pricing.discount_bronze', '5'); ?>% OFF</div>
        </div>

        <div class="bg-parchment border border-wood p-6 rounded-lg text-center space-y-3 shadow-[0_4px_15px_rgba(92,64,51,0.1)] relative hover-3d-float aged-card card-corner">
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-wood text-cream font-cyber text-[10px] font-bold px-3 py-0.5 rounded-full uppercase">Popular</div>
          <span class="badge badge-cyan font-cyber text-xs">Silver Tier</span>
          <div class="text-slate-400 text-xs"><?php echo htmlspecialchars(setting('website.loyalty_tier_descriptions.silver', 'Unlocked at 100 loyalty points')); ?></div>
          <div class="text-3xl font-extrabold font-cyber text-wood"><?php echo setting('pricing.discount_silver', '10'); ?>% OFF</div>
        </div>

        <div class="bg-parchment border border-brass p-6 rounded-lg text-center space-y-3 shadow-[0_4px_15px_rgba(184,134,11,0.1)] hover-3d-float aged-card card-corner">
          <span class="badge badge-gold font-cyber text-xs">Gold Tier</span>
          <div class="text-slate-400 text-xs"><?php echo htmlspecialchars(setting('website.loyalty_tier_descriptions.gold', 'Unlocked at 300 loyalty points')); ?></div>
          <div class="text-3xl font-extrabold font-cyber text-brass"><?php echo setting('pricing.discount_gold', '15'); ?>% OFF</div>
        </div>
      </div>
    </div>
  </section>

  <div class="vintage-divider"></div>

  <!-- Cafe Fuel Bar -->
  <section id="cafe" class="py-24 px-6 md:px-12 relative bg-parchment">
    <div class="max-w-4xl mx-auto text-center space-y-8">
      <h2 class="text-3xl md:text-5xl font-extrabold font-cyber tracking-wide uppercase text-wood">The Fuel Bar</h2>
      <p class="text-slate-400 max-w-lg mx-auto text-sm">
        <?php echo htmlspecialchars(setting('website.fuel_bar_text', 'Order snacks, drinks, and ramen directly to your station through the lounge attendant.')); ?>
      </p>
      
      <div class="flex flex-wrap justify-center gap-4 text-xs font-mono text-slate-400">
        <span class="px-4 py-2 bg-slate-900/60 border border-slate-800 rounded hover-3d-float">🥤 Monster & Red Bull</span>
        <span class="px-4 py-2 bg-slate-900/60 border border-slate-800 rounded hover-3d-float">🍜 Spicy Shin Ramyun</span>
        <span class="px-4 py-2 bg-slate-900/60 border border-slate-800 rounded hover-3d-float">🍿 Chips & Chocolates</span>
        <span class="px-4 py-2 bg-slate-900/60 border border-slate-800 rounded hover-3d-float">☕ Cold Coffee & Tea</span>
      </div>
    </div>
  </section>

  <div class="filigree py-6">&#9670; &#9671; &#9670; &#9671; &#9670;</div>

  <!-- Footer -->
  <footer class="bg-slate-950 border-t border-slate-900 py-12 px-6 text-center text-xs text-slate-400 space-y-4">
    <div class="flex justify-center items-center gap-3">
      <i class="fa-solid fa-dice-d6 text-wood text-xl"></i>
      <span class="font-cyber text-base font-extrabold tracking-widest text-slate-200 uppercase"><?php echo SITE_NAME; ?></span>
    </div>
    <p>&copy; <?php echo date('Y'); ?> <?php echo SITE_NAME; ?>. <?php echo SITE_COPYRIGHT; ?></p>
    <p class="pt-4 border-t border-slate-800">
      <a href="https://wa.me/919414136480?text=Hi!%20I%20need%20help%20setting%20up%20the%20gaming%20cafe%20template" target="_blank" class="text-forest hover:text-wood transition inline-flex items-center gap-1.5">
        <i class="fa-brands fa-whatsapp text-base"></i>
        <span>Paid Setup Assistance — <strong>+91 94141 36480</strong></span>
      </a>
    </p>
  </footer>

  <div id="toast-container" class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"></div>

  <script>
    const BACKEND_URL = '<?php echo BACKEND_URL; ?>';
    const APP_SETTINGS = <?php echo json_encode($APP_SETTINGS); ?>;
    const PUBLIC_STATUS_API = `${BACKEND_URL}/api/stations/public-status`;
    const APPOINTMENTS_API = `${BACKEND_URL}/api/appointments`;

    let allStations = [];
    let currentFilter = 'ALL';
    let selectedCategory = null;
    let fpStart, fpEnd;

    const typeIcons = {
      'PS5': 'fa-solid fa-gamepad text-clay',
      'PS4': 'fa-solid fa-gamepad text-blue-400',
      'Xbox': 'fa-solid fa-gamepad text-clay',
      'Pool': 'fa-solid fa-8 text-wood',
      'Other': 'fa-solid fa-circle text-slate-400'
    };

    let foodCart = [];

    const filterLabels = { 'PS5': 'PS5', 'PS4': 'PS4', 'Xbox': 'Xbox', 'Pool': 'Pool', 'Other': 'Other' };

    function renderFilterButtons() {
      const container = document.getElementById('filter-container');
      if (!container) return;
      const visibleTypes = getVisibleTypes();
      const allBtn = container.querySelector('#filter-ALL');
      container.innerHTML = '';
      container.appendChild(allBtn);

      visibleTypes.forEach(type => {
        if (!filterLabels[type]) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => filterStations(type);
        btn.id = 'filter-' + type;
        btn.className = 'filter-btn px-4 py-2 bg-cream border border-slate-800 text-slate-400 hover:border-wood font-cyber font-bold text-xs uppercase tracking-wider rounded transition';
        btn.innerText = filterLabels[type];
        container.appendChild(btn);
      });
    }

    document.addEventListener('DOMContentLoaded', () => {
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

      loadStatusAndBooking();
      setInterval(loadStatusAndBooking, 10000);

      // Food item click
      document.querySelectorAll('.food-item').forEach(el => {
        el.addEventListener('click', () => {
          const name = el.dataset.name;
          const price = parseFloat(el.dataset.price);
          const icon = el.dataset.icon;
          addToFoodCart(name, price, icon);
        });
      });
    });

    function openFoodModal() {
      document.getElementById('food-modal').classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeFoodModal() {
      document.getElementById('food-modal').classList.remove('active');
      document.body.style.overflow = '';
    }

    function addToFoodCart(name, price, icon) {
      const existing = foodCart.find(item => item.name === name);
      if (existing) {
        existing.qty++;
      } else {
        foodCart.push({ name, price, icon, qty: 1 });
      }
      renderFoodCart();
    }

    function removeFromFoodCart(name) {
      const idx = foodCart.findIndex(item => item.name === name);
      if (idx > -1) {
        if (foodCart[idx].qty > 1) {
          foodCart[idx].qty--;
        } else {
          foodCart.splice(idx, 1);
        }
      }
      renderFoodCart();
    }

    function clearFoodCart() {
      foodCart = [];
      renderFoodCart();
    }

    function renderFoodCart() {
      const cart = document.getElementById('food-cart');
      const total = document.getElementById('food-cart-total');
      
      if (foodCart.length === 0) {
        cart.innerHTML = '<p class="text-xs text-slate-400 italic">Click items above to add to your order.</p>';
        total.innerText = '0.00';
        return;
      }

      let html = '';
      let sum = 0;
      foodCart.forEach(item => {
        sum += item.price * item.qty;
        html += `
          <div class="flex justify-between items-center text-xs bg-kraft px-2 py-1 rounded">
            <span>${item.icon} ${item.name} x${item.qty}</span>
            <span class="flex items-center gap-2">
              <span class="text-clay font-bold">₹${(item.price * item.qty).toFixed(2)}</span>
              <button onclick="removeFromFoodCart('${item.name}')" class="text-rust hover:text-slate-100 text-sm">&times;</button>
            </span>
          </div>
        `;
      });
      cart.innerHTML = html;
      total.innerText = sum.toFixed(2);
    }

    async function submitFoodOrder() {
      if (foodCart.length === 0) {
        showToast('Add at least one item to your order', 'error');
        return;
      }
      const locationInput = document.getElementById('food-order-location');
      const location = locationInput ? locationInput.value.trim() : '';
      if (!location) {
        showToast('Please enter your table number, seat, or name', 'error');
        return;
      }

      const submitBtn = document.getElementById('submit-food-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Sending...';
      }

      try {
        const response = await fetch(`${BACKEND_URL}/api/pos/quick-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location, items: foodCart })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          showToast(`Order sent successfully! Attendant will serve you.`, 'success');
          foodCart = [];
          if (locationInput) locationInput.value = '';
          renderFoodCart();
          closeFoodModal();
        } else {
          throw new Error(data.message || 'Failed to submit order');
        }
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i> Send Order';
        }
      }
    }

    let enabledStationTypes = null;

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
          enabledStationTypes = data.enabledTypes;
          allStations = data.stations;
          loader.classList.add('hidden');
          grid.classList.remove('hidden');
          errBox.classList.add('hidden');

          renderFilterButtons();
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

    function getVisibleTypes() {
      if (enabledStationTypes && Array.isArray(enabledStationTypes) && enabledStationTypes.length > 0) {
        return enabledStationTypes;
      }
      return ['PS5', 'PS4', 'Xbox', 'Pool', 'Other'];
    }

    function renderPricingMatrix(rates) {
      const tbody = document.getElementById('pricing-matrix-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      
      const visibleTypes = getVisibleTypes();

      const friendlyNames = {
        'PS5': 'PlayStation 5 Console',
        'PS4': 'PlayStation 4 Console',
        'Xbox': 'Xbox Series X Console',
        'Pool': 'Pool Table',
        'Other': 'Other'
      };

      const colorClasses = {
        'PS5': 'text-clay',
        'PS4': 'text-blue-400',
        'Xbox': 'text-clay',
        'Pool': 'text-wood',
        'Other': 'text-slate-400'
      };

      const order = ['PS5', 'PS4', 'Xbox', 'Pool', 'Other'];
      const sortedRates = [...rates].sort((a, b) => {
        const indexA = order.indexOf(a.station_type) === -1 ? 99 : order.indexOf(a.station_type);
        const indexB = order.indexOf(b.station_type) === -1 ? 99 : order.indexOf(b.station_type);
        return indexA - indexB;
      });

      sortedRates.forEach(rate => {
        if (!visibleTypes.includes(rate.station_type)) return;
        const row = document.createElement('tr');
        const name = friendlyNames[rate.station_type] || rate.station_type;
        const color = colorClasses[rate.station_type] || 'text-slate-100';
        const rateVal = parseFloat(rate.hourly_rate).toFixed(2);
        
        let addonText = 'N/A';
        if (parseFloat(rate.controller_addon_rate) > 0) {
          addonText = `+₹${parseFloat(rate.controller_addon_rate).toFixed(2)} / hr per extra pad`;
        }

        row.innerHTML = `
          <td class="p-6 font-bold font-cyber text-slate-100">${name}</td>
          <td class="p-6 ${color}">₹${rateVal} / hr</td>
          <td class="p-6 text-slate-300 font-cyber text-xs">${addonText}</td>
        `;
        tbody.appendChild(row);
      });
    }

    function getVisibleStations() {
      const visibleTypes = getVisibleTypes();
      return allStations.filter(s => visibleTypes.includes(s.type));
    }

    function updateCounters() {
      const visible = getVisibleStations();
      document.getElementById('total-count').innerText = visible.length;
      document.getElementById('available-count').innerText = visible.filter(s => s.status === 'Available').length;
      document.getElementById('occupied-count').innerText = visible.filter(s => s.status === 'Occupied').length;
      document.getElementById('maintenance-count').innerText = visible.filter(s => s.status === 'Maintenance').length;
    }

    function renderStations() {
      const grid = document.getElementById('stations-grid');
      grid.innerHTML = '';

      const visible = getVisibleStations();
      const filtered = currentFilter === 'ALL' 
        ? visible 
        : visible.filter(s => s.type === currentFilter);

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full text-center py-10 text-slate-500 font-cyber text-xs">
            NO STATIONS FOUND
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
          statusClass = 'border-forest/30 hover:border-forest';
          statusBadgeClass = 'bg-forest/10 border border-forest text-forest';
          statusPulseClass = 'status-pulse-green';
          statusLabel = 'Available';
        } else if (station.status === 'Occupied') {
          statusClass = 'border-rust/30 hover:border-rust';
          statusBadgeClass = 'bg-rust/10 border border-rust text-rust';
          statusPulseClass = 'status-pulse-red';
          statusLabel = 'Busy';
        } else if (station.status === 'Maintenance') {
          statusClass = 'border-brass/30 hover:border-brass';
          statusBadgeClass = 'bg-brass/10 border border-brass text-brass';
          statusPulseClass = 'status-pulse-yellow';
          statusLabel = 'Offline';
        }

        const card = document.createElement('div');
        card.className = `bg-kraft border rounded-lg p-5 flex flex-col justify-between items-center text-center transition-all duration-300 hover-3d-float aged-card card-corner ${statusClass} ${statusPulseClass}`;
        
        card.innerHTML = `
          <div class="w-12 h-12 rounded-full bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-3 text-lg">
            <i class="${iconClass}"></i>
          </div>
          <div>
            <h3 class="font-bold text-slate-100 font-cyber text-sm tracking-wide mb-1 leading-tight">${station.name}</h3>
            <span class="text-[9px] tracking-widest uppercase font-mono text-slate-500">${station.type}</span>
          </div>
          <div class="mt-4 flex flex-col items-center gap-2 w-full">
            <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass}">
              ${statusLabel}
            </span>
            <button onclick="triggerPublicReservation(${station.id}, '${station.type}', '${station.name}')" class="w-full mt-1 btn btn-primary py-1.5 text-xs font-cyber uppercase tracking-wider hover-3d-lift">
              Reserve
            </button>
          </div>
        `;
        
        grid.appendChild(card);
      });
      init3DTilt();
    }

    function triggerPublicReservation(stationId, stationType, stationName) {
      let category = 'console';
      const isConsole = ['PS5', 'Xbox', 'PC', 'VR', 'PS4'].includes(stationType);
      if (stationType === 'Pool') category = 'pool';
      else if (stationType === 'Dining') category = 'dining';

      const btn = document.querySelector(`.category-btn[data-category="${category}"]`);
      if (btn) {
        selectCategory(category, btn);
      }

      const select = document.getElementById('booking-station');
      if (select) {
        // Ensure the option exists (even if it's currently occupied/maintenance, pre-booking should be possible)
        let optionExists = false;
        for (let i = 0; i < select.options.length; i++) {
          if (parseInt(select.options[i].value) === stationId) {
            optionExists = true;
            break;
          }
        }
        if (!optionExists) {
          const opt = document.createElement('option');
          opt.value = stationId;
          opt.innerText = `${stationName} (${stationType})`;
          select.appendChild(opt);
        }
        select.value = stationId;
      }

      // Smooth scroll to booking slot section
      const section = document.getElementById('book-slot');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }

    function filterStations(type) {
      currentFilter = type;

      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = 'filter-btn px-4 py-2 bg-cream border border-slate-800 text-slate-400 hover:border-wood font-cyber font-bold text-xs uppercase tracking-wider rounded transition';
      });

      const activeBtn = document.getElementById('filter-' + type);
      if (activeBtn) {
        activeBtn.className = 'filter-btn px-4 py-2 bg-wood text-cream font-cyber font-bold text-xs uppercase tracking-wider rounded transition hover-3d-push';
      }

      renderStations();
    }

    function populateBookingDropdown(select) {
      if (!select) return;
      const cachedValue = select.value;
      select.innerHTML = selectedCategory ? '<option value="">-- Choose --</option>' : '<option value="">-- Choose a category first --</option>';
      
      const filtered = allStations.filter(station => {
        if (station.status !== 'Available') return false;
        if (!selectedCategory) return false;
        const isConsole = ['PS5', 'Xbox', 'PC', 'VR', 'PS4'].includes(station.type);
        if (selectedCategory === 'console' && !isConsole) return false;
        if (selectedCategory === 'pool' && station.type !== 'Pool') return false;
        if (selectedCategory === 'dining' && station.type !== 'Dining') return false;
        return true;
      });

      filtered.forEach(station => {
        const opt = document.createElement('option');
        opt.value = station.id;
        opt.innerText = `${station.name} (${station.type})`;
        select.appendChild(opt);
      });

      if (cachedValue) {
        select.value = cachedValue;
      }

      // Hide dropdown if Pool category is selected and automatically select the Pool table
      const container = document.getElementById('booking-station-container');
      if (selectedCategory === 'pool') {
        const poolStation = filtered.find(s => s.type === 'Pool');
        if (poolStation) {
          select.value = poolStation.id;
        }
        if (container) container.classList.add('hidden');
      } else {
        if (container) container.classList.remove('hidden');
      }
    }

    function selectCategory(category, btn) {
      selectedCategory = category;
      document.querySelectorAll('.category-btn').forEach(b => {
        b.classList.remove('border-wood', 'bg-kraft/80', 'shadow-[0_0_15px_rgba(92,64,51,0.15)]');
        b.classList.add('border-slate-700');
      });
      btn.classList.remove('border-slate-700');
      btn.classList.add('border-wood', 'shadow-[0_0_15px_rgba(92,64,51,0.15)]');
      
      const select = document.getElementById('booking-station');
      populateBookingDropdown(select);

      const selectGroup = select.closest('.form-group');
      if (category === 'dining') {
        // Hide the specific table selection dropdown for dining bookings
        if (selectGroup) selectGroup.style.display = 'none';
        
        // Auto-assign the booking request to the first dining table ID under the hood
        const anyDining = allStations.find(s => s.type === 'Dining');
        if (anyDining) {
          select.innerHTML = `<option value="${anyDining.id}">${anyDining.name}</option>`;
          select.value = anyDining.id;
        }
      } else {
        // Show selection dropdown for console and pool bookings
        if (selectGroup) selectGroup.style.display = 'block';
      }
    }

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
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting...';

      try {
        const response = await fetch(APPOINTMENTS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, playerPhone, stationId, startTime, endTime, notes })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          showToast('Reservation submitted! Pending review.', 'success');
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
        submitBtn.innerHTML = '<i class="fa-solid fa-calendar-check mr-2"></i> Submit Reservation';
      }
    });

    function showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'p-4 rounded border shadow-lg flex items-center gap-3 max-w-sm pointer-events-auto transition duration-300 transform translate-y-2 opacity-0';
      
      let icon = '<i class="fa-solid fa-circle-info text-wood"></i>';
      let styleClasses = 'border-wood bg-parchment text-slate-100';

      if (type === 'success') {
        icon = '<i class="fa-solid fa-circle-check text-forest"></i>';
        styleClasses = 'border-forest bg-parchment text-slate-100';
      } else if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-exclamation text-rust"></i>';
        styleClasses = 'border-rust bg-parchment text-slate-100';
      }

      toast.className += ` ${styleClasses}`;
      toast.innerHTML = `
        <div class="text-lg">${icon}</div>
        <div class="text-sm font-semibold flex-grow">${message}</div>
        <button class="text-slate-400 hover:text-slate-100" onclick="this.parentElement.remove()">&times;</button>
      `;

      container.appendChild(toast);
      setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
      setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
      }, 5000);
    }

    // Scroll-triggered 3D reveal animations
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Hero parallax orbs
    const orbs = document.querySelectorAll('.parallax-orb');
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      orbs.forEach(orb => {
        const speed = parseFloat(orb.dataset.parallax) || 0.1;
        orb.style.transform = `translateY(${scrolled * speed}px)`;
      });
    }, { passive: true });

    // Interactive 3D Card tilt effect (with Z-axis depth pop-out for inner elements)
    function init3DTilt() {
      // Don't enable full dynamic mouse tracking on mobile to save performance/battery
      if (window.innerWidth < 768) return;

      const tiltCards = document.querySelectorAll('.hover-3d-float, .hover-3d-tilt');
      tiltCards.forEach(card => {
        if (card.dataset.tiltBound) return; // Prevent duplicate listeners
        card.dataset.tiltBound = 'true';

        // Ensure card-container has preserve-3d
        card.style.transformStyle = 'preserve-3d';
        card.style.webkitTransformStyle = 'preserve-3d';
        
        // Find children we want to pop out (e.g. badges, text elements, icons)
        const popElements = card.querySelectorAll('.badge, h3, .text-3xl, .filigree, button, .w-12');
        popElements.forEach(el => {
          el.style.transform = 'translateZ(20px)';
          el.style.transition = 'transform 0.1s ease';
        });

        card.addEventListener('mousemove', e => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          // Max rotation angles (degrees)
          const maxRotateX = 8;
          const maxRotateY = 8;
          
          const rotateX = ((centerY - y) / centerY) * maxRotateX;
          const rotateY = ((x - centerX) / centerX) * maxRotateY;
          
          card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.025) translateZ(10px)`;
          card.style.boxShadow = '0 20px 40px rgba(92, 64, 51, 0.2), 0 8px 15px rgba(92, 64, 51, 0.1)';
        });

        card.addEventListener('mouseleave', () => {
          card.style.transform = '';
          card.style.boxShadow = '';
        });
      });
    }

    // Initialize 3D cards initially
    init3DTilt();
    window.addEventListener('resize', init3DTilt);
  </script>
</body>
</html>
