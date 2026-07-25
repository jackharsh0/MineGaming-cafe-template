<?php
include 'header.php';
if ($role !== 'SuperAdmin') {
    header("Location: dashboard.php");
    exit();
}
?>
<div class="space-y-6">
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
    <button type="button" data-tab="billing" class="settings-tab-btn px-4 py-2 rounded-t text-xs font-cyber uppercase tracking-wider transition bg-kraft text-slate-400 hover:bg-wood/30">Billing</button>
    <button type="button" data-tab="notifications" class="settings-tab-btn px-4 py-2 rounded-t text-xs font-cyber uppercase tracking-wider transition bg-kraft text-slate-400 hover:bg-wood/30">Notifications</button>
    <button type="button" data-tab="security" class="settings-tab-btn px-4 py-2 rounded-t text-xs font-cyber uppercase tracking-wider transition bg-kraft text-slate-400 hover:bg-wood/30">Security</button>
    <button type="button" data-tab="receipt" class="settings-tab-btn px-4 py-2 rounded-t text-xs font-cyber uppercase tracking-wider transition bg-kraft text-slate-400 hover:bg-wood/30">Receipt</button>
    <button type="button" data-tab="system" class="settings-tab-btn px-4 py-2 rounded-t text-xs font-cyber uppercase tracking-wider transition bg-kraft text-slate-400 hover:bg-wood/30">System</button>
  </div>

  <!-- TAB: BRAND -->
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
      <div class="form-group"><label class="form-label">Invoice Prefix</label><input id="brand-invoice-prefix" class="form-control w-32" placeholder="INV-"></div>
      <div class="col-span-2 form-group"><label class="form-label">Receipt Footer Message</label><input id="brand-receipt-footer" class="form-control" placeholder="Thank you for playing!"></div>
      <div class="col-span-2 form-group"><label class="form-label">Copyright Text</label><input id="brand-copyright" class="form-control" placeholder="All rights reserved."></div>
    </div>

    <h3 class="text-md font-bold text-wood mt-6 mb-3 border-t border-slate-800 pt-4">Appearance</h3>
    <div class="grid grid-cols-2 gap-4 max-w-lg">
      <div class="form-group"><label class="form-label">Primary Color</label><div class="flex gap-2 items-center"><input type="color" id="brand-primary-color" class="w-10 h-10 rounded border border-slate-800 cursor-pointer"><input type="text" id="brand-primary-color-text" class="form-control w-28" placeholder="#5c4033" oninput="document.getElementById('brand-primary-color').value=this.value"></div></div>
      <div class="form-group"><label class="form-label">Secondary Color</label><div class="flex gap-2 items-center"><input type="color" id="brand-secondary-color" class="w-10 h-10 rounded border border-slate-800 cursor-pointer"><input type="text" id="brand-secondary-color-text" class="form-control w-28" placeholder="#a0522d" oninput="document.getElementById('brand-secondary-color').value=this.value"></div></div>
      <div class="form-group"><label class="form-label">Font Family</label>
        <select id="brand-font-family" class="form-control">
          <option value="Inter">Inter</option>
          <option value="Poppins">Poppins</option>
          <option value="Roboto">Roboto</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Playfair Display">Playfair Display</option>
          <option value="System UI">System UI</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Favicon</label><input type="file" id="favicon-upload" accept="image/png,image/x-icon" class="text-xs text-slate-400"></div>
    </div>
    <div class="mt-6"><button onclick="saveTab('brand')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Brand Settings</button></div>
  </div>

  <!-- TAB: WEBSITE -->
  <div id="tab-website" class="settings-tab-pane hidden bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-globe"></i> Public Website</h2>
    <div class="grid grid-cols-2 gap-4 max-w-3xl">
      <div class="col-span-2 form-group"><label class="form-label">Hero Title</label><input id="web-hero-title" class="form-control" placeholder="Where Console Meets the Felt"></div>
      <div class="col-span-2 form-group"><label class="form-label">Hero Subtitle</label><textarea id="web-hero-subtitle" class="form-control h-20" placeholder="PlayStation 5, Xbox Series X..."></textarea></div>
      <div class="col-span-2 form-group"><label class="form-label">About Text</label><textarea id="web-about-text" class="form-control h-20" placeholder="Describe your lounge..."></textarea></div>
      <div class="col-span-2 form-group"><label class="form-label">Fuel Bar Text</label><textarea id="web-fuel-bar-text" class="form-control h-20" placeholder="Order snacks and drinks..."></textarea></div>
      <div class="form-group"><label class="form-label">Theme Mode</label>
        <select id="web-theme-mode" class="form-control">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="auto">Auto (system)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Contact Form Email</label><input id="web-contact-email" class="form-control" placeholder="bookings@soleila.in"></div>
      <div class="col-span-2 form-group"><label class="form-label">Hero Video URL (replaces hero image)</label><input id="web-hero-video" class="form-control" placeholder="https://example.com/hero.mp4"></div>
      <div class="form-group"><label class="form-label">Hero Overlay Opacity</label><input type="range" id="web-hero-overlay" min="0" max="1" step="0.05" class="w-full accent-wood"><span id="web-hero-overlay-val" class="text-xs text-slate-400">0.4</span></div>
    </div>

    <h3 class="text-md font-bold text-wood mt-6 mb-3 border-t border-slate-800 pt-4">Announcement Banner</h3>
    <div class="grid grid-cols-2 gap-4 max-w-3xl">
      <div class="col-span-2 form-group"><label class="form-label">Banner Text</label><input id="web-announcement" class="form-control" placeholder="Holiday special! 20% off all sessions this week"></div>
      <div class="form-group"><label class="form-label"><input type="checkbox" id="web-announcement-enabled" class="accent-wood mr-1"> Show Announcement</label></div>
      <div class="form-group"><label class="form-label"><input type="checkbox" id="web-cookie-consent" class="accent-wood mr-1"> Show Cookie Consent Banner</label></div>
    </div>

    <h3 class="text-md font-bold text-wood mt-6 mb-3 border-t border-slate-800 pt-4">Social Media Links</h3>
    <div class="grid grid-cols-2 gap-4 max-w-lg">
      <div class="form-group"><label class="form-label"><i class="fa-brands fa-instagram"></i> Instagram</label><input id="social-instagram" class="form-control" placeholder="https://instagram.com/soleila"></div>
      <div class="form-group"><label class="form-label"><i class="fa-brands fa-facebook"></i> Facebook</label><input id="social-facebook" class="form-control" placeholder="https://facebook.com/soleila"></div>
      <div class="form-group"><label class="form-label"><i class="fa-brands fa-twitter"></i> Twitter / X</label><input id="social-twitter" class="form-control" placeholder="https://twitter.com/soleila"></div>
      <div class="form-group"><label class="form-label"><i class="fa-brands fa-youtube"></i> YouTube</label><input id="social-youtube" class="form-control" placeholder="https://youtube.com/@soleila"></div>
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

    <h3 class="text-md font-bold text-wood mt-6 mb-3 border-t border-slate-800 pt-4">Default Food & Drink Items</h3>
    <div id="food-items-list" class="space-y-2 max-w-xl mb-3"></div>
    <button type="button" onclick="addDefaultFoodItem()" class="btn btn-secondary btn-sm"><i class="fa-solid fa-plus mr-1"></i> Add Item</button>

    <div class="mt-6"><button onclick="saveTab('website')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Website Settings</button></div>
  </div>

  <!-- TAB: STATIONS -->
  <div id="tab-stations" class="settings-tab-pane hidden bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-desktop"></i> Station Configuration</h2>

    <h3 class="text-sm font-bold text-wood mb-2">Display Name Overrides</h3>
    <p class="text-xs text-slate-400 mb-3">How station types appear on the public site.</p>
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

    <h3 class="text-sm font-bold text-wood mb-3 mt-6 border-t border-slate-800 pt-4">Station Behavior</h3>
    <div class="grid grid-cols-2 gap-4 max-w-lg">
      <div class="form-group"><label class="form-label">Naming Pattern</label><input id="station-naming-pattern" class="form-control" placeholder="{type}-{n:02d}"></div>
      <div class="form-group"><label class="form-label">Default Hourly Rate (₹)</label><input type="number" step="0.01" id="station-default-rate" class="form-control" placeholder="5.00"></div>
      <div class="form-group"><label class="form-label">Min Billing (minutes)</label><input type="number" id="station-min-billing" class="form-control" placeholder="15"></div>
      <div class="form-group"><label class="form-label">Rounding Interval (min)</label><input type="number" id="station-rounding" class="form-control" placeholder="1"></div>
      <div class="form-group"><label class="form-label">Occupancy Refresh (seconds)</label><input type="number" id="station-refresh" class="form-control" placeholder="10"></div>
      <div class="form-group"><label class="form-label"><input type="checkbox" id="station-auto-lock" class="accent-wood mr-1"> Auto-lock expired prepaid sessions</label></div>
    </div>

    <div class="bg-kraft border border-slate-800 rounded p-4 text-xs text-slate-400 mt-4 space-y-2">
      <p><i class="fa-solid fa-arrow-right text-wood mr-1"></i> <strong>Which types appear</strong> on the public site: managed in <a href="billing.php" class="text-wood underline">Billing & Rates</a></p>
      <p><i class="fa-solid fa-arrow-right text-wood mr-1"></i> <strong>Hourly rates & coupons</strong>: also in <a href="billing.php" class="text-wood underline">Billing & Rates</a></p>
      <p><i class="fa-solid fa-arrow-right text-wood mr-1"></i> <strong>Add/remove stations</strong>: <a href="stations.php" class="text-wood underline">Stations page</a></p>
    </div>
    <div class="mt-6"><button onclick="saveTab('stations')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Station Settings</button></div>
  </div>

  <!-- TAB: BILLING -->
  <div id="tab-billing" class="settings-tab-pane hidden bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-hand-holding-dollar"></i> Billing & Pricing</h2>
    <div class="grid grid-cols-2 gap-4 max-w-lg">
      <div class="form-group"><label class="form-label">Tax Label</label>
        <select id="billing-tax-label" class="form-control">
          <option value="GST">GST</option>
          <option value="VAT">VAT</option>
          <option value="Sales Tax">Sales Tax</option>
          <option value="IVA">IVA</option>
          <option value="HST">HST</option>
          <option value="Tax">Tax</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Currency Position</label>
        <select id="billing-currency-position" class="form-control">
          <option value="before">₹100 (before)</option>
          <option value="after">100 ₹ (after)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Decimal Places</label>
        <select id="billing-decimal-places" class="form-control">
          <option value="2">2 (1.00)</option>
          <option value="0">0 (1)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Rounding Mode</label>
        <select id="billing-rounding-mode" class="form-control">
          <option value="nearest">Nearest</option>
          <option value="up">Always round up</option>
          <option value="down">Always round down</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Service Charge (%)</label><input type="number" step="0.01" id="billing-service-charge" class="form-control" placeholder="0"></div>
      <div class="form-group"><label class="form-label">Max Discount (%)</label><input type="number" step="1" id="billing-max-discount" class="form-control" placeholder="50"></div>
    </div>
    <div class="mt-6"><button onclick="saveTab('billing')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Billing Settings</button></div>
  </div>

  <!-- TAB: NOTIFICATIONS -->
  <div id="tab-notifications" class="settings-tab-pane hidden bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-bell"></i> Notifications & Alerts</h2>
    <div class="grid grid-cols-2 gap-4 max-w-lg">
      <div class="form-group"><label class="form-label"><input type="checkbox" id="notif-sound-enabled" class="accent-wood mr-1"> Sound Effects Enabled</label></div>
      <div class="form-group"><label class="form-label"><input type="checkbox" id="notif-checkout-bell" class="accent-wood mr-1"> Ring bell on checkout</label></div>
      <div class="form-group"><label class="form-label">Timer End Sound</label><input type="file" id="notif-timer-sound" accept="audio/mpeg" class="text-xs text-slate-400"><p class="text-[10px] text-slate-500">MP3 file for timer alerts</p></div>
      <div class="col-span-2 form-group"><label class="form-label">Slack Webhook URL (low-stock alerts)</label><input id="notif-slack-webhook" class="form-control" placeholder="https://hooks.slack.com/services/..."></div>
      <div class="col-span-2 form-group"><label class="form-label">Email for Daily Reports</label><input id="notif-email-alerts" class="form-control" placeholder="manager@soleila.in"></div>
      <div class="col-span-2 form-group"><label class="form-label">SMS API Key (Twilio / provider)</label><input id="notif-sms-key" class="form-control" placeholder="API key for SMS confirmations"></div>
    </div>
    <div class="mt-6"><button onclick="saveTab('notifications')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Notification Settings</button></div>
  </div>

  <!-- TAB: SECURITY -->
  <div id="tab-security" class="settings-tab-pane hidden bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-shield-halved"></i> Security & Access</h2>
    <div class="grid grid-cols-2 gap-4 max-w-lg">
      <div class="form-group"><label class="form-label">Session Timeout (minutes)</label><input type="number" id="sec-session-timeout" class="form-control" placeholder="120"></div>
      <div class="form-group"><label class="form-label">Max Login Attempts</label><input type="number" id="sec-max-login" class="form-control" placeholder="5"></div>
      <div class="col-span-2 form-group"><label class="form-label">Maintenance IP Whitelist (one per line)</label><textarea id="sec-ip-whitelist" class="form-control h-24" placeholder="127.0.0.1&#x0a;192.168.1.100"></textarea></div>
    </div>
    <div class="mt-6"><button onclick="saveTab('security')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Security Settings</button></div>
  </div>

  <!-- TAB: RECEIPT -->
  <div id="tab-receipt" class="settings-tab-pane hidden bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-receipt"></i> Print & Receipt</h2>
    <div class="grid grid-cols-2 gap-4 max-w-lg">
      <div class="form-group"><label class="form-label"><input type="checkbox" id="receipt-show-logo" class="accent-wood mr-1"> Show logo on receipts</label></div>
      <div class="form-group"><label class="form-label"><input type="checkbox" id="receipt-show-tax" class="accent-wood mr-1"> Show tax breakdown</label></div>
      <div class="form-group"><label class="form-label"><input type="checkbox" id="receipt-auto-print" class="accent-wood mr-1"> Auto-open print dialog on checkout</label></div>
      <div class="col-span-2 form-group"><label class="form-label">Custom Footer Message</label><textarea id="receipt-footer-msg" class="form-control h-20" placeholder="Thank you for visiting!"></textarea></div>
    </div>
    <div class="mt-6"><button onclick="saveTab('receipt')" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Receipt Settings</button></div>
  </div>

  <!-- TAB: SYSTEM -->
  <div id="tab-system" class="settings-tab-pane hidden bg-parchment border border-slate-800 rounded-lg p-6">
    <h2 class="text-lg font-bold text-wood mb-4 flex items-center gap-2"><i class="fa-solid fa-gear"></i> System & SEO</h2>
    <div class="grid grid-cols-2 gap-4 max-w-3xl">
      <div class="col-span-2 form-group"><label class="form-label">Browser Page Title</label><input id="sys-page-title" class="form-control" placeholder="Soleila - Premier Lounge"></div>
      <div class="col-span-2 form-group"><label class="form-label">Meta Description (SEO)</label><textarea id="sys-meta-desc" class="form-control h-20" placeholder="Premium gaming lounge..."></textarea></div>
      <div class="col-span-2 form-group"><label class="form-label">OG Image URL (social share preview)</label><input id="sys-og-image" class="form-control" placeholder="https://soleila.in/og-image.jpg"></div>
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
