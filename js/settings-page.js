let settingsData = {};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupTabNavigation();
  setupLogoUpload();
  setupColorSync();
  setupHeroOverlay();
});

function setupTabNavigation() {
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-tab-btn').forEach(b => {
        b.classList.remove('bg-wood', 'text-cream');
        b.classList.add('bg-kraft', 'text-slate-400');
      });
      btn.classList.remove('bg-kraft', 'text-slate-400');
      btn.classList.add('bg-wood', 'text-cream');
      document.querySelectorAll('.settings-tab-pane').forEach(p => p.classList.add('hidden'));
      const pane = document.getElementById('tab-' + btn.dataset.tab);
      if (pane) pane.classList.remove('hidden');
    });
  });
}

function setupColorSync() {
  document.querySelectorAll('input[type="color"]').forEach(picker => {
    const textInput = document.getElementById(picker.id + '-text');
    if (!textInput) return;
    picker.addEventListener('input', () => { textInput.value = picker.value; });
  });
}

function setupHeroOverlay() {
  const slider = document.getElementById('web-hero-overlay');
  const val = document.getElementById('web-hero-overlay-val');
  if (slider && val) {
    slider.addEventListener('input', () => { val.textContent = slider.value; });
  }
}

async function loadSettings() {
  try {
    const res = await apiFetch('/settings');
    if (res.success) {
      settingsData = res.settings;
      populateAllTabs();
    }
  } catch (err) {
    showToast('Failed to load settings: ' + err.message, 'error');
  }
}

