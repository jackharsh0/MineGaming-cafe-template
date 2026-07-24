<?php
include 'header.php';
?>

<div class="bg-parchment border border-slate-800 rounded-lg p-6">
  <div class="section-header flex justify-between items-center mb-6">
    <h2 class="text-xl font-bold text-wood flex items-center gap-2">
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
<div id="modal-station-crud" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="station-modal-title">Add New Station</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-station-crud')">&times;</button>
    </div>
    <form id="form-station-crud">
      <input type="hidden" id="crud-station-id" value="">
      <div class="modal-body space-y-4">
        <!-- Type and Count -->
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="crud-type">Device Class</label>
            <select id="crud-type" class="form-control" required>
              <option value="PS5">PlayStation 5</option>
              <option value="PS4">PlayStation 4</option>
              <option value="Xbox">Xbox Series X/S</option>
              <option value="Pool">Pool Table</option>
              <option value="Dining">Dining Table</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group" id="crud-count-group">
            <label class="form-label" for="crud-count">Station Count <span class="text-[10px] text-clay">(batch)</span></label>
            <input type="number" id="crud-count" class="form-control" value="1" min="1" max="50" onchange="onStationCountChanged()" oninput="onStationCountChanged()">
          </div>
        </div>

        <!-- Name & Starting Number -->
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="crud-name" id="crud-name-label">Station Name</label>
            <input type="text" id="crud-name" class="form-control" placeholder="e.g. PS5-01" required oninput="onStationNameChanged()">
          </div>
          <div class="form-group" id="crud-startnum-group" style="display: none;">
            <label class="form-label" for="crud-startnum">Starting Number</label>
            <input type="number" id="crud-startnum" class="form-control" value="1" min="1" max="99" onchange="onStationCountChanged()">
          </div>
        </div>

        <!-- Live Preview -->
        <div id="crud-preview-section" style="display: none;" class="bg-kraft border border-wood/40 rounded-lg p-3">
          <h4 class="text-[10px] font-cyber text-wood uppercase tracking-wider mb-2">Preview</h4>
          <div id="crud-preview-names" class="flex flex-wrap gap-2 text-[11px] text-slate-300 font-mono"></div>
        </div>

        <!-- Network (hidden in batch mode) -->
        <div id="crud-network-section" class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="crud-ip">Network IP Address</label>
            <input type="text" id="crud-ip" class="form-control" placeholder="192.168.1.10">
          </div>
          <div class="form-group">
            <label class="form-label" for="crud-mac">Physical MAC Address</label>
            <input type="text" id="crud-mac" class="form-control" placeholder="00:1A:2B:3C:4D:5E">
          </div>
        </div>

        <!-- Equipment Details -->
        <div id="crud-equipment-section" class="border-t border-slate-800 pt-4 mt-2 space-y-4">
          <h4 class="text-xs font-bold text-wood uppercase font-cyber tracking-wider">Equipment Details</h4>
          <div class="grid grid-cols-3 gap-2">
            <div class="form-group">
              <label class="form-label" for="crud-cpu">Controller / Cue Count</label>
              <input type="text" id="crud-cpu" class="form-control" placeholder="e.g. 2 controllers">
            </div>
            <div class="form-group">
              <label class="form-label" for="crud-gpu">Display / Table Type</label>
              <input type="text" id="crud-gpu" class="form-control" placeholder="e.g. 55-inch 4K">
            </div>
            <div class="form-group">
              <label class="form-label" for="crud-ram">Accessories</label>
              <input type="text" id="crud-ram" class="form-control" placeholder="e.g. Headset, Chalk">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="crud-peripherals">Additional Notes</label>
            <textarea id="crud-peripherals" class="form-control h-20" placeholder="Extra details about this station..."></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-station-crud')">Cancel</button>
        <button type="submit" class="btn btn-primary" id="crud-submit-btn">Save Station Details</button>
      </div>
    </form>
  </div>
</div>

<?php
include 'footer.php';
?>
