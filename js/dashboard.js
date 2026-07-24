// Dashboard Actions and State Management

let allStations = [];
let activeSessionsMap = new Map(); // tracks ticked countdown/up states
let pricingRates = [];
let billingSettings = {
  tax_percent: "10.00",
  discount_bronze: "5.00",
  discount_silver: "10.00",
  discount_gold: "15.00"
};

// Dom Elements
const stationGrid = document.getElementById('dashboard-station-grid');
let currentFilter = 'ALL';

// Load Data on Load
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  loadPlayersList();
  
  // Refreshes stats widgets
  loadStatsSummary();
  setInterval(loadStatsSummary, 10000);

  // Filter chip listeners
  document.querySelectorAll('.status-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.status-chip').forEach(c => {
        c.classList.remove('active', 'bg-wood', 'text-cream');
        c.classList.add('bg-kraft', 'border', 'border-slate-700', 'text-slate-400');
      });
      this.classList.add('active', 'bg-wood', 'text-cream');
      this.classList.remove('bg-kraft', 'border', 'border-slate-700', 'text-slate-400');
      currentFilter = this.dataset.filter;
      renderStationGrid();
    });
  });

  // Prepaid confirmation submit
  const prepaidForm = document.getElementById('form-prepaid-confirm');
  if (prepaidForm) {
    prepaidForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const stationId = parseInt(prepaidForm.dataset.stationId);
      const playerId = prepaidForm.dataset.playerId || null;
      const controllerCount = parseInt(prepaidForm.dataset.controllerCount);
      const durationMinutes = prepaidForm.dataset.durationMinutes ? parseInt(prepaidForm.dataset.durationMinutes) : null;
      const prepaidAmount = prepaidForm.dataset.prepaidAmount ? parseFloat(prepaidForm.dataset.prepaidAmount) : null;
      const paymentMethod = document.getElementById('prepaid-payment-method').value;

      try {
        await apiFetch('/sessions/start', {
          method: 'POST',
          body: JSON.stringify({
            stationId,
            playerId,
            sessionType: 'Prepaid',
            controllerCount,
            durationMinutes,
            prepaidAmount,
            paymentMethod
          })
        });

        closeModal('modal-prepaid-confirm');
        showToast('Prepaid session started successfully!', 'success');
        loadStations();
        loadStatsSummary();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Prepaid quick duration recalculation listeners
  const startDurationInput = document.getElementById('start-duration-minutes');
  if (startDurationInput) {
    startDurationInput.addEventListener('input', recalculatePrepaidAmount);
  }
  const startPlayerSelect = document.getElementById('start-player-id');
  if (startPlayerSelect) {
    startPlayerSelect.addEventListener('change', recalculatePrepaidAmount);
  }
  const startControllerSelect = document.getElementById('start-controller-count');
  if (startControllerSelect) {
    startControllerSelect.addEventListener('change', recalculatePrepaidAmount);
  }
});

// SSE Event Listeners
window.addEventListener('stationStatusChanged', (e) => {
  console.log('Reloading stations grid from SSE update');
  loadStations();
  loadStatsSummary();
});

window.addEventListener('sessionTimerTick', (e) => {
  const sessionTicks = e.detail; // Array of session tick states
  sessionTicks.forEach(tick => {
    activeSessionsMap.set(tick.station_id, tick);
    
    // Update live DOM timers and costs if present
    const timerElem = document.getElementById(`timer-${tick.station_id}`);
    const costElem = document.getElementById(`cost-${tick.station_id}`);
    
    if (timerElem) {
      if (tick.status === 'Paused') {
        if (tick.has_limit && tick.seconds_left <= 0) {
          timerElem.innerHTML = `<span class="text-cyan-400 font-cyber">FINISHED</span>`;
        } else {
          timerElem.innerHTML = `<span class="text-brass">PAUSED</span>`;
        }
        timerElem.className = 'station-timer';
      } else {
        const isCountdown = tick.has_limit;
        const timeVal = isCountdown ? tick.seconds_left : tick.seconds_elapsed;
        if (typeof timeVal !== 'number' || isNaN(timeVal)) {
          timerElem.innerText = '00:00:00';
        } else {
          timerElem.innerText = formatTimeSeconds(timeVal);
        }
        
        // Add low time warning if countdown and < 5 mins (300 seconds)
        if (isCountdown && timeVal <= 300) {
          timerElem.className = 'station-timer warning';
        } else {
          timerElem.className = isCountdown ? 'station-timer' : 'station-timer postpaid';
        }
      }
    }

    if (costElem) {
      const cost = typeof tick.game_cost === 'number' && !isNaN(tick.game_cost) ? tick.game_cost : 0;
      costElem.innerText = `₹${cost.toFixed(2)}`;
    }
  });
});

async function loadDashboardData() {
  try {
    await loadStations();
    await loadPricingRates();
    await loadBillingSettings();
  } catch (err) {
    showToast('Failed to connect to backend service', 'error');
  }
}

async function loadPricingRates() {
  try {
    const data = await apiFetch('/billing/rates');
    if (data.success) {
      pricingRates = data.rates;
    }
  } catch (err) {
    console.error('Failed to load pricing rates:', err);
  }
}

async function loadBillingSettings() {
  try {
    const data = await apiFetch('/billing/settings');
    if (data.success) {
      billingSettings = data.settings;
    }
  } catch (err) {
    console.error('Failed to load billing settings:', err);
  }
}

