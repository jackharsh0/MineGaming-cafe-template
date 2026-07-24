<?php
include 'header.php';
?>

<div class="flex flex-col lg:flex-row gap-6">
  <!-- Main Dashboard Panel -->
  <div class="flex-grow">
    <!-- Live Analytics Widgets -->
    <div class="dashboard-grid">
      <?php if ($role !== 'Manager'): ?>
      <!-- Live Revenue Tracker -->
      <div class="widget-card green">
        <div class="widget-title">Live Revenue (Today)</div>
        <div class="flex items-center justify-between">
          <div class="widget-value text-forest" id="widget-revenue">₹0.00</div>
          <div class="text-3xl text-forest/20"><i class="fa-solid fa-money-bill-trend-up"></i></div>
        </div>
        <div class="text-xs text-slate-400 mt-2">Sum of sessions and quick Cafe orders</div>
      </div>
      <?php endif; ?>

      <?php if ($role !== 'Manager'): ?>
      <!-- Active Occupancy Rate Widget -->
      <div class="widget-card cyan">
        <div class="widget-title">Station Occupancy</div>
        <div class="flex items-center justify-between">
          <div class="widget-value text-wood" id="widget-occupancy">0%</div>
          <div class="text-3xl text-wood/20"><i class="fa-solid fa-gamepad"></i></div>
        </div>
        <div class="text-xs text-slate-400 mt-2" id="widget-occupancy-ratio">0 of 0 seats active</div>
      </div>
      <?php endif; ?>

      <!-- Popular Console type -->
      <div class="widget-card gold">
        <div class="widget-title">Inventory Alerts</div>
        <div class="flex items-center justify-between">
          <div class="widget-value text-brass" id="widget-low-stock">0</div>
          <div class="text-3xl text-brass/20"><i class="fa-solid fa-triangle-exclamation"></i></div>
        </div>
        <div class="text-xs text-slate-400 mt-2">Items below stock safety threshold</div>
      </div>
    </div>



    <!-- Station Layout Grid Section -->
    <div class="station-grid-container bg-parchment border border-slate-800 rounded-lg p-6">
      <div class="section-header">
        <h2 class="text-xl font-bold text-wood flex items-center gap-2">
          <i class="fa-solid fa-network-wired text-wood"></i>
          <span>Live Station Status</span>
        </h2>
        <!-- Status filter chips -->
        <div class="flex gap-1.5" id="status-filter-chips">
          <button class="status-chip active bg-wood text-cream px-3 py-1 rounded-full text-xs font-cyber transition duration-200 hover:bg-wood/80" data-filter="ALL">All</button>
          <button class="status-chip bg-kraft border border-slate-700 text-slate-400 px-3 py-1 rounded-full text-xs font-cyber transition duration-200 hover:border-wood" data-filter="Available">Free</button>
          <button class="status-chip bg-kraft border border-slate-700 text-slate-400 px-3 py-1 rounded-full text-xs font-cyber transition duration-200 hover:border-wood" data-filter="Occupied">Active</button>
          <button class="status-chip bg-kraft border border-slate-700 text-slate-400 px-3 py-1 rounded-full text-xs font-cyber transition duration-200 hover:border-wood" data-filter="Maintenance">Maint.</button>
        </div>
      </div>

      <!-- Station status grid, dynamically populated by JS -->
      <div class="station-status-grid stagger-3d perspective-container" id="dashboard-station-grid">
        <div class="col-span-full py-12 text-center text-slate-500">
          <i class="fa-solid fa-spinner fa-spin text-2xl text-wood mb-2"></i>
          <p>Loading station data...</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Real-time Activity Timeline Sidebar Feed (Feature 41) -->
  <?php if ($role !== 'Attendant' && $role !== 'Manager'): ?>
    <div class="w-full lg:w-80 shrink-0 bg-parchment border border-slate-800 rounded-lg flex flex-col h-[650px] overflow-hidden">
      <div class="activity-feed-header border-b border-slate-800 p-4 font-cyber text-lg uppercase tracking-wider flex items-center justify-between">
        <span class="text-clay"><i class="fa-solid fa-circle-nodes mr-2"></i>System Activity</span>
        <span class="flex h-2 w-2 relative">
          <span class="vintage-flicker absolute inline-flex h-full w-full rounded-full bg-clay opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-clay"></span>
        </span>
      </div>
      
      <div class="flex-grow overflow-y-auto" id="activity-feed-scroll">
        <ul class="activity-list" id="activity-feed-list">
          <li class="activity-item">
            <div class="activity-time">Just now</div>
            <div class="activity-action text-wood">Connection</div>
            <div class="activity-desc">Dashboard listening to live events</div>
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
<div id="modal-start-session" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title text-wood" id="start-session-title">Start Session</h3>
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
              <label class="flex items-center gap-2 bg-kraft border border-slate-700 p-3 rounded cursor-pointer hover:border-wood transition">
                <input type="radio" name="start-session-type" value="Prepaid" onclick="toggleBillingFields('Prepaid')">
                <div>
                  <div class="font-bold text-sm text-slate-100">Prepaid</div>
                  <div class="text-[10px] text-slate-500">Pay cash/play hours first</div>
                </div>
              </label>
              <label class="flex items-center gap-2 bg-kraft border border-slate-700 p-3 rounded cursor-pointer hover:border-wood transition">
                <input type="radio" name="start-session-type" value="Postpaid" checked onclick="toggleBillingFields('Postpaid')">
                <div>
                  <div class="font-bold text-sm text-slate-100">Postpaid</div>
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
                <input type="number" step="any" id="start-prepaid-amount" class="form-control" placeholder="e.g. 10.00" min="0">
              </div>
            </div>
            <!-- Quick Duration Selection -->
            <div class="flex gap-2 items-center justify-start pb-2 border-b border-slate-800/40">
              <span class="text-xs text-slate-400 font-cyber">Quick Timer:</span>
              <button type="button" onclick="setQuickDuration(30)" class="btn btn-secondary btn-sm border border-wood text-wood hover:bg-wood hover:text-cream transition-all duration-200 hover-3d-push">+30 Min</button>
              <button type="button" onclick="setQuickDuration(60)" class="btn btn-secondary btn-sm border border-wood text-wood hover:bg-wood hover:text-cream transition-all duration-200 hover-3d-push">+1 Hour</button>
              <button type="button" onclick="setQuickDuration(120)" class="btn btn-secondary btn-sm border border-wood text-wood hover:bg-wood hover:text-cream transition-all duration-200 hover-3d-push">+2 Hours</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-start-session')">Cancel</button>
          <button type="submit" class="btn btn-primary hover-3d-lift">Start Session</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Time Extension Modal -->
  <div id="modal-extend-session" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title text-wood" id="extend-session-title">Extend Session</h3>
        <button class="btn-modal-close" onclick="closeModal('modal-extend-session')">&times;</button>
      </div>
      <form id="form-extend-session">
        <input type="hidden" id="extend-session-id" value="">
        <div class="modal-body space-y-4">
          <p class="text-sm text-slate-400">Select an extension amount or custom duration below.</p>
          
          <div class="grid grid-cols-3 gap-2">
            <button type="button" onclick="setExtendVal(30)" class="bg-kraft border border-slate-700 py-2 rounded font-cyber text-sm hover:border-wood text-slate-100 hover-3d-push">+30 Min</button>
            <button type="button" onclick="setExtendVal(60)" class="bg-kraft border border-slate-700 py-2 rounded font-cyber text-sm hover:border-wood text-slate-100 hover-3d-push">+1 Hour</button>
            <button type="button" onclick="setExtendVal(120)" class="bg-kraft border border-slate-700 py-2 rounded font-cyber text-sm hover:border-wood text-slate-100 hover-3d-push">+2 Hours</button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label" for="extend-minutes">Custom Minutes</label>
              <input type="number" min="5" id="extend-minutes" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label" for="extend-amount">Or Custom Cash (₹)</label>
              <input type="number" step="0.01" min="0.01" id="extend-amount" class="form-control">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-extend-session')">Cancel</button>
          <button type="submit" class="btn btn-primary hover-3d-lift">Extend Timer</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Station Transfer Modal -->
  <div id="modal-transfer-session" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title text-wood" id="transfer-session-title">Migrate Player Session</h3>
        <button class="btn-modal-close" onclick="closeModal('modal-transfer-session')">&times;</button>
      </div>
      <form id="form-transfer-session">
        <input type="hidden" id="transfer-session-id" value="">
        <div class="modal-body space-y-4">
          <p class="text-sm text-slate-400">Migrate active player session to another station.</p>
          <div class="form-group">
            <label class="form-label" for="transfer-target-station">Select Target Station</label>
            <select id="transfer-target-station" class="form-control" required>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-transfer-session')">Cancel</button>
          <button type="submit" class="btn btn-accent hover-3d-lift">Transfer</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Merge Terminal → Dining Table Modal -->
  <div id="modal-merge-to-table" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-container max-w-md">
      <div class="modal-header">
        <h3 class="modal-title text-clay" id="merge-to-table-title">
          <i class="fa-solid fa-code-merge mr-2"></i>Merge to Dining Table
        </h3>
        <button class="btn-modal-close" onclick="closeModal('modal-merge-to-table')">&times;</button>
      </div>
      <form id="form-merge-to-table">
        <input type="hidden" id="merge-to-table-session-id" value="">
        <div class="modal-body space-y-4">
          <div class="bg-kraft border border-clay/30 rounded p-3 text-xs text-slate-300 space-y-1">
            <p class="font-bold text-clay font-cyber uppercase tracking-wider text-[10px]"><i class="fa-solid fa-circle-info mr-1"></i> How this works</p>
            <p>The terminal session time charge + any food orders will be <span class="text-wood font-semibold">moved to the selected dining table</span>. The terminal station will be freed immediately.</p>
            <p class="text-slate-400">Staff then checks out the <span class="text-wood font-semibold">dining table</span> to collect full payment in one go.</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="merge-to-table-target">Select Destination Dining Table</label>
            <select id="merge-to-table-target" class="form-control" required>
              <option value="">-- Loading... --</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-merge-to-table')">Cancel</button>
          <button type="submit" class="btn btn-accent hover-3d-lift">
            <i class="fa-solid fa-code-merge mr-1"></i> Confirm Merge
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Checkout Invoice Dialog Modal -->
  <div id="modal-checkout-session" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-container max-w-xl">
      <div class="modal-header">
        <h3 class="modal-title text-wood"><i class="fa-solid fa-receipt text-wood mr-2"></i>Billing Checkout</h3>
        <button class="btn-modal-close" onclick="closeModal('modal-checkout-session')">&times;</button>
      </div>
      <form id="form-checkout-session">
        <input type="hidden" id="checkout-session-id" value="">
        <div class="modal-body space-y-6">
          
          <!-- Receipt Layout -->
          <div class="bg-cream p-6 border border-slate-800 rounded font-mono text-xs text-slate-500 relative" id="printable-receipt-area">
            <div class="text-center border-b border-dashed border-slate-800 pb-4 mb-4">
              <h4 class="text-base font-bold text-wood font-cyber tracking-widest uppercase" id="rcpt-business-name"><?php echo SITE_NAME; ?></h4>
              <p class="text-[10px] text-slate-400 font-cyber tracking-wide" id="rcpt-business-address"><?php echo SITE_ADDRESS; ?></p>
              <p class="text-[10px] text-slate-400" id="rcpt-business-phone">TEL: <?php echo SITE_PHONE; ?></p>
            </div>
            
            <div class="space-y-1 mb-4">
              <div class="flex justify-between"><span>INVOICE NO:</span><span id="rcpt-invoice-no">#SESS-000</span></div>
              <div class="flex justify-between"><span>STATION:</span><span id="rcpt-station-name" class="font-bold text-slate-100">Station</span></div>
              <div class="flex justify-between"><span>PLAYER:</span><span id="rcpt-player-name">Guest</span></div>
              <div class="flex justify-between"><span>LOYALTY TIER:</span><span id="rcpt-loyalty-tier">Bronze (5% Disc)</span></div>
              <div class="flex justify-between"><span>TIME:</span><span id="rcpt-elapsed-time">60 Mins</span></div>
            </div>

            <!-- Items list -->
            <div class="border-t border-dashed border-slate-800 pt-3 mb-4 space-y-2">
              <div class="grid grid-cols-12 gap-1 font-bold text-slate-100 mb-2">
                <span class="col-span-6">DESCRIPTION</span>
                <span class="col-span-2 text-center">QTY</span>
                <span class="col-span-2 text-right">RATE</span>
                <span class="col-span-2 text-right">TOTAL</span>
              </div>
              
              <div class="grid grid-cols-12 gap-1 text-slate-500">
                <span class="col-span-6" id="rcpt-game-desc">Game Session (Hourly billing)</span>
                <span class="col-span-2 text-center" id="rcpt-game-qty">1</span>
                <span class="col-span-2 text-right" id="rcpt-game-rate">₹0.00</span>
                <span class="col-span-2 text-right font-bold text-slate-100" id="rcpt-game-cost">₹0.00</span>
              </div>
              <div id="rcpt-terminal-items-container" class="space-y-1 border-t border-dashed border-slate-800 pt-2 mt-2" style="display: none;">
                <!-- Merged terminal charges go here -->
              </div>
              <div id="rcpt-cafe-items-container" class="space-y-1 border-t border-dashed border-slate-800 pt-2 mt-2">
              </div>
            </div>

            <!-- Totals -->
            <div class="border-t border-dashed border-slate-800 pt-3 space-y-1">
              <div class="flex justify-between"><span>SUBTOTAL:</span><span id="rcpt-subtotal">₹0.00</span></div>
              <div class="flex justify-between text-clay"><span>DISCOUNT:</span><span id="rcpt-discount">-₹0.00</span></div>
              <div class="flex justify-between"><span id="rcpt-tax-label">TAX/GST (10%):</span><span id="rcpt-tax">₹0.00</span></div>
              <div class="flex justify-between text-base font-bold text-slate-100 border-t border-dashed border-slate-800 pt-2 mt-2">
                <span>INVOICE TOTAL:</span><span id="rcpt-total" class="text-wood">₹0.00</span>
              </div>
            </div>
            
            <div class="text-center border-t border-dashed border-slate-800 pt-4 mt-6 text-[10px] text-slate-400">
              <p id="rcpt-footer"><?php echo SITE_RECEIPT_FOOTER; ?></p>
            </div>
          </div>

          <!-- Checkout Actions & Coupons -->
          <div class="space-y-4 no-print">
            <div class="grid grid-cols-2 gap-4">
              <div class="form-group mb-0">
                <label class="form-label">Apply Promo Coupon</label>
                <div class="flex gap-2">
                  <input type="text" id="checkout-coupon-code" class="form-control" placeholder="WELCOME10">
                  <button type="button" onclick="applyCoupon()" class="btn btn-secondary py-2 hover-3d-push">Apply</button>
                </div>
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Payment Method</label>
                <select id="checkout-payment-method" class="form-control">
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="PlayHours">Play Hours</option>
                  <option value="Split">Split Payment</option>
                </select>
              </div>
            </div>

            <!-- Player Phone Number & Merge Table Options -->
            <div class="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/40">
              <div class="form-group mb-0" id="checkout-phone-section">
                <label class="form-label text-xs uppercase tracking-wider block font-cyber text-wood">Player Phone (Optional)</label>
                <input type="text" id="checkout-customer-phone" class="form-control" placeholder="e.g. +919876543210" list="checkout-players-list">
                <datalist id="checkout-players-list"></datalist>
              </div>
              <div class="form-group mb-0" id="checkout-merge-table-section">
                <label class="form-label text-xs uppercase tracking-wider block font-cyber text-wood">Or Merge to Dining Table</label>
                <select id="checkout-merge-table-id" class="form-control">
                  <option value="">-- No Transfer --</option>
                </select>
              </div>
            </div>

            <div id="split-payment-inputs" style="display: none;" class="p-3 bg-kraft border border-slate-800 rounded grid grid-cols-2 gap-4">
              <div class="form-group mb-0">
                <label class="form-label">Debit from Play Hours (Hrs)</label>
                <input type="number" step="0.01" min="0" id="checkout-split-play-hours" class="form-control" value="0.00">
                <span class="text-[10px] text-slate-500">Available: <span id="checkout-available-play-hours">0.00</span> Hours</span>
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
          <button type="button" onclick="window.print()" class="btn btn-success hover-3d-push"><i class="fa-solid fa-print"></i> Print</button>
          <button type="submit" class="btn btn-primary hover-3d-lift">Confirm Payment</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Prepaid Confirmation Modal -->
  <div id="modal-prepaid-confirm" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-container max-w-md">
      <div class="modal-header bg-cream">
        <h3 class="modal-title font-cyber text-wood uppercase flex items-center gap-2">
          <i class="fa-solid fa-cash-register text-wood"></i>
          <span>Prepaid Receipt</span>
        </h3>
        <button class="btn-modal-close" type="button" onclick="closeModal('modal-prepaid-confirm')">&times;</button>
      </div>
      <form id="form-prepaid-confirm">
        <div class="modal-body space-y-4">
          <div class="bg-cream p-4 border border-slate-800 rounded font-mono text-xs text-slate-500">
            <div class="text-center border-b border-dashed border-slate-800 pb-2 mb-3">
              <h4 class="text-sm font-bold text-wood font-cyber tracking-widest uppercase"><?php echo SITE_NAME; ?></h4>
              <p class="text-[9px] text-slate-400 font-cyber tracking-wide">PREPAID PAYMENT</p>
            </div>
            <div class="space-y-1 mb-3">
              <div class="flex justify-between"><span>STATION:</span><span id="prepaid-rcpt-station" class="font-bold text-slate-100">-</span></div>
              <div class="flex justify-between"><span>PLAYER:</span><span id="prepaid-rcpt-player">-</span></div>
              <div class="flex justify-between"><span>LOYALTY:</span><span id="prepaid-rcpt-tier">-</span></div>
              <div class="flex justify-between"><span>DURATION:</span><span id="prepaid-rcpt-duration">-</span></div>
            </div>
            <div class="border-t border-dashed border-slate-800 pt-2 space-y-1">
              <div class="flex justify-between"><span>SUBTOTAL:</span><span id="prepaid-rcpt-subtotal">₹0.00</span></div>
              <div class="flex justify-between text-clay"><span>DISCOUNT:</span><span id="prepaid-rcpt-discount">-₹0.00</span></div>
              <div class="flex justify-between"><span id="prepaid-rcpt-tax-label">TAX/GST (10%):</span><span id="prepaid-rcpt-tax">₹0.00</span></div>
              <div class="flex justify-between text-sm font-bold text-slate-100 border-t border-dashed border-slate-800 pt-2 mt-2">
                <span>TOTAL:</span><span id="prepaid-rcpt-total" class="text-wood">₹0.00</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="prepaid-payment-method">Payment Method</label>
            <select id="prepaid-payment-method" class="form-control">
              <option value="Cash">Cash</option>
              <option value="Card">Credit/Debit Card</option>
              <option value="PlayHours">Play Hours</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-prepaid-confirm')">Cancel</button>
          <button type="submit" class="btn btn-primary hover-3d-lift">Collect Payment & Start</button>
        </div>
      </form>
    </div>
  </div>

