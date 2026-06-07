<?php
include 'header.php';
?>

<div class="flex flex-col lg:flex-row gap-6">
  <!-- Main Dashboard Panel -->
  <div class="flex-grow">
    <!-- Live Analytics Widgets -->
    <div class="dashboard-grid">
      <!-- Live Revenue Tracker -->
      <div class="widget-card green">
        <div class="widget-title">Live Revenue (Today)</div>
        <div class="flex items-center justify-between">
          <div class="widget-value text-neonGreen" id="widget-revenue">₹0.00</div>
          <div class="text-3xl text-neonGreen/20"><i class="fa-solid fa-money-bill-trend-up"></i></div>
        </div>
        <div class="text-xs text-slate-400 mt-2">Sum of sessions and quick Cafe orders</div>
      </div>

      <!-- Active Occupancy Rate Widget -->
      <div class="widget-card cyan">
        <div class="widget-title">Station Occupancy</div>
        <div class="flex items-center justify-between">
          <div class="widget-value text-neonCyan" id="widget-occupancy">0%</div>
          <div class="text-3xl text-neonCyan/20"><i class="fa-solid fa-gamepad"></i></div>
        </div>
        <div class="text-xs text-slate-400 mt-2" id="widget-occupancy-ratio">0 of 0 seats active</div>
      </div>

      <!-- Popular Console type -->
      <div class="widget-card gold">
        <div class="widget-title">Inventory Alerts</div>
        <div class="flex items-center justify-between">
          <div class="widget-value text-neonGold" id="widget-low-stock">0</div>
          <div class="text-3xl text-neonGold/20"><i class="fa-solid fa-triangle-exclamation"></i></div>
        </div>
        <div class="text-xs text-slate-400 mt-2">Items below stock safety threshold</div>
      </div>
    </div>

    <!-- Station Layout Grid Section -->
    <div class="station-grid-container bg-cyberPanel border border-slate-800 rounded-lg p-6">
      <div class="section-header">
        <h2 class="text-xl font-bold text-neonCyan flex items-center gap-2">
          <i class="fa-solid fa-network-wired text-neonCyan"></i>
          <span>Live Station Status Grid</span>
        </h2>
        <!-- Filters -->
        <div class="flex gap-2">
          <select id="filter-type" class="bg-cyberDark border border-slate-700 px-3 py-1 text-sm rounded text-slate-300 focus:outline-none focus:border-neonCyan">
            <option value="ALL">All Stations</option>
            <option value="PC">PC Section</option>
            <option value="PS5">PlayStation 5</option>
            <option value="Xbox">Xbox Series X</option>
            <option value="VR">VR Booths</option>
          </select>
          <select id="filter-status" class="bg-cyberDark border border-slate-700 px-3 py-1 text-sm rounded text-slate-300 focus:outline-none focus:border-neonCyan">
            <option value="ALL">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Occupied">Active</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <!-- Station status grid, dynamically populated by JS -->
      <div class="station-status-grid" id="dashboard-station-grid">
        <div class="col-span-full py-12 text-center text-slate-500">
          <i class="fa-solid fa-spinner fa-spin text-2xl text-neonCyan mb-2"></i>
          <p>Establishing connection with security terminal stream...</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Real-time Activity Timeline Sidebar Feed (Feature 41) -->
  <?php if ($role !== 'Attendant'): ?>
    <div class="w-full lg:w-80 shrink-0 bg-cyberPanel border border-slate-800 rounded-lg flex flex-col h-[650px] overflow-hidden">
      <div class="activity-feed-header border-b border-slate-800 p-4 font-cyber text-lg uppercase tracking-wider flex items-center justify-between">
        <span class="text-neonPink"><i class="fa-solid fa-circle-nodes mr-2"></i>System activity feed</span>
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neonPink opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-neonPink"></span>
        </span>
      </div>
      
      <div class="flex-grow overflow-y-auto" id="activity-feed-scroll">
        <ul class="activity-list" id="activity-feed-list">
          <li class="activity-item">
            <div class="activity-time">Just now</div>
            <div class="activity-action text-neonCyan">Connection</div>
            <div class="activity-desc">Dashboard listening to Server Sent Events stream</div>
          </li>
        </ul>
      </div>
    </div>
  <?php endif; ?>
