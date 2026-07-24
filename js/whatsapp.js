// WhatsApp Business Billing Integration Frontend Controller

let activeChats = [];
let currentChatId = null;
let chatFilterText = '';

document.addEventListener('DOMContentLoaded', () => {
  // Fetch initial connection status and configuration
  fetchWhatsAppStatus();
  fetchWhatsAppSettings();
  fetchQueueLogs();

  // Listen to Server-Sent Events (SSE) for status updates
  window.addEventListener('whatsappStatusChanged', (e) => {
    handleWhatsAppStatus(e.detail);
    fetchQueueLogs();
  });

  // Listen to SSE for real-time messages
  window.addEventListener('whatsappMessageReceived', (e) => {
    handleWhatsAppMessage(e.detail);
    fetchQueueLogs();
  });

  // Setup periodic polling fallback (every 8 seconds) in case SSE drops
  setInterval(fetchWhatsAppStatus, 8000);
  setInterval(fetchQueueLogs, 10000);
});

// Update the DOM elements based on connection status
function handleWhatsAppStatus(data) {
  const statusBadge = document.getElementById('wa-status-badge');
  const qrContainer = document.getElementById('wa-qr-container');
  const qrPlaceholder = document.getElementById('wa-qr-placeholder');
  const qrWrapper = document.getElementById('wa-qr-wrapper');
  const qrImg = document.getElementById('wa-qr-img');
  const detailsContainer = document.getElementById('wa-details-container');
  
  const userNameEl = document.getElementById('wa-user-name');
  const userNumberEl = document.getElementById('wa-user-number');
  const platformEl = document.getElementById('wa-device-platform');

  if (!statusBadge) return;

  // Reset status badge classes
  statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ';
  statusBadge.innerText = data.status;

  switch (data.status) {
    case 'Disconnected':
      statusBadge.classList.add('bg-rust/10', 'border', 'border-rust', 'text-rust');
      closeMessengerModal();
      
      qrContainer.classList.remove('hidden');
      qrPlaceholder.classList.remove('hidden');
      qrWrapper.classList.add('hidden');
      detailsContainer.classList.add('hidden');
      break;

    case 'Connecting':
      statusBadge.classList.add('bg-brass/10', 'border', 'border-brass', 'text-brass');
      closeMessengerModal();
      
      qrContainer.classList.remove('hidden');
      qrPlaceholder.classList.remove('hidden');
      qrPlaceholder.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin text-5xl text-wood mb-2"></i>
        <p class="text-xs text-slate-400 font-cyber uppercase tracking-wider mb-2">Connecting to WhatsApp...</p>
        <button onclick="refreshQRCode()" class="btn btn-danger btn-sm py-1.5 px-3 text-[10px] uppercase mt-2 cursor-pointer relative z-10">
          <i class="fa-solid fa-rotate mr-1"></i> Reset Connection
        </button>
      `;
      qrWrapper.classList.add('hidden');
      detailsContainer.classList.add('hidden');
      break;

    case 'QR_Ready':
      statusBadge.classList.add('bg-cyan/10', 'border', 'border-cyan', 'text-cyan');
      statusBadge.innerText = 'Scan QR';
      closeMessengerModal();

      qrContainer.classList.remove('hidden');
      qrPlaceholder.classList.add('hidden');
      qrWrapper.classList.remove('hidden');
      qrImg.src = data.qr;
      detailsContainer.classList.add('hidden');
      break;

    case 'Connected':
      statusBadge.classList.add('bg-forest/10', 'border', 'border-forest', 'text-forest');

      // Keep main status panel, show Connected details
      qrContainer.classList.add('hidden');
      detailsContainer.classList.remove('hidden');

      if (data.user) {
        userNameEl.innerText = data.user.name || 'WhatsApp Client';
        userNumberEl.innerText = `+${data.user.number}`;
        platformEl.innerText = data.user.platform || 'WhatsApp Web';
      }
      break;
  }
}

// Fetch WhatsApp status from backend api
async function fetchWhatsAppStatus() {
  const errorAlert = document.getElementById('wa-connection-error-alert');
  try {
    const data = await apiFetch('/whatsapp/status');
    if (data.success) {
      if (errorAlert) errorAlert.classList.add('hidden');
      handleWhatsAppStatus(data);
    }
  } catch (err) {
    console.error('Failed to fetch WhatsApp status:', err);
    if (errorAlert) {
      errorAlert.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1.5"></i> <strong>API Error:</strong> ${err.message}<br><span class="text-[10px] opacity-75">URL: ${window.BACKEND_URL}/whatsapp/status</span>`;
      errorAlert.classList.remove('hidden');
    }
  }
}

