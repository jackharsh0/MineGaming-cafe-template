<?php
include 'header.php';
?>

<div class="bg-parchment border border-slate-800 rounded-lg p-6">
  <div class="section-header flex justify-between items-center mb-6">
    <h2 class="text-xl font-bold text-wood flex items-center gap-2">
      <i class="fa-solid fa-calendar-check"></i>
      <span>Appointment Booking Scheduler</span>
    </h2>
    <button onclick="triggerAddAppointment()" class="btn btn-primary btn-sm">
      <i class="fa-solid fa-plus mr-1"></i> Schedule Appointment
    </button>
  </div>

  <!-- Filters -->
  <div class="flex gap-4 mb-6 items-center">
    <div class="flex items-center gap-2">
      <label class="text-xs font-bold uppercase text-slate-400" for="filter-appt-status">Filter Status</label>
      <select id="filter-appt-status" class="bg-cream border border-slate-700 px-3 py-1.5 text-xs rounded text-slate-300 focus:outline-none focus:border-wood" onchange="renderAppointmentsTable()">
        <option value="ALL">All Statuses</option>
        <option value="Pending">Pending</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Completed">Completed</option>
        <option value="Cancelled">Cancelled</option>
      </select>
    </div>
  </div>

  <!-- Table list -->
  <div class="table-responsive">
    <table class="cyber-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Player Name</th>
          <th>Player Phone</th>
          <th>Station</th>
          <th>Date</th>
          <th>Time Window</th>
          <th>Status</th>
          <th>Notes</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="appointments-table-body">
        <tr>
          <td colspan="9" class="text-center py-6 text-slate-500">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i> Fetching appointments schedule...
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ==========================================
     APPOINTMENT MODALS (Add & Edit)
     ========================================== -->

<!-- Add/Edit Appointment Modal -->
<div id="modal-appointment-crud" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="appt-modal-title">Schedule New Appointment</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-appointment-crud')">&times;</button>
    </div>
    <form id="form-appointment-crud">
      <input type="hidden" id="crud-appt-id" value="">
      <div class="modal-body space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="crud-appt-player-name">Player Full Name</label>
            <input type="text" id="crud-appt-player-name" class="form-control" placeholder="e.g. Jack Reacher" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="crud-appt-player-phone">Contact Phone</label>
            <input type="text" id="crud-appt-player-phone" class="form-control" placeholder="e.g. +15550199" required>
          </div>
        </div>

        <!-- Reservation Category -->
        <div class="form-group">
          <label class="form-label">What to reserve</label>
          <div class="grid grid-cols-3 gap-2">
            <button type="button" class="appt-category-btn bg-kraft border border-slate-700 rounded-lg p-2 text-center hover:border-wood transition duration-300" data-category="console" onclick="selectApptCategory('console', this)">
              <span class="text-lg block">🎮</span>
              <span class="text-[10px] font-cyber text-slate-100 uppercase">Console</span>
            </button>
            <button type="button" class="appt-category-btn bg-kraft border border-slate-700 rounded-lg p-2 text-center hover:border-wood transition duration-300" data-category="pool" onclick="selectApptCategory('pool', this)">
              <span class="text-lg block">🎱</span>
              <span class="text-[10px] font-cyber text-slate-100 uppercase">Pool</span>
            </button>
            <button type="button" class="appt-category-btn bg-kraft border border-slate-700 rounded-lg p-2 text-center hover:border-wood transition duration-300" data-category="dining" onclick="selectApptCategory('dining', this)">
              <span class="text-lg block">🍽️</span>
              <span class="text-[10px] font-cyber text-slate-100 uppercase">Table</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group" id="crud-appt-station-id-container">
            <label class="form-label" for="crud-appt-station-id">Assign Station / Console</label>
            <select id="crud-appt-station-id" class="form-control" required>
              <option value="">-- Choose a category first --</option>
              <!-- Dynamically populated by JS -->
            </select>
          </div>
          <!-- Interactive Box-type Console Selection -->
          <div class="form-group hidden" id="crud-appt-station-boxes-container">
            <label class="form-label">Select Station / Console</label>
            <div id="crud-appt-station-boxes" class="grid grid-cols-3 gap-2 mt-1">
              <!-- Dynamically populated by JS as clickable boxes -->
            </div>
          </div>
          <div class="form-group" id="crud-appt-status-group" style="display: none;">
            <label class="form-label" for="crud-appt-status">Appointment Status</label>
            <select id="crud-appt-status" class="form-control">
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="crud-appt-start-time">Start Date & Time</label>
            <input type="text" id="crud-appt-start-time" class="form-control" placeholder="Select Start Date & Time" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="crud-appt-end-time">End Date & Time</label>
            <input type="text" id="crud-appt-end-time" class="form-control" placeholder="Select End Date & Time" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="crud-appt-notes">Special Requests & Notes</label>
          <textarea id="crud-appt-notes" class="form-control h-20" placeholder="e.g. Needs extra gamepad, preferred seating, food additions..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-appointment-crud')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Appointment Slot</button>
      </div>
    </form>
  </div>
</div>

<?php
include 'footer.php';
?>