</div>

<!-- ==========================================
     DASHBOARD MODALS (Start Session, Extend, Transfer, Checkout)
     ========================================== -->

<!-- Start Session Modal -->
<div id="modal-start-session" class="modal-overlay">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="start-session-title">Start Session: PC-01</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-start-session')">&times;</button>
    </div>
    <form id="form-start-session">
      <input type="hidden" id="start-station-id" value="">
      <div class="modal-body space-y-4">
        <!-- 1. Player Search/Select -->
        <div class="form-group">
          <label class="form-label">Select Registered Player (Optional)</label>
          <select id="start-player-id" class="form-control">
            <option value="">-- Guest Walk-in --</option>
            <!-- Populated by JS -->
          </select>
          <p class="text-xs text-slate-500 mt-1">Guest walk-ins are not eligible for loyalty points or discounts.</p>
        </div>

        <!-- 2. Controllers Count (Consoles only) -->
        <div class="form-group" id="controller-count-group" style="display: none;">
          <label class="form-label">Gamepad Peripherals Assigned</label>
          <select id="start-controller-count" class="form-control">
            <option value="1">1 Controller (Standard Rate)</option>
            <option value="2">2 Controllers (Add-on billing)</option>
            <option value="4">4 Controllers (Add-on billing)</option>
          </select>
        </div>

        <!-- 3. Session billing mode -->
        <div class="form-group">
          <label class="form-label">Billing Mode</label>
          <div class="grid grid-cols-2 gap-4 mt-1">
            <label class="flex items-center gap-2 bg-slate-900 border border-slate-700 p-3 rounded cursor-pointer hover:border-neonCyan transition">
              <input type="radio" name="start-session-type" value="Prepaid" onclick="toggleBillingFields('Prepaid')">
              <div>
                <div class="font-bold text-sm">Prepaid</div>
                <div class="text-[10px] text-slate-500">Pay cash/wallet first</div>
              </div>
            </label>
            <label class="flex items-center gap-2 bg-slate-900 border border-slate-700 p-3 rounded cursor-pointer hover:border-neonCyan transition">
              <input type="radio" name="start-session-type" value="Postpaid" checked onclick="toggleBillingFields('Postpaid')">
              <div>
                <div class="font-bold text-sm">Postpaid</div>
                <div class="text-[10px] text-slate-500">Bill increments dynamically</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 4. Prepaid inputs -->
        <div id="prepaid-fields" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label">Duration (Minutes)</label>
              <input type="number" id="start-duration-minutes" class="form-control" placeholder="e.g. 60" min="15">
            </div>
            <div class="form-group">
              <label class="form-label">Or Cash Amount (₹)</label>
              <input type="number" step="0.50" id="start-prepaid-amount" class="form-control" placeholder="e.g. 10.00" min="1">
            </div>
          </div>
          <!-- Quick Duration Selection -->
          <div class="flex gap-2 items-center justify-start pb-2 border-b border-slate-800/40">
            <span class="text-xs text-slate-400 font-cyber">Quick Timer:</span>
            <button type="button" onclick="setQuickDuration(30)" class="btn btn-secondary btn-sm border border-neonCyan text-neonCyan hover:bg-neonCyan hover:text-cyberDark transition-all duration-200">+30 Min</button>
            <button type="button" onclick="setQuickDuration(60)" class="btn btn-secondary btn-sm border border-neonCyan text-neonCyan hover:bg-neonCyan hover:text-cyberDark transition-all duration-200">+1 Hour</button>
            <button type="button" onclick="setQuickDuration(120)" class="btn btn-secondary btn-sm border border-neonCyan text-neonCyan hover:bg-neonCyan hover:text-cyberDark transition-all duration-200">+2 Hours</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-start-session')">Cancel</button>
        <button type="submit" class="btn btn-primary">Establish Timer Connection</button>
      </div>
    </form>
  </div>
