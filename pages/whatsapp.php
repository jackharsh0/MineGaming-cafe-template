<?php
include 'header.php';
?>

<div id="wa-main-container" class="w-full space-y-6">
  <!-- Top Section: Two columns (Status & QR on Left, Settings & Test Console on Right) -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
    
    <!-- Left Column: WhatsApp Connection Status & QR Scanner -->
    <div class="col-span-1 xl:col-span-2 space-y-6">
      <div class="bg-parchment border border-slate-800 rounded-lg p-6 relative hover-3d-float aged-card card-corner">
        <div class="filigree mb-2">&#9670; &#9671; &#9670;</div>
        <div class="section-header mb-6">
          <h2 class="text-2xl font-bold text-wood font-cyber uppercase tracking-wider flex items-center gap-2">
            <i class="fa-brands fa-whatsapp text-forest"></i>
            <span>WhatsApp Connection Dashboard</span>
          </h2>
          <p class="text-xs text-slate-400 mt-1">Connect your WhatsApp Business or personal account to send automated digital bills and POS receipts.</p>
        </div>

        <!-- Connection Diagnostic Alert -->
        <div id="wa-connection-error-alert" class="hidden p-3 mb-6 bg-rust/20 border border-rust text-rust text-xs rounded text-center max-w-md mx-auto"></div>

        <!-- Connection Status Card -->
        <div id="wa-connection-card" class="p-6 bg-cream border border-slate-800 rounded-lg text-center space-y-4 max-w-md mx-auto">
          <div class="flex items-center justify-center gap-2">
            <span class="text-xs text-slate-400 font-cyber uppercase tracking-wider">Status:</span>
            <span id="wa-status-badge" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rust/10 border border-rust text-rust">
              Disconnected
            </span>
          </div>

          <!-- Disconnected Mode: QR Code Loader -->
          <div id="wa-qr-container" class="space-y-4 py-4 flex flex-col items-center">
            <div id="wa-qr-placeholder" class="w-64 h-64 bg-kraft border border-dashed border-slate-700 rounded flex flex-col items-center justify-center text-center p-4">
              <i class="fa-solid fa-qrcode text-5xl text-slate-400 mb-2"></i>
              <p class="text-xs text-slate-500 font-cyber uppercase tracking-wider">Waiting for QR Code...</p>
            </div>
            <div id="wa-qr-wrapper" class="hidden relative p-4 bg-white border border-slate-800 rounded shadow-md">
              <img id="wa-qr-img" src="" alt="Scan this QR code to connect WhatsApp" class="w-56 h-56 block">
              <div id="wa-qr-overlay" class="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-center p-4 hidden">
                <i class="fa-solid fa-circle-exclamation text-rust text-3xl mb-2"></i>
                <p class="text-xs text-slate-800 font-semibold mb-2">QR Code Expired</p>
                <button onclick="refreshQRCode()" class="btn btn-primary btn-sm py-1.5 text-[10px] uppercase">
                  <i class="fa-solid fa-rotate mr-1"></i> Refresh QR
                </button>
              </div>
            </div>
            <p id="wa-qr-instruction" class="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              Open WhatsApp on your phone, go to <strong>Settings</strong> or <strong>Linked Devices</strong>, and scan the QR code above.
            </p>
          </div>

          <!-- Connected Mode: Device Details -->
          <div id="wa-details-container" class="hidden space-y-4 py-4 text-center">
            <div class="w-20 h-20 bg-forest/10 border border-forest rounded-full flex items-center justify-center mx-auto text-forest mb-2">
              <i class="fa-solid fa-circle-check text-4xl"></i>
            </div>
            <div class="space-y-1">
              <h4 id="wa-user-name" class="text-lg font-bold text-wood font-cyber">John Doe</h4>
              <p id="wa-user-number" class="text-xs font-mono text-slate-400">+91 98765 43210</p>
              <span id="wa-device-platform" class="inline-block text-[9px] bg-kraft border border-slate-700 text-slate-200 px-2 py-0.5 rounded font-mono uppercase">WhatsApp Web</span>
            </div>
            
            <div class="pt-4 flex flex-col gap-2.5 max-w-xs mx-auto">
              <!-- Trigger live chat modal button -->
              <button onclick="openMessengerModal()" class="w-full btn btn-primary py-2.5 text-xs uppercase font-cyber tracking-wider">
                <i class="fa-solid fa-comments mr-1.5"></i> Open Live Chat Messenger
              </button>
              <button onclick="triggerDisconnect()" class="w-full btn btn-danger py-2.5 text-xs uppercase font-cyber tracking-wider">
                <i class="fa-solid fa-link-slash mr-1.5"></i> Disconnect Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Anti-Ban Queue Controller Card -->
      <div class="bg-parchment border border-slate-800 rounded-lg p-6 relative hover-3d-float aged-card card-corner">
        <div class="section-header mb-4">
          <h3 class="text-lg font-bold font-cyber text-wood uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-gauge-high text-wood"></i>
            <span>Dynamic Anti-Ban Queue Controller</span>
          </h3>
          <p class="text-xs text-slate-400 mt-1">Select a pacing speed for automated receipts. Slower sending intervals bypass spam detection algorithms.</p>
        </div>

        <!-- Vintage 3-Position Lever Switch -->
        <div class="py-4 flex flex-col items-center justify-center space-y-4">
          <div class="flex justify-between items-center w-full px-1 text-xs">
            <span class="font-bold text-slate-700 font-cyber uppercase tracking-wider">Queue Pacing Level</span>
            <span id="pacing-range-display" class="font-bold text-forest text-sm font-mono">Safe (7s - 15s)</span>
          </div>

          <div class="vintage-switch-track relative w-full h-10 p-1 flex items-center justify-between cursor-pointer select-none">
            <!-- Brass sliding lever handle -->
            <div id="vintage-lever-handle" class="vintage-lever-handle" style="left: calc(34% + 1px);"></div>
            
            <!-- 3 clickable label zones -->
            <div id="pacing-label-fast" onclick="setLeverPosition(1)" class="z-10 flex-1 text-center text-xs font-cyber font-bold uppercase tracking-wider text-slate-500 transition-all duration-150">🚀 Fast (3-6s)</div>
            <div id="pacing-label-safe" onclick="setLeverPosition(2)" class="z-10 flex-1 text-center text-xs font-cyber font-bold uppercase tracking-wider text-slate-500 transition-all duration-150">🛡️ Safe (7-15s)</div>
            <div id="pacing-label-paranoid" onclick="setLeverPosition(3)" class="z-10 flex-1 text-center text-xs font-cyber font-bold uppercase tracking-wider text-slate-500 transition-all duration-150">🔒 Paranoid (15-30s)</div>
          </div>

          <p class="text-[11px] text-slate-400 font-cyber text-center leading-relaxed">
            The queue dispatch worker automatically randomizes delays inside the selected range for every sent message.
          </p>
        </div>
      </div>
    </div>

    <!-- Right Column: Settings & Test Console -->
    <div class="space-y-6">
      <!-- Configuration -->
      <div class="bg-parchment border border-slate-800 rounded-lg p-6 hover-3d-float aged-card card-corner">
        <h3 class="text-lg font-bold font-cyber text-clay mb-4 uppercase tracking-wider">
          <i class="fa-solid fa-sliders mr-2 text-clay"></i>Notifications Settings
        </h3>
        <p class="text-xs text-slate-400 mb-4">Control how the lounge communicates with players upon completing payments.</p>
        
        <div class="space-y-4">
          <!-- Toggle Auto-billing -->
          <div class="flex items-start gap-3 p-3 bg-cream border border-slate-800 rounded">
            <div class="flex items-center h-5">
              <input type="checkbox" id="setting-auto-bill" class="w-4 h-4 rounded border-slate-700 text-wood bg-kraft focus:ring-0 cursor-pointer" onchange="toggleAutoBilling(this.checked)">
            </div>
            <div class="text-xs">
              <label for="setting-auto-bill" class="font-bold text-slate-100 cursor-pointer block select-none">Send WhatsApp Bills</label>
              <span class="text-[10px] text-slate-400 block mt-0.5">Automatically format and send a full breakdown receipt to the player's mobile number on checkout.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Test Console -->
      <div class="bg-parchment border border-slate-800 rounded-lg p-6 hover-3d-float aged-card card-corner">
        <h3 class="text-lg font-bold font-cyber text-wood mb-4 uppercase tracking-wider">
          <i class="fa-solid fa-paper-plane mr-2 text-wood"></i>Test Messenger
        </h3>
        <p class="text-xs text-slate-400 mb-4">Send a manual test message to verify that your WhatsApp account is successfully connected and delivering messages.</p>

        <form id="form-wa-test" class="space-y-4" onsubmit="sendTestMessage(event)">
          <div class="form-group">
            <label class="form-label text-xs uppercase" for="test-phone">Recipient Phone Number</label>
            <input type="text" id="test-phone" class="form-control" placeholder="e.g. 919876543210 (with country code)" required>
          </div>
          <div class="form-group">
            <label class="form-label text-xs uppercase" for="test-type">Template Type</label>
            <select id="test-type" class="form-control cursor-pointer" onchange="toggleTestCustomMessage(this.value)">
              <option value="custom">✍️ Custom Text Message</option>
              <option value="bill">📜 Vintage PDF Bill Invoice</option>
              <option value="low_play_hours">⚠️ Low Play Hours Alert</option>
              <option value="loyalty_tier">🎉 Loyalty Tier Upgrade Promo</option>
            </select>
          </div>
          <div class="form-group" id="test-message-group">
            <label class="form-label text-xs uppercase" for="test-message">Message Text</label>
            <textarea id="test-message" class="form-control h-20" placeholder="Hello from MineGaming!">Hello from MineGaming! This is a test message to verify our WhatsApp billing integration.</textarea>
          </div>
          
          <button type="submit" id="btn-send-test" class="w-full btn btn-primary py-3 text-xs uppercase font-cyber tracking-wider">
            <i class="fa-solid fa-paper-plane"></i> Send Test Message
          </button>
        </form>
      </div>
    </div>
  </div>

  <!-- Bottom Section: WhatsApp Message Queue Logs -->
  <div class="bg-parchment border border-slate-800 rounded-lg p-6 hover-3d-float aged-card card-corner">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold font-cyber text-wood uppercase tracking-wider flex items-center gap-2">
        <i class="fa-solid fa-list-check text-wood"></i>
        <span>WhatsApp Message Queue Logs</span>
      </h3>
      <button onclick="fetchQueueLogs()" class="btn btn-secondary btn-sm py-1.5 px-3 text-[10px] uppercase font-cyber tracking-wider">
        <i class="fa-solid fa-rotate mr-1"></i> Refresh Logs
      </button>
    </div>
    
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-slate-800 text-slate-400 uppercase font-cyber tracking-wider text-[10px]">
            <th class="py-2.5 px-3">ID</th>
            <th class="py-2.5 px-3">Recipient</th>
            <th class="py-2.5 px-3">Message Type</th>
            <th class="py-2.5 px-3">Status</th>
            <th class="py-2.5 px-3">Attempts</th>
            <th class="py-2.5 px-3">Error Details</th>
            <th class="py-2.5 px-3">Queued At</th>
          </tr>
        </thead>
        <tbody id="queue-logs-body" class="divide-y divide-slate-800/10">
          <tr>
            <td colspan="7" class="py-4 text-center text-slate-500">Loading recent message queue logs...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- ================= CONNECTED MESSENGER POPUP MODAL ================= -->
