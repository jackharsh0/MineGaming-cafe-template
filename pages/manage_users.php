<?php
include 'header.php';
?>

<div class="bg-parchment border border-slate-800 rounded-lg p-6">
  <div class="section-header flex justify-between items-center mb-6">
    <h2 class="text-xl font-bold text-wood flex items-center gap-2">
      <i class="fa-solid fa-user-gear"></i>
      <span>Staff Account Management</span>
    </h2>
    <button onclick="triggerAddUser()" class="btn btn-primary btn-sm">
      <i class="fa-solid fa-plus mr-1"></i> Add Account
    </button>
  </div>

  <!-- Table list -->
  <div class="table-responsive">
    <table class="cyber-table">
      <thead>
        <tr>
          <th>Full Name</th>
          <th>Username</th>
          <th>Role</th>
          <th>Status</th>
          <th>Created At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="users-table-body">
        <tr>
          <td colspan="6" class="text-center py-6 text-slate-500">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading staff user database...
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ==========================================
     STAFF ACCOUNT MODALS (Add & Edit)
     ========================================== -->

<!-- Add/Edit User Modal -->
<div id="modal-user-crud" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="user-modal-title">Create New Account</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-user-crud')">&times;</button>
    </div>
    <form id="form-user-crud">
      <input type="hidden" id="crud-user-id" value="">
      <div class="modal-body space-y-4">
        <div class="form-group">
          <label class="form-label" for="crud-fullname">Full Name (KYC)</label>
          <input type="text" id="crud-fullname" class="form-control" placeholder="Sarah Connor" required>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="crud-username">Username</label>
            <input type="text" id="crud-username" class="form-control" placeholder="sarah_c" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="crud-role">System Role</label>
            <select id="crud-role" class="form-control" required>
              <option value="SuperAdmin">SuperAdmin</option>
              <option value="Manager">Manager</option>
              <option value="Attendant">Attendant</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="crud-password">Account Password</label>
          <input type="password" id="crud-password" class="form-control" placeholder="••••••••">
          <p class="text-[10px] text-slate-500 italic mt-1" id="password-help-text">Required for new accounts. Leave blank to retain current password on edits.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-user-crud')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Account Settings</button>
      </div>
    </form>
  </div>
</div>

<?php
include 'footer.php';
?>
