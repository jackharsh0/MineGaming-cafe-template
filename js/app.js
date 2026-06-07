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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

// Modal open/close helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}


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
  
  let icon = '<i class="fa-solid fa-circle-info text-neonCyan"></i>';
  let border = 'border-neonCyan bg-cyberPanel text-white';

  if (type === 'success') {
    icon = '<i class="fa-solid fa-circle-check text-neonGreen"></i>';
    border = 'border-neonGreen bg-cyberPanel text-white';
  } else if (type === 'error') {
    icon = '<i class="fa-solid fa-circle-exclamation text-neonRed"></i>';
    border = 'border-neonRed bg-cyberPanel text-white';
  } else if (type === 'warning') {
    icon = '<i class="fa-solid fa-triangle-exclamation text-neonGold"></i>';
    border = 'border-neonGold bg-cyberPanel text-white';
  }

  toast.innerHTML = `
    <div class="text-lg">${icon}</div>
    <div class="text-sm font-semibold flex-grow">${message}</div>
    <button class="text-slate-400 hover:text-white" onclick="this.parentElement.remove()">&times;</button>
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
          <h3 class="modal-title text-neonRed font-cyber uppercase" id="confirm-modal-title">Confirm Action</h3>
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

// Sound Effects Helper using Web Audio API
window.SoundEffects = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playTimerEnded() {
    try {
      this.init();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      // Loud retro chime arpeggios
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      // Arpeggio: C5 (523.25) -> E5 (659.25) -> G5 (783.99) -> C6 (1046.50)
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.setValueAtTime(659.25, now + 0.12);
      osc1.frequency.setValueAtTime(783.99, now + 0.24);
      osc1.frequency.setValueAtTime(1046.50, now + 0.36);

      osc2.frequency.setValueAtTime(523.25 / 2, now);
      osc2.frequency.setValueAtTime(659.25 / 2, now + 0.12);
      osc2.frequency.setValueAtTime(783.99 / 2, now + 0.24);
      osc2.frequency.setValueAtTime(1046.50 / 2, now + 0.36);

      gainNode.gain.setValueAtTime(0.5, now); // loud volume!
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
    } catch (err) {
      console.warn('Sound play blocked or failed:', err);
    }
  },
  playNewAppointment() {
    try {
      this.init();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      // Distinct synth song/melody: G5 (783.99) -> C6 (1046.50) -> E6 (1318.51)
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(783.99, now);
      osc.frequency.setValueAtTime(1046.50, now + 0.18);
      osc.frequency.setValueAtTime(1318.51, now + 0.36);

      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.setValueAtTime(0.25, now + 0.36);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (err) {
      console.warn('Sound play blocked or failed:', err);
    }
  }
};

// ==========================================
// Web Audio API Synthesizer (SoundEffects)
// ==========================================
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

  // Helper to play a single synthesized tone with exponential decay
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

  // Loud retro alarm arpeggio for timer ends
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

  // Rich retro-futuristic synth melody for appointment requests
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

// Initialize audio context on any user click interaction (browser security policy bypass)
document.addEventListener('click', () => {
  SoundEffects.init();
}, { passive: true });
window.SoundEffects = SoundEffects;
