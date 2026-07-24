// Active Sessions Management Client Action File

document.addEventListener('DOMContentLoaded', () => {
  loadActiveSessions();
});

let allSessions = [];
let ticksMap = new Map();

async function loadActiveSessions() {
  const tbody = document.getElementById('sessions-table-body');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="10" class="text-center py-6 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading live session logs...
      </td>
    </tr>
  `;

  try {
    const data = await apiFetch('/sessions/active');
    if (data.success && data.sessions.length > 0) {
      allSessions = data.sessions;
      tbody.innerHTML = '';
      
      data.sessions.forEach(sess => {
        const tr = document.createElement('tr');
        tr.id = `row-session-${sess.id}`;

        const start = new Date(sess.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        let typeBadge = sess.session_type === 'Prepaid' ? '<span class="badge badge-cyan">Prepaid</span>' : '<span class="badge badge-pink">Postpaid</span>';
        
        // Control buttons
        const playPauseBtn = sess.status === 'Paused'
          ? `<button onclick="resumeSession(${sess.id})" class="btn btn-success btn-sm" title="Resume"><i class="fa-solid fa-play"></i></button>`
          : `<button onclick="pauseSession(${sess.id})" class="btn btn-secondary btn-sm" title="Pause"><i class="fa-solid fa-pause"></i></button>`;

        const extendBtn = sess.session_type === 'Prepaid'
          ? `<button onclick="triggerExtend(${sess.id}, '${sess.station_name}')" class="btn btn-primary btn-sm" title="Extend"><i class="fa-solid fa-clock-rotate-left"></i></button>`
          : '';

        const stopOrCheckoutBtn = sess.session_type === 'Prepaid'
          ? `<button onclick="stopPrepaidSession(${sess.id})" class="btn btn-danger btn-sm"><i class="fa-solid fa-circle-stop mr-1"></i> Stop</button>`
          : `<button onclick="triggerCheckout(${sess.id})" class="btn btn-accent btn-sm"><i class="fa-solid fa-cash-register mr-1"></i> Checkout</button>`;

        tr.innerHTML = `
          <td class="font-mono text-xs text-slate-500">#${sess.id}</td>
          <td class="font-bold text-slate-100 font-cyber">${sess.station_name}</td>
          <td><span class="station-type-badge">${sess.station_type}</span></td>
          <td>${sess.player_name || '<span class="text-slate-500 italic">Guest Walk-in</span>'}</td>
          <td><span class="badge badge-gold">${sess.loyalty_tier || 'Bronze'}</span></td>
          <td class="font-mono text-xs">${start}</td>
          <td>${typeBadge}</td>
          <td class="font-bold text-wood" id="row-cost-${sess.id}">₹${parseFloat(sess.total_cost).toFixed(2)}</td>
          <td class="font-mono text-base text-wood" id="row-timer-${sess.id}">00:00:00</td>
          <td>
            <div class="flex gap-2">
              ${playPauseBtn}
              ${extendBtn}
              <a href="pos.php?session_id=${sess.id}" class="btn btn-success btn-sm flex items-center justify-center font-cyber text-xs" title="Add Food"><i class="fa-solid fa-cookie-bite"></i></a>
              <button onclick="triggerTransfer(${sess.id}, '${sess.station_name}')" class="btn btn-secondary btn-sm" title="Transfer"><i class="fa-solid fa-arrows-left-right text-wood"></i></button>
              ${stopOrCheckoutBtn}
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-8 text-slate-500">No active player sessions. Go to dashboard to start.</td>
        </tr>
      `;
    }
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-6 text-rust font-bold">Failed to load active sessions: ${err.message}</td>
      </tr>
    `;
  }
}

// SSE live timer tick handler specifically for list page rows
window.addEventListener('sessionTimerTick', (e) => {
  const sessionTicks = e.detail;
  sessionTicks.forEach(tick => {
    ticksMap.set(tick.id, tick);

    const timerCell = document.getElementById(`row-timer-${tick.id}`);
    const costCell = document.getElementById(`row-cost-${tick.id}`);

    if (timerCell) {
      if (tick.status === 'Paused') {
        timerCell.innerHTML = `<span class="text-brass font-bold">PAUSED</span>`;
      } else {
        const timeVal = tick.session_type === 'Prepaid' ? tick.seconds_left : tick.seconds_elapsed;
        timerCell.innerText = formatTimeSeconds(timeVal);

        if (tick.session_type === 'Prepaid' && timeVal <= 300) {
          timerCell.className = 'font-mono text-base text-rust vintage-breathe';
        } else {
          timerCell.className = tick.session_type === 'Postpaid' ? 'font-mono text-base text-clay' : 'font-mono text-base text-wood';
        }
      }
    }

    if (costCell) {
      costCell.innerText = `₹${tick.game_cost.toFixed(2)}`;
    }
  });
});

// SSE redirect for station updates
window.addEventListener('stationStatusChanged', (e) => {
  loadActiveSessions();
});

