// Core application helpers for Gaming Zone

// Global fetch API wrapper that includes JWT authentication headers
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (window.JWT_TOKEN) {
    headers['Authorization'] = `Bearer ${window.JWT_TOKEN}`;
  }

  const response = await fetch(`${window.BACKEND_URL}${endpoint}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Server returned an invalid response (status ' + response.status + '). Please contact support.');
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || data.message === 'Invalid or Expired Token') {
      window.location.href = 'logout.php';
      return;
    }
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

// Modal open/close helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const focusEl = modal.querySelector('input, select, button:not(.btn-modal-close)');
    if (focusEl) setTimeout(() => focusEl.focus(), 50);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// Global Escape key to close any active modal overlay
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) {
      activeModal.classList.remove('active');
      activeModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }
});


// Global alert notification (Toast)
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `p-4 rounded shadow-lg transition duration-300 transform translate-y-2 opacity-0 flex items-center gap-3 max-w-sm pointer-events-auto border`;
  
  let icon = '<i class="fa-solid fa-circle-info text-wood"></i>';
  let border = 'border-wood bg-parchment text-slate-100';

  if (type === 'success') {
    icon = '<i class="fa-solid fa-circle-check text-forest"></i>';
    border = 'border-forest bg-parchment text-slate-100';
  } else if (type === 'error') {
    icon = '<i class="fa-solid fa-circle-exclamation text-rust"></i>';
    border = 'border-rust bg-parchment text-slate-100';
  } else if (type === 'warning') {
    icon = '<i class="fa-solid fa-triangle-exclamation text-brass"></i>';
    border = 'border-brass bg-parchment text-slate-100';
  }

  toast.innerHTML = `
    <div class="text-lg">${icon}</div>
    <div class="text-sm font-semibold flex-grow">${message}</div>
    <button class="text-slate-400 hover:text-slate-100" onclick="this.parentElement.remove()">&times;</button>
  `;

  toast.className += ` ${border}`;
  toastContainer.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Remove toast
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global reusable confirm modal helper
window.showConfirm = function(title, message, onConfirm) {
  let modal = document.getElementById('modal-confirm-action');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-confirm-action';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container max-w-sm">
        <div class="modal-header">
          <h3 class="modal-title text-rust font-cyber uppercase" id="confirm-modal-title">Confirm Action</h3>
          <button class="btn-modal-close" onclick="closeModal('modal-confirm-action')">&times;</button>
        </div>
        <div class="modal-body">
          <p id="confirm-modal-message" class="text-sm text-slate-300">Are you sure you want to perform this action?</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-confirm-action')">Cancel</button>
          <button type="button" id="btn-confirm-action-submit" class="btn btn-danger">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  document.getElementById('confirm-modal-title').innerText = title;
  document.getElementById('confirm-modal-message').innerText = message;
  
  const confirmBtn = document.getElementById('btn-confirm-action-submit');
  
  // Clone button to remove previous event listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newConfirmBtn.addEventListener('click', () => {
    closeModal('modal-confirm-action');
    onConfirm();
  });
  
  openModal('modal-confirm-action');
};

// Initialize on page loads
document.addEventListener('DOMContentLoaded', () => {
  // Global DOM initialization if needed
  
  // Auto-resume AudioContext on first interaction
  document.addEventListener('click', () => {
    if (window.SoundEffects) {
      window.SoundEffects.init();
      if (window.SoundEffects.ctx && window.SoundEffects.ctx.state === 'suspended') {
        window.SoundEffects.ctx.resume();
      }
    }
  }, { once: true });
});

// Web Audio API Synthesizer (SoundEffects) is defined below.

// Web Audio API synthesizer
const SoundEffects = {
  ctx: null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // Play a synthesized tone
  playTone(freq, type, duration, startTime, volume = 0.5) {
    try {
      this.init();
      if (!this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      console.warn('Failed to play tone:', e);
    }
  },

  // Timer ended sound
  playTimerEnded() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      let timeOffset = 0;
      
      // Play 3 loud bursts of a fast sawtooth arpeggio
      for (let burst = 0; burst < 3; burst++) {
        const burstStart = now + timeOffset;
        this.playTone(880, 'sawtooth', 0.15, burstStart, 0.8);
        this.playTone(1046.5, 'sawtooth', 0.15, burstStart + 0.1, 0.8);
        this.playTone(1318.5, 'sawtooth', 0.15, burstStart + 0.2, 0.8);
        this.playTone(1760, 'sawtooth', 0.35, burstStart + 0.3, 0.9);
        timeOffset += 0.55;
      }
    } catch (e) {
      console.error('Failed to play Timer Ended sound:', e);
    }
  },

  // New appointment sound
  playNewAppointment() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const notes = [
        { freq: 523.25, dur: 0.2, time: 0.0, vol: 0.6 },  // C5
        { freq: 783.99, dur: 0.2, time: 0.15, vol: 0.6 }, // G5
        { freq: 659.25, dur: 0.2, time: 0.3, vol: 0.6 },  // E5
        { freq: 1046.50, dur: 0.2, time: 0.45, vol: 0.7 }, // C6
        { freq: 1567.98, dur: 0.4, time: 0.6, vol: 0.8 }   // G6
      ];

      notes.forEach(n => {
        this.playTone(n.freq, 'sine', n.dur, now + n.time, n.vol);
        this.playTone(n.freq / 2, 'triangle', n.dur * 1.5, now + n.time, n.vol * 0.4);
      });
    } catch (e) {
      console.error('Failed to play New Appointment sound:', e);
    }
  }
};

  // Initialize audio on click (browser autoplay policy)
document.addEventListener('click', () => {
  SoundEffects.init();
}, { passive: true });
window.SoundEffects = SoundEffects;

window.initMemberSlider = function(targetId, valueType = 'id', allowGuest = true) {
  const target = document.getElementById(targetId);
  if (!target) return;

  // Prevent double-initialization
  const existingWidget = document.querySelector(`.member-slider-widget[data-target="${targetId}"]`);
  if (existingWidget) {
    existingWidget.remove();
  }

  // Create widget container
  const widget = document.createElement('div');
  widget.className = 'member-slider-widget mt-2 w-full';
  widget.setAttribute('data-target', targetId);

  // Widget layout
  widget.innerHTML = `
    <!-- Top search bar only (no Add buttons or register forms) -->
    <div class="relative w-full mb-2">
      <span class="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-500 text-xs">
        <i class="fa-solid fa-magnifying-glass"></i>
      </span>
      <input type="text" placeholder="Search by name/phone or enter new number..." class="form-control text-xs w-full pl-7 pr-2 py-1.5 bg-slate-900/40 border border-slate-800 rounded text-slate-200 slider-search-input">
    </div>

    <!-- Horizontal scroll slider list -->
    <div class="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin max-w-full slider-cards-container" style="min-height: 80px;">
      <div class="text-xs text-slate-400 p-2 animate-pulse">Loading members...</div>
    </div>
  `;

  // Hide the original target select/input element
  target.style.display = 'none';
  target.parentNode.insertBefore(widget, target.nextSibling);

  // References
  const searchInput = widget.querySelector('.slider-search-input');
  const cardsContainer = widget.querySelector('.slider-cards-container');

  let playersList = [];
  let selectedValue = target.value;

  // Direct register new player
  async function handleDirectAddPlayer(phone) {
    const defaultName = `Player ${phone}`;
    try {
      showToast(`Registering new member: ${phone}...`, 'info');
      const res = await apiFetch('/players', {
        method: 'POST',
        body: JSON.stringify({ name: defaultName, phone })
      });
      if (res.success) {
        showToast('Player registered successfully!', 'success');
        const valToSelect = valueType === 'phone' ? res.player.phone : res.player.id;
        await refreshList(valToSelect);
      }
    } catch (err) {
      showToast(err.message || 'Failed to register player', 'error');
    }
  }

  // Fetch and render players
  async function refreshList(selectValueOnLoad = null) {
    try {
      const data = await apiFetch('/players');
      if (data.success) {
        playersList = data.players.filter(p => !p.is_blacklisted);
        renderCards(selectValueOnLoad);
      }
    } catch (err) {
      console.error('Failed to load players for slider:', err);
      cardsContainer.innerHTML = `<div class="text-xs text-rust p-2">Failed to load members</div>`;
    }
  }

  // Render cards based on search query
  function renderCards(selectValueOnLoad = null) {
    const isDisabled = target.disabled || target.readOnly;
    const topRow = widget.querySelector('.relative.w-full.mb-2');
    if (topRow) {
      topRow.style.display = isDisabled ? 'none' : 'block';
    }
    if (isDisabled) {
      cardsContainer.classList.add('pointer-events-none', 'opacity-80');
    } else {
      cardsContainer.classList.remove('pointer-events-none', 'opacity-80');
    }

    const query = searchInput.value.trim().toLowerCase();
    const filtered = playersList.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.phone.includes(query)
    );

    cardsContainer.innerHTML = '';

    // Render guest card
    if (allowGuest && !query) {
      const guestCard = document.createElement('div');
      guestCard.className = `flex-shrink-0 w-28 p-2 rounded border cursor-pointer flex flex-col items-center justify-center text-center transition-all duration-300 hover-3d-push `;
      
      const isGuestSelected = !selectedValue;
      if (isGuestSelected) {
        guestCard.className += 'bg-wood/20 border-wood text-slate-100 font-bold';
      } else {
        guestCard.className += 'bg-slate-900/20 border-slate-800/60 hover:bg-slate-900/40 text-slate-300';
      }

      guestCard.innerHTML = `
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-700 text-slate-200 uppercase">
          <i class="fa-solid fa-user-secret"></i>
        </div>
        <div class="text-[10px] font-cyber font-bold truncate mt-1 max-w-full">Guest Walk-in</div>
        <div class="text-[8px] text-slate-500 font-mono">No membership</div>
      `;

      guestCard.addEventListener('click', () => {
        selectCard('', guestCard);
      });

      cardsContainer.appendChild(guestCard);
    }

    // Render player cards
    filtered.forEach(player => {
      const playerVal = valueType === 'phone' ? player.phone : player.id;
      const isSelected = String(selectedValue) === String(playerVal) || String(selectValueOnLoad) === String(playerVal);
      
      if (isSelected && selectValueOnLoad) {
        selectedValue = playerVal;
        target.value = playerVal;
        target.dispatchEvent(new Event('change', { bubbles: true }));
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const card = document.createElement('div');
      card.className = `flex-shrink-0 w-32 p-2 rounded border cursor-pointer flex flex-col items-center justify-center text-center transition-all duration-300 hover-3d-float `;
      
      if (isSelected) {
        card.className += 'bg-wood/10 border-wood-gold text-slate-100 font-bold';
      } else {
        card.className += 'bg-slate-900/20 border-slate-800/60 hover:bg-slate-900/40 text-slate-300';
      }

      // Initial letters
      const initials = player.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      card.innerHTML = `
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold bg-wood text-parchment uppercase relative">
          <span>${initials}</span>
          <span class="absolute -bottom-1 -right-1 text-[8px] px-1 rounded-full font-bold ${
            player.loyalty_tier === 'Gold' ? 'bg-brass text-slate-950 font-bold' :
            player.loyalty_tier === 'Silver' ? 'bg-slate-400 text-slate-950' : 'bg-amber-800 text-slate-200'
          }">${player.loyalty_tier[0]}</span>
        </div>
        <div class="text-[10px] font-bold truncate mt-1 max-w-full" title="${player.name}">${player.name}</div>
        <div class="text-[8px] text-slate-500 font-mono">${player.phone}</div>
        <div class="text-[8px] text-wood font-semibold mt-1">Hrs: ${parseFloat(player.play_hours).toFixed(2)}</div>
      `;

      card.addEventListener('click', () => {
        selectCard(playerVal, card);
      });

      cardsContainer.appendChild(card);
    });

    // Direct add card for phone number queries
    const cleanedQuery = query.replace(/[^0-9+]/g, '');
    const isNumericQuery = /^\+?[0-9]{4,15}$/.test(cleanedQuery);
    if (isNumericQuery && !isDisabled) {
      const hasExactMatch = playersList.some(p => p.phone === cleanedQuery);
      if (!hasExactMatch) {
        const addCard = document.createElement('div');
        addCard.className = `flex-shrink-0 w-28 p-2 rounded border border-dashed border-wood-gold bg-wood/5 hover:bg-wood/15 cursor-pointer flex flex-col items-center justify-center text-center transition-all duration-300 hover-3d-push text-wood-gold`;
        addCard.innerHTML = `
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-wood text-parchment uppercase">
            <i class="fa-solid fa-user-plus"></i>
          </div>
          <div class="text-[10px] font-bold truncate mt-1 max-w-full">Add Member</div>
          <div class="text-[8px] text-slate-500 font-mono">${cleanedQuery}</div>
          <div class="text-[8px] text-wood font-semibold mt-1">Register Now</div>
        `;
        addCard.addEventListener('click', () => {
          handleDirectAddPlayer(cleanedQuery);
        });
        cardsContainer.appendChild(addCard);
      }
    }

    if (filtered.length === 0 && (!allowGuest || query) && !isNumericQuery) {
      cardsContainer.innerHTML = `<div class="text-xs text-slate-500 p-3 italic">No registered members found.</div>`;
    }
  }

  // Select card handler
  function selectCard(val, cardElement) {
    if (target.disabled || target.readOnly) return;
    selectedValue = val;
    target.value = val;
    
    // Dispatch events to trigger any dynamic PHP/JS form handlers
    target.dispatchEvent(new Event('change', { bubbles: true }));
    target.dispatchEvent(new Event('input', { bubbles: true }));

    // Re-render cards to show active select border
    renderCards();
  }

  // Search filter listener
  searchInput.addEventListener('input', () => {
    renderCards();
  });

  // Initial load
  refreshList(selectedValue);

  // Sync back if target changes externally (e.g. from reset forms)
  const syncObserver = new MutationObserver(() => {
    if (String(target.value) !== String(selectedValue)) {
      selectedValue = target.value;
      renderCards();
    }
  });
  syncObserver.observe(target, { attributes: true, childList: true, characterData: true });
  
  // Also hook into periodic select/input value change polls
  const checkValInterval = setInterval(() => {
    if (!document.body.contains(widget)) {
      clearInterval(checkValInterval);
      return;
    }
    if (String(target.value) !== String(selectedValue)) {
      selectedValue = target.value;
      renderCards();
    }
  }, 500);
};