function populateAllTabs() {
  const s = settingsData;
  if (!s) return;

  // Brand tab
  setVal('brand-business-name', s.brand?.business_name);
  setVal('brand-tagline', s.brand?.tagline);
  setVal('brand-address', s.brand?.address);
  setVal('brand-phone', s.brand?.phone);
  setVal('brand-email', s.brand?.email);
  setVal('brand-est-year', s.brand?.est_year);
  setVal('brand-currency', s.brand?.currency_symbol);
  setVal('brand-invoice-prefix', s.brand?.invoice_prefix);
  setVal('brand-receipt-footer', s.brand?.receipt_footer);
  setVal('brand-copyright', s.brand?.copyright_text);
  setVal('brand-primary-color', s.brand?.primary_color);
  setVal('brand-primary-color-text', s.brand?.primary_color);
  setVal('brand-secondary-color', s.brand?.secondary_color);
  setVal('brand-secondary-color-text', s.brand?.secondary_color);
  setVal('brand-font-family', s.brand?.font_family);
  if (s.brand?.logo_url) {
    const preview = document.getElementById('logo-preview');
    if (preview) { preview.src = BACKEND_URL + s.brand.logo_url; preview.classList.remove('hidden'); }
  }

  // Website tab
  setVal('web-hero-title', s.website?.hero_title);
  setVal('web-hero-subtitle', s.website?.hero_subtitle);
  setVal('web-about-text', s.website?.about_text);
  setVal('web-fuel-bar-text', s.website?.fuel_bar_text);
  setVal('web-holiday-mode', s.website?.holiday_mode);
  setVal('web-theme-mode', s.website?.theme_mode);
  setVal('web-hero-video', s.website?.hero_video_url);
  setVal('web-contact-email', s.website?.contact_form_email);
  setVal('web-announcement', s.website?.announcement_banner);
  setVal('web-announcement-enabled', s.website?.announcement_banner_enabled);
  setVal('web-cookie-consent', s.website?.cookie_consent_enabled);
  setVal('web-loyalty-bronze', s.website?.loyalty_tier_descriptions?.bronze);
  setVal('web-loyalty-silver', s.website?.loyalty_tier_descriptions?.silver);
  setVal('web-loyalty-gold', s.website?.loyalty_tier_descriptions?.gold);

  const overlay = document.getElementById('web-hero-overlay');
  const overlayVal = document.getElementById('web-hero-overlay-val');
  if (overlay && overlayVal && s.website?.hero_overlay_opacity != null) {
    overlay.value = s.website.hero_overlay_opacity;
    overlayVal.textContent = s.website.hero_overlay_opacity;
  }

  if (s.website?.social_links) {
    setVal('social-instagram', s.website.social_links.instagram);
    setVal('social-facebook', s.website.social_links.facebook);
    setVal('social-twitter', s.website.social_links.twitter);
    setVal('social-youtube', s.website.social_links.youtube);
  }

  if (s.website?.sections_visible) {
    Object.keys(s.website.sections_visible).forEach(key => {
      const el = document.getElementById('web-section-' + key);
      if (el) el.checked = !!s.website.sections_visible[key];
    });
  }
  if (s.website?.opening_hours) {
    Object.keys(s.website.opening_hours).forEach(day => {
      setVal('hours-' + day + '-open', s.website.opening_hours[day]?.open);
      setVal('hours-' + day + '-close', s.website.opening_hours[day]?.close);
    });
  }
  renderDefaultFoodItems(s.website?.default_food_items);

  // Stations tab
  if (s.stations?.display_names) {
    Object.keys(s.stations.display_names).forEach(type => {
      setVal('display-name-' + type.toLowerCase(), s.stations.display_names[type]);
    });
  }
  setVal('station-naming-pattern', s.stations?.naming_pattern);
  setVal('station-default-rate', s.stations?.default_hourly_rate);
  setVal('station-min-billing', s.stations?.minimum_billing_minutes);
  setVal('station-rounding', s.stations?.rounding_interval);
  setVal('station-refresh', s.stations?.occupancy_refresh_seconds);
  setVal('station-auto-lock', s.stations?.auto_lock_enabled);

  // Billing tab
  setVal('billing-tax-label', s.billing?.tax_label);
  setVal('billing-currency-position', s.billing?.currency_position);
  setVal('billing-decimal-places', s.billing?.decimal_places);
  setVal('billing-rounding-mode', s.billing?.rounding_mode);
  setVal('billing-service-charge', s.billing?.service_charge_percent);
  setVal('billing-max-discount', s.billing?.discount_max_percent);

  // Notifications tab
  setVal('notif-sound-enabled', s.notifications?.sound_enabled);
  setVal('notif-checkout-bell', s.notifications?.signal_bell_on_checkout);
  setVal('notif-slack-webhook', s.notifications?.slack_webhook_url);
  setVal('notif-email-alerts', s.notifications?.email_alerts);
  setVal('notif-sms-key', s.notifications?.sms_api_key);

  // Security tab
  setVal('sec-session-timeout', s.security?.session_timeout_minutes);
  setVal('sec-max-login', s.security?.max_login_attempts);
  setVal('sec-ip-whitelist', s.security?.maintenance_ip_whitelist);

  // Receipt tab
  setVal('receipt-show-logo', s.receipt?.show_logo);
  setVal('receipt-show-tax', s.receipt?.show_tax_breakdown);
  setVal('receipt-auto-print', s.receipt?.auto_print);
  setVal('receipt-footer-msg', s.receipt?.footer_message);

  // System tab
  setVal('sys-page-title', s.system?.page_title);
  setVal('sys-meta-desc', s.system?.meta_description);
  setVal('sys-og-image', s.system?.og_image_url);
  setVal('sys-maintenance', s.system?.maintenance_mode);
  setVal('sys-timezone', s.system?.timezone);
  setVal('sys-date-format', s.system?.date_format);
  setVal('sys-time-format', s.system?.time_format);
  setVal('sys-auto-backup', s.system?.auto_backup);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === 'checkbox') {
    el.checked = !!val;
  } else {
    el.value = val ?? '';
  }
}

function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  if (el.type === 'checkbox') return el.checked;
  return el.value;
}

