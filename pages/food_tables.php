<?php
include 'header.php';
?>

<div class="space-y-6">

  <!-- Header Stats -->
  <div class="dashboard-grid">
    <div class="widget-card green">
      <div class="widget-title">Free Tables</div>
      <div class="flex items-center justify-between">
        <div class="widget-value text-forest" id="ft-free-count">0</div>
        <div class="text-3xl text-forest/20"><i class="fa-solid fa-table"></i></div>
      </div>
    </div>
    <div class="widget-card cyan">
      <div class="widget-title">Occupied Tables</div>
      <div class="flex items-center justify-between">
        <div class="widget-value text-wood" id="ft-occupied-count">0</div>
        <div class="text-3xl text-wood/20"><i class="fa-solid fa-users"></i></div>
      </div>
    </div>
    <div class="widget-card gold">
      <div class="widget-title">Total Tables</div>
      <div class="flex items-center justify-between">
        <div class="widget-value text-brass" id="ft-total-count">0</div>
        <div class="text-3xl text-brass/20"><i class="fa-solid fa-utensils"></i></div>
      </div>
    </div>
  </div>

  <!-- Table Grid -->
  <div class="bg-parchment border border-slate-800 rounded-lg p-6">
    <div class="section-header flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold text-wood flex items-center gap-2">
        <i class="fa-solid fa-utensils text-clay"></i>
        <span>Dining Tables</span>
      </h2>
      <div class="flex gap-2">
        <select id="ft-filter" onchange="filterFoodTables(this.value)" class="bg-cream border border-slate-700 px-3 py-1 text-sm rounded text-slate-400 focus:outline-none focus:border-wood">
          <option value="ALL">All Tables</option>
          <option value="Available">Free</option>
          <option value="Occupied">Occupied</option>
          <option value="Maintenance">Maintenance</option>
        </select>
        <?php if ($role === 'SuperAdmin'): ?>
          <button onclick="triggerAddFoodTable()" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-plus mr-1"></i> Add Table
          </button>
        <?php endif; ?>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="food-tables-grid">
      <div class="col-span-full text-center py-12 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin text-2xl text-wood mb-2"></i>
        <p>Loading dining tables...</p>
      </div>
    </div>
  </div>
</div>

<!-- Add/Edit Food Table Modal -->
<div id="modal-food-table" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container max-w-md">
    <div class="modal-header">
      <h3 class="modal-title text-wood" id="ft-modal-title">Add Dining Table</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-food-table')">&times;</button>
    </div>
    <form id="form-food-table">
      <input type="hidden" id="ft-id" value="">
      <div class="modal-body space-y-4">
        <div class="form-group">
          <label class="form-label" for="ft-name">Table Name / Number</label>
          <input type="text" id="ft-name" class="form-control" placeholder="e.g. Table-01" required>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="ft-capacity">Capacity (Seats)</label>
            <input type="number" id="ft-capacity" class="form-control" placeholder="4" min="1" value="4">
          </div>
          <div class="form-group">
            <label class="form-label" for="ft-location">Section / Location</label>
            <input type="text" id="ft-location" class="form-control" placeholder="e.g. Main Hall">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="ft-notes">Notes</label>
          <textarea id="ft-notes" class="form-control h-16" placeholder="Special instructions, location details..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-food-table')">Cancel</button>
        <button type="submit" class="btn btn-primary hover-3d-lift">Save Table</button>
      </div>
    </form>
  </div>
</div>

<script>
let allFoodTables = [];
let ftFilter = 'ALL';
let shouldStartSessionOnOrder = false;
let targetTableIdForNewSession = null;
let targetTableNameForNewSession = '';

document.addEventListener('DOMContentLoaded', () => {
  loadFoodTables();
  setInterval(loadFoodTables, 10000);
});

async function loadFoodTables() {
  try {
    const data = await apiFetch('/stations');
    if (data.success && data.stations) {
      allFoodTables = data.stations.filter(s => s.type === 'Dining');
      renderFoodTables();
      updateFoodCounters();
    }
  } catch (err) {
    document.getElementById('food-tables-grid').innerHTML = `<div class="col-span-full text-center py-10 text-rust">Failed to load: ${err.message}</div>`;
  }
}

