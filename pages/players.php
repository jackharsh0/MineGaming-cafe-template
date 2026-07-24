<?php
include 'header.php';
?>

<div class="bg-parchment border border-slate-800 rounded-lg p-6">
  <div class="section-header flex justify-between items-center mb-6">
    <h2 class="text-xl font-bold text-wood flex items-center gap-2">
      <i class="fa-solid fa-users"></i>
      <span>Player Membership & Play Hours</span>
    </h2>
    <div class="flex gap-2">
      <?php if ($role === 'SuperAdmin' || $role === 'Manager'): ?>
        <button onclick="exportPlayerRoster()" class="btn btn-secondary btn-sm">
          <i class="fa-solid fa-file-csv mr-1"></i> Export Roster
        </button>
      <?php endif; ?>
      <?php if ($role === 'SuperAdmin'): ?>
        <button onclick="triggerRegisterPlayer()" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-user-plus mr-1"></i> Register Player
        </button>
      <?php endif; ?>
    </div>
  </div>

  <!-- Search -->
  <div class="mb-6 max-w-md">
    <div class="relative">
      <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
        <i class="fa-solid fa-magnifying-glass"></i>
      </span>
      <input type="text" id="player-search" oninput="searchPlayers(this.value)" class="form-control pl-10" placeholder="Search by name or phone number...">
    </div>
  </div>

  <!-- Table list -->
  <div class="table-responsive">
    <table class="cyber-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Play Hours Balance</th>
          <th>Loyalty Points</th>
          <th>Loyalty Tier</th>
          <th>Blacklist Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="players-table-body">
        <tr>
          <td colspan="8" class="text-center py-6 text-slate-500">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading player rosters...
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ==========================================
     PLAYERS MODALS (Register, Load Wallet, Blacklist, History)
     ========================================== -->

<!-- Register Player Modal -->
<div id="modal-player-register" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title">Register New Member</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-player-register')">&times;</button>
    </div>
    <form id="form-player-register">
      <div class="modal-body space-y-4">
        <div class="form-group">
          <label class="form-label" for="reg-name">Full Name (KYC)</label>
          <input type="text" id="reg-name" class="form-control" placeholder="Jack Reacher" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-phone">Phone Number (Unique ID)</label>
          <input type="text" id="reg-phone" class="form-control" placeholder="+91 98765 43210" value="+91" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-email">Email Address</label>
          <input type="email" id="reg-email" class="form-control" placeholder="jack@reacher.com">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-player-register')">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Profile</button>
      </div>
    </form>
  </div>
</div>

<!-- Load/Adjust Play Hours Modal -->
<div id="modal-wallet-load" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="wallet-modal-title">Adjust Play Hours</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-wallet-load')">&times;</button>
    </div>
    <form id="form-wallet-load">
      <input type="hidden" id="wallet-player-id" value="">
      <div class="modal-body space-y-4">
        <p class="text-sm text-slate-400">Adjust the player's play hours balance. Debits require a justification note.</p>
        
        <div class="form-group">
          <label class="form-label" for="wallet-tx-type">Adjustment Type</label>
          <select id="wallet-tx-type" class="form-control" onchange="toggleWalletDebitReason(this.value)">
            <option value="credit">Load Play Hours (Credit)</option>
            <option value="debit">Deduct Play Hours (Debit)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="wallet-amount">Hours (Hrs)</label>
          <input type="number" step="0.5" min="0.5" value="2" id="wallet-amount" class="form-control" required>
        </div>

        <div class="form-group" id="wallet-reason-group" style="display: none;">
          <label class="form-label" for="wallet-reason">Deduction Reason (Required)</label>
          <input type="text" id="wallet-reason" class="form-control" placeholder="e.g. Forfeited session / error correction">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-wallet-load')">Cancel</button>
        <button type="submit" class="btn btn-success" id="btn-wallet-submit">Update Play Hours</button>
      </div>
    </form>
  </div>
</div>

<!-- Blacklist Flag Modal -->
<div id="modal-player-blacklist" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="blacklist-modal-title">Blacklist Profile</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-player-blacklist')">&times;</button>
    </div>
    <form id="form-player-blacklist">
      <input type="hidden" id="blacklist-player-id" value="">
      <div class="modal-body space-y-4">
        <div class="form-group">
          <label class="form-label" for="blacklist-toggle">Restrict Status</label>
          <select id="blacklist-toggle" class="form-control">
            <option value="1">Banned (Blacklisted)</option>
            <option value="0">Unrestricted (Active)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="blacklist-notes">Banned notes visibility (Visible to all operators)</label>
          <textarea id="blacklist-notes" class="form-control h-24" placeholder="Reason for ban (e.g. destructive, keyboard smashing, unpaid bills)..." required></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-player-blacklist')">Cancel</button>
        <button type="submit" class="btn btn-danger">Apply Status</button>
      </div>
    </form>
  </div>
</div>

<!-- Player History Modal -->
<div id="modal-player-history" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container max-w-2xl">
    <div class="modal-header">
      <h3 class="modal-title" id="history-modal-title">Session History</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-player-history')">&times;</button>
    </div>
    <div class="modal-body space-y-4">
      <div class="grid grid-cols-2 gap-4 text-sm bg-slate-900/50 p-4 border border-slate-800 rounded">
        <div>
          <div class="text-slate-500">Tier Profile</div>
          <div class="font-bold font-cyber text-wood" id="hist-profile-tier">Bronze</div>
        </div>
        <div>
          <div class="text-slate-500">Accumulated Points</div>
          <div class="font-bold text-slate-100" id="hist-profile-points">0 PTS</div>
        </div>
      </div>

      <div class="table-responsive max-h-60 overflow-y-auto">
        <table class="cyber-table">
          <thead>
            <tr>
              <th>Station</th>
              <th>Session Type</th>
              <th>Start Time</th>
              <th>Total Cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="history-table-body">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="closeModal('modal-player-history')">Close</button>
    </div>
  </div>
</div>

<!-- Manual Loyalty Adjust Modal -->
<div id="modal-loyalty-adjust" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title">Adjust Loyalty Points</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-loyalty-adjust')">&times;</button>
    </div>
    <form id="form-loyalty-adjust">
      <input type="hidden" id="loyalty-player-id" value="">
      <div class="modal-body space-y-4">
        <p class="text-sm text-slate-400">Manually override player's loyalty points balance. Loyalty tier (Bronze/Silver/Gold) will be automatically re-calculated.</p>
        <div class="form-group">
          <label class="form-label" for="loyalty-points-input">Loyalty Points (PTS)</label>
          <input type="number" min="0" value="0" id="loyalty-points-input" class="form-control" required>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-loyalty-adjust')">Cancel</button>
        <button type="submit" class="btn btn-primary">Apply Points</button>
      </div>
    </form>
  </div>
</div>

<?php
include 'footer.php';
?>
