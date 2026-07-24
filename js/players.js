// Players and Membership Client Actions

let allPlayers = [];

document.addEventListener('DOMContentLoaded', () => {
  loadPlayersList();
});

async function loadPlayersList() {
  const tbody = document.getElementById('players-table-body');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-6 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading player database...
      </td>
    </tr>
  `;

  try {
    const data = await apiFetch('/players');
    if (data.success) {
      allPlayers = data.players;
      renderPlayersTable(data.players);
    }
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-6 text-rust font-bold">Failed to load player database: ${err.message}</td>
      </tr>
    `;
  }
}

async function searchPlayers(query) {
  if (!query) {
    loadPlayersList();
    return;
  }

  const tbody = document.getElementById('players-table-body');
  try {
    const data = await apiFetch(`/players/search?query=${query}`);
    if (data.success) {
      allPlayers = data.players;
      renderPlayersTable(data.players);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderPlayersTable(players) {
  const tbody = document.getElementById('players-table-body');
  if (!tbody) return;
  
  if (players.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-6 text-slate-500">No players found matching your query.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  players.forEach(player => {
    const tr = document.createElement('tr');

    let tierBadge = '';
    if (player.loyalty_tier === 'Gold') {
      tierBadge = '<span class="badge badge-gold font-cyber"><i class="fa-solid fa-crown mr-1"></i>Gold</span>';
    } else if (player.loyalty_tier === 'Silver') {
      tierBadge = '<span class="badge badge-cyan font-cyber"><i class="fa-solid fa-medal mr-1"></i>Silver</span>';
    } else {
      tierBadge = '<span class="badge badge-pink font-cyber">Bronze</span>';
    }

    let blacklistBadge = player.is_blacklisted 
      ? `<span class="badge badge-red hover:underline cursor-pointer" title="${player.blacklist_notes || 'No reason specified'}"><i class="fa-solid fa-user-slash mr-1"></i>Banned</span>`
      : '<span class="badge badge-green">Active</span>';

    const isSuperAdmin = window.CURRENT_USER_ROLE === 'SuperAdmin';
    const isManager = window.CURRENT_USER_ROLE === 'Manager';
    const isAuthorized = isSuperAdmin || isManager;
    let actionButtons = `
      <div class="flex gap-2">
        ${isAuthorized ? `
          <button onclick="triggerLoadWallet(${player.id})" class="btn btn-success btn-sm" title="Adjust Play Hours">
            <i class="fa-solid fa-clock"></i>
          </button>
          <button onclick="triggerLoyaltyAdjust(${player.id})" class="btn btn-primary btn-sm" title="Adjust Loyalty">
            <i class="fa-solid fa-medal text-cream"></i>
          </button>
        ` : ''}
        <button onclick="triggerHistory(${player.id})" class="btn btn-secondary btn-sm" title="Play History">
          <i class="fa-solid fa-clock-rotate-left"></i>
        </button>
        ${isAuthorized ? `
          <button onclick="triggerBlacklist(${player.id})" class="btn btn-secondary btn-sm animate-pulse-once" title="Toggle Blacklist">
            <i class="fa-solid fa-user-slash text-rust"></i>
          </button>
          <button onclick="deletePlayer(${player.id}, '${player.name.replace(/'/g, "\\'")}', ${player.play_hours})" class="btn btn-danger btn-sm" title="Delete Profile">
            <i class="fa-solid fa-trash"></i>
          </button>
        ` : ''}
      </div>
    `;

    tr.innerHTML = `
      <td class="font-semibold text-slate-100">${player.name}</td>
      <td class="font-mono text-xs">${player.phone}</td>
      <td class="text-xs text-slate-400">${player.email || '-'}</td>
      <td class="font-bold text-forest">${parseFloat(player.play_hours).toFixed(2)} Hrs</td>
      <td class="font-semibold">${player.loyalty_points} pts</td>
      <td>${tierBadge}</td>
      <td>${blacklistBadge}</td>
      <td>${actionButtons}</td>
    `;
    tbody.appendChild(tr);
  });
}

function triggerRegisterPlayer() {
  document.getElementById('reg-name').value = '';
  document.getElementById('reg-phone').value = '+91';
  document.getElementById('reg-email').value = '';
  openModal('modal-player-register');
}

document.getElementById('form-player-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const email = document.getElementById('reg-email').value.trim() || null;

  try {
    await apiFetch('/players', {
      method: 'POST',
      body: JSON.stringify({ name, phone, email })
    });
    closeModal('modal-player-register');
    showToast('Player profile registered successfully!', 'success');
    loadPlayersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function triggerLoadWallet(id) {
  const player = allPlayers.find(p => p.id === id);
  if (!player) return;
  document.getElementById('wallet-player-id').value = id;
  document.getElementById('wallet-modal-title').innerText = `Adjust Play Hours: ${player.name}`;
  document.getElementById('wallet-tx-type').value = 'credit';
  document.getElementById('wallet-amount').value = 2;
  document.getElementById('wallet-reason').value = '';
  toggleWalletDebitReason('credit');
  openModal('modal-wallet-load');
}

function toggleWalletDebitReason(type) {
  const group = document.getElementById('wallet-reason-group');
  const reasonInput = document.getElementById('wallet-reason');
  const submitBtn = document.getElementById('btn-wallet-submit');
  if (type === 'debit') {
    group.style.display = 'block';
    reasonInput.required = true;
    submitBtn.className = 'btn btn-danger';
    submitBtn.innerText = 'Deduct Hours';
  } else {
    group.style.display = 'none';
    reasonInput.required = false;
    submitBtn.className = 'btn btn-success';
    submitBtn.innerText = 'Load Hours';
  }
}

document.getElementById('form-wallet-load').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('wallet-player-id').value;
  const amount = parseFloat(document.getElementById('wallet-amount').value);
  const transactionType = document.getElementById('wallet-tx-type').value;
  const reason = document.getElementById('wallet-reason').value.trim() || null;

  try {
    const data = await apiFetch(`/players/${id}/play-hours`, {
      method: 'POST',
      body: JSON.stringify({ amount, transactionType, reason })
    });
    closeModal('modal-wallet-load');
    showToast(transactionType === 'debit' ? `Deducted ${amount.toFixed(2)} hours` : `Loaded ${amount.toFixed(2)} play hours`, 'success');
    loadPlayersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function triggerBlacklist(id) {
  const player = allPlayers.find(p => p.id === id);
  if (!player) return;
  document.getElementById('blacklist-player-id').value = id;
  document.getElementById('blacklist-modal-title').innerText = `Restrict Access: ${player.name}`;
  document.getElementById('blacklist-toggle').value = player.is_blacklisted ? '1' : '0';
  document.getElementById('blacklist-notes').value = player.blacklist_notes || '';
  openModal('modal-player-blacklist');
}

document.getElementById('form-player-blacklist').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('blacklist-player-id').value;
  const is_blacklisted = document.getElementById('blacklist-toggle').value === '1';
  const blacklist_notes = document.getElementById('blacklist-notes').value.trim();

  try {
    await apiFetch(`/players/${id}/blacklist`, {
      method: 'PATCH',
      body: JSON.stringify({ is_blacklisted, blacklist_notes })
    });
    closeModal('modal-player-blacklist');
    showToast('Player status updated', 'success');
    loadPlayersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function triggerHistory(id) {
  const player = allPlayers.find(p => p.id === id);
  if (!player) return;
  document.getElementById('history-modal-title').innerText = `${player.name}'s Play History`;
  const tbody = document.getElementById('history-table-body');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-6 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading histories...
      </td>
    </tr>
  `;

  try {
    const data = await apiFetch(`/players/${id}/history`);
    if (data.success) {
      document.getElementById('hist-profile-tier').innerText = data.player.loyalty_tier;
      document.getElementById('hist-profile-points').innerText = `${data.player.loyalty_points} PTS`;

      const list = data.history;
      if (list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-6 text-slate-500">No session history on record.</td>
          </tr>
        `;
      } else {
        tbody.innerHTML = '';
        list.forEach(sess => {
          const tr = document.createElement('tr');
          const start = new Date(sess.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          
          let statBadge = '';
          if (sess.status === 'Completed') {
            statBadge = '<span class="badge badge-green">Done</span>';
          } else if (sess.status === 'Active') {
            statBadge = '<span class="badge badge-cyan">Playing</span>';
          } else {
            statBadge = `<span class="badge badge-red">${sess.status}</span>`;
          }

          tr.innerHTML = `
            <td class="font-bold text-slate-100 font-cyber text-xs">${sess.station_name}</td>
            <td class="text-xs">${sess.session_type}</td>
            <td class="font-mono text-[10px]">${start}</td>
            <td class="font-semibold text-forest text-xs">₹${parseFloat(sess.total_cost).toFixed(2)}</td>
            <td>${statBadge}</td>
          `;
          tbody.appendChild(tr);
        });
      }
      openModal('modal-player-history');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Trigger loyalty adjust modal
function triggerLoyaltyAdjust(id) {
  const player = allPlayers.find(p => p.id === id);
  if (!player) return;
  document.getElementById('loyalty-player-id').value = id;
  document.getElementById('loyalty-points-input').value = player.loyalty_points;
  openModal('modal-loyalty-adjust');
}

// Loyalty override form submission
document.getElementById('form-loyalty-adjust').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('loyalty-player-id').value;
  const points = parseInt(document.getElementById('loyalty-points-input').value);

  try {
    await apiFetch(`/players/${id}/loyalty`, {
      method: 'POST',
      body: JSON.stringify({ points })
    });
    closeModal('modal-loyalty-adjust');
    showToast('Loyalty points updated successfully!', 'success');
    loadPlayersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Delete Player account (GDPR & Data deletion request)
function deletePlayer(id, name, balance) {
  let warningMessage = `Are you absolutely sure you want to permanently delete player ${name}? All their details will be removed from the system.`;
  if (parseFloat(balance) > 0) {
    warningMessage = `⚠️ WARNING: Player ${name} currently has a positive play hours balance of ${parseFloat(balance).toFixed(2)} Hours!\n\nDeleting this profile will permanently forfeit this balance. Do you still want to proceed?`;
  }

  showConfirm('Delete Player Profile', warningMessage, async () => {
    try {
      await apiFetch(`/players/${id}`, { method: 'DELETE' });
      showToast(`Successfully deleted player: ${name}`, 'success');
      loadPlayersList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// Export members directory to CSV format
function exportPlayerRoster() {
  if (allPlayers.length === 0) {
    showToast('No player profiles found to export', 'error');
    return;
  }

  const headers = ['Name', 'Phone', 'Email', 'Play Hours Balance (Hrs)', 'Loyalty Points', 'Loyalty Tier', 'Status'];
  const rows = allPlayers.map(p => [
    `"${p.name.replace(/"/g, '""')}"`,
    `"${p.phone}"`,
    `"${(p.email || '').replace(/"/g, '""')}"`,
    parseFloat(p.play_hours).toFixed(2),
    p.loyalty_points,
    p.loyalty_tier,
    p.is_blacklisted ? 'Banned' : 'Active'
  ]);

  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `players_roster_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Player roster exported to CSV successfully!', 'success');
}