<!-- Food & Drinks Quick Order Modal -->
<div id="food-modal-dash" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container max-w-3xl">
    <div class="modal-header">
      <h3 class="modal-title text-wood"><i class="fa-solid fa-utensils mr-2 text-clay"></i>Fuel Bar - Quick Order</h3>
      <button class="btn-modal-close" onclick="closeFoodModalDash()">&times;</button>
    </div>
    <div class="modal-body space-y-4">
      <p class="text-xs text-slate-400">Select items to order for the customer.</p>
      
      <!-- Category Tabs -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap pb-2 border-b border-slate-800" id="food-categories-tabs-dash" style="-ms-overflow-style: none; scrollbar-width: none;">
        <!-- Populated dynamically -->
      </div>

      <div class="grid grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1" id="food-items-grid-dash">
        <div class="col-span-3 text-center text-slate-500 py-6">
          <i class="fa-solid fa-spinner fa-spin mr-1"></i> Loading catalog...
        </div>
      </div>

      <div class="border-t border-slate-800 pt-4">
        <h4 class="text-xs font-bold text-wood uppercase tracking-wider mb-2">Order Summary</h4>
        <div id="food-cart-dash" class="space-y-1 min-h-[40px]">
          <p class="text-xs text-slate-400 italic">Click items above to add.</p>
        </div>
        <div class="flex justify-between items-center mt-3 pt-3 border-t border-slate-800">
          <span class="text-xs font-bold text-slate-100">Total: ₹<span id="food-cart-total-dash">0.00</span></span>
          <button onclick="clearFoodCartDash()" class="text-[10px] text-rust hover:underline">Clear</button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="closeFoodModalDash()">Cancel</button>
      <button type="button" onclick="submitFoodOrderDash()" class="btn btn-accent hover-3d-lift">
        <i class="fa-solid fa-paper-plane mr-1"></i> Send Order
      </button>
    </div>
  </div>