</div>

<!-- Time Extension Modal -->
<div id="modal-extend-session" class="modal-overlay">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="extend-session-title">Extend Session: PC-01</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-extend-session')">&times;</button>
    </div>
    <form id="form-extend-session">
      <input type="hidden" id="extend-session-id" value="">
      <div class="modal-body space-y-4">
        <p class="text-sm text-slate-400">Select an extension amount or custom duration below.</p>
        
        <div class="grid grid-cols-3 gap-2">
          <button type="button" onclick="setExtendVal(30)" class="bg-slate-900 border border-slate-700 py-2 rounded font-cyber text-sm hover:border-neonCyan text-white">+30 Min</button>
          <button type="button" onclick="setExtendVal(60)" class="bg-slate-900 border border-slate-700 py-2 rounded font-cyber text-sm hover:border-neonCyan text-white">+1 Hour</button>
          <button type="button" onclick="setExtendVal(120)" class="bg-slate-900 border border-slate-700 py-2 rounded font-cyber text-sm hover:border-neonCyan text-white">+2 Hours</button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="extend-minutes">Custom Minutes</label>
            <input type="number" min="5" id="extend-minutes" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label" for="extend-amount">Or Custom Cash (₹)</label>
            <input type="number" step="0.50" min="0.50" id="extend-amount" class="form-control">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-extend-session')">Cancel</button>
        <button type="submit" class="btn btn-primary">Extend Timer</button>
      </div>
    </form>
  </div>
</div>

<!-- Station Transfer Modal -->
<div id="modal-transfer-session" class="modal-overlay">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="transfer-session-title">Migrate Player Session</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-transfer-session')">&times;</button>
    </div>
    <form id="form-transfer-session">
      <input type="hidden" id="transfer-session-id" value="">
      <div class="modal-body space-y-4">
        <p class="text-sm text-slate-400">Migrate active player session to another terminal. Time left / billing will be adjusted automatically according to new station rates.</p>
        <div class="form-group">
          <label class="form-label" for="transfer-target-station">Select Target Station</label>
          <select id="transfer-target-station" class="form-control" required>
            <!-- Populated with Available stations -->
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-transfer-session')">Cancel</button>
        <button type="submit" class="btn btn-accent">Initiate Relocation</button>
      </div>
    </form>
  </div>
</div>