// Fetch auto-billing settings
async function fetchWhatsAppSettings() {
  try {
    const data = await apiFetch('/whatsapp/settings');
    if (data.success) {
      const checkbox = document.getElementById('setting-auto-bill');
      if (checkbox) checkbox.checked = data.enabled;

      // Update pacing lever status based on database values
      const min = data.pacingMin || 7;
      const max = data.pacingMax || 15;
      
      let pos = 2; // Default to Safe
      if (min === 3 && max === 6) {
        pos = 1;
      } else if (min === 15 && max === 30) {
        pos = 3;
      }
      
      setLeverPosition(pos, false); // Initialize the lever position without firing a DB write
    }
  } catch (err) {
    console.error('Failed to load WhatsApp settings:', err);
  }
}

// Toggle automatic billing messages
async function toggleAutoBilling(enabled) {
  try {
    const data = await apiFetch('/whatsapp/settings', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
    if (data.success) {
      showToast(enabled ? 'Automatic billing enabled!' : 'Automatic billing disabled.', 'success');
      const checkbox = document.getElementById('setting-auto-bill');
      if (checkbox) checkbox.checked = enabled;
    }
  } catch (err) {
    showToast(err.message || 'Failed to update settings', 'error');
    const checkbox = document.getElementById('setting-auto-bill');
    if (checkbox) checkbox.checked = !enabled;
  }
}

// Trigger logout/disconnection
async function triggerDisconnect() {
  if (!confirm('Are you sure you want to disconnect this WhatsApp account? Automated receipts will no longer be sent.')) {
    return;
  }

  const badge = document.getElementById('wa-status-badge');
  if (badge) badge.innerText = 'Disconnecting...';

  try {
    const data = await apiFetch('/whatsapp/logout', { method: 'POST' });
    if (data.success) {
      showToast('WhatsApp account disconnected successfully', 'success');
      activeChats = [];
      currentChatId = null;
      closeMessengerModal();
      fetchWhatsAppStatus();
    }
  } catch (err) {
    showToast(err.message || 'Failed to disconnect', 'error');
    fetchWhatsAppStatus();
  }
}

// Open Live Chat Modal
function openMessengerModal() {
  const modal = document.getElementById('wa-messenger-modal');
  if (modal) {
    modal.classList.remove('hidden');
    loadChatList();
  }
}

// Close Live Chat Modal
function closeMessengerModal() {
  const modal = document.getElementById('wa-messenger-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Fetch WhatsApp Queue Logs
async function fetchQueueLogs() {
  const tbody = document.getElementById('queue-logs-body');
  if (!tbody) return;

  try {
    const data = await apiFetch('/whatsapp/queue');
    if (data.success && data.queue) {
      if (data.queue.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-4 text-center text-slate-500 font-cyber uppercase tracking-wider text-[10px]">No recent messages in the queue</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.queue.map(item => {
        let statusClass = 'bg-rust/10 border border-rust text-rust';
        if (item.status === 'sent') statusClass = 'bg-forest/10 border border-forest text-forest';
        else if (item.status === 'sending') statusClass = 'bg-brass/10 border border-brass text-brass animate-pulse';
        else if (item.status === 'pending') statusClass = 'bg-[#0284c7]/10 border border-[#0284c7] text-[#0284c7]';
        
        const dateStr = new Date(item.created_at).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const errorDetails = item.error_message ? escapeHtml(item.error_message) : '-';
        const msgType = item.message_type === 'pdf_invoice' ? '🧾 PDF Receipt' : '💬 Text Message';

        return `
          <tr class="hover:bg-cream/40 transition-colors">
            <td class="py-2 px-3 font-mono text-[10px] text-slate-500">#${item.id}</td>
            <td class="py-2 px-3 font-mono text-[10px] text-slate-700">+${escapeHtml(item.to_phone)}</td>
            <td class="py-2 px-3 font-bold text-wood text-[10px]">${msgType}</td>
            <td class="py-2 px-3">
              <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusClass}">
                ${item.status}
              </span>
            </td>
            <td class="py-2 px-3 font-mono text-[10px] text-slate-500">${item.attempts} / 3</td>
            <td class="py-2 px-3 text-[10px] text-slate-500 truncate max-w-xs" title="${errorDetails}">${errorDetails}</td>
            <td class="py-2 px-3 text-[10px] text-slate-400 font-mono">${dateStr}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load queue logs:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-4 text-center text-rust">Failed to load message queue logs.</td>
      </tr>
    `;
  }
}

// Load active chats list from backend
async function loadChatList() {
  try {
    const data = await apiFetch('/whatsapp/chats');
    if (data.success) {
      activeChats = data.chats || [];
      renderChatList();
    }
  } catch (err) {
    console.error('Failed to load chats:', err);
  }
}

// Filter chats sidebar
function filterChats(val) {
  chatFilterText = val.toLowerCase();
  renderChatList();
}

// Render active chats sidebar list
function renderChatList() {
  const container = document.getElementById('chat-list-container');
  if (!container) return;

  const filtered = activeChats.filter(c => {
    const name = c.name.toLowerCase();
    const id = c.id.toLowerCase();
    return name.includes(chatFilterText) || id.includes(chatFilterText);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-xs text-slate-400">
        No active conversations found
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const initials = c.name.slice(0, 2).toUpperCase();
    const timeStr = formatTime(c.timestamp);
    const activeClass = (c.id === currentChatId) ? 'bg-[#efe9dc] border-l-4 border-l-forest' : 'hover:bg-cream/40';
    const unreadBadge = c.unreadCount > 0 ? `
      <span class="bg-forest text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
        ${c.unreadCount}
      </span>
    ` : '';
    
    return `
      <div onclick="selectChat('${c.id}', '${escapeHtml(c.name)}')" class="p-3 flex items-center gap-3 cursor-pointer border-b border-slate-800/10 transition-all ${activeClass}">
        <div class="w-9 h-9 rounded-full bg-wood/10 border border-wood/20 flex items-center justify-center font-bold text-xs text-wood select-none">
          ${initials}
        </div>
        <div class="flex-grow min-w-0">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold truncate" style="color: var(--text-primary) !important;">${escapeHtml(c.name)}</h4>
            <span class="text-[9px] text-slate-400 font-mono">${timeStr}</span>
          </div>
          <div class="flex items-center justify-between mt-1">
            <p class="text-[10px] text-slate-400 truncate pr-2">${escapeHtml(c.lastMessage || 'No messages')}</p>
            ${unreadBadge}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Select chat and display conversation
async function selectChat(jid, name) {
  currentChatId = jid;
  
  // Update sidebar active highlights
  renderChatList();
  
  // Show chat screen, hide empty state
  document.getElementById('chat-empty-state').classList.add('hidden');
  const screen = document.getElementById('chat-active-screen');
  screen.classList.remove('hidden');
  
  // Set headers
  document.getElementById('active-chat-title').innerText = name;
  document.getElementById('active-chat-subtitle').innerText = jid.split('@')[0];
  document.getElementById('active-chat-avatar').innerText = name.slice(0, 2).toUpperCase();
  
  // Reset input and templates
  document.getElementById('chat-template-select').value = '';
  document.getElementById('chat-text-input').value = '';
  
  // Load conversation history
  await loadMessages(jid);
}

// Load message history for JID
async function loadMessages(jid) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="flex items-center justify-center h-full text-xs text-slate-400">
      <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading messages...
    </div>
  `;
  
  try {
    const data = await apiFetch(`/whatsapp/chats/${encodeURIComponent(jid)}/messages`);
    if (data.success && currentChatId === jid) {
      renderMessages(data.messages || []);
    }
  } catch (err) {
    console.error('Failed to load messages:', err);
    container.innerHTML = `
      <div class="flex items-center justify-center h-full text-xs text-rust">
        Failed to load message history.
      </div>
    `;
  }
}

// Render message history in active viewport
function renderMessages(messages) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="flex items-center justify-center h-full text-xs text-slate-400">
        No messages in this chat
      </div>
    `;
    return;
  }

  container.innerHTML = messages.map(m => {
    const fromMe = m.fromMe;
    const bubbleAlign = fromMe ? 'justify-end' : 'justify-start';
    const bubbleBg = fromMe ? 'bg-[#d9fdd3] text-slate-900 border border-[#b2e2a8]' : 'bg-white text-slate-900 border border-slate-200';
    const timeStr = formatTime(m.timestamp);
    
    let contentHtml = '';
    
    if (m.type === 'document' || (m.hasMedia && m.body.endsWith('.pdf'))) {
      contentHtml = `
        <div class="flex items-center gap-2 p-2 bg-[#f0f0f0] border border-slate-300 rounded mb-1 text-slate-800 font-cyber text-[10px]">
          <i class="fa-solid fa-file-pdf text-red-600 text-lg"></i>
          <div class="truncate flex-grow">
            <span class="font-bold block truncate">${escapeHtml(m.body || m.filename || 'invoice.pdf')}</span>
            <span class="text-[8px] text-slate-500 font-mono">PDF Document</span>
          </div>
        </div>
      `;
    } else {
      contentHtml = `<p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(m.body)}</p>`;
    }

    return `
      <div class="flex ${bubbleAlign} w-full">
        <div class="max-w-[70%] p-2 rounded-lg shadow-sm text-xs relative ${bubbleBg}">
          ${contentHtml}
          <div class="flex items-center justify-end gap-1 mt-1 text-[8px] text-slate-400 font-mono">
            <span>${timeStr}</span>
            ${fromMe ? '<i class="fa-solid fa-check text-[9px]"></i>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Scroll to bottom
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 50);
}

// Handle message form submission
async function handleChatSubmit(e) {
  e.preventDefault();
  if (!currentChatId) return;

  const textInput = document.getElementById('chat-text-input');
  const body = textInput.value.trim();
  if (!body) return;

  textInput.value = '';

  // Append temporary sending bubble immediately
  appendTemporaryMessage(body, true);

  try {
    const data = await apiFetch(`/whatsapp/chats/${encodeURIComponent(currentChatId)}/send`, {
      method: 'POST',
      body: JSON.stringify({ message: body })
    });
    if (data.success) {
      showToast('Message enqueued for delivery', 'success');
    }
  } catch (err) {
    showToast(err.message || 'Failed to send message', 'error');
  }
}

// Handle template quick reply selection
async function handleChatTemplateChange(value) {
  if (!value || !currentChatId) return;

  // Reset template dropdown immediately
  document.getElementById('chat-template-select').value = '';

  const confirmMsg = value === 'bill' 
    ? 'Send a mock vintage PDF bill invoice to this contact?' 
    : `Send the quick reply template "${value.replace('_', ' ')}" to this contact?`;

  if (!confirm(confirmMsg)) return;

  // Append temporary alert bubble
  appendTemporaryMessage(`[Sending Template: ${value.toUpperCase()}]`, true);

  try {
    const data = await apiFetch(`/whatsapp/chats/${encodeURIComponent(currentChatId)}/send`, {
      method: 'POST',
      body: JSON.stringify({ type: value })
    });
    if (data.success) {
      showToast('Template enqueued successfully', 'success');
    }
  } catch (err) {
    showToast(err.message || 'Failed to queue template', 'error');
  }
}

// Start a chat with a new phone number
async function startNewChat() {
  const input = document.getElementById('new-chat-number');
  const number = input.value.trim();
  if (!number) {
    showToast('Please enter a valid phone number', 'warning');
    return;
  }

  // Format phone number
  let clean = number.replace(/[^\d]/g, '');
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  if (!clean.endsWith('@c.us') && !clean.endsWith('@g.us')) {
    clean = `${clean}@c.us`;
  }

  input.value = '';

  // Check if conversation already exists in active list
  const existing = activeChats.find(c => c.id === clean);
  if (existing) {
    selectChat(clean, existing.name);
  } else {
    const newChat = {
      id: clean,
      name: number,
      unreadCount: 0,
      timestamp: Date.now(),
      isGroup: clean.endsWith('@g.us'),
      lastMessage: ''
    };
    activeChats.unshift(newChat);
    renderChatList();
    selectChat(clean, number);
  }
}

// Process Server Sent Event updates for real-time messages
function handleWhatsAppMessage(data) {
  const jid = data.fromMe ? data.to : data.sender;
  
  const chatIndex = activeChats.findIndex(c => c.id === jid);
  if (chatIndex !== -1) {
    activeChats[chatIndex].lastMessage = data.body;
    activeChats[chatIndex].timestamp = data.timestamp;
    if (!data.fromMe && currentChatId !== jid) {
      activeChats[chatIndex].unreadCount += 1;
    }
    // Bump chat card to the top
    const chat = activeChats.splice(chatIndex, 1)[0];
    activeChats.unshift(chat);
  } else {
    // Create new chat card in sidebar
    const newChat = {
      id: jid,
      name: jid.split('@')[0],
      unreadCount: data.fromMe ? 0 : 1,
      timestamp: data.timestamp,
      isGroup: jid.includes('@g.us'),
      lastMessage: data.body
    };
    activeChats.unshift(newChat);
  }

  renderChatList();

  // If this belongs to the active conversation, draw message bubble
  if (currentChatId === jid) {
    appendMessageBubble(data);
  }
}

// Append real-time message bubble to active conversation
function appendMessageBubble(m) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  // Clear "No messages" or spinner empty states
  if (container.querySelector('.flex.items-center.justify-center')) {
    container.innerHTML = '';
  }

  // Remove temporary sending indicator bubble if matching body is found
  const tempMsg = container.querySelector(`[data-temp="true"][data-body="${escapeHtml(m.body)}"]`);
  if (tempMsg) {
    tempMsg.remove();
  }

  const fromMe = m.fromMe;
  const bubbleAlign = fromMe ? 'justify-end' : 'justify-start';
  const bubbleBg = fromMe ? 'bg-[#d9fdd3] text-slate-900 border border-[#b2e2a8]' : 'bg-white text-slate-900 border border-slate-200';
  const timeStr = formatTime(m.timestamp);

  let contentHtml = '';
  if (m.type === 'document' || (m.hasMedia && m.body.endsWith('.pdf'))) {
    contentHtml = `
      <div class="flex items-center gap-2 p-2 bg-[#f0f0f0] border border-slate-300 rounded mb-1 text-slate-800 font-cyber text-[10px]">
        <i class="fa-solid fa-file-pdf text-red-600 text-lg"></i>
        <div class="truncate flex-grow">
          <span class="font-bold block truncate">${escapeHtml(m.body || m.filename || 'invoice.pdf')}</span>
          <span class="text-[8px] text-slate-500 font-mono">PDF Document</span>
        </div>
      </div>
    `;
  } else {
    contentHtml = `<p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(m.body)}</p>`;
  }

  const bubbleHtml = `
    <div class="flex ${bubbleAlign} w-full animate-fade-in">
      <div class="max-w-[70%] p-2 rounded-lg shadow-sm text-xs relative ${bubbleBg}">
        ${contentHtml}
        <div class="flex items-center justify-end gap-1 mt-1 text-[8px] text-slate-400 font-mono">
          <span>${timeStr}</span>
          ${fromMe ? '<i class="fa-solid fa-check text-[9px]"></i>' : ''}
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', bubbleHtml);
  container.scrollTop = container.scrollHeight;
}

// Append instant temporary "sending" bubble to user input
function appendTemporaryMessage(body, fromMe) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  if (container.querySelector('.flex.items-center.justify-center')) {
    container.innerHTML = '';
  }

  const bubbleAlign = fromMe ? 'justify-end' : 'justify-start';
  const bubbleBg = 'bg-[#d9fdd3]/75 text-slate-700 border border-[#b2e2a8]/50 opacity-80';
  const timeStr = formatTime(Date.now());

  const bubbleHtml = `
    <div class="flex ${bubbleAlign} w-full" data-temp="true" data-body="${escapeHtml(body)}">
      <div class="max-w-[70%] p-2 rounded-lg shadow-sm text-xs relative ${bubbleBg}">
        <p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(body)}</p>
        <div class="flex items-center justify-end gap-1 mt-1 text-[8px] text-slate-400 font-mono">
          <span>${timeStr}</span>
          <i class="fa-solid fa-clock text-[9px] animate-spin text-slate-500"></i>
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', bubbleHtml);
  container.scrollTop = container.scrollHeight;
}

// Toggle message type text visibility in Test Console (fallback disconnected view)
function toggleTestCustomMessage(type) {
  const messageGroup = document.getElementById('test-message-group');
  const messageInput = document.getElementById('test-message');
  if (!messageGroup) return;

  if (type === 'custom') {
    messageGroup.classList.remove('hidden');
    messageInput.required = true;
  } else {
    messageGroup.classList.add('hidden');
    messageInput.required = false;
  }
}

// Send test message (disconnected fallback view)
async function sendTestMessage(e) {
  e.preventDefault();
  
  const phoneInput = document.getElementById('test-phone');
  const typeInput = document.getElementById('test-type');
  const messageInput = document.getElementById('test-message');
  const submitBtn = document.getElementById('btn-send-test');

  const payload = {
    to: phoneInput.value.trim(),
    type: typeInput.value
  };

  if (payload.type === 'custom') {
    if (!messageInput.value.trim()) {
      showToast('Please enter a message text', 'error');
      return;
    }
    payload.message = messageInput.value.trim();
  }

  submitBtn.disabled = true;
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Queuing...';

  try {
    const data = await apiFetch('/whatsapp/send-test', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (data.success) {
      showToast(data.message || 'Test message queued successfully!', 'success');
      fetchQueueLogs();
    }
  } catch (err) {
    showToast(err.message || 'Failed to queue message.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

// Force reload QR manually
async function refreshQRCode() {
  const qrOverlay = document.getElementById('wa-qr-overlay');
  if (qrOverlay) qrOverlay.classList.add('hidden');
  
  try {
    await apiFetch('/whatsapp/logout', { method: 'POST' });
    fetchWhatsAppStatus();
  } catch (err) {
    console.error('Failed to refresh QR:', err);
  }
}

// Helpers
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Vintage 3-Position Lever Switch Helpers
function setLeverPosition(pos, saveToDb = true) {
  const handle = document.getElementById('vintage-lever-handle');
  const labelFast = document.getElementById('pacing-label-fast');
  const labelSafe = document.getElementById('pacing-label-safe');
  const labelParanoid = document.getElementById('pacing-label-paranoid');
  const display = document.getElementById('pacing-range-display');
  
  if (!handle || !labelFast || !labelSafe || !labelParanoid || !display) return;
  
  // Remove active styling from all labels
  labelFast.classList.remove('active-label');
  labelSafe.classList.remove('active-label');
  labelParanoid.classList.remove('active-label');
  
  let min = 7, max = 15;
  
  if (pos === 1) {
    min = 3;
    max = 6;
    handle.style.left = '3px';
    labelFast.classList.add('active-label');
    display.innerText = 'Fast (3s - 6s)';
  } else if (pos === 2) {
    min = 7;
    max = 15;
    handle.style.left = 'calc(34% + 1px)';
    labelSafe.classList.add('active-label');
    display.innerText = 'Safe (7s - 15s)';
  } else if (pos === 3) {
    min = 15;
    max = 30;
    handle.style.left = 'calc(65% + 1px)';
    labelParanoid.classList.add('active-label');
    display.innerText = 'Paranoid (15s - 30s)';
  }
  
  if (saveToDb) {
    savePacingSettings(min, max);
  }
}

async function savePacingSettings(min, max) {
  try {
    const data = await apiFetch('/whatsapp/settings', {
      method: 'POST',
      body: JSON.stringify({ pacingMin: min, pacingMax: max })
    });
    if (data.success) {
      showToast(`Pacing speed updated to: ${min}s - ${max}s`, 'success');
    }
  } catch (err) {
    console.error('Failed to update pacing settings:', err);
    showToast('Failed to save pacing settings', 'error');
  }
}