</div>

<script>
let foodCartDash = [];
let foodCartSessionId = null;
let allInventoryDash = [];
let allCategoriesDash = [];
let activeCategoryTabDash = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
  loadInventoryDash();
});

async function loadInventoryDash() {
  try {
    const catData = await apiFetch('/categories');
    if (catData.success) {
      allCategoriesDash = catData.categories;
    }

    const data = await apiFetch('/inventory');
    if (data.success && data.inventory) {
      allInventoryDash = data.inventory.filter(item => item.id !== 999 && item.id !== 1000 && (item.type === 'Snack' || item.type === 'Drink'));
      
      const usedCategoryIds = new Set(allInventoryDash.map(item => item.category_id).filter(id => id !== null));
      allCategoriesDash = allCategoriesDash.filter(cat => usedCategoryIds.has(cat.id));

      renderCategoryTabsDash();
      renderFoodItemsDash();
    }
  } catch (err) {
    console.error('Failed to load dashboard food items:', err);
    const grid = document.getElementById('food-items-grid-dash');
    if (grid) {
      grid.innerHTML = `<div class="col-span-3 text-center text-rust py-6">Error loading food menu.</div>`;
    }
  }
}

function renderCategoryTabsDash() {
  const container = document.getElementById('food-categories-tabs-dash');
  if (!container) return;
  container.innerHTML = '';

  const allTab = document.createElement('button');
  allTab.className = `status-chip px-4 py-1.5 rounded-full text-xs font-cyber transition shrink-0 ${activeCategoryTabDash === 'ALL' ? 'active bg-wood text-cream border-2 border-wood shadow-sm' : 'bg-kraft border-2 border-slate-800/40 text-slate-400 hover:border-wood hover:text-wood'}`;
  allTab.innerHTML = `📋 All`;
  allTab.onclick = () => {
    activeCategoryTabDash = 'ALL';
    renderCategoryTabsDash();
    renderFoodItemsDash();
  };
  container.appendChild(allTab);

  allCategoriesDash.forEach(cat => {
    const tab = document.createElement('button');
    const isActive = activeCategoryTabDash === cat.id;
    tab.className = `status-chip px-4 py-1.5 rounded-full text-xs font-cyber transition shrink-0 ${isActive ? 'active bg-wood text-cream border-2 border-wood shadow-sm' : 'bg-kraft border-2 border-slate-800/40 text-slate-400 hover:border-wood hover:text-wood'}`;
    tab.innerHTML = `${cat.icon} ${cat.name}`;
    tab.onclick = () => {
      activeCategoryTabDash = cat.id;
      renderCategoryTabsDash();
      renderFoodItemsDash();
    };
    container.appendChild(tab);
  });

  const hasUncategorized = allInventoryDash.some(item => !item.category_id);
  if (hasUncategorized) {
    const uncatTab = document.createElement('button');
    const isActive = activeCategoryTabDash === 'UNCATEGORIZED';
    uncatTab.className = `status-chip px-4 py-1.5 rounded-full text-xs font-cyber transition shrink-0 ${isActive ? 'active bg-wood text-cream border-2 border-wood shadow-sm' : 'bg-kraft border-2 border-slate-800/40 text-slate-400 hover:border-wood hover:text-wood'}`;
    uncatTab.innerHTML = `📦 Uncategorized`;
    uncatTab.onclick = () => {
      activeCategoryTabDash = 'UNCATEGORIZED';
      renderCategoryTabsDash();
      renderFoodItemsDash();
    };
    container.appendChild(uncatTab);
  }
}

