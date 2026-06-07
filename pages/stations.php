<?php
include 'header.php';
?>

<div class="bg-cyberPanel border border-slate-800 rounded-lg p-6">
  <div class="section-header flex justify-between items-center mb-6">
    <h2 class="text-xl font-bold text-neonCyan flex items-center gap-2">
      <i class="fa-solid fa-desktop"></i>
      <span>Device & Console Manager</span>
    </h2>
    <!-- Only SuperAdmin can add stations -->
    <?php if ($role === 'SuperAdmin'): ?>
      <button onclick="triggerAddStation()" class="btn btn-primary btn-sm">
        <i class="fa-solid fa-plus mr-1"></i> Add Station
      </button>
    <?php endif; ?>
  </div>

  <!-- Table list -->
  <div class="table-responsive">
    <table class="cyber-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Specs (CPU/GPU/RAM)</th>
          <th>IP Address</th>
          <th>MAC Address</th>
          <th>Peripherals & Controllers</th>
          <th>Status</th>
          <?php if ($role === 'SuperAdmin'): ?>
            <th>Actions</th>
          <?php endif; ?>
        </tr>
      </thead>
      <tbody id="stations-table-body">
        <tr>
          <td colspan="8" class="text-center py-6 text-slate-500">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading station catalogs...
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ==========================================
     STATIONS MODALS (Add & Edit)
     ========================================== -->

<!-- Add/Edit Station Modal -->
<div id="modal-station-crud" class="modal-overlay">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="station-modal-title">Add New Station</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-station-crud')">&times;</button>
    </div>
    <form id="form-station-crud">
      <input type="hidden" id="crud-station-id" value="">
      <div class="modal-body space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="crud-name">Station Name / Designation</label>
            <input type="text" id="crud-name" class="form-control" placeholder="e.g. PC-05" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="crud-type">Device Class</label>
            <select id="crud-type" class="form-control" required>
              <option value="PC">PC</option>
              <option value="PS5">PlayStation 5</option>
              <option value="Xbox">Xbox Series X/S</option>
              <option value="VR">VR Booth</option>
              <option value="Other">Other Console</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="crud-ip">Network IP Address</label>
            <input type="text" id="crud-ip" class="form-control" placeholder="192.168.1.10">
          </div>
          <div class="form-group">
            <label class="form-label" for="crud-mac">Physical MAC Address</label>
            <input type="text" id="crud-mac" class="form-control" placeholder="00:1A:2B:3C:4D:5E">
          </div>
        </div>

        <!-- PC Hardware details -->
        <div class="border-t border-slate-800 pt-4 mt-2 space-y-4">
          <h4 class="text-xs font-bold text-neonCyan uppercase font-cyber tracking-wider">Specifications Logs</h4>
          <div class="grid grid-cols-3 gap-2">
            <div class="form-group">
              <label class="form-label" for="crud-cpu">CPU Model</label>
              <input type="text" id="crud-cpu" class="form-control" placeholder="i7-13700">
            </div>
            <div class="form-group">
              <label class="form-label" for="crud-gpu">Graphics GPU</label>
              <input type="text" id="crud-gpu" class="form-control" placeholder="RTX 4070">
            </div>
            <div class="form-group">
              <label class="form-label" for="crud-ram">RAM Memory</label>
              <input type="text" id="crud-ram" class="form-control" placeholder="16GB DDR5">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="crud-peripherals">Peripherals, Controllers & Accessories</label>
            <textarea id="crud-peripherals" class="form-control h-20" placeholder="Keyboard, Mouse, Headset, Controller specifications..."></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-station-crud')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Station Details</button>
      </div>
    </form>
  </div>
</div>

<?php
include 'footer.php';
?>