<!-- Checkout Invoice Dialog Modal (POS Billing, Coupons, Split-payment, Printable PDF) -->
<div id="modal-checkout-session" class="modal-overlay">
  <div class="modal-container max-w-xl">
    <div class="modal-header">
      <h3 class="modal-title"><i class="fa-solid fa-receipt text-neonCyan mr-2"></i>Billing Checkout Invoice</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-checkout-session')">&times;</button>
    </div>
    <form id="form-checkout-session">
      <input type="hidden" id="checkout-session-id" value="">
      <div class="modal-body space-y-6">
        
        <!-- Receipt Layout -->
        <div class="bg-slate-950 p-6 border border-slate-800 rounded font-mono text-xs text-slate-300 relative" id="printable-receipt-area">
          <div class="text-center border-b border-dashed border-slate-800 pb-4 mb-4">
            <h4 class="text-base font-bold text-neonCyan font-cyber tracking-widest uppercase">THE GAMING GARAGE</h4>
            <p class="text-[10px] text-slate-500 font-cyber tracking-wide">SARDARPURA, JODHPUR, RAJASTHAN</p>
            <p class="text-[10px] text-slate-500">TEL: +91 98765-43210</p>
          </div>
          
          <div class="space-y-1 mb-4">
            <div class="flex justify-between"><span>INVOICE NO:</span><span id="rcpt-invoice-no">#SESS-000</span></div>
            <div class="flex justify-between"><span>STATION:</span><span id="rcpt-station-name" class="font-bold text-white">PC-01</span></div>
            <div class="flex justify-between"><span>PLAYER:</span><span id="rcpt-player-name">Guest</span></div>
            <div class="flex justify-between"><span>LOYALTY TIER:</span><span id="rcpt-loyalty-tier">Bronze (5% Disc)</span></div>
            <div class="flex justify-between"><span>ELAPSED TIME:</span><span id="rcpt-elapsed-time">60 Mins</span></div>
          </div>

          <!-- Items list -->
          <div class="border-t border-dashed border-slate-800 pt-3 mb-4 space-y-2">
            <div class="grid grid-cols-12 gap-1 font-bold text-white mb-2">
              <span class="col-span-6">DESCRIPTION</span>
              <span class="col-span-2 text-center">QTY</span>
              <span class="col-span-2 text-right">RATE</span>
              <span class="col-span-2 text-right">TOTAL</span>
            </div>
            
            <div class="grid grid-cols-12 gap-1 text-slate-300">
              <span class="col-span-6" id="rcpt-game-desc">Game Session (Hourly billing)</span>
              <span class="col-span-2 text-center" id="rcpt-game-qty">1</span>
              <span class="col-span-2 text-right" id="rcpt-game-rate">₹0.00</span>
              <span class="col-span-2 text-right font-bold text-white" id="rcpt-game-cost">₹0.00</span>
            </div>
            <div id="rcpt-cafe-items-container" class="space-y-1">
              <!-- Cafe items appended here -->
            </div>
          </div>

          <!-- Totals -->
          <div class="border-t border-dashed border-slate-800 pt-3 space-y-1">
            <div class="flex justify-between"><span>SUBTOTAL:</span><span id="rcpt-subtotal">₹0.00</span></div>
            <div class="flex justify-between text-neonPink"><span>DISCOUNT:</span><span id="rcpt-discount">-₹0.00</span></div>
            <div class="flex justify-between"><span id="rcpt-tax-label">TAX/GST (10%):</span><span id="rcpt-tax">₹0.00</span></div>
            <div class="flex justify-between text-base font-bold text-white border-t border-dashed border-slate-800 pt-2 mt-2">
              <span>INVOICE TOTAL:</span><span id="rcpt-total" class="text-neonCyan">₹0.00</span>
            </div>
          </div>
          
          <div class="text-center border-t border-dashed border-slate-800 pt-4 mt-6 text-[10px] text-slate-500">
            <p>THANK YOU FOR PLAYING AT THE GAMING GARAGE!</p>
            <p>CONGLOMERATE SECURE SYS VER 2026</p>
          </div>
        </div>

        <!-- Checkout Actions & Coupons -->
        <div class="space-y-4 no-print">
          <div class="grid grid-cols-2 gap-4">
            <!-- Coupon Validation -->
            <div class="form-group mb-0">
              <label class="form-label">Apply Promo Coupon</label>
              <div class="flex gap-2">
                <input type="text" id="checkout-coupon-code" class="form-control" placeholder="WELCOME10">
                <button type="button" onclick="applyCoupon()" class="btn btn-secondary py-2">Apply</button>
              </div>
            </div>

            <!-- Payment Methods -->
            <div class="form-group mb-0">
              <label class="form-label">Payment Method</label>
              <select id="checkout-payment-method" class="form-control" onchange="togglePaymentInputs(this.value)">
                <option value="Cash">Cash</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Wallet">Digital Wallet Balance</option>
                <option value="Split">Split Payment (Wallet/Cash)</option>
              </select>
            </div>
          </div>

          <!-- Split payment inputs -->
          <div id="split-payment-inputs" style="display: none;" class="p-3 bg-slate-900 border border-slate-800 rounded grid grid-cols-2 gap-4">
            <div class="form-group mb-0">
              <label class="form-label">Debit from Wallet (₹)</label>
              <input type="number" step="0.01" min="0" id="checkout-split-wallet" class="form-control" value="0.00">
              <span class="text-[10px] text-slate-500">Available Wallet: ₹<span id="checkout-available-wallet">0.00</span></span>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Pay in Cash (₹)</label>
              <input type="number" step="0.01" min="0" id="checkout-split-cash" class="form-control" value="0.00">
            </div>
          </div>

        </div>


      </div>
      <div class="modal-footer no-print">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-checkout-session')">Cancel</button>
        <button type="button" onclick="window.print()" class="btn btn-success"><i class="fa-solid fa-print"></i> Print</button>
        <button type="submit" class="btn btn-primary">Confirm Checkout Payment</button>
      </div>
    </form>
  </div>