// Default food items
function renderDefaultFoodItems(items) {
  const container = document.getElementById('food-items-list');
  if (!container) return;
  container.innerHTML = '';
  if (!items || !items.length) {
    container.innerHTML = '<p class="text-xs text-slate-500 italic">No default food items configured.</p>';
    return;
  }
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-kraft border border-slate-800 rounded p-2';
    row.innerHTML = `
      <input type="text" class="food-icon form-control w-12 text-center" value="${item.icon || '🥤'}" placeholder="🥤">
      <input type="text" class="food-name form-control flex-grow" value="${item.name || ''}" placeholder="Item name">
      <input type="number" step="0.01" class="food-price form-control w-24" value="${item.price || 0}" placeholder="0.00">
      <button type="button" class="text-rust hover:text-red-500 text-lg" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(row);
  });
}

function addDefaultFoodItem() {
  const container = document.getElementById('food-items-list');
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 bg-kraft border border-slate-800 rounded p-2';
  row.innerHTML = `
    <input type="text" class="food-icon form-control w-12 text-center" value="🥤" placeholder="🥤">
    <input type="text" class="food-name form-control flex-grow" value="" placeholder="Item name">
    <input type="number" step="0.01" class="food-price form-control w-24" value="0" placeholder="0.00">
    <button type="button" class="text-rust hover:text-red-500 text-lg" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(row);
}