// Action functions (identical to dashboard.js API bindings)
async function pauseSession(sessId) {
  try {
    await apiFetch(`/sessions/${sessId}/pause`, { method: 'POST' });
    showToast('Session paused.', 'info');
    loadActiveSessions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function resumeSession(sessId) {
  try {
    await apiFetch(`/sessions/${sessId}/resume`, { method: 'POST' });
    showToast('Session resumed.', 'success');
    loadActiveSessions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

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
    loadActiveSessions();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

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
    loadActiveSessions();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

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

      // Populate layouts
      document.getElementById('rcpt-invoice-no').innerText = `#SESS-${info.id}`;
      document.getElementById('rcpt-station-name').innerText = info.station_name;
      document.getElementById('rcpt-player-name').innerText = info.player_name;
      document.getElementById('rcpt-loyalty-tier').innerText = `${info.loyalty_tier} discount applied`;
      document.getElementById('rcpt-elapsed-time').innerText = `${info.elapsed_minutes} Mins`;

      document.getElementById('rcpt-game-desc').innerText = `Game Play: ${info.session_type}`;
      document.getElementById('rcpt-game-qty').innerText = info.elapsed_minutes > 0 ? `${(info.elapsed_minutes / 60).toFixed(2)} hr` : '0 hr';
      document.getElementById('rcpt-game-rate').innerText = `₹${parseFloat(billing.game_cost / (info.elapsed_minutes/60 || 1)).toFixed(2)}`;
      document.getElementById('rcpt-game-cost').innerText = `₹${billing.game_cost.toFixed(2)}`;

      // Cafe and Terminal items
      const cafeContainer = document.getElementById('rcpt-cafe-items-container');
      const terminalContainer = document.getElementById('rcpt-terminal-items-container');
      cafeContainer.innerHTML = '';
      if (terminalContainer) { terminalContainer.innerHTML = ''; terminalContainer.style.display = 'none'; }
      
      const posItems = await apiFetch(`/pos/session/${sessId}`);
      if (posItems.success && posItems.items.length > 0) {
        let hasTerminalItems = false;
        let hasCafeItems = false;
        
        posItems.items.forEach(item => {
          const rate = parseFloat(item.unit_price).toFixed(2);
          const total = parseFloat(item.total_price).toFixed(2);
          
          if (parseInt(item.item_id) === 999) {
            hasTerminalItems = true;
            
            let timeDetails = '';
            if (item.terminal_station_name) {
              timeDetails += `<div class="text-[10px] text-slate-500"><span class="text-slate-400">Station:</span> ${item.terminal_station_name}</div>`;
            }
            if (item.terminal_start_time) {
              const startTime = new Date(item.terminal_start_time);
              const fmtTime = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
              timeDetails += `<div class="text-[10px] text-slate-500"><span class="text-slate-400">Time:</span> ${fmtTime(startTime)} - ${item.terminal_end_time ? fmtTime(new Date(item.terminal_end_time)) : 'Now'}</div>`;
              if (item.terminal_target_end_time) {
                timeDetails += `<div class="text-[10px] text-slate-500"><span class="text-slate-400">Target:</span> ${fmtTime(new Date(item.terminal_target_end_time))} (estimated)</div>`;
              }
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
            if (terminalContainer) terminalContainer.appendChild(row);
          } else {
            hasCafeItems = true;
            const row = document.createElement('div');
            row.className = 'grid grid-cols-12 gap-1 text-[11px] text-slate-400';
            row.innerHTML = `
              <span class="col-span-6">+ ${item.item_name}</span>
              <span class="col-span-2 text-center">${item.quantity}</span>
              <span class="col-span-2 text-right">₹${rate}</span>
              <span class="col-span-2 text-right text-slate-300">₹${total}</span>
            `;
            cafeContainer.appendChild(row);
          }
        });
        
        if (hasTerminalItems && terminalContainer) {
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

      updateInvoiceDom(billing.subtotal, 0.00, billing.tax, billing.total);

      document.getElementById('checkout-available-play-hours').innerText = parseFloat(info.play_hours || 0).toFixed(2);
      document.getElementById('checkout-split-play-hours').value = '0.00';
      document.getElementById('checkout-split-cash').value = '0.00';

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
    if (submitBtn) submitBtn.innerText = 'Confirm Checkout';
  }
}

function stopPrepaidSession(sessId) {
  showConfirm('Stop Prepaid Session', "Are you sure you want to stop this prepaid session early and free the station?", async () => {
    try {
      const data = await apiFetch(`/sessions/${sessId}/stop`, { method: 'POST' });
      if (data.success) {
        showToast('Prepaid session stopped early and station cleared!', 'success');
        loadActiveSessions();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

document.getElementById('form-checkout-session').addEventListener('submit', async (e) => {
  e.preventDefault();
  const sessId = document.getElementById('checkout-session-id').value;
  const paymentMethod = document.getElementById('checkout-payment-method').value;
  const couponCode = document.getElementById('checkout-coupon-code').value || null;
  const playHoursSplitAmount = parseFloat(document.getElementById('checkout-split-play-hours').value) || 0.00;
  const cashSplitAmount = parseFloat(document.getElementById('checkout-split-cash').value) || 0.00;

  try {
    const data = await apiFetch(`/billing/checkout/${sessId}`, {
      method: 'POST',
      body: JSON.stringify({
        paymentMethod,
        couponCode,
        playHoursSplitAmount,
        cashSplitAmount
      })
    });

    if (data.success) {
      closeModal('modal-checkout-session');
      showToast('Payment checked out successfully!', 'success');
      loadActiveSessions();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function formatTimeSeconds(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const paddedH = h.toString().padStart(2, '0');
  const paddedM = m.toString().padStart(2, '0');
  const paddedS = s.toString().padStart(2, '0');

  return `${paddedH}:${paddedM}:${paddedS}`;
}
