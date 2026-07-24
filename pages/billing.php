<?php
include 'header.php';
if ($role !== 'SuperAdmin') {
    header("Location: dashboard.php");
    exit();
}
?>

<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
  <!-- Left Column: Pricing Rules (Managers only) -->
  <div class="col-span-1 xl:col-span-2 space-y-6">
    <div class="bg-parchment border border-slate-800 rounded-lg p-6">
      <div class="section-header mb-6">
        <h2 class="text-xl font-bold text-wood flex items-center gap-2">
          <i class="fa-solid fa-hand-holding-dollar"></i>
          <span>Hourly Rates Configuration</span>
        </h2>
      </div>

      <form id="form-hourly-rates">
        <div class="space-y-4" id="rates-rows-container">
          <!-- Loaded by JS -->
          <div class="py-6 text-center text-slate-500">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading base rules...
          </div>
        </div>

        <?php if ($role !== 'Attendant'): ?>
          <div class="mt-6 flex justify-end">
            <button type="submit" class="btn btn-primary">
              <i class="fa-solid fa-floppy-disk mr-1"></i> Save Pricing Rules
            </button>
          </div>
        <?php endif; ?>
      </form>
    </div>

    <!-- Global Settings card -->
    <div class="bg-parchment border border-slate-800 rounded-lg p-6 mt-6">
      <div class="section-header mb-6">
        <h2 class="text-xl font-bold text-brass flex items-center gap-2">
          <i class="fa-solid fa-gears"></i>
          <span>Global Billing & Loyalty Settings</span>
        </h2>
      </div>

      <form id="form-billing-settings">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="setting-tax-percent">Tax / GST Rate (%)</label>
            <input type="number" step="0.01" min="0" max="100" id="setting-tax-percent" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="setting-discount-bronze">Bronze Discount (%)</label>
            <input type="number" step="0.01" min="0" max="100" id="setting-discount-bronze" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="setting-discount-silver">Silver Discount (%)</label>
            <input type="number" step="0.01" min="0" max="100" id="setting-discount-silver" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="setting-discount-gold">Gold Discount (%)</label>
            <input type="number" step="0.01" min="0" max="100" id="setting-discount-gold" class="form-control" required>
          </div>
        </div>

        <div class="border-t border-slate-800 pt-4 mt-4">
          <h4 class="text-xs font-bold text-wood uppercase font-cyber tracking-wider mb-3">Station Type Visibility</h4>
          <p class="text-[10px] text-slate-400 mb-3">Toggle which station types appear on the public website.</p>
          <div class="flex flex-wrap gap-4" id="station-type-toggles">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="PC" class="station-toggle w-4 h-4 accent-wood">
              <span class="text-xs text-slate-100 font-semibold">PC</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="PS5" class="station-toggle w-4 h-4 accent-wood" checked>
              <span class="text-xs text-slate-100 font-semibold">PS5</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="PS4" class="station-toggle w-4 h-4 accent-wood" checked>
              <span class="text-xs text-slate-100 font-semibold">PS4</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="Xbox" class="station-toggle w-4 h-4 accent-wood" checked>
              <span class="text-xs text-slate-100 font-semibold">Xbox</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="Pool" class="station-toggle w-4 h-4 accent-wood" checked>
              <span class="text-xs text-slate-100 font-semibold">Pool</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="VR" class="station-toggle w-4 h-4 accent-wood" checked>
              <span class="text-xs text-slate-100 font-semibold">VR</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="Dining" class="station-toggle w-4 h-4 accent-wood" checked>
              <span class="text-xs text-slate-100 font-semibold">Dining</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="Other" class="station-toggle w-4 h-4 accent-wood" checked>
              <span class="text-xs text-slate-100 font-semibold">Other</span>
            </label>
          </div>
        </div>

        <?php if ($role !== 'Attendant'): ?>
          <div class="mt-6 flex justify-end">
            <button type="submit" class="btn btn-success">
              <i class="fa-solid fa-floppy-disk mr-1"></i> Save Settings
            </button>
          </div>
        <?php endif; ?>
      </form>
    </div>
  </div>

  <!-- Right Column: Promo Codes Coupon Engine -->
  <div class="bg-parchment border border-slate-800 rounded-lg p-6 flex flex-col h-[600px]">
    <div class="section-header flex justify-between items-center mb-6">
      <h3 class="text-lg font-bold font-cyber text-clay uppercase tracking-wider">
        <i class="fa-solid fa-ticket mr-2"></i>Coupon Codes
      </h3>
      <?php if ($role !== 'Attendant'): ?>
        <button onclick="triggerAddCoupon()" class="btn btn-secondary btn-sm">
          <i class="fa-solid fa-plus mr-1"></i> Create
        </button>
      <?php endif; ?>
    </div>

    <!-- Coupons List -->
    <div class="flex-grow overflow-y-auto space-y-3 pr-1" id="coupons-list-container">
      <!-- Loaded by JS -->
      <div class="py-6 text-center text-slate-500">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading coupons...
      </div>
    </div>
  </div>
</div>

<!-- ==========================================
     BILLING MODALS (Create Coupon)
     ========================================== -->
<div id="modal-coupon-create" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title">Create Promo Coupon</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-coupon-create')">&times;</button>
    </div>
    <form id="form-coupon-create">
      <div class="modal-body space-y-4">
        <div class="form-group">
          <label class="form-label" for="coupon-code">Promo Code (Uppercase)</label>
          <input type="text" id="coupon-code" class="form-control" placeholder="WELCOME10" required>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="coupon-discount-percent">Discount Percentage (%)</label>
            <input type="number" step="0.01" min="0" max="100" id="coupon-discount-percent" class="form-control" placeholder="10.00">
          </div>
          <div class="form-group">
            <label class="form-label" for="coupon-discount-flat">Or Flat Cash Discount (₹)</label>
            <input type="number" step="0.01" min="0" id="coupon-discount-flat" class="form-control" placeholder="5.00">
          </div>
        </div>
        <p class="text-[10px] text-slate-500 italic mt-0">Note: Provide either a percentage or a flat discount value, not both.</p>

        <div class="form-group">
          <label class="form-label" for="coupon-min-spend">Minimum Spend Threshold (₹)</label>
          <input type="number" step="1" min="0" value="0" id="coupon-min-spend" class="form-control" required>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-coupon-create')">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Coupon</button>
      </div>
    </form>
  </div>
</div>

<?php
include 'footer.php';
?>