function renderFoodItemsDash() {
  const grid = document.getElementById('food-items-grid-dash');
  if (!grid) return;
  grid.innerHTML = '';

  let filtered = allInventoryDash;
  if (activeCategoryTabDash === 'UNCATEGORIZED') {
    filtered = allInventoryDash.filter(item => !item.category_id);
  } else if (activeCategoryTabDash !== 'ALL') {
    filtered = allInventoryDash.filter(item => item.category_id === activeCategoryTabDash);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-3 text-center text-slate-500 py-6">No food items available.</div>`;
    return;
  }

  filtered.forEach(item => {
    let icon = item.category_icon || (item.type === 'Drink' ? '🥤' : '🍿');
    const isOutOfStock = item.stock_qty <= 0;

    const card = document.createElement('div');
    if (isOutOfStock) {
      card.className = 'food-item-dash bg-kraft/40 border border-slate-800 rounded p-3 flex flex-col items-center text-center opacity-40 cursor-not-allowed';
    } else {
      card.className = 'food-item-dash bg-kraft border border-slate-800 rounded p-3 flex flex-col items-center text-center cursor-pointer hover:border-clay transition hover-3d-float';
      card.onclick = () => addToFoodCartDash(item.id, item.name, parseFloat(item.price), icon);
    }
    card.innerHTML = `
      <span class="text-2xl">${icon}</span>
      <span class="text-xs font-bold text-slate-100 mt-1">${item.name}</span>
      <span class="text-[10px] text-clay font-bold">₹${parseFloat(item.price).toFixed(2)}</span>
      <span class="text-[9px] ${isOutOfStock ? 'text-rust font-bold mt-0.5' : 'text-slate-500'}">${isOutOfStock ? 'OUT OF STOCK' : `Stock: ${item.stock_qty}`}</span>
    `;
    grid.appendChild(card);
  });
}

