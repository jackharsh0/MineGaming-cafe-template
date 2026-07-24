<?php
include 'header.php';
if ($role !== 'SuperAdmin') {
    header("Location: dashboard.php");
    exit();
}
?>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-wood flex items-center gap-2">
      <i class="fa-solid fa-sliders"></i>
      <span>System Settings</span>
    </h1>
    <span class="text-xs text-slate-400 font-cyber tracking-wider bg-kraft border border-slate-800 px-3 py-1 rounded">SUPERADMIN ONLY</span>
  </div>

  <!-- Tab Navigation -->
  <div class="flex flex-wrap gap-1 border-b border-slate-800 pb-0.5" id="settings-tabs">
    <button type="button" data-tab="brand" class="settings-tab-btn px-4 py-2 rounded-t text-xs font-cyber uppercase tracking-wider transition bg-wood text-cream">Brand</button>
    <button type="button" data-tab="website" class="settings-tab-btn px-4 py-2 rounded-t text-xs font-cyber uppercase tracking-wider transition bg-kraft text-slate-400 hover:bg-wood/30">Website</button>
    <button type="button" data-tab="stations" class="settings-tab-btn px-4 py-2 rounded-t text-xs font-cyber uppercase tracking-wider transition bg-kraft text-slate-400 hover:bg-wood/30">Stations</button>
    <button type="button" data-tab="system" class="settings-tab-btn px-4 py-2 rounded-t text-xs font-cyber uppercase tracking-wider transition bg-kraft text-slate-400 hover:bg-wood/30">System</button>
  </div>

  <!-- ──────── TAB: BRAND ──────── -->
  <div id="tab-brand" class="settings-tab-pane bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-store"></i> Brand & Business Info</h2>
    <div class="grid grid-cols-2 gap-4 max-w-3xl">
      <div class="col-span-2 flex items-center gap-4">
        <div class="w-16 h-16 rounded bg-kraft border border-slate-800 flex items-center justify-center overflow-hidden">
          <img id="logo-preview" class="hidden w-full h-full object-contain" src="" alt="Logo">
        </div>
        <div>
          <label class="form-label block text-xs font-cyber text-wood mb-1">Business Logo</label>
          <input type="file" id="logo-upload" accept="image/*" class="text-xs text-slate-400">
          <p class="text-[10px] text-slate-500 mt-0.5">Max 2MB. PNG or JPG.</p>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Business Name</label><input id="brand-business-name" class="form-control" placeholder="Soleila"></div>
      <div class="form-group"><label class="form-label">Tagline</label><input id="brand-tagline" class="form-control" placeholder="Jodhpur's Premier Lounge"></div>
      <div class="col-span-2 form-group"><label class="form-label">Address</label><input id="brand-address" class="form-control" placeholder="Sardarpura, Jodhpur"></div>
      <div class="form-group"><label class="form-label">Phone</label><input id="brand-phone" class="form-control" placeholder="+91 98765-43210"></div>
      <div class="form-group"><label class="form-label">Email</label><input id="brand-email" class="form-control" placeholder="hello@soleila.in"></div>
      <div class="form-group"><label class="form-label">Year Est.</label><input id="brand-est-year" class="form-control" placeholder="2024"></div>
      <div class="form-group"><label class="form-label">Currency Symbol</label><input id="brand-currency" class="form-control w-20" placeholder="₹"></div>
      <div class="col-span-2 form-group"><label class="form-label">Receipt Footer Message</label><input id="brand-receipt-footer" class="form-control" placeholder="Thank you for playing!"></div>
      <div class="col-span-2 form-group"><label class="form-label">Copyright Text</label><input id="brand-copyright" class="form-control" placeholder="All rights reserved."></div>
    </div>
    <div class="mt-6"><button onclick="saveTab('brand')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Brand Settings</button></div>
  </div>

  <!-- ──────── TAB: WEBSITE ──────── -->
  <div id="tab-website" class="settings-tab-pane hidden bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-globe"></i> Public Website Content</h2>
    <div class="grid grid-cols-2 gap-4 max-w-3xl">
      <div class="col-span-2 form-group"><label class="form-label">Hero Title</label><input id="web-hero-title" class="form-control" placeholder="Where Console Meets the Felt"></div>
      <div class="col-span-2 form-group"><label class="form-label">Hero Subtitle</label><textarea id="web-hero-subtitle" class="form-control h-20" placeholder="PlayStation 5, Xbox Series X..."></textarea></div>
      <div class="col-span-2 form-group"><label class="form-label">About Text</label><textarea id="web-about-text" class="form-control h-20" placeholder="Describe your lounge..."></textarea></div>
      <div class="col-span-2 form-group"><label class="form-label">Fuel Bar Text</label><textarea id="web-fuel-bar-text" class="form-control h-20" placeholder="Order snacks and drinks..."></textarea></div>
      <div class="form-group"><label class="form-label"><input type="checkbox" id="web-holiday-mode" class="accent-wood mr-1"> Holiday Mode (hide site)</label></div>
    </div>

    <h3 class="text-md font-bold text-wood mt-6 mb-3 border-t border-slate-800 pt-4">Section Visibility</h3>
    <div class="flex flex-wrap gap-4 mb-4">
      <label><input type="checkbox" id="web-section-hero" class="accent-wood mr-1"> Hero</label>
      <label><input type="checkbox" id="web-section-live_status" class="accent-wood mr-1"> Live Status</label>
      <label><input type="checkbox" id="web-section-pricing" class="accent-wood mr-1"> Pricing</label>
      <label><input type="checkbox" id="web-section-booking" class="accent-wood mr-1"> Booking</label>
      <label><input type="checkbox" id="web-section-loyalty" class="accent-wood mr-1"> Loyalty</label>
      <label><input type="checkbox" id="web-section-cafe" class="accent-wood mr-1"> Cafe</label>
    </div>

    <h3 class="text-md font-bold text-wood mt-6 mb-3 border-t border-slate-800 pt-4">Opening Hours</h3>
    <div class="grid grid-cols-2 gap-3 max-w-lg" id="hours-grid">
      <?php
      $days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      foreach ($days as $day):
      ?>
      <div class="bg-kraft border border-slate-800 rounded p-3">
        <label class="text-xs font-cyber text-wood uppercase block mb-1"><?php echo ucfirst($day); ?></label>
        <div class="flex gap-2 text-xs">
          <input type="time" id="hours-<?php echo $day; ?>-open" class="form-control w-full" value="10:00">
          <span class="text-slate-500 self-center">to</span>
          <input type="time" id="hours-<?php echo $day; ?>-close" class="form-control w-full" value="23:00">
        </div>
      </div>
      <?php endforeach; ?>
    </div>

    <h3 class="text-md font-bold text-wood mt-6 mb-3 border-t border-slate-800 pt-4">Loyalty Tier Descriptions</h3>
    <div class="grid grid-cols-3 gap-4 max-w-3xl">
      <div class="form-group"><label class="form-label">Bronze Tier</label><textarea id="web-loyalty-bronze" class="form-control h-20" placeholder="Standard level upon registration..."></textarea></div>
      <div class="form-group"><label class="form-label">Silver Tier</label><textarea id="web-loyalty-silver" class="form-control h-20" placeholder="Unlocked at 100 points..."></textarea></div>
      <div class="form-group"><label class="form-label">Gold Tier</label><textarea id="web-loyalty-gold" class="form-control h-20" placeholder="Unlocked at 300 points..."></textarea></div>
    </div>

    <h3 class="text-md font-bold text-wood mt-6 mb-3 border-t border-slate-800 pt-4">Default Food & Drink Items (public quick-order modal)</h3>
    <div id="food-items-list" class="space-y-2 max-w-xl mb-3"></div>
    <button type="button" onclick="addDefaultFoodItem()" class="btn btn-secondary btn-sm"><i class="fa-solid fa-plus mr-1"></i> Add Item</button>

    <div class="mt-6"><button onclick="saveTab('website')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Website Settings</button></div>
  </div>

  <!-- ──────── TAB: STATIONS ──────── -->
  <div id="tab-stations" class="settings-tab-pane hidden bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-desktop"></i> Station Configuration</h2>
    <h3 class="text-sm font-bold text-wood mb-2">Display Name Overrides</h3>
    <p class="text-xs text-slate-400 mb-3">Change how station types appear on the public site.</p>
    <div class="grid grid-cols-2 gap-3 max-w-lg mb-6">
      <?php
      $all_types = ['PC', 'PS5', 'PS4', 'Xbox', 'Pool', 'Dining', 'VR', 'Other'];
      foreach ($all_types as $type):
      ?>
      <div class="form-group">
        <label class="form-label text-[10px]"><?php echo $type; ?></label>
        <input type="text" data-type="<?php echo $type; ?>" class="display-name-input form-control" placeholder="<?php echo $type; ?>">
      </div>
      <?php endforeach; ?>
    </div>

    <div class="bg-kraft border border-slate-800 rounded p-4 text-xs text-slate-400 space-y-2">
      <p><i class="fa-solid fa-arrow-right text-wood mr-1"></i> <strong>Which types appear</strong> on the public site: managed in <a href="billing.php" class="text-wood underline">Billing & Rates</a></p>
      <p><i class="fa-solid fa-arrow-right text-wood mr-1"></i> <strong>Hourly rates & coupons</strong>: also in <a href="billing.php" class="text-wood underline">Billing & Rates</a></p>
      <p><i class="fa-solid fa-arrow-right text-wood mr-1"></i> <strong>Add/remove stations</strong>: <a href="stations.php" class="text-wood underline">Stations page</a></p>
    </div>
    <div class="mt-6"><button onclick="saveTab('stations')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Display Names</button></div>
  </div>

  <!-- ──────── TAB: SYSTEM ──────── -->
  <div id="tab-system" class="settings-tab-pane hidden bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-gear"></i> System & SEO</h2>
    <div class="grid grid-cols-2 gap-4 max-w-lg">
      <div class="col-span-2 form-group"><label class="form-label">Browser Page Title</label><input id="sys-page-title" class="form-control" placeholder="Soleila - Premier Lounge"></div>
      <div class="col-span-2 form-group"><label class="form-label">Meta Description (SEO)</label><textarea id="sys-meta-desc" class="form-control h-20" placeholder="Premium gaming lounge..."></textarea></div>
    </div>

    <h3 class="text-sm font-bold text-wood mb-3 mt-6 border-t border-slate-800 pt-4">Regional Settings</h3>
    <div class="grid grid-cols-3 gap-4 max-w-lg">
      <div class="form-group"><label class="form-label">Timezone</label><input id="sys-timezone" class="form-control" placeholder="Asia/Kolkata"></div>
      <div class="form-group"><label class="form-label">Date Format</label><input id="sys-date-format" class="form-control" placeholder="d/m/Y"></div>
      <div class="form-group"><label class="form-label">Time Format</label><input id="sys-time-format" class="form-control" placeholder="H:i"></div>
    </div>

    <h3 class="text-sm font-bold text-wood mb-3 mt-6 border-t border-slate-800 pt-4">Maintenance</h3>
    <div class="flex flex-wrap gap-4 mb-4">
      <label class="flex items-center gap-1.5"><input type="checkbox" id="sys-maintenance" class="accent-wood"> Maintenance Mode (hides public site)</label>
      <label class="flex items-center gap-1.5"><input type="checkbox" id="sys-auto-backup" class="accent-wood"> Auto daily backup</label>
    </div>

    <div class="mt-6"><button onclick="saveTab('system')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save System Settings</button></div>
  </div>
</div>

<script src="../js/settings-page.js"></script>

<?php include 'footer.php'; ?>
