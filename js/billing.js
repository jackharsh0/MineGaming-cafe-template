// Billing and Pricing engine Client actions

document.addEventListener('DOMContentLoaded', () => {
  loadPricingRates();
  loadCouponsList();
  loadBillingSettings();
});

let systemRates = [];

async function loadPricingRates() {
  const container = document.getElementById('rates-rows-container');
  if (!container) return;

  try {
    const data = await apiFetch('/billing/rates');
    if (data.success) {
      systemRates = data.rates;
      container.innerHTML = '';

      systemRates.forEach(rate => {
        const div = document.createElement('div');
        div.className = 'p-4 bg-slate-900/30 border border-slate-800 rounded space-y-4';

        let addonLabel = rate.station_type === 'PS5' || rate.station_type === 'Xbox' ? 'Controller Add-on Rate (₹/hr)' : 'Gamepad Add-on (N/A)';
        let disableAddon = rate.station_type !== 'PS5' && rate.station_type !== 'Xbox' ? 'disabled' : '';

        // Only SuperAdmin can configure pricing
        const isSuperAdmin = window.CURRENT_USER_ROLE === 'SuperAdmin';
        const disabledAttr = !isSuperAdmin ? 'disabled' : '';

        div.innerHTML = `
          <div class="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 class="font-bold text-white font-cyber text-base tracking-wider">${rate.station_type} Terminals</h3>
            <span class="station-type-badge">${rate.station_type}</span>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group mb-0">
              <label class="form-label text-[10px]">Standard Rate (₹/hr)</label>
              <input type="number" step="0.50" min="0" value="${parseFloat(rate.hourly_rate).toFixed(2)}" 
                     class="form-control rate-standard" data-type="${rate.station_type}" ${disabledAttr} required>
            </div>
            
            <div class="form-group mb-0">
              <label class="form-label text-[10px]">${addonLabel}</label>
              <input type="number" step="0.25" min="0" value="${parseFloat(rate.controller_addon_rate).toFixed(2)}" 
                     class="form-control rate-addon" data-type="${rate.station_type}" ${disableAddon || disabledAttr} required>
            </div>
          </div>
        `;
        container.appendChild(div);
      });
    }
  } catch (err) {
    container.innerHTML = `
      <div class="py-6 text-center text-neonRed font-bold">Failed to load hourly pricing rules: ${err.message}</div>
    `;
  }
}