async function loadStations() {
  try {
    const data = await apiFetch('/stations');
    if (data.success) {
      allStations = data.stations;
      
      // Get currently active sessions to sync initial values
      const sessData = await apiFetch('/sessions/active');
      if (sessData.success) {
        activeSessionsMap.clear();
        sessData.sessions.forEach(sess => {
          // Pre-populate ticks structure
          activeSessionsMap.set(sess.station_id, {
            id: sess.id,
            station_id: sess.station_id,
            session_type: sess.session_type,
            status: sess.status,
            seconds_left: 0, 
            seconds_elapsed: 0,
            game_cost: parseFloat(sess.total_cost)
          });
        });
      }

      renderStationGrid();
    }
  } catch (err) {
    console.error(err);
    stationGrid.innerHTML = `
      <div class="col-span-full py-12 text-center text-rust">
        <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 animate-bounce"></i>
        <p class="font-bold">Connection Failure</p>
        <p class="text-xs text-slate-500 mt-1">Please check if the Express backend service is running on port 8000.</p>
      </div>
    `;
  }
}

async function loadStatsSummary() {
  try {
    const data = await apiFetch('/analytics/summary');
    if (data.success) {
      const summary = data.summary;
      const revEl = document.getElementById('widget-revenue');
      if (revEl) revEl.innerText = `₹${summary.gross_revenue.toFixed(2)}`;
      const occEl = document.getElementById('widget-occupancy');
      if (occEl) occEl.innerText = `${summary.occupancy_rate}%`;
      const ratioEl = document.getElementById('widget-occupancy-ratio');
      if (ratioEl) ratioEl.innerText = `${summary.occupied_stations} of ${summary.total_stations} stations active`;
      
      const lowStockWidget = document.getElementById('widget-low-stock');
      if (lowStockWidget) {
        lowStockWidget.innerText = summary.low_stock_count;
        if (summary.low_stock_count > 0) {
          lowStockWidget.className = 'widget-value text-rust vintage-breathe';
        } else {
          lowStockWidget.className = 'widget-value text-brass';
        }
      }
    }
  } catch (err) {
    console.error('Failed to load summary stats:', err);
  }
}

async function loadPlayersList() {
  try {
    const data = await apiFetch('/players');
    if (data.success) {
      const select = document.getElementById('start-player-id');
      if (select) {
        // Clear except guest
        select.innerHTML = '<option value="">-- Guest Walk-in --</option>';
        data.players.forEach(player => {
          if (!player.is_blacklisted) {
            const opt = document.createElement('option');
            opt.value = player.id;
            opt.dataset.tier = player.loyalty_tier;
            opt.innerText = `${player.name} (${player.phone}) - [${player.loyalty_tier}]`;
            select.appendChild(opt);
          }
        });
      }

      // Populate checkout players datalist for autocomplete search
      const datalist = document.getElementById('checkout-players-list');
      if (datalist) {
        datalist.innerHTML = '';
        data.players.forEach(player => {
          if (!player.is_blacklisted) {
            const opt = document.createElement('option');
            opt.value = player.phone;
            opt.innerText = `${player.name} - [${player.loyalty_tier}]`;
            datalist.appendChild(opt);
          }
        });
      }
      // Initialize premium selection sliders
      if (typeof initMemberSlider === 'function') {
        initMemberSlider('start-player-id', 'id', true);
        initMemberSlider('checkout-customer-phone', 'phone', true);
      }
    }
  } catch (err) {
    console.error('Failed to load players list:', err);
  }
}