function addToFoodCartDash(id, name, price, icon) {
  const existing = foodCartDash.find(item => item.id === id);
  if (existing) {
    existing.qty++;
  } else {
    foodCartDash.push({ id, name, price, icon, qty: 1 });
  }
  renderFoodCartDash();
}

function openFoodModalDashForSession(sessionId) {
  foodCartSessionId = sessionId;
  document.getElementById('food-modal-dash').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFoodModalDash() {
  document.getElementById('food-modal-dash').classList.remove('active');
  document.body.style.overflow = '';
}

function renderFoodCartDash() {
  const cart = document.getElementById('food-cart-dash');
  const total = document.getElementById('food-cart-total-dash');
  if (foodCartDash.length === 0) {
    cart.innerHTML = '<p class="text-xs text-slate-400 italic">Click items above to add.</p>';
    total.innerText = '0.00';
    return;
  }
  let html = '';
  let sum = 0;
  foodCartDash.forEach(item => {
    sum += item.price * item.qty;
    html += `<div class="flex justify-between items-center text-xs bg-kraft px-2 py-1 rounded">
      <span>${item.icon} ${item.name} x${item.qty}</span>
      <span class="flex items-center gap-2">
        <span class="text-clay font-bold">₹${(item.price * item.qty).toFixed(2)}</span>
        <button onclick="removeFoodDash(${item.id})" class="text-rust hover:text-slate-100 text-sm">&times;</button>
      </span>
    </div>`;
  });
  cart.innerHTML = html;
  total.innerText = sum.toFixed(2);
}

function removeFoodDash(id) {
  const idx = foodCartDash.findIndex(item => item.id === id);
  if (idx > -1) {
    if (foodCartDash[idx].qty > 1) foodCartDash[idx].qty--;
    else foodCartDash.splice(idx, 1);
  }
  renderFoodCartDash();
}

function clearFoodCartDash() {
  foodCartDash = [];
  renderFoodCartDash();
}

async function submitFoodOrderDash() {
  if (foodCartDash.length === 0) { showToast('Add at least one item', 'error'); return; }
  
  if (!foodCartSessionId) {
    showToast('Direct sale from dashboard is not supported. Please use the Cafe POS page.', 'error');
    return;
  }

  const items = foodCartDash.map(i => ({ itemId: i.id, quantity: i.qty }));
  
  try {
    const response = await apiFetch('/pos/checkout', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: foodCartSessionId,
        playerId: null,
        saleType: 'SessionBill',
        items: items
      })
    });

    if (response.success) {
      showToast('Food items successfully billed to active session!', 'success');
      foodCartDash = [];
      foodCartSessionId = null;
      renderFoodCartDash();
      closeFoodModalDash();
      // Reload stations status grid to show updated session cost
      if (typeof loadStations === 'function') {
        loadStations();
      }
    }
  } catch (err) {
    showToast(`Error ordering food: ${err.message}`, 'error');
  }
}

</script>

<?php
include 'footer.php';
?>
