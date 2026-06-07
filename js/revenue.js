// Revenue and Analytics Client Logic

let allTransactions = [];
let revenueChart = null;

document.addEventListener('DOMContentLoaded', () => {
  loadRevenueDetails();
  
  // Set up filters
  document.getElementById('txSearch')?.addEventListener('input', applyFilters);
  document.getElementById('filterType')?.addEventListener('change', applyFilters);
  document.getElementById('filterMethod')?.addEventListener('change', applyFilters);
});

async function loadRevenueDetails() {
  const tbody = document.getElementById('transactions-table-body');
  if (!tbody) return;

  try {
    const res = await apiFetch('/analytics/revenue-details');
    if (!res.success) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-neonRed font-bold">Failed to load analytics data!</td></tr>`;
      return;
    }

    const { revenue, graph, transactions } = res.data;
    allTransactions = transactions;

    // 1. Populate aggregate totals
    document.getElementById('revenue-daily').textContent = `₹${parseFloat(revenue.daily || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('revenue-weekly').textContent = `₹${parseFloat(revenue.weekly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('revenue-monthly').textContent = `₹${parseFloat(revenue.monthly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 2. Render Graph
    renderTrendChart(graph);

    // 3. Render Transaction List
    applyFilters();

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-neonRed font-bold">Error connecting to server.</td></tr>`;
  }
}

function renderTrendChart(graphData) {
  const ctx = document.getElementById('revenueTrendChart')?.getContext('2d');
  if (!ctx) return;

  // Destroy previous chart if it exists
  if (revenueChart) {
    revenueChart.destroy();
  }

  const labels = graphData.map(d => d.date);
  const data = graphData.map(d => d.total);

  // Setup gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 240, 255, 0)');

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Revenue (₹)',
        data: data,
        borderColor: '#00f0ff',
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#00f0ff',
        pointBorderColor: '#11131c',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        shadowColor: 'rgba(0, 240, 255, 0.5)',
        shadowBlur: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#171926',
          titleColor: '#00f0ff',
          bodyColor: '#fff',
          borderColor: '#24293c',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function(context) {
              let value = context.parsed.y || 0;
              return `Revenue: ₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#94a3b8',
            font: {
              family: 'Rajdhani',
              size: 11
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#94a3b8',
            font: {
              family: 'Rajdhani',
              size: 11
            },
            callback: function(value) {
              return '₹' + value;
            }
          }
        }
      }
    }
  });
}

function applyFilters() {
  const tbody = document.getElementById('transactions-table-body');
  if (!tbody) return;

  const searchQuery = document.getElementById('txSearch')?.value.toLowerCase().trim() || '';
  const selectedType = document.getElementById('filterType')?.value || 'All';
  const selectedMethod = document.getElementById('filterMethod')?.value || 'All';

  const filtered = allTransactions.filter(tx => {
    // 1. Search Query filter (Customer Name or Reference ID)
    const matchesSearch = searchQuery === '' || 
      tx.customer_name.toLowerCase().includes(searchQuery) ||
      tx.ref_id.toString().toLowerCase().includes(searchQuery);

    // 2. Type filter
    const matchesType = selectedType === 'All' || tx.type === selectedType;

    // 3. Method filter
    const matchesMethod = selectedMethod === 'All' || tx.payment_method === selectedMethod;

    return matchesSearch && matchesType && matchesMethod;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-slate-500 italic">
          <i class="fa-solid fa-folder-open text-lg mb-2 block text-slate-600"></i>
          No transactions match current filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach(tx => {
    const tr = document.createElement('tr');
    
    // Format timestamp
    const date = new Date(tx.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = `${dateStr} @ ${timeStr}`;

    // Format type badge
    let typeBadge = '';
    if (tx.type === 'Game Session') {
      typeBadge = `<span class="badge badge-cyan"><i class="fa-solid fa-gamepad mr-1 text-[9px]"></i>Session</span>`;
    } else {
      typeBadge = `<span class="badge badge-pink"><i class="fa-solid fa-cart-shopping mr-1 text-[9px]"></i>Cafe/Prepaid</span>`;
    }

    // Format payment method badge
    let methodBadge = '';
    const m = tx.payment_method || 'Cash';
    if (m === 'Wallet') {
      methodBadge = `<span class="badge badge-cyan"><i class="fa-solid fa-wallet mr-1 text-[9px]"></i>Wallet</span>`;
    } else if (m === 'Card') {
      methodBadge = `<span class="badge" style="background: rgba(14, 165, 233, 0.1); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3)"><i class="fa-solid fa-credit-card mr-1 text-[9px]"></i>Card</span>`;
    } else if (m === 'Split') {
      methodBadge = `<span class="badge badge-gold"><i class="fa-solid fa-arrows-split-up-and-left mr-1 text-[9px]"></i>Split</span>`;
    } else {
      methodBadge = `<span class="badge" style="background: rgba(255, 255, 255, 0.05); color: #ccc; border: 1px solid rgba(255, 255, 255, 0.15)"><i class="fa-solid fa-money-bill-1 mr-1 text-[9px]"></i>Cash</span>`;
    }

    tr.className = "cursor-pointer hover:bg-slate-800/40 transition duration-150 border-b border-slate-900";
    tr.setAttribute('onclick', `viewReceipt('${tx.type}', ${tx.ref_id})`);

    tr.innerHTML = `
      <td class="font-mono text-xs text-slate-400">${formattedTime}</td>
      <td>${typeBadge}</td>
      <td class="font-mono text-xs text-slate-300">#${tx.ref_id}</td>
      <td class="font-bold text-slate-100">${tx.customer_name}</td>
      <td class="font-mono font-bold text-neonGreen">₹${parseFloat(tx.amount || 0).toFixed(2)}</td>
      <td>${methodBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function viewReceipt(type, refId) {
  const modalContent = document.getElementById('receipt-modal-content');
  if (!modalContent) return;

  modalContent.innerHTML = `
    <div class="text-center py-12 text-slate-500">
      <i class="fa-solid fa-spinner fa-spin fa-2x mb-3 text-neonCyan"></i>
      <p class="text-xs">RETRIEVING TRANSACTION DATA...</p>
    </div>
  `;
  openModal('modal-receipt-view');

  try {
    const res = await apiFetch(`/analytics/receipt/${encodeURIComponent(type)}/${refId}`);
    if (!res.success) {
      modalContent.innerHTML = `
        <div class="text-center py-12 text-neonRed font-bold">
          <i class="fa-solid fa-circle-xmark fa-2x mb-3"></i>
          <p class="text-xs">FAILED TO RETRIEVE RECEIPT</p>
        </div>
      `;
      return;
    }

    const receipt = res.receipt;
    
    // Format timestamp
    const date = new Date(receipt.timestamp);
    const formattedDate = `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let formattedStartTime = 'N/A';
    let formattedEndTime = 'N/A';
    if (receipt.start_time) {
      formattedStartTime = new Date(receipt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (receipt.end_time) {
      formattedEndTime = new Date(receipt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Generate items HTML
    let itemsHTML = '';
    if (receipt.game_cost > 0) {
      itemsHTML += `
        <div class="flex justify-between items-start text-xs">
          <div>
            <div class="font-bold text-slate-200">Gameplay Time Fee</div>
            <div class="text-[9px] text-slate-500">${receipt.elapsed_minutes} mins on ${receipt.station_name}</div>
          </div>
          <span class="font-mono text-slate-100">₹${receipt.game_cost.toFixed(2)}</span>
        </div>
      `;
    }

    if (receipt.items && receipt.items.length > 0) {
      receipt.items.forEach(item => {
        itemsHTML += `
          <div class="flex justify-between items-start text-xs pt-1">
            <div>
              <div class="font-bold text-slate-200">${item.name}</div>
              <div class="text-[9px] text-slate-500">x${item.quantity} @ ₹${item.unit_price.toFixed(2)} each</div>
            </div>
            <span class="font-mono text-slate-100">₹${item.total_price.toFixed(2)}</span>
          </div>
        `;
      });
    }

    if (receipt.game_cost === 0 && (!receipt.items || receipt.items.length === 0)) {
      itemsHTML = `<div class="text-center text-slate-500 italic py-2">No purchased items or gaming fees.</div>`;
    }

    // Payment method layout
    let pMethodBadge = '';
    const pm = receipt.payment_method || 'Cash';
    if (pm === 'Wallet') {
      pMethodBadge = '<span class="badge badge-cyan">Wallet</span>';
    } else if (pm === 'Card') {
      pMethodBadge = '<span class="badge" style="background: rgba(14, 165, 233, 0.1); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3)">Card</span>';
    } else if (pm === 'Split') {
      pMethodBadge = '<span class="badge badge-gold">Split</span>';
    } else {
      pMethodBadge = '<span class="badge" style="background: rgba(255, 255, 255, 0.05); color: #ccc; border: 1px solid rgba(255, 255, 255, 0.15)">Cash</span>';
    }

    modalContent.innerHTML = `
      <div class="text-center border-b border-dashed border-slate-700 pb-3">
        <h4 class="text-white text-base font-bold tracking-widest font-cyber">THE GAMING GARAGE</h4>
        <p class="text-[10px] text-slate-400">JODHPUR'S PREMIER GAMING LOUNGE</p>
        <p class="text-[9px] text-slate-500 font-mono mt-1">Ref Transaction ID: #${receipt.ref_id}</p>
      </div>
      
      <!-- Meta detail grid -->
      <div class="grid grid-cols-2 gap-y-1.5 text-[11px] border-b border-dashed border-slate-700 pb-3">
        <span class="text-slate-400">Timestamp:</span>
        <span class="text-right text-slate-200 font-mono">${formattedDate}</span>
        
        <span class="text-slate-400">Type:</span>
        <span class="text-right text-slate-200">${receipt.type}</span>

        <span class="text-slate-400">Customer:</span>
        <span class="text-right text-slate-200">${receipt.customer_name}</span>

        <span class="text-slate-400">Contact No:</span>
        <span class="text-right text-slate-200 font-mono">${receipt.customer_phone}</span>

        <span class="text-slate-400">Membership Tier:</span>
        <span class="text-right text-neonCyan font-cyber font-bold tracking-wider">${receipt.customer_tier}</span>

        <span class="text-slate-400">Processed By:</span>
        <span class="text-right text-slate-200">${receipt.staff_name}</span>
      </div>

      <!-- Session Specific stats if applicable -->
      ${receipt.type === 'Game Session' ? `
      <div class="border-b border-dashed border-slate-700 pb-3 text-[11px] space-y-1.5">
        <div class="flex justify-between font-bold text-neonCyan font-cyber">
          <span>STATION ASSIGNMENT</span>
          <span>${receipt.station_name} [${receipt.station_type}]</span>
        </div>
        <div class="flex justify-between">
          <span>Config:</span>
          <span>x${receipt.controller_count} Controller(s) @ ₹${receipt.hourly_rate.toFixed(2)}/hr</span>
        </div>
        <div class="flex justify-between">
          <span>Elapsed Time:</span>
          <span>${receipt.elapsed_minutes} mins (Paused: ${Math.floor(receipt.paused_seconds / 60)}m)</span>
        </div>
        <div class="flex justify-between text-[10px]">
          <span>Time Session Range:</span>
          <span class="font-mono text-slate-400">${formattedStartTime} - ${formattedEndTime}</span>
        </div>
      </div>
      ` : ''}

      <!-- Items detail list -->
      <div class="border-b border-dashed border-slate-700 pb-3">
        <div class="font-bold text-[11px] text-neonPink uppercase tracking-wider mb-2 font-cyber">Receipt Items</div>
        <div class="space-y-2">
          ${itemsHTML}
        </div>
      </div>

      <!-- Summary aggregates -->
      <div class="text-[11px] space-y-1.5">
        <div class="flex justify-between">
          <span class="text-slate-400">Subtotal:</span>
          <span class="font-mono text-slate-200">₹${receipt.subtotal.toFixed(2)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Discount Applied:</span>
          <span class="font-mono text-neonRed">-₹${receipt.discount.toFixed(2)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">G.S.T (10%):</span>
          <span class="font-mono text-slate-200">₹${receipt.tax.toFixed(2)}</span>
        </div>
        
        <div class="flex justify-between text-xs font-bold border-t border-dashed border-slate-700 pt-3 text-white">
          <span>GRAND TOTAL:</span>
          <span class="font-mono text-neonGreen text-sm">₹${receipt.total.toFixed(2)}</span>
        </div>
        
        <div class="flex justify-between items-center pt-2">
          <span class="text-slate-400">Payment Status:</span>
          <div class="flex items-center gap-2">
            <span class="badge badge-green">PAID</span>
            ${pMethodBadge}
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    console.error(err);
    modalContent.innerHTML = `
      <div class="text-center py-12 text-neonRed font-bold">
        <i class="fa-solid fa-circle-exclamation fa-2x mb-3"></i>
        <p class="text-xs">ERROR CONNECTING TO SERVER: ${err.message}</p>
      </div>
    `;
  }
}