// Save pricing rules (Managers only)
const ratesForm = document.getElementById('form-hourly-rates');
if (ratesForm) {
  ratesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (window.CURRENT_USER_ROLE !== 'SuperAdmin') return;

    const ratesPayload = [];
    const types = ['PC', 'PS5', 'Xbox', 'VR', 'Other'];

    types.forEach(type => {
      const standardInput = document.querySelector(`.rate-standard[data-type="${type}"]`);
      if (!standardInput) return; // type not rendered

      const addonInput = document.querySelector(`.rate-addon[data-type="${type}"]`);

      ratesPayload.push({
        station_type: type,
        hourly_rate: parseFloat(standardInput.value),
        controller_addon_rate: parseFloat(addonInput.value || 0)
      });
    });

    try {
      await apiFetch('/billing/rates', {
        method: 'PUT',
        body: JSON.stringify({ rates: ratesPayload })
      });
      showToast('Pricing configurations saved!', 'success');
      loadPricingRates();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// Coupons actions
async function loadCouponsList() {
  const container = document.getElementById('coupons-list-container');
  if (!container) return;

  try {
    const data = await apiFetch('/billing/coupons');
    if (data.success) {
      container.innerHTML = '';
      if (data.coupons.length === 0) {
        container.innerHTML = '<div class="py-6 text-center text-slate-500 italic">No coupons logged.</div>';
        return;
      }

      data.coupons.forEach(coupon => {
        const div = document.createElement('div');
        div.className = 'p-3 bg-slate-900/40 border border-slate-800 rounded flex items-center justify-between';

        let valueStr = '';
        if (coupon.discount_percent) {
          valueStr = `${parseFloat(coupon.discount_percent)}% OFF`;
        } else if (coupon.discount_flat) {
          valueStr = `₹${parseFloat(coupon.discount_flat)} OFF`;
        }

        let details = `Min spend: ₹${parseFloat(coupon.min_spend)}`;

        div.innerHTML = `
          <div>
            <div class="font-bold text-white font-cyber text-sm tracking-wider flex items-center gap-2">
              <span class="text-neonPink">${coupon.code}</span>
              <span class="text-xs text-neonCyan">(${valueStr})</span>
            </div>
            <div class="text-[10px] text-slate-500">${details}</div>
          </div>
          <span class="badge ${coupon.active ? 'badge-green' : 'badge-red'}">${coupon.active ? 'Active' : 'Expired'}</span>
        `;
        container.appendChild(div);
      });
    }
  } catch (err) {
    container.innerHTML = '<div class="py-6 text-center text-neonRed">Failed to load coupons.</div>';
  }
}

function triggerAddCoupon() {
  document.getElementById('coupon-code').value = '';
  document.getElementById('coupon-discount-percent').value = '';
  document.getElementById('coupon-discount-flat').value = '';
  document.getElementById('coupon-min-spend').value = '0';
  openModal('modal-coupon-create');
}

const couponForm = document.getElementById('form-coupon-create');
if (couponForm) {
  couponForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('coupon-code').value.toUpperCase().trim();
    const discount_percent = parseFloat(document.getElementById('coupon-discount-percent').value) || null;
    const discount_flat = parseFloat(document.getElementById('coupon-discount-flat').value) || null;
    const min_spend = parseFloat(document.getElementById('coupon-min-spend').value) || 0.00;

    if (!discount_percent && !discount_flat) {
      showToast('Please specify percent OR flat discount amount', 'warning');
      return;
    }

    try {
      await apiFetch('/billing/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code,
          discount_percent,
          discount_flat,
          min_spend
        })
      });
      closeModal('modal-coupon-create');
      showToast('Coupon code created!', 'success');
      loadCouponsList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// Load Global Billing & Loyalty Settings
async function loadBillingSettings() {
  const form = document.getElementById('form-billing-settings');
  if (!form) return;

  const isSuperAdmin = window.CURRENT_USER_ROLE === 'SuperAdmin';
  const inputs = form.querySelectorAll('input');
  if (!isSuperAdmin) {
    inputs.forEach(input => input.disabled = true);
  }

  try {
    const data = await apiFetch('/billing/settings');
    if (data.success && data.settings) {
      const s = data.settings;
      document.getElementById('setting-tax-percent').value = parseFloat(s.tax_percent || '10.00').toFixed(2);
      document.getElementById('setting-discount-bronze').value = parseFloat(s.discount_bronze || '5.00').toFixed(2);
      document.getElementById('setting-discount-silver').value = parseFloat(s.discount_silver || '10.00').toFixed(2);
      document.getElementById('setting-discount-gold').value = parseFloat(s.discount_gold || '15.00').toFixed(2);
    }
  } catch (err) {
    showToast('Failed to load global settings: ' + err.message, 'error');
  }
}

// Save Global Billing & Loyalty Settings
const settingsForm = document.getElementById('form-billing-settings');
if (settingsForm) {
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (window.CURRENT_USER_ROLE !== 'SuperAdmin') return;

    const payload = {
      tax_percent: parseFloat(document.getElementById('setting-tax-percent').value),
      discount_bronze: parseFloat(document.getElementById('setting-discount-bronze').value),
      discount_silver: parseFloat(document.getElementById('setting-discount-silver').value),
      discount_gold: parseFloat(document.getElementById('setting-discount-gold').value)
    };

    try {
      await apiFetch('/billing/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: payload })
      });
      showToast('Global billing settings saved!', 'success');
      loadBillingSettings();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