function updateFoodCounters() {
  document.getElementById('ft-free-count').innerText = allFoodTables.filter(s => s.status === 'Available').length;
  document.getElementById('ft-occupied-count').innerText = allFoodTables.filter(s => s.status === 'Occupied').length;
  document.getElementById('ft-total-count').innerText = allFoodTables.length;
}

function filterFoodTables(val) {
  ftFilter = val;
  renderFoodTables();
}

function renderFoodTables() {
  const grid = document.getElementById('food-tables-grid');
  grid.innerHTML = '';

  const filtered = ftFilter === 'ALL' ? allFoodTables : allFoodTables.filter(s => s.status === ftFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-500 font-cyber text-xs">No dining tables found.</div>`;
    return;
  }

  filtered.forEach(table => {
    const card = document.createElement('div');
    let statusClass = 'border-forest/30';
    let statusBg = 'bg-forest/10 text-forest';
    let statusLabel = 'Free';
    let actionBtn = '';

    if (table.status === 'Available') {
      statusClass = 'border-forest/30 hover:border-forest';
      statusBg = 'bg-forest/10 border border-forest text-forest';
      statusLabel = 'Free';
      actionBtn = `<button onclick="openTableFoodOrder(${table.id}, true)" class="btn btn-accent btn-sm w-full mt-2 hover-3d-push"><i class="fa-solid fa-utensils mr-1"></i> Add Food</button>`;
    } else if (table.status === 'Occupied') {
      statusClass = 'border-clay/30 hover:border-clay';
      statusBg = 'bg-clay/10 border border-clay text-clay';
      statusLabel = 'Occupied';
      actionBtn = `
        <div class="flex gap-1 mt-2">
          <button onclick="openTableFoodOrder(${table.id})" class="btn btn-accent btn-sm flex-1 hover-3d-push"><i class="fa-solid fa-utensils mr-1"></i> Food Menu</button>
          <button onclick="triggerMergeToTerminal(${table.id}, '${table.name}')" class="btn btn-secondary btn-sm" title="Merge to Terminal"><i class="fa-solid fa-code-merge text-wood"></i></button>
          <button onclick="triggerTableCheckout(${table.id}, '${table.name}')" class="btn btn-danger btn-sm flex-1 hover-3d-push"><i class="fa-solid fa-stop mr-1"></i> Checkout</button>
        </div>
      `;
    } else {
      statusClass = 'border-brass/30 hover:border-brass';
      statusBg = 'bg-brass/10 border border-brass text-brass';
      statusLabel = 'Maintenance';
    }

    const capacity = table.specs_cpu || '-';
    const location = table.specs_gpu || '-';
    const notes = table.specs_peripherals || '';

    card.className = `bg-kraft border-2 rounded-lg p-4 flex flex-col justify-between transition-all duration-300 hover-3d-float aged-card card-corner ${statusClass}`;
    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-bold text-slate-100 font-cyber text-base">${table.name}</h3>
            <span class="text-[10px] text-slate-500 font-mono">${location ? location + ' · ' : ''}${capacity} seats</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${statusBg}">${statusLabel}</span>
        </div>
        ${notes ? `<p class="text-[10px] text-slate-400 mt-1 italic">${notes}</p>` : ''}
      </div>
      <div>
        ${actionBtn}
        <div class="flex gap-1 mt-1">
          <button onclick="editFoodTable(${table.id})" class="btn btn-secondary btn-sm text-[10px] py-1 flex-1"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
          ${window.CURRENT_USER_ROLE === 'SuperAdmin' ? `<button onclick="deleteFoodTable(${table.id},'${table.name}')" class="btn btn-danger btn-sm text-[10px] py-1 flex-1"><i class="fa-solid fa-trash-can mr-1"></i> Delete</button>` : ''}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function triggerAddFoodTable() {
  document.getElementById('ft-id').value = '';
  document.getElementById('ft-modal-title').innerText = 'Add Dining Table';
  document.getElementById('ft-name').value = '';
  document.getElementById('ft-capacity').value = '4';
  document.getElementById('ft-location').value = '';
  document.getElementById('ft-notes').value = '';
  openModal('modal-food-table');
}

async function editFoodTable(id) {
  try {
    const data = await apiFetch('/stations');
    const table = data.stations.find(s => s.id === id);
    if (table) {
      document.getElementById('ft-id').value = table.id;
      document.getElementById('ft-modal-title').innerText = 'Edit Table: ' + table.name;
      document.getElementById('ft-name').value = table.name;
      document.getElementById('ft-capacity').value = table.specs_cpu || '4';
      document.getElementById('ft-location').value = table.specs_gpu || '';
      document.getElementById('ft-notes').value = table.specs_peripherals || '';
      openModal('modal-food-table');
    }
  } catch (err) {
    showToast('Failed to load table details', 'error');
  }
}

document.getElementById('form-food-table').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('ft-id').value;
  const name = document.getElementById('ft-name').value.trim();
  const capacity = document.getElementById('ft-capacity').value || '4';
  const location = document.getElementById('ft-location').value.trim() || '';
  const notes = document.getElementById('ft-notes').value.trim() || '';

  const endpoint = id ? `/stations/${id}` : '/stations';
  const method = id ? 'PUT' : 'POST';

  try {
    await apiFetch(endpoint, {
      method,
      body: JSON.stringify({
        name,
        type: 'Dining',
        specs_cpu: capacity.toString(),
        specs_gpu: location,
        specs_peripherals: notes,
        ip_address: null,
        mac_address: null
      })
    });
    closeModal('modal-food-table');
    showToast(id ? 'Table updated!' : 'Table added!', 'success');
    loadFoodTables();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function deleteFoodTable(id, name) {
  showConfirm('Delete Table', `Delete ${name}?`, async () => {
    try {
      await apiFetch(`/stations/${id}`, { method: 'DELETE' });
      showToast(`Table ${name} deleted`, 'success');
      loadFoodTables();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function startTableSession(tableId, tableName) {
  try {
    const data = await apiFetch('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({
        stationId: tableId,
        playerId: null,
        sessionType: 'Postpaid',
        controllerCount: 1,
        durationMinutes: null,
        prepaidAmount: null,
        paymentMethod: null
      })
    });
    if (data.success) {
      showToast(`Session started at ${tableName}`, 'success');
      loadFoodTables();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function endTableSession(tableId, tableName) {
  try {
    const data = await apiFetch(`/sessions/station/${tableId}`);
    if (data.success && data.session) {
      await apiFetch(`/sessions/${data.session.id}/stop`, { method: 'POST' });
      showToast(`Session ended at ${tableName}`, 'success');
      loadFoodTables();
    } else {
      showToast('No active session found for this table', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// MERGE TO TERMINAL — Dining Table → Terminal
// ==========================================
async function triggerMergeToTerminal(tableId, tableName) {
  // Fetch the active session for this table first
  try {
    const sessData = await apiFetch(`/sessions/station/${tableId}`);
    if (!sessData.success || !sessData.session) {
      showToast('No active session found for this table', 'error');
      return;
    }
    const diningSessionId = sessData.session.id;
    document.getElementById('merge-to-terminal-session-id').value = diningSessionId;
    document.getElementById('merge-to-terminal-title').innerText = `Merge ${tableName} → Terminal`;

    const select = document.getElementById('merge-to-terminal-target');
    select.innerHTML = '<option value="">⏳ Loading active terminals...</option>';

    const data = await apiFetch('/billing/active-sessions');
    select.innerHTML = '<option value="">-- Select a Terminal --</option>';
    if (data.success && data.terminals.length > 0) {
      data.terminals.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.innerText = `${t.station_name} (${t.station_type}) — ${t.player_name} — ${t.elapsed_minutes} min — ₹${t.game_cost.toFixed(2)}`;
        select.appendChild(opt);
      });
    } else {
      select.innerHTML = '<option value="">No active terminal sessions found</option>';
    }

    openModal('modal-merge-to-terminal');
  } catch (err) {
    showToast('Failed to load terminal sessions: ' + err.message, 'error');
  }
}

// Wire form-merge-to-terminal submit
document.addEventListener('DOMContentLoaded', () => {
  const mergeTermForm = document.getElementById('form-merge-to-terminal');
  if (mergeTermForm) {
    mergeTermForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const diningSessionId = document.getElementById('merge-to-terminal-session-id').value;
      const terminalSessionId = document.getElementById('merge-to-terminal-target').value;
      if (!terminalSessionId) {
        showToast('Please select a terminal session', 'warning');
        return;
      }
      const btn = e.submitter;
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Merging...'; }
      try {
        const data = await apiFetch('/billing/merge-from-table', {
          method: 'POST',
          body: JSON.stringify({ diningSessionId, terminalSessionId })
        });
        if (data.success) {
          closeModal('modal-merge-to-terminal');
          showToast(data.message, 'success');
          loadFoodTables();
        }
      } catch (err) {
        showToast(err.message || 'Merge failed', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-code-merge mr-1"></i> Confirm Merge'; }
      }
    });
  }
});
</script>

<!-- Merge Dining Table → Terminal Modal -->
<div id="modal-merge-to-terminal" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container max-w-md">
    <div class="modal-header">
      <h3 class="modal-title text-wood" id="merge-to-terminal-title">
        <i class="fa-solid fa-code-merge mr-2"></i>Merge Table to Terminal
      </h3>
      <button class="btn-modal-close" onclick="closeModal('modal-merge-to-terminal')">&times;</button>
    </div>
    <form id="form-merge-to-terminal">
      <input type="hidden" id="merge-to-terminal-session-id" value="">
      <div class="modal-body space-y-4">
        <div class="bg-kraft border border-wood/30 rounded p-3 text-xs text-slate-300 space-y-1">
          <p class="font-bold text-wood font-cyber uppercase tracking-wider text-[10px]"><i class="fa-solid fa-circle-info mr-1"></i> How this works</p>
          <p>All food orders from this table will be <span class="text-clay font-semibold">moved to the selected terminal session</span>. The dining table will be freed immediately.</p>
          <p class="text-slate-400">Staff then checks out the <span class="text-clay font-semibold">terminal</span> when the customer finishes playing to collect one unified payment.</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="merge-to-terminal-target">Select Destination Terminal Session</label>
          <select id="merge-to-terminal-target" class="form-control" required>
            <option value="">-- Loading... --</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-merge-to-terminal')">Cancel</button>
        <button type="submit" class="btn btn-primary hover-3d-lift">
          <i class="fa-solid fa-code-merge mr-1"></i> Confirm Merge
        </button>
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
      <p class="text-xs text-slate-400">Select items to order for this table.</p>
      
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

<!-- Checkout Modal -->
<div id="modal-checkout-session" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container max-w-lg">
    <div class="modal-header">
      <h3 class="modal-title text-wood font-cyber uppercase tracking-wider"><i class="fa-solid fa-receipt mr-2 text-clay"></i>Table Session Checkout</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-checkout-session')">&times;</button>
    </div>
    <form id="form-checkout-session">
      <input type="hidden" id="checkout-session-id" value="">
      <div class="modal-body space-y-6">
        
        <!-- Receipt Layout -->
        <div class="bg-cream p-6 border border-slate-800 rounded font-mono text-xs text-slate-500 relative" id="printable-receipt-area">
          <div class="text-center border-b border-dashed border-slate-800 pb-4 mb-4">
            <h4 class="text-base font-bold text-wood font-cyber tracking-widest uppercase">SOLEILA</h4>
            <p class="text-[10px] text-slate-400 font-cyber tracking-wide">SARDARPURA, JODHPUR, RAJASTHAN</p>
            <p class="text-[10px] text-slate-400">TEL: +91 98765-43210</p>
          </div>
          
          <div class="space-y-1 mb-4">
            <div class="flex justify-between"><span>INVOICE NO:</span><span id="rcpt-invoice-no">#SESS-000</span></div>
            <div class="flex justify-between"><span>STATION:</span><span id="rcpt-station-name" class="font-bold text-slate-100">Station</span></div>
            <div class="flex justify-between"><span>PLAYER:</span><span id="rcpt-player-name">Guest</span></div>
            <div class="flex justify-between"><span>LOYALTY TIER:</span><span id="rcpt-loyalty-tier">Bronze (5% Disc)</span></div>
            <div class="flex justify-between"><span>ELAPSED TIME:</span><span id="rcpt-elapsed-time">60 Mins</span></div>
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
            <div id="rcpt-cafe-items-container" class="space-y-1">
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
            <p>THANK YOU FOR DINING AT SOLEILA!</p>
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

          <!-- Player Phone Number Option -->
          <div class="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/40">
            <div class="form-group mb-0" id="checkout-phone-section">
              <label class="form-label text-xs uppercase tracking-wider block font-cyber text-wood">Player Phone (Optional)</label>
              <input type="text" id="checkout-customer-phone" class="form-control" placeholder="e.g. +919876543210">
            </div>
            <!-- Merge Table dropdown is hidden for Dining checkout -->
            <div class="form-group mb-0" id="checkout-merge-table-section" style="display: none;">
              <select id="checkout-merge-table-id" class="form-control"><option value="">-- No Transfer --</option></select>
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

<script>
// Supporting JS for Food and Checkout on Dining page
let foodCartDash = [];
let foodCartSessionId = null;
let allInventoryDash = [];
let allCategoriesDash = [];
let activeCategoryTabDash = 'ALL';
let activeCheckoutTotals = {};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initMemberSlider === 'function') {
    initMemberSlider('checkout-customer-phone', 'phone', true);
  }
  loadInventoryDash();
  
  // Wire checkout payment method change
  const paySelect = document.getElementById('checkout-payment-method');
  if (paySelect) {
    paySelect.addEventListener('change', (e) => {
      const splitInputs = document.getElementById('split-payment-inputs');
      if (splitInputs) {
        splitInputs.style.display = e.target.value === 'Split' ? 'grid' : 'none';
      }
    });
  }

  // Wire form submit for checkout
  const checkoutForm = document.getElementById('form-checkout-session');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sessId = document.getElementById('checkout-session-id').value;
      const paymentMethod = document.getElementById('checkout-payment-method').value;
      const couponCode = document.getElementById('checkout-coupon-code').value || null;
      const playHoursSplitAmount = parseFloat(document.getElementById('checkout-split-play-hours').value) || 0.00;
      const cashSplitAmount = parseFloat(document.getElementById('checkout-split-cash').value) || 0.00;
      const customerPhone = document.getElementById('checkout-customer-phone').value || null;

      try {
        const data = await apiFetch(`/billing/checkout/${sessId}`, {
          method: 'POST',
          body: JSON.stringify({
            paymentMethod,
            couponCode,
            playHoursSplitAmount,
            cashSplitAmount,
            customerPhone
          })
        });

        if (data.success) {
          closeModal('modal-checkout-session');
          showToast('Payment checked out and dining table cleared!', 'success');
          loadFoodTables();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
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
    console.error('Failed to load dining food items:', err);
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

// Remove food item from modal cart
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

function closeFoodModalDash() {
  document.getElementById('food-modal-dash').classList.remove('active');
  document.body.style.overflow = '';
}

async function openTableFoodOrder(tableId, isNewSession = false) {
  try {
    if (isNewSession) {
      shouldStartSessionOnOrder = true;
      targetTableIdForNewSession = tableId;
      const table = allFoodTables.find(t => t.id === tableId);
      targetTableNameForNewSession = table ? table.name : `Table-${tableId}`;
      foodCartSessionId = null;
      foodCartDash = [];
      renderFoodCartDash();
      document.getElementById('food-modal-dash').classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      shouldStartSessionOnOrder = false;
      targetTableIdForNewSession = null;
      targetTableNameForNewSession = '';
      const data = await apiFetch(`/sessions/station/${tableId}`);
      if (data.success && data.session) {
        foodCartSessionId = data.session.id;
        foodCartDash = [];
        renderFoodCartDash();
        document.getElementById('food-modal-dash').classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        showToast('No active session found for this table', 'error');
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitFoodOrderDash() {
  if (foodCartDash.length === 0) { showToast('Add at least one item', 'error'); return; }
  const items = foodCartDash.map(i => ({ itemId: i.id, quantity: i.qty }));

  try {
    let activeSessionId = foodCartSessionId;

    if (shouldStartSessionOnOrder && targetTableIdForNewSession) {
      const sessionData = await apiFetch('/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
          stationId: targetTableIdForNewSession,
          playerId: null,
          sessionType: 'Postpaid',
          controllerCount: 1,
          durationMinutes: null,
          prepaidAmount: null,
          paymentMethod: null
        })
      });

      if (sessionData.success && sessionData.session) {
        activeSessionId = sessionData.session.id;
        showToast(`Session started at ${targetTableNameForNewSession} automatically!`, 'success');
      } else {
        throw new Error(sessionData.message || 'Failed to auto-start table session');
      }
    }

    const response = await apiFetch('/pos/checkout', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: activeSessionId,
        playerId: null,
        saleType: 'SessionBill',
        items: items
      })
    });

    if (response.success) {
      showToast('Food items successfully billed to dining table!', 'success');
      foodCartDash = [];
      foodCartSessionId = null;
      shouldStartSessionOnOrder = false;
      targetTableIdForNewSession = null;
      targetTableNameForNewSession = '';
      renderFoodCartDash();
      closeFoodModalDash();
      loadFoodTables();
    }
  } catch (err) {
    showToast(`Error ordering food: ${err.message}`, 'error');
  }
}

async function triggerTableCheckout(tableId, tableName) {
  try {
    const data = await apiFetch(`/sessions/station/${tableId}`);
    if (data.success && data.session) {
      const sessId = data.session.id;
      document.getElementById('checkout-session-id').value = sessId;
      document.getElementById('checkout-coupon-code').value = '';
      document.getElementById('checkout-payment-method').value = 'Cash';
      
      const splitInputs = document.getElementById('split-payment-inputs');
      if (splitInputs) splitInputs.style.display = 'none';

      const previewData = await apiFetch(`/billing/checkout-preview/${sessId}`);
      if (previewData.success) {
        const info = previewData.session;
        const billing = previewData.billing;
        activeCheckoutTotals = billing;

        document.getElementById('rcpt-invoice-no').innerText = `#SESS-${info.id}`;
        document.getElementById('rcpt-station-name').innerText = info.station_name;
        document.getElementById('rcpt-player-name').innerText = info.player_name;
        document.getElementById('rcpt-loyalty-tier').innerText = `${info.loyalty_tier} discount applied`;
        document.getElementById('rcpt-elapsed-time').innerText = `${info.elapsed_minutes} Mins`;

        document.getElementById('rcpt-game-desc').innerText = `Table Session Time`;
        document.getElementById('rcpt-game-qty').innerText = info.elapsed_minutes > 0 ? `${(info.elapsed_minutes / 60).toFixed(2)} hr` : '0 hr';
        document.getElementById('rcpt-game-rate').innerText = `₹0.00`;
        document.getElementById('rcpt-game-cost').innerText = `₹0.00`;

        const cafeContainer = document.getElementById('rcpt-cafe-items-container');
        cafeContainer.innerHTML = '';
        
        const posItems = await apiFetch(`/pos/session/${sessId}`);
        if (posItems.success && posItems.items.length > 0) {
          posItems.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-12 gap-1 text-[11px] text-slate-400 items-center';
            const rate = parseFloat(item.unit_price).toFixed(2);
            const total = parseFloat(item.total_price).toFixed(2);
            const deleteBtn = item.item_id !== 999 
              ? `<button type="button" onclick="removeReceiptFoodItem(${item.id}, ${sessId})" class="text-clay hover:text-red-500 font-bold mr-1 text-xs" title="Remove Item">&times;</button>`
              : '';
            row.innerHTML = `
              <span class="col-span-6 flex items-center">${deleteBtn} <span class="truncate">${item.item_name}</span></span>
              <span class="col-span-2 text-center">${item.quantity}</span>
              <span class="col-span-2 text-right">₹${rate}</span>
              <span class="col-span-2 text-right text-slate-300">₹${total}</span>
            `;
            cafeContainer.appendChild(row);
          });
        } else {
          cafeContainer.innerHTML = '<div class="text-[10px] text-slate-500 italic py-1">No cafe purchases linked</div>';
        }

        const taxLabel = document.getElementById('rcpt-tax-label');
        if (taxLabel) taxLabel.innerText = `TAX/GST (${billing.tax_rate}%):`;

        document.getElementById('rcpt-subtotal').innerText = `₹${billing.subtotal.toFixed(2)}`;
        document.getElementById('rcpt-discount').innerText = `-₹${(billing.discount || 0.00).toFixed(2)}`;
        document.getElementById('rcpt-tax').innerText = `₹${billing.tax.toFixed(2)}`;
        document.getElementById('rcpt-total').innerText = `₹${billing.total.toFixed(2)}`;

        document.getElementById('checkout-available-play-hours').innerText = parseFloat(info.play_hours || 0).toFixed(2);
        document.getElementById('checkout-split-play-hours').value = '0.00';
        document.getElementById('checkout-split-cash').value = '0.00';

        // Reset phone number input
        const phoneInput = document.getElementById('checkout-customer-phone');
        if (phoneInput) {
          phoneInput.value = '';
          if (info.player_id) {
            phoneInput.disabled = true;
            phoneInput.value = info.player_phone || '';
          } else {
            phoneInput.disabled = false;
          }
        }

        openModal('modal-checkout-session');
      }
    } else {
      showToast('No active session found for this table', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeReceiptFoodItem(saleItemId, sessId) {
  if (!confirm('Are you sure you want to remove this item from the bill?')) return;
  try {
    const data = await apiFetch(`/pos/sale-item/${saleItemId}`, { method: 'DELETE' });
    if (data.success) {
      showToast('Item removed from bill successfully!', 'success');
      await triggerTableCheckoutForSessionId(sessId);
    }
  } catch (err) {
    showToast(err.message || 'Failed to remove item', 'error');
  }
}

async function triggerTableCheckoutForSessionId(sessId) {
  const previewData = await apiFetch(`/billing/checkout-preview/${sessId}`);
  if (previewData.success) {
    const info = previewData.session;
    const billing = previewData.billing;
    activeCheckoutTotals = billing;

    document.getElementById('rcpt-subtotal').innerText = `₹${billing.subtotal.toFixed(2)}`;
    document.getElementById('rcpt-discount').innerText = `-₹${(billing.discount || 0.00).toFixed(2)}`;
    document.getElementById('rcpt-tax').innerText = `₹${billing.tax.toFixed(2)}`;
    document.getElementById('rcpt-total').innerText = `₹${billing.total.toFixed(2)}`;

    const cafeContainer = document.getElementById('rcpt-cafe-items-container');
    cafeContainer.innerHTML = '';
    
    const posItems = await apiFetch(`/pos/session/${sessId}`);
    if (posItems.success && posItems.items.length > 0) {
      posItems.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-12 gap-1 text-[11px] text-slate-400 items-center';
        const rate = parseFloat(item.unit_price).toFixed(2);
        const total = parseFloat(item.total_price).toFixed(2);
        const deleteBtn = item.item_id !== 999 
          ? `<button type="button" onclick="removeReceiptFoodItem(${item.id}, ${sessId})" class="text-clay hover:text-red-500 font-bold mr-1 text-xs" title="Remove Item">&times;</button>`
          : '';
        row.innerHTML = `
          <span class="col-span-6 flex items-center">${deleteBtn} <span class="truncate">${item.item_name}</span></span>
          <span class="col-span-2 text-center">${item.quantity}</span>
          <span class="col-span-2 text-right">₹${rate}</span>
          <span class="col-span-2 text-right text-slate-300">₹${total}</span>
        `;
        cafeContainer.appendChild(row);
      });
    } else {
      cafeContainer.innerHTML = '<div class="text-[10px] text-slate-500 italic py-1">No cafe purchases linked</div>';
    }
  }
}

async function applyCoupon() {
  const code = document.getElementById('checkout-coupon-code').value.trim();
  if (!code) { showToast('Enter coupon code', 'error'); return; }
  try {
    const data = await apiFetch(`/billing/coupon/verify?code=${code}&subtotal=${activeCheckoutTotals.subtotal}`);
    if (data.success) {
      const discount = parseFloat(data.discount);
      const tax = (activeCheckoutTotals.subtotal - discount) * (activeCheckoutTotals.tax_rate / 100);
      const total = activeCheckoutTotals.subtotal - discount + tax;
      document.getElementById('rcpt-discount').innerText = `-₹${discount.toFixed(2)}`;
      document.getElementById('rcpt-tax').innerText = `₹${tax.toFixed(2)}`;
      document.getElementById('rcpt-total').innerText = `₹${total.toFixed(2)}`;
      showToast('Coupon applied successfully!', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
</script>

<?php
include 'footer.php';
?>