function renderStationGrid() {
  if (!stationGrid) return;
  stationGrid.innerHTML = '';

  const filtered = allStations.filter(station => {
    if (station.type === 'Dining') return false;
    const matchStatus = currentFilter === 'ALL' || station.status === currentFilter;
    return matchStatus;
  });

  if (filtered.length === 0) {
    stationGrid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500">
        <i class="fa-solid fa-circle-info text-xl mb-1"></i>
        <p>No stations match selected filters.</p>
        <p class="text-xs mt-1 text-slate-600">Try changing the filter or add stations via the Stations page.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(station => {
    const activeSession = activeSessionsMap.get(station.id);
    const card = document.createElement('div');
    card.className = `station-card status-${station.status}`;
    
    // Header
    let bodyHTML = '';
    let footerHTML = '';

    if (station.status === 'Available') {
      bodyHTML = `
        <div class="text-center py-4">
          <span class="badge badge-green mb-2">FREE</span>
          <p class="text-xs text-slate-400">Ready for connection</p>
        </div>
      `;
      if (window.CURRENT_USER_ROLE === 'Attendant') {
        footerHTML = `<div class="text-center text-[10px] text-slate-500 italic py-2 border-t border-slate-800/50 w-full">No Actions Allowed</div>`;
      } else {
        footerHTML = `
          <button onclick="triggerStartSession(${station.id}, '${station.name}', '${station.type}')" class="btn btn-primary btn-sm flex-grow flex items-center justify-center gap-1.5 py-2">
            <i class="fa-solid fa-play"></i> Start Session
          </button>
          <button onclick="toggleMaintenance(${station.id})" class="btn btn-secondary btn-sm flex items-center justify-center gap-1 py-2" title="Put in Maintenance">
            <i class="fa-solid fa-screwdriver-wrench text-brass"></i> Service
          </button>
        `;
      }
    } else if (station.status === 'Maintenance') {
      bodyHTML = `
        <div class="text-center py-4">
          <span class="badge badge-gold mb-2 vintage-breathe">UNDER MAINTENANCE</span>
          <p class="text-xs text-slate-500">${station.specs_peripherals || 'Hardware checks ongoing'}</p>
        </div>
      `;
      if (window.CURRENT_USER_ROLE === 'Attendant') {
        footerHTML = `<div class="text-center text-[10px] text-slate-500 italic py-2 border-t border-slate-800/50 w-full">Under Maintenance</div>`;
      } else {
        footerHTML = `
          <button onclick="toggleMaintenance(${station.id})" class="btn btn-success btn-sm flex-grow flex items-center justify-center gap-1.5 py-2">
            <i class="fa-solid fa-power-off"></i> Bring Online
          </button>
        `;
      }
    } else if (station.status === 'Occupied') {
      const sess = activeSession || { session_type: 'Prepaid', game_cost: 0.00, has_limit: false, seconds_left: 0 };
      let timeDisplay = '00:00:00';
      if (sess.status === 'Paused') {
        if (sess.has_limit && sess.seconds_left <= 0) {
          timeDisplay = '<span class="text-cyan-400 font-cyber">FINISHED</span>';
        } else {
          timeDisplay = '<span class="text-brass">PAUSED</span>';
        }
      }
      const timerTypeClass = sess.has_limit ? 'station-timer' : 'station-timer postpaid';

      bodyHTML = `
        <div class="mb-2">
          <div class="flex justify-between items-center">
            <span class="badge ${sess.session_type === 'Prepaid' ? 'badge-cyan' : 'badge-pink'}">${sess.session_type}</span>
            <span class="text-[11px] text-wood font-bold font-cyber" id="cost-${station.id}">₹${sess.game_cost.toFixed(2)}</span>
          </div>
          <div class="text-center mt-2">
            <div class="${timerTypeClass}" id="timer-${station.id}">${timeDisplay}</div>
          </div>
        </div>
      `;

      if (window.CURRENT_USER_ROLE === 'Attendant') {
        footerHTML = `
          <div class="w-full flex justify-center border-t border-slate-800/50 pt-2 mt-1">
            <button onclick="openFoodModalDashForSession(${sess.id})" class="btn btn-success btn-sm w-full font-cyber uppercase tracking-wider">
              <i class="fa-solid fa-cookie-bite mr-1"></i> Add Food
            </button>
          </div>
        `;
      } else {
        // Pausing controls
        const hasExtend = (sess.session_type === 'Prepaid' || sess.has_limit);
        const playPauseBtn = sess.status === 'Paused' 
          ? `<button onclick="resumeSession(${sess.id})" class="btn btn-success btn-sm ${hasExtend ? '' : 'col-span-2'} flex items-center justify-center gap-1" title="Resume Session"><i class="fa-solid fa-play"></i> Play</button>`
          : `<button onclick="pauseSession(${sess.id})" class="btn btn-secondary btn-sm ${hasExtend ? '' : 'col-span-2'} flex items-center justify-center gap-1" title="Pause Session"><i class="fa-solid fa-pause"></i> Pause</button>`;

        const extendBtn = hasExtend
          ? `<button onclick="triggerExtend(${sess.id}, '${station.name}')" class="btn btn-primary btn-sm flex items-center justify-center gap-1" title="Add Time"><i class="fa-solid fa-clock-rotate-left"></i> +Time</button>`
          : '';

        const foodBtn = `<button onclick="openFoodModalDashForSession(${sess.id})" class="btn btn-success btn-sm flex items-center justify-center gap-1" title="Add Food"><i class="fa-solid fa-cookie-bite"></i> +Food</button>`;
        const transferBtn = `<button onclick="triggerTransfer(${sess.id}, '${station.name}')" class="btn btn-secondary btn-sm flex items-center justify-center gap-1" title="Transfer Station"><i class="fa-solid fa-arrows-left-right text-wood"></i> Move</button>`;
        const mergeBtn = `<button onclick="triggerMergeToTable(${sess.id}, '${station.name}')" class="btn btn-accent btn-sm col-span-2 flex items-center justify-center gap-1" title="Merge to Dining Table"><i class="fa-solid fa-code-merge text-clay"></i> Merge to Table</button>`;

        if (sess.session_type === 'Prepaid') {
          footerHTML = `
            <div class="flex flex-col w-full gap-2 mt-2">
              <div class="grid grid-cols-2 gap-1.5 w-full text-[11px] font-cyber">
                ${playPauseBtn}
                ${extendBtn}
                ${foodBtn}
                ${transferBtn}
                ${mergeBtn}
              </div>
              <button onclick="stopPrepaidSession(${sess.id})" class="btn btn-danger btn-sm w-full font-cyber uppercase tracking-wider py-1.5 mt-1">
                <i class="fa-solid fa-circle-stop mr-1"></i> Stop Session
              </button>
            </div>
          `;
        } else {
          footerHTML = `
            <div class="flex flex-col w-full gap-2 mt-2">
              <div class="grid grid-cols-2 gap-1.5 w-full text-[11px] font-cyber">
                ${playPauseBtn}
                ${extendBtn}
                ${foodBtn}
                ${transferBtn}
                ${mergeBtn}
              </div>
              <button onclick="triggerCheckout(${sess.id})" class="btn btn-accent btn-sm w-full py-1.5 mt-1 flex items-center justify-center gap-1">
                <i class="fa-solid fa-cash-register"></i> Stop & Pay
              </button>
            </div>
          `;
        }
      }
    }

    card.innerHTML = `
      <div>
        <div class="station-header-info">
          <h3 class="station-name">${station.name}</h3>
          <span class="station-type-badge">${station.type}</span>
        </div>
        <div class="station-body">
          ${bodyHTML}
        </div>
      </div>
      <div class="station-footer">
        ${footerHTML}
      </div>
    `;

    stationGrid.appendChild(card);
  });
}

// Global actions triggers
function triggerStartSession(stationId, name, type) {
  document.getElementById('start-station-id').value = stationId;
  document.getElementById('start-session-title').innerText = `Start Session: ${name}`;
  
  // Show controller selection only if Console (PS5, Xbox, etc)
  const ctrlGrp = document.getElementById('controller-count-group');
  if (type === 'PS5' || type === 'Xbox' || type === 'PS4') {
    ctrlGrp.style.display = 'block';
  } else {
    ctrlGrp.style.display = 'none';
  }

  // Reset inputs
  document.getElementById('start-player-id').value = '';
  document.getElementById('start-duration-minutes').value = '';
  document.getElementById('start-prepaid-amount').value = '';
  
  // Set Postpaid as default checked in radio button
  const postpaidRadio = document.querySelector('input[name="start-session-type"][value="Postpaid"]');
  if (postpaidRadio) postpaidRadio.checked = true;
  
  toggleBillingFields('Postpaid');
  openModal('modal-start-session');
}

function toggleBillingFields(type) {
  const fields = document.getElementById('prepaid-fields');
  const inputDuration = document.getElementById('start-duration-minutes');
  const inputAmt = document.getElementById('start-prepaid-amount');
  
  if (fields) {
    fields.style.display = 'block';
  }
  
  if (type === 'Prepaid') {
    if (inputDuration) inputDuration.placeholder = "e.g. 60 (Required)";
    if (inputAmt) inputAmt.placeholder = "e.g. 10.00";
  } else {
    if (inputDuration) inputDuration.placeholder = "Optional limit (mins)";
    if (inputAmt) inputAmt.placeholder = "Optional limit (₹)";
  }
}

// Start submit
document.getElementById('form-start-session').addEventListener('submit', async (e) => {
  e.preventDefault();
  const stationId = parseInt(document.getElementById('start-station-id').value);
  const playerId = document.getElementById('start-player-id').value || null;
  const controllerCount = parseInt(document.getElementById('start-controller-count').value) || 1;
  
  const startTypeElems = document.getElementsByName('start-session-type');
  let sessionType = 'Prepaid';
  for (const elem of startTypeElems) {
    if (elem.checked) sessionType = elem.value;
  }

  const durationMinutes = parseInt(document.getElementById('start-duration-minutes').value) || null;
  const prepaidAmount = parseFloat(document.getElementById('start-prepaid-amount').value) || null;

  if (sessionType === 'Prepaid') {
    let total = 0.00;
    let subtotal = 0.00;
    let discount = 0.00;
    let tax = 0.00;

    const stationCard = allStations.find(s => s.id === stationId);
    const stationType = stationCard ? stationCard.type : 'Other';
    
    const playerSelect = document.getElementById('start-player-id');
    const selectedOpt = playerSelect.options[playerSelect.selectedIndex];
    const loyaltyTier = selectedOpt ? (selectedOpt.dataset.tier || 'Bronze') : 'Bronze';
    const playerName = selectedOpt ? selectedOpt.text.split(' - ')[0] : 'Guest Walk-in';

    const taxRate = parseFloat(billingSettings.tax_percent || '10.00') / 100;
    if (prepaidAmount && prepaidAmount > 0) {
      total = prepaidAmount;
      subtotal = parseFloat((total / (1 + taxRate)).toFixed(2));
      tax = parseFloat((total - subtotal).toFixed(2));
      discount = 0.00;
    } else if (durationMinutes && durationMinutes > 0) {
      const rule = pricingRates.find(r => r.station_type === stationType);
      if (rule) {
        let baseRate = parseFloat(rule.hourly_rate);
        
        if (controllerCount > 1 && parseFloat(rule.controller_addon_rate) > 0) {
          baseRate = baseRate + ((controllerCount - 1) * parseFloat(rule.controller_addon_rate));
        }
        
        const rawCost = (durationMinutes / 60) * baseRate;
        let discountPct = 0;
        if (loyaltyTier === 'Gold') discountPct = parseFloat(billingSettings.discount_gold || '15.00') / 100;
        else if (loyaltyTier === 'Silver') discountPct = parseFloat(billingSettings.discount_silver || '10.00') / 100;

        discount = parseFloat((rawCost * discountPct).toFixed(2));
        total = parseFloat((rawCost - discount).toFixed(2));
        subtotal = parseFloat((total / (1 + taxRate)).toFixed(2));
        tax = parseFloat((total - subtotal).toFixed(2));
      }
    } else {
      showToast('Prepaid amount or duration is required', 'warning');
      return;
    }

    // Populate Prepaid Receipt Details
    document.getElementById('prepaid-rcpt-station').innerText = stationCard ? stationCard.name : `Station #${stationId}`;
    document.getElementById('prepaid-rcpt-player').innerText = playerName;
    document.getElementById('prepaid-rcpt-tier').innerText = loyaltyTier;
    document.getElementById('prepaid-rcpt-duration').innerText = durationMinutes ? `${durationMinutes} Mins` : `Cash Amount: ₹${total.toFixed(2)}`;
    document.getElementById('prepaid-rcpt-subtotal').innerText = `₹${subtotal.toFixed(2)}`;
    document.getElementById('prepaid-rcpt-discount').innerText = `-₹${discount.toFixed(2)}`;
    
    const prepaidTaxLabel = document.getElementById('prepaid-rcpt-tax-label');
    if (prepaidTaxLabel) {
      prepaidTaxLabel.innerText = `TAX/GST (${parseFloat(billingSettings.tax_percent || '10.00')}%):`;
    }
    document.getElementById('prepaid-rcpt-tax').innerText = `₹${tax.toFixed(2)}`;
    document.getElementById('prepaid-rcpt-total').innerText = `₹${total.toFixed(2)}`;

    // Save configuration in dataset attributes
    const prepaidForm = document.getElementById('form-prepaid-confirm');
    if (prepaidForm) {
      prepaidForm.dataset.stationId = stationId;
      prepaidForm.dataset.playerId = playerId || '';
      prepaidForm.dataset.controllerCount = controllerCount;
      prepaidForm.dataset.durationMinutes = durationMinutes || '';
      prepaidForm.dataset.prepaidAmount = prepaidAmount || '';
    }

    closeModal('modal-start-session');
    openModal('modal-prepaid-confirm');
    return;
  }

  try {
    await apiFetch('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({
        stationId,
        playerId,
        sessionType,
        controllerCount,
        durationMinutes,
        prepaidAmount
      })
    });

    closeModal('modal-start-session');
    showToast('Session started successfully!', 'success');
    loadStations();
    loadStatsSummary();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Pause/Resume calls
async function pauseSession(sessId) {
  try {
    await apiFetch(`/sessions/${sessId}/pause`, { method: 'POST' });
    showToast('Session paused.', 'info');
    loadStations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function resumeSession(sessId) {
  try {
    await apiFetch(`/sessions/${sessId}/resume`, { method: 'POST' });
    showToast('Session resumed.', 'success');
    loadStations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Time extensions
function triggerExtend(sessId, stationName) {
  document.getElementById('extend-session-id').value = sessId;
  document.getElementById('extend-session-title').innerText = `Extend Session: ${stationName}`;
  document.getElementById('extend-minutes').value = '';
  document.getElementById('extend-amount').value = '';
  openModal('modal-extend-session');
}

function setExtendVal(mins) {
  document.getElementById('extend-minutes').value = mins;
  document.getElementById('extend-amount').value = '';
}

document.getElementById('form-extend-session').addEventListener('submit', async (e) => {
  e.preventDefault();
  const sessId = document.getElementById('extend-session-id').value;
  const minutes = parseInt(document.getElementById('extend-minutes').value) || null;
  const amount = parseFloat(document.getElementById('extend-amount').value) || null;

  try {
    await apiFetch(`/sessions/${sessId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ minutes, amount })
    });
    closeModal('modal-extend-session');
    showToast('Timer extension applied', 'success');
    loadStations();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Station Transfer Wizard
async function triggerTransfer(sessId, stationName) {
  document.getElementById('transfer-session-id').value = sessId;
  document.getElementById('transfer-session-title').innerText = `Relocate Player: ${stationName}`;
  
  const select = document.getElementById('transfer-target-station');
  select.innerHTML = '<option value="">-- Loading Available Stations --</option>';

  try {
    const data = await apiFetch('/stations');
    if (data.success) {
      select.innerHTML = '<option value="">-- Choose New Station --</option>';
      let count = 0;
      data.stations.forEach(st => {
        if (st.status === 'Available') {
          const opt = document.createElement('option');
          opt.value = st.id;
          opt.innerText = `${st.name} (${st.type}) - Spec: ${st.specs_gpu || 'Standard'}`;
          select.appendChild(opt);
          count++;
        }
      });
      if (count === 0) {
        select.innerHTML = '<option value="">No available stations found</option>';
      }
    }
    openModal('modal-transfer-session');
  } catch (err) {
    showToast('Could not load target stations', 'error');
  }
}

document.getElementById('form-transfer-session').addEventListener('submit', async (e) => {
  e.preventDefault();
  const sessId = document.getElementById('transfer-session-id').value;
  const targetStationId = parseInt(document.getElementById('transfer-target-station').value);

  if (!targetStationId) {
    showToast('Please select a target station', 'warning');
    return;
  }

  try {
    await apiFetch(`/sessions/${sessId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ targetStationId })
    });
    closeModal('modal-transfer-session');
    showToast('Player migrated successfully', 'success');
    loadStations();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Maintenance toggle
async function toggleMaintenance(stationId) {
  try {
    const data = await apiFetch(`/stations/${stationId}/maintenance`, { method: 'PATCH' });
    showToast(data.message, 'success');
    loadStations();
    loadStatsSummary();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Checkout Preview & Apply coupon logic
let activeCheckoutTotals = {};

async function triggerCheckout(sessId) {
  document.getElementById('checkout-session-id').value = sessId;
  document.getElementById('checkout-coupon-code').value = '';
  document.getElementById('checkout-payment-method').value = 'Cash';
  togglePaymentInputs('Cash');

  try {
    const data = await apiFetch(`/billing/checkout-preview/${sessId}`);
    if (data.success) {
      const info = data.session;
      const billing = data.billing;
      activeCheckoutTotals = billing;

      // Populate layout
      document.getElementById('rcpt-invoice-no').innerText = `#SESS-${info.id}`;
      document.getElementById('rcpt-station-name').innerText = info.station_name;
      document.getElementById('rcpt-player-name').innerText = info.player_name;
      document.getElementById('rcpt-loyalty-tier').innerText = `${info.loyalty_tier} discount applied`;
      document.getElementById('rcpt-elapsed-time').innerText = `${info.elapsed_minutes} Mins`;

      document.getElementById('rcpt-game-desc').innerText = `Game Play: ${info.session_type}`;
      document.getElementById('rcpt-game-qty').innerText = info.billed_minutes > 0 ? `${(info.billed_minutes / 60).toFixed(2)} hr` : '0 hr';
      document.getElementById('rcpt-game-rate').innerText = `₹${parseFloat(billing.game_cost / (info.billed_minutes/60 || 1)).toFixed(2)}`;
      document.getElementById('rcpt-game-cost').innerText = `₹${billing.game_cost.toFixed(2)}`;

      // Cafe and Terminal items
      const cafeContainer = document.getElementById('rcpt-cafe-items-container');
      const terminalContainer = document.getElementById('rcpt-terminal-items-container');
      cafeContainer.innerHTML = '';
      terminalContainer.innerHTML = '';
      terminalContainer.style.display = 'none';
      
      const posItems = await apiFetch(`/pos/session/${sessId}`);
      if (posItems.success && posItems.items.length > 0) {
        let hasTerminalItems = false;
        let hasCafeItems = false;
        
        posItems.items.forEach(item => {
          const rate = parseFloat(item.unit_price).toFixed(2);
          const total = parseFloat(item.total_price).toFixed(2);
          
          if (parseInt(item.item_id) === 999) {
            hasTerminalItems = true;
            
            // Build terminal session time details
            let timeDetails = '';
            if (item.terminal_station_name) {
              timeDetails += `<div class="text-[10px] text-slate-500"><span class="text-slate-400">Station:</span> ${item.terminal_station_name}</div>`;
            }
            if (item.terminal_start_time) {
              const startTime = new Date(item.terminal_start_time);
              const fmtTime = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
              const fmtDate = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
              
              timeDetails += `<div class="text-[10px] text-slate-500"><span class="text-slate-400">Time:</span> ${fmtTime(startTime)} - ${item.terminal_end_time ? fmtTime(new Date(item.terminal_end_time)) : 'Now'}</div>`;
              
              if (item.terminal_target_end_time) {
                const targetTime = new Date(item.terminal_target_end_time);
                timeDetails += `<div class="text-[10px] text-slate-500"><span class="text-slate-400">Target:</span> ${fmtTime(targetTime)} (estimated)</div>`;
              }
              
              // Calculate real elapsed
              const startMs = new Date(item.terminal_start_time).getTime();
              const endMs = item.terminal_end_time ? new Date(item.terminal_end_time).getTime() : Date.now();
              const elapsedMin = Math.round((endMs - startMs) / 60000);
              timeDetails += `<div class="text-[10px] text-slate-500"><span class="text-slate-400">Elapsed:</span> ${elapsedMin} min (real-time)</div>`;
            }
            if (item.terminal_hourly_rate && parseFloat(item.terminal_hourly_rate) > 0) {
              timeDetails += `<div class="text-[10px] text-slate-500"><span class="text-slate-400">Rate:</span> ₹${parseFloat(item.terminal_hourly_rate).toFixed(2)}/hr</div>`;
            }
            if (item.terminal_payment_method) {
              timeDetails += `<div class="text-[10px] text-slate-500"><span class="text-slate-400">Paid via:</span> ${item.terminal_payment_method}</div>`;
            }
            
            const detailsBlock = timeDetails ? `<div class="mt-1 space-y-0.5 col-span-12">${timeDetails}</div>` : '';
            
            const row = document.createElement('div');
            row.className = 'grid grid-cols-12 gap-1 text-[11px] text-slate-400 items-center border-t border-dashed border-slate-800 pt-2 mt-1';
            row.innerHTML = `
              <span class="col-span-6 flex items-start"><span class="truncate text-wood font-bold">Terminal: ${item.item_name}</span></span>
              <span class="col-span-2 text-center">${parseFloat(item.quantity).toFixed(2)} hr</span>
              <span class="col-span-2 text-right">₹${rate}</span>
              <span class="col-span-2 text-right text-slate-300">₹${total}</span>
              ${detailsBlock}
            `;
            terminalContainer.appendChild(row);
          } else {
            hasCafeItems = true;
            const row = document.createElement('div');
            row.className = 'grid grid-cols-12 gap-1 text-[11px] text-slate-400 items-center';
            const deleteBtn = `<button type="button" onclick="removeReceiptFoodItem(${item.id}, ${sessId})" class="text-clay hover:text-red-500 font-bold mr-1 text-xs" title="Remove Item">&times;</button>`;
            row.innerHTML = `
              <span class="col-span-6 flex items-center">${deleteBtn} <span class="truncate">${item.item_name}</span></span>
              <span class="col-span-2 text-center">${item.quantity}</span>
              <span class="col-span-2 text-right">₹${rate}</span>
              <span class="col-span-2 text-right text-slate-300">₹${total}</span>
            `;
            cafeContainer.appendChild(row);
          }
        });
        
        if (hasTerminalItems) {
          terminalContainer.style.display = 'block';
        }
        if (!hasCafeItems) {
          cafeContainer.innerHTML = '<div class="text-[10px] text-slate-500 italic py-1">No cafe purchases linked</div>';
        }
      } else {
        cafeContainer.innerHTML = '<div class="text-[10px] text-slate-500 italic py-1">No cafe purchases linked</div>';
      }

      // Update dynamic Tax/GST label
      const taxLabel = document.getElementById('rcpt-tax-label');
      if (taxLabel) {
        taxLabel.innerText = `TAX/GST (${billing.tax_rate}%):`;
      }

      // Populate totals
      updateInvoiceDom(billing.subtotal, 0.00, billing.tax, billing.total);

      // Populate play hours split limits
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

      // Populate dining tables dropdown
      const mergeSelect = document.getElementById('checkout-merge-table-id');
      const mergeSection = document.getElementById('checkout-merge-table-section');
      if (mergeSelect) {
        mergeSelect.innerHTML = '<option value="">-- No Transfer --</option>';
        if (info.station_type === 'Dining') {
          if (mergeSection) mergeSection.style.display = 'none';
        } else {
          if (mergeSection) mergeSection.style.display = '';
          const activeDiningStations = allStations.filter(s => s.type === 'Dining' && s.status === 'Occupied');
          activeDiningStations.forEach(st => {
            const activeSess = activeSessionsMap.get(st.id);
            if (activeSess) {
              const opt = document.createElement('option');
              opt.value = activeSess.id; // Dining session ID
              opt.innerText = `${st.name} (Session #${activeSess.id})`;
              mergeSelect.appendChild(opt);
            }
          });
        }
      }

      openModal('modal-checkout-session');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateInvoiceDom(sub, disc, tax, tot) {
  document.getElementById('rcpt-subtotal').innerText = `₹${sub.toFixed(2)}`;
  document.getElementById('rcpt-discount').innerText = `-₹${disc.toFixed(2)}`;
  document.getElementById('rcpt-tax').innerText = `₹${tax.toFixed(2)}`;
  document.getElementById('rcpt-total').innerText = `₹${tot.toFixed(2)}`;
}

async function applyCoupon() {
  const code = document.getElementById('checkout-coupon-code').value.trim();
  if (!code) {
    showToast('Please enter coupon code', 'warning');
    return;
  }

  const subtotal = activeCheckoutTotals.subtotal;
  try {
    const data = await apiFetch(`/billing/coupons/validate/${code}?subtotal=${subtotal}`);
    if (data.success) {
      const coupon = data.coupon;
      let discount = 0.00;
      if (coupon.discount_percent) {
        discount = subtotal * (parseFloat(coupon.discount_percent) / 100);
      } else if (coupon.discount_flat) {
        discount = parseFloat(coupon.discount_flat);
      }

      const tax = (subtotal - discount) * (activeCheckoutTotals.tax_rate / 100);
      const total = subtotal - discount + tax;

      updateInvoiceDom(subtotal, discount, tax, total);
      showToast('Coupon discount applied!', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function togglePaymentInputs(method) {
  const splitInput = document.getElementById('split-payment-inputs');
  const submitBtn = document.querySelector('#form-checkout-session button[type="submit"]');

  if (method === 'Split') {
    splitInput.style.display = 'grid';
    if (submitBtn) submitBtn.innerText = 'Confirm Checkout Payment';
  } else {
    splitInput.style.display = 'none';
    if (submitBtn) submitBtn.innerText = 'Confirm Checkout Payment';
  }
}

function stopPrepaidSession(sessId) {
  showConfirm('Stop Prepaid Session', "Are you sure you want to stop this prepaid session early and free the station?", async () => {
    try {
      const data = await apiFetch(`/sessions/${sessId}/stop`, { method: 'POST' });
      if (data.success) {
        showToast('Prepaid session stopped early and station cleared!', 'success');
        loadStations();
        loadStatsSummary();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// Toggle checkout button to merge when dining table is selected
document.getElementById('checkout-merge-table-id').addEventListener('change', function () {
  const submitBtn = document.querySelector('#form-checkout-session button[type="submit"]');
  if (this.value) {
    if (submitBtn) submitBtn.innerText = 'Merge to Table';
  } else {
    if (submitBtn) submitBtn.innerText = 'Confirm Payment';
  }
});

// Submit payment checkout
document.getElementById('form-checkout-session').addEventListener('submit', async (e) => {
  e.preventDefault();
  const diningSessionId = document.getElementById('checkout-merge-table-id').value;
  if (diningSessionId) {
    submitMergeToTable();
    return;
  }

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
      showToast('Payment checked out and station cleared!', 'success');
      loadStations();
      loadStatsSummary();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Helper: formats seconds into H:MM:SS format
function formatTimeSeconds(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const paddedH = h.toString().padStart(2, '0');
  const paddedM = m.toString().padStart(2, '0');
  const paddedS = s.toString().padStart(2, '0');

  return `${paddedH}:${paddedM}:${paddedS}`;
}

// Quick pre-paid duration selection
function setQuickDuration(minutes) {
  const durationInput = document.getElementById('start-duration-minutes');
  if (durationInput) {
    durationInput.value = minutes;
    recalculatePrepaidAmount();
  }
}

// Recalculate Prepaid Cash Amount dynamically based on minutes/station/player
function recalculatePrepaidAmount() {
  const durationInput = document.getElementById('start-duration-minutes');
  const minutes = parseInt(durationInput.value);
  if (!minutes || minutes <= 0) {
    document.getElementById('start-prepaid-amount').value = '';
    return;
  }

  const stationId = parseInt(document.getElementById('start-station-id').value);
  if (!stationId) return;

  const station = allStations.find(s => s.id === stationId);
  if (!station) return;

  const rule = pricingRates.find(r => r.station_type === station.type);
  if (!rule) return;

  const controllerCount = parseInt(document.getElementById('start-controller-count').value) || 1;
  const playerSelect = document.getElementById('start-player-id');
  const selectedOpt = playerSelect.options[playerSelect.selectedIndex];
  const loyaltyTier = selectedOpt ? (selectedOpt.dataset.tier || 'Bronze') : 'Bronze';

  let hourlyRate = parseFloat(rule.hourly_rate);
  
  if (controllerCount > 1 && parseFloat(rule.controller_addon_rate) > 0) {
    hourlyRate = hourlyRate + ((controllerCount - 1) * parseFloat(rule.controller_addon_rate));
  }

  let discountPct = 0;
  if (loyaltyTier === 'Gold') discountPct = parseFloat(billingSettings.discount_gold || '15.00') / 100;
  else if (loyaltyTier === 'Silver') discountPct = parseFloat(billingSettings.discount_silver || '10.00') / 100;

  const baseCost = (minutes / 60) * hourlyRate;
  const discount = baseCost * discountPct;
  const totalCost = parseFloat((baseCost - discount).toFixed(2));

  document.getElementById('start-prepaid-amount').value = totalCost;
}

async function submitMergeToTable() {
  const consoleSessionId = document.getElementById('checkout-session-id').value;
  const diningSessionId = document.getElementById('checkout-merge-table-id').value;
  if (!diningSessionId) {
    showToast('Please select an active dining table to merge into.', 'error');
    return;
  }

  const submitBtn = document.querySelector('#form-checkout-session button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Merging...';
  }

  try {
    const response = await apiFetch('/billing/merge-to-table', {
      method: 'POST',
      body: JSON.stringify({ consoleSessionId, diningSessionId })
    });

    if (response.success) {
      showToast('Session charges successfully merged into dining table!', 'success');
      closeModal('modal-checkout-session');
      loadStations();
      loadStatsSummary();
    }
  } catch (err) {
    showToast(err.message || 'Failed to merge session', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Merge to Table';
    }
  }
}

async function removeReceiptFoodItem(saleItemId, sessId) {
  if (!confirm('Are you sure you want to remove this item from the bill?')) return;
  try {
    const data = await apiFetch(`/pos/sale-item/${saleItemId}`, { method: 'DELETE' });
    if (data.success) {
      showToast('Item removed from bill successfully!', 'success');
      await triggerCheckout(sessId);
      if (typeof loadStations === 'function') loadStations();
    }
  } catch (err) {
    showToast(err.message || 'Failed to remove item', 'error');
  }
}

// ==========================================
// MERGE TO TABLE — Terminal → Dining Table
// ==========================================
async function triggerMergeToTable(sessId, stationName) {
  document.getElementById('merge-to-table-session-id').value = sessId;
  document.getElementById('merge-to-table-title').innerText = `Merge ${stationName} → Dining Table`;

  const select = document.getElementById('merge-to-table-target');
  select.innerHTML = '<option value="">⏳ Loading active tables...</option>';

  try {
    const data = await apiFetch('/billing/active-sessions');
    select.innerHTML = '<option value="">-- Select a Dining Table --</option>';
    if (data.success && data.tables.length > 0) {
      data.tables.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.innerText = `${t.station_name} — ${t.player_name} (${t.elapsed_minutes} min elapsed)`;
        select.appendChild(opt);
      });
    } else {
      select.innerHTML = '<option value="">No active dining tables found</option>';
    }
    openModal('modal-merge-to-table');
  } catch (err) {
    showToast('Failed to load dining tables: ' + err.message, 'error');
  }
}

document.getElementById('form-merge-to-table').addEventListener('submit', async (e) => {
  e.preventDefault();
  const consoleSessionId = document.getElementById('merge-to-table-session-id').value;
  const diningSessionId = document.getElementById('merge-to-table-target').value;
  if (!diningSessionId) {
    showToast('Please select a dining table to merge into', 'warning');
    return;
  }

  const btn = e.submitter;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Merging...'; }

  try {
    const data = await apiFetch('/billing/merge-to-table', {
      method: 'POST',
      body: JSON.stringify({ consoleSessionId, diningSessionId })
    });
    if (data.success) {
      closeModal('modal-merge-to-table');
      showToast(data.message, 'success');
      loadStations();
      loadStatsSummary();
    }
  } catch (err) {
    showToast(err.message || 'Merge failed', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-code-merge mr-1"></i> Confirm Merge'; }
  }
});
