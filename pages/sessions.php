<?php
include 'header.php';
?>

<div class="bg-parchment border border-slate-800 rounded-lg p-6">
  <div class="section-header flex justify-between items-center mb-6">
    <h2 class="text-xl font-bold text-wood flex items-center gap-2">
      <i class="fa-solid fa-stopwatch"></i>
      <span>Active Sessions List</span>
    </h2>
    <a href="dashboard.php" class="btn btn-primary btn-sm">
      <i class="fa-solid fa-desktop mr-1"></i> Dashboard Layout
    </a>
  </div>

  <!-- Table list -->
  <div class="table-responsive">
    <table class="cyber-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Station</th>
          <th>Type</th>
          <th>Player</th>
          <th>Loyalty</th>
          <th>Start Time</th>
          <th>Billing Mode</th>
          <th>Accrued Cost</th>
          <th>Time Left / Elapsed</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="sessions-table-body">
        <tr>
          <td colspan="10" class="text-center py-6 text-slate-500">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i> Fetching active sessions...
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ==========================================
     SESSIONS MODALS (Shared from Dashboard)
     ========================================== -->

<!-- Time Extension Modal -->
<div id="modal-extend-session" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="extend-session-title">Extend Session</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-extend-session')">&times;</button>
    </div>
    <form id="form-extend-session">
      <input type="hidden" id="extend-session-id" value="">
      <div class="modal-body space-y-4">
        <p class="text-sm text-slate-400">Select an extension amount or custom duration below.</p>
        
        <div class="grid grid-cols-3 gap-2">
          <button type="button" onclick="setExtendVal(30)" class="bg-slate-900 border border-slate-700 py-2 rounded font-cyber text-sm hover:border-wood text-slate-100">+30 Min</button>
          <button type="button" onclick="setExtendVal(60)" class="bg-slate-900 border border-slate-700 py-2 rounded font-cyber text-sm hover:border-wood text-slate-100">+1 Hour</button>
          <button type="button" onclick="setExtendVal(120)" class="bg-slate-900 border border-slate-700 py-2 rounded font-cyber text-sm hover:border-wood text-slate-100">+2 Hours</button>
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
        <button type="submit" class="btn btn-primary">Extend Timer</button>
      </div>
    </form>
  </div>
</div>

<!-- Station Transfer Modal -->
<div id="modal-transfer-session" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="transfer-session-title">Migrate Player Session</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-transfer-session')">&times;</button>
    </div>
    <form id="form-transfer-session">
      <input type="hidden" id="transfer-session-id" value="">
      <div class="modal-body space-y-4">
        <p class="text-sm text-slate-400">Migrate active player session to another station.</p>
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

<!-- Checkout Invoice Dialog Modal -->
<div id="modal-checkout-session" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container max-w-xl">
    <div class="modal-header">
      <h3 class="modal-title"><i class="fa-solid fa-receipt text-wood mr-2"></i>Billing Checkout Invoice</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-checkout-session')">&times;</button>
    </div>
    <form id="form-checkout-session">
      <input type="hidden" id="checkout-session-id" value="">
      <div class="modal-body space-y-6">
        
        <div class="bg-slate-950 p-6 border border-slate-800 rounded font-mono text-xs text-slate-300 relative" id="printable-receipt-area">
          <div class="text-center border-b border-dashed border-slate-800 pb-4 mb-4">
            <h4 class="text-base font-bold text-wood font-cyber tracking-widest uppercase">SOLEILA</h4>
            <p class="text-[10px] text-slate-500 font-cyber tracking-wide">SARDARPURA, JODHPUR, RAJASTHAN</p>
          </div>
          
          <div class="space-y-1 mb-4">
            <div class="flex justify-between"><span>INVOICE NO:</span><span id="rcpt-invoice-no">#SESS-000</span></div>
            <div class="flex justify-between"><span>STATION:</span><span id="rcpt-station-name" class="font-bold text-slate-100">Station</span></div>
            <div class="flex justify-between"><span>PLAYER:</span><span id="rcpt-player-name">Guest</span></div>
            <div class="flex justify-between"><span>LOYALTY TIER:</span><span id="rcpt-loyalty-tier">Bronze</span></div>
            <div class="flex justify-between"><span>ELAPSED TIME:</span><span id="rcpt-elapsed-time">0 Mins</span></div>
          </div>

          <!-- Items list -->
          <div class="border-t border-dashed border-slate-800 pt-3 mb-4 space-y-2">
            <div class="grid grid-cols-12 gap-1 font-bold text-slate-100 mb-2">
              <span class="col-span-6">DESCRIPTION</span>
              <span class="col-span-2 text-center">QTY</span>
              <span class="col-span-2 text-right">RATE</span>
              <span class="col-span-2 text-right">TOTAL</span>
            </div>
            
            <div class="grid grid-cols-12 gap-1 text-slate-300">
              <span class="col-span-6" id="rcpt-game-desc">Game Session</span>
              <span class="col-span-2 text-center" id="rcpt-game-qty">1</span>
              <span class="col-span-2 text-right" id="rcpt-game-rate">₹0.00</span>
              <span class="col-span-2 text-right font-bold text-slate-100" id="rcpt-game-cost">₹0.00</span>
            </div>
            <div id="rcpt-terminal-items-container" class="space-y-1 border-t border-dashed border-slate-800 pt-2 mt-2" style="display: none;">
              <!-- Merged terminal charges -->
            </div>
            <div id="rcpt-cafe-items-container" class="space-y-1">
              <!-- Cafe items -->
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
        </div>

        <div class="space-y-4 no-print">
          <div class="grid grid-cols-2 gap-4">
            <div class="form-group mb-0">
              <label class="form-label">Apply Promo Coupon</label>
              <div class="flex gap-2">
                <input type="text" id="checkout-coupon-code" class="form-control" placeholder="WELCOME10">
                <button type="button" onclick="applyCoupon()" class="btn btn-secondary py-2">Apply</button>
              </div>
            </div>

            <div class="form-group mb-0">
              <label class="form-label">Payment Method</label>
              <select id="checkout-payment-method" class="form-control" onchange="togglePaymentInputs(this.value)">
                <option value="Cash">Cash</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="PlayHours">Play Hours</option>
                <option value="Split">Split Payment</option>
              </select>
            </div>
          </div>

          <div id="split-payment-inputs" style="display: none;" class="p-3 bg-slate-900 border border-slate-800 rounded grid grid-cols-2 gap-4">
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
        <button type="button" onclick="window.print()" class="btn btn-success"><i class="fa-solid fa-print"></i> Print</button>
        <button type="submit" class="btn btn-primary">Confirm Checkout</button>
      </div>
    </form>
  </div>
</div>

<?php
include 'footer.php';
?>