</div>

<!-- Prepaid Confirmation Modal -->
<div id="modal-prepaid-confirm" class="modal-overlay">
  <div class="modal-container max-w-md">
    <div class="modal-header bg-slate-950">
      <h3 class="modal-title font-cyber text-neonCyan uppercase flex items-center gap-2">
        <i class="fa-solid fa-cash-register text-neonCyan"></i>
        <span>Prepaid Payment Receipt</span>
      </h3>
      <button class="btn-modal-close" type="button" onclick="closeModal('modal-prepaid-confirm')">&times;</button>
    </div>
    <form id="form-prepaid-confirm">
      <div class="modal-body space-y-4">
        <div class="bg-slate-950 p-4 border border-slate-800 rounded font-mono text-xs text-slate-300">
          <div class="text-center border-b border-dashed border-slate-800 pb-2 mb-3">
            <h4 class="text-sm font-bold text-neonCyan font-cyber tracking-widest uppercase">THE GAMING GARAGE</h4>
            <p class="text-[9px] text-slate-500 font-cyber tracking-wide">PREPAID PAYMENT OVERVIEW</p>
          </div>
          <div class="space-y-1 mb-3">
            <div class="flex justify-between"><span>STATION:</span><span id="prepaid-rcpt-station" class="font-bold text-white">-</span></div>
            <div class="flex justify-between"><span>PLAYER:</span><span id="prepaid-rcpt-player">-</span></div>
            <div class="flex justify-between"><span>LOYALTY TIER:</span><span id="prepaid-rcpt-tier">-</span></div>
            <div class="flex justify-between"><span>DURATION / TYPE:</span><span id="prepaid-rcpt-duration">-</span></div>
          </div>
          <div class="border-t border-dashed border-slate-800 pt-2 space-y-1">
            <div class="flex justify-between"><span>SUBTOTAL:</span><span id="prepaid-rcpt-subtotal">₹0.00</span></div>
            <div class="flex justify-between text-neonPink"><span>LOYALTY DISCOUNT:</span><span id="prepaid-rcpt-discount">-₹0.00</span></div>
            <div class="flex justify-between"><span id="prepaid-rcpt-tax-label">TAX/GST (10%):</span><span id="prepaid-rcpt-tax">₹0.00</span></div>
            <div class="flex justify-between text-sm font-bold text-white border-t border-dashed border-slate-800 pt-2 mt-2">
              <span>TOTAL TO COLLECT:</span><span id="prepaid-rcpt-total" class="text-neonCyan">₹0.00</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="prepaid-payment-method">Payment Method</label>
          <select id="prepaid-payment-method" class="form-control">
            <option value="Cash">Cash</option>
            <option value="Card">Credit/Debit Card</option>
            <option value="Wallet">Digital Wallet Balance</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-prepaid-confirm')">Cancel</button>
        <button type="submit" class="btn btn-primary">Collect Payment & Start</button>
      </div>
    </form>
  </div>
</div>

<?php
include 'footer.php';
?>