// Save tab
async function saveTab(tabName) {
  const payload = {};

  if (tabName === 'brand') {
    payload.brand = {
      business_name: getVal('brand-business-name'),
      tagline: getVal('brand-tagline'),
      address: getVal('brand-address'),
      phone: getVal('brand-phone'),
      email: getVal('brand-email'),
      est_year: getVal('brand-est-year'),
      currency_symbol: getVal('brand-currency'),
      invoice_prefix: getVal('brand-invoice-prefix'),
      receipt_footer: getVal('brand-receipt-footer'),
      copyright_text: getVal('brand-copyright'),
      primary_color: getVal('brand-primary-color'),
      secondary_color: getVal('brand-secondary-color'),
      font_family: getVal('brand-font-family')
    };
  }

  if (tabName === 'website') {
    const hours = {};
    ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].forEach(day => {
      hours[day] = { open: getVal('hours-' + day + '-open'), close: getVal('hours-' + day + '-close') };
    });
    const sections = {};
    ['hero','live_status','pricing','booking','loyalty','cafe'].forEach(key => {
      sections[key] = !!document.getElementById('web-section-' + key)?.checked;
    });
    const items = [];
    document.querySelectorAll('#food-items-list > div').forEach(row => {
      const icon = row.querySelector('input:nth-child(1)')?.value || '🥤';
      const name = row.querySelector('input:nth-child(2)')?.value?.trim();
      const price = parseFloat(row.querySelector('input:nth-child(3)')?.value) || 0;
      if (name) items.push({ icon, name, price });
    });
    const socialLinks = {
      instagram: getVal('social-instagram'),
      facebook: getVal('social-facebook'),
      twitter: getVal('social-twitter'),
      youtube: getVal('social-youtube')
    };
    const heroOverlay = parseFloat(document.getElementById('web-hero-overlay')?.value) || 0.4;
    payload.website = {
      hero_title: getVal('web-hero-title'),
      hero_subtitle: getVal('web-hero-subtitle'),
      about_text: getVal('web-about-text'),
      fuel_bar_text: getVal('web-fuel-bar-text'),
      opening_hours: hours,
      sections_visible: sections,
      holiday_mode: !!getVal('web-holiday-mode'),
      theme_mode: getVal('web-theme-mode'),
      hero_video_url: getVal('web-hero-video'),
      hero_overlay_opacity: heroOverlay,
      contact_form_email: getVal('web-contact-email'),
      announcement_banner: getVal('web-announcement'),
      announcement_banner_enabled: !!getVal('web-announcement-enabled'),
      cookie_consent_enabled: !!getVal('web-cookie-consent'),
      social_links: socialLinks,
      loyalty_tier_descriptions: {
        bronze: getVal('web-loyalty-bronze'),
        silver: getVal('web-loyalty-silver'),
        gold: getVal('web-loyalty-gold')
      },
      default_food_items: items
    };
  }

  if (tabName === 'stations') {
    const displayNames = {};
    document.querySelectorAll('.display-name-input').forEach(input => {
      displayNames[input.dataset.type] = input.value;
    });
    payload.stations = {
      display_names: displayNames,
      naming_pattern: getVal('station-naming-pattern'),
      default_hourly_rate: parseFloat(getVal('station-default-rate')) || 5,
      minimum_billing_minutes: parseInt(getVal('station-min-billing')) || 15,
      rounding_interval: parseInt(getVal('station-rounding')) || 1,
      occupancy_refresh_seconds: parseInt(getVal('station-refresh')) || 10,
      auto_lock_enabled: !!getVal('station-auto-lock')
    };
  }

  if (tabName === 'billing') {
    payload.billing = {
      tax_label: getVal('billing-tax-label'),
      currency_position: getVal('billing-currency-position'),
      decimal_places: parseInt(getVal('billing-decimal-places')) || 2,
      rounding_mode: getVal('billing-rounding-mode'),
      service_charge_percent: parseFloat(getVal('billing-service-charge')) || 0,
      discount_max_percent: parseInt(getVal('billing-max-discount')) || 50
    };
  }

  if (tabName === 'notifications') {
    payload.notifications = {
      sound_enabled: !!getVal('notif-sound-enabled'),
      signal_bell_on_checkout: !!getVal('notif-checkout-bell'),
      slack_webhook_url: getVal('notif-slack-webhook'),
      email_alerts: getVal('notif-email-alerts'),
      sms_api_key: getVal('notif-sms-key')
    };
  }

  if (tabName === 'security') {
    payload.security = {
      session_timeout_minutes: parseInt(getVal('sec-session-timeout')) || 120,
      max_login_attempts: parseInt(getVal('sec-max-login')) || 5,
      maintenance_ip_whitelist: getVal('sec-ip-whitelist')
    };
  }

  if (tabName === 'receipt') {
    payload.receipt = {
      show_logo: !!getVal('receipt-show-logo'),
      show_tax_breakdown: !!getVal('receipt-show-tax'),
      auto_print: !!getVal('receipt-auto-print'),
      footer_message: getVal('receipt-footer-msg')
    };
  }

  if (tabName === 'system') {
    payload.system = {
      page_title: getVal('sys-page-title'),
      meta_description: getVal('sys-meta-desc'),
      og_image_url: getVal('sys-og-image'),
      maintenance_mode: !!getVal('sys-maintenance'),
      timezone: getVal('sys-timezone'),
      date_format: getVal('sys-date-format'),
      time_format: getVal('sys-time-format'),
      auto_backup: !!getVal('sys-auto-backup')
    };
  }

  try {
    const res = await apiFetch('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (res.success) {
      settingsData = res.settings;
      showToast(tabName.charAt(0).toUpperCase() + tabName.slice(1) + ' settings saved!', 'success');
    }
  } catch (err) {
    showToast('Failed to save: ' + err.message, 'error');
  }
}

// Logo upload
function setupLogoUpload() {
  const input = document.getElementById('logo-upload');
  if (!input) return;
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await fetch(BACKEND_URL + '/api/settings/upload-logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        const preview = document.getElementById('logo-preview');
        if (preview) { preview.src = BACKEND_URL + data.url; preview.classList.remove('hidden'); }
        showToast('Logo uploaded!', 'success');
        await apiFetch('/settings', {
          method: 'PUT',
          body: JSON.stringify({ brand: { logo_url: data.url } })
        });
      }
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    }
  });
}