<div id="wa-messenger-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm hidden animate-fade-in p-4">
  <div class="bg-cream border-2 border-slate-800 rounded-lg aged-card card-corner shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden relative">
    
    <!-- Modal Header -->
    <div class="p-3 border-b-2 border-slate-800 bg-parchment flex items-center justify-between">
      <div class="flex items-center gap-2">
        <i class="fa-brands fa-whatsapp text-forest text-xl"></i>
        <h3 class="text-sm font-bold text-wood font-cyber uppercase tracking-wider">WhatsApp Live Chat Messenger</h3>
      </div>
      <div class="flex items-center gap-3">
        <!-- Direct logout shortcut in modal header -->
        <button onclick="triggerDisconnect()" class="btn btn-danger btn-sm py-1 px-3 text-[9px] uppercase tracking-wider">
          <i class="fa-solid fa-link-slash mr-1"></i> Disconnect
        </button>
        <button onclick="closeMessengerModal()" class="w-8 h-8 rounded bg-kraft border border-slate-700 text-slate-800 hover:bg-kraft/80 flex items-center justify-center cursor-pointer transition-colors">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
    
    <!-- Modal Body (Two Column Split Layout) -->
    <div class="flex-grow grid grid-cols-12 gap-0 overflow-hidden h-full">
      <!-- Left Panel: Chat List (col-span-4) -->
      <div class="col-span-12 md:col-span-4 border-r border-slate-800 flex flex-col h-full bg-[#fcfbfa]">
        <!-- Search & Start Chat -->
        <div class="p-3 border-b border-slate-800 bg-parchment flex flex-col gap-2">
          <div class="relative">
            <input type="text" id="chat-search" placeholder="Search contact or group..." class="form-control text-xs w-full pl-8 py-1.5" onkeyup="filterChats(this.value)">
            <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-500 text-[10px]"></i>
          </div>
          
          <div class="flex gap-1.5 pt-1">
            <input type="text" id="new-chat-number" placeholder="Enter number (e.g. 919876543210)" class="form-control text-[10px] py-1 px-2.5 flex-grow" />
            <button onclick="startNewChat()" class="btn btn-primary btn-sm py-1 px-3 text-[9px] uppercase tracking-wider">
              <i class="fa-solid fa-message mr-1"></i> Start
            </button>
          </div>
        </div>

        <!-- Chat List Container -->
        <div id="chat-list-container" class="flex-grow overflow-y-auto divide-y divide-slate-800/10">
          <div class="p-8 text-center text-xs text-slate-400">Loading chats...</div>
        </div>
      </div>

      <!-- Right Panel: Active Chat Viewport (col-span-8) -->
      <div class="col-span-12 md:col-span-8 flex flex-col h-full bg-cream relative">
        <!-- Empty Selection View -->
        <div id="chat-empty-state" class="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#f5efe4] text-center z-25">
          <div class="w-16 h-16 bg-forest/5 border border-forest/20 rounded-full flex items-center justify-center text-forest/40 mb-3">
            <i class="fa-brands fa-whatsapp text-3xl animate-pulse"></i>
          </div>
          <h4 class="text-xs font-bold font-cyber text-wood uppercase tracking-widest">Select a Conversation</h4>
          <p class="text-[10px] text-slate-500 max-w-xs mt-1 leading-relaxed">Choose a contact from the sidebar or type a phone number to start chatting in real time.</p>
        </div>

        <!-- Active Chat Workspace -->
        <div id="chat-active-screen" class="flex flex-col h-full hidden">
          <!-- Workspace Header -->
          <div class="p-3 border-b border-slate-800 bg-parchment flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-wood/10 border border-wood/30 flex items-center justify-center font-bold text-xs text-wood" id="active-chat-avatar">
                AB
              </div>
              <div>
                <h4 id="active-chat-title" class="text-xs font-bold font-cyber uppercase tracking-wider" style="color: var(--text-primary) !important;">Contact Name</h4>
                <p id="active-chat-subtitle" class="text-[9px] text-slate-400 font-mono">+91 00000 00000</p>
              </div>
            </div>
          </div>

          <!-- Bubble history feed -->
          <div id="chat-messages-container" class="flex-grow p-4 overflow-y-auto space-y-3 bg-[#e5ddd5]" style="background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-blend-mode: overlay; background-color: rgba(245, 239, 228, 0.94);">
            <!-- Message bubbles -->
          </div>

          <!-- Message Form Bar -->
          <div class="p-3 border-t border-slate-800 bg-parchment">
            <form id="chat-send-form" onsubmit="handleChatSubmit(event)" class="flex gap-2 items-center">
              <div class="relative">
                <select id="chat-template-select" class="form-control text-[10px] py-1.5 px-2 bg-kraft border border-slate-700 text-slate-200 cursor-pointer rounded" onchange="handleChatTemplateChange(this.value)">
                  <option value="">⚡ Quick Reply</option>
                  <option value="bill">🧾 Vintage Bill</option>
                  <option value="low_play_hours">⚠️ Low Play Hours Alert</option>
                  <option value="loyalty_tier">🎉 Loyalty Promo</option>
                </select>
              </div>
              
              <input type="text" id="chat-text-input" placeholder="Type a message..." class="form-control text-xs flex-grow py-1.5 px-3 rounded-full border-slate-700 bg-[#fcfbfa] text-slate-800 focus:ring-0 focus:border-slate-500" autocomplete="off">
              
              <button type="submit" class="w-8 h-8 rounded-full bg-forest text-white border border-forest hover:bg-forest/80 flex items-center justify-center cursor-pointer transition-all">
                <i class="fa-solid fa-paper-plane text-[11px]"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</div>

<style>
/* Vintage Mechanical Lever Switch Styles */
.vintage-switch-track {
  background: #231610; /* Deep walnut recessed slot */
  border: 2px solid #5c4033;
  border-radius: 20px;
  box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.8), 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
}

.vintage-lever-handle {
  position: absolute;
  top: 3px;
  bottom: 3px;
  width: 32%;
  background: radial-gradient(circle at 35% 35%, #ffd700, #cda82d 45%, #926d11 80%, #5c4008 100%);
  border: 1.5px solid #4a3410;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.5);
  transition: left 0.25s cubic-bezier(0.25, 0.8, 0.25, 1.15);
  cursor: pointer;
}

.vintage-lever-handle::after {
  content: '';
  position: absolute;
  top: 15%;
  left: 45%;
  width: 10%;
  height: 70%;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  box-shadow: inset 1px 1px 1px rgba(255,255,255,0.4);
}

.vintage-switch-track .active-label {
  color: #fcfaf2 !important;
  font-weight: 900 !important;
  text-shadow: 0 1px 3px rgba(0,0,0,0.9);
}
</style>

<script src="../js/whatsapp.js"></script>

<?php
include 'footer.php';
?>
