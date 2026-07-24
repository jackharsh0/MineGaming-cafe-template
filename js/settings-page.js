let settingsData = {};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupTabNavigation();
  setupLogoUpload();
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
  setVal('brand-receipt-footer', s.brand?.receipt_footer);
  setVal('brand-copyright', s.brand?.copyright_text);
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
  setVal('web-loyalty-bronze', s.website?.loyalty_tier_descriptions?.bronze);
  setVal('web-loyalty-silver', s.website?.loyalty_tier_descriptions?.silver);
  setVal('web-loyalty-gold', s.website?.loyalty_tier_descriptions?.gold);
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

  // System tab
  setVal('sys-page-title', s.system?.page_title);
  setVal('sys-meta-desc', s.system?.meta_description);
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
      receipt_footer: getVal('brand-receipt-footer'),
      copyright_text: getVal('brand-copyright')
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
    payload.website = {
      hero_title: getVal('web-hero-title'),
      hero_subtitle: getVal('web-hero-subtitle'),
      about_text: getVal('web-about-text'),
      fuel_bar_text: getVal('web-fuel-bar-text'),
      opening_hours: hours,
      sections_visible: sections,
      holiday_mode: !!getVal('web-holiday-mode'),
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
    payload.stations = { display_names: displayNames };
  }

  if (tabName === 'system') {
    payload.system = {
      page_title: getVal('sys-page-title'),
      meta_description: getVal('sys-meta-desc'),
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
        // Save the URL into settings
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
