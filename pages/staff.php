<?php
include 'header.php';
?>

<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
  <!-- Left Column: Security Audit Logs (Managers / Admins only) -->
  <div class="col-span-1 xl:col-span-2 space-y-6">
    <div class="bg-parchment border border-slate-800 rounded-lg p-6">
      <div class="section-header mb-6">
        <h2 class="text-xl font-bold text-wood flex items-center gap-2">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <span>Staff Actions Security Audit Trail</span>
        </h2>
      </div>

      <!-- Audit logs list -->
      <div class="table-responsive max-h-[500px] overflow-y-auto pr-1">
        <table class="cyber-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Operator</th>
              <th>Action</th>
              <th>Operation Details</th>
            </tr>
          </thead>
          <tbody id="audit-logs-tbody">
            <tr>
              <td colspan="4" class="text-center py-6 text-slate-500">
                <i class="fa-solid fa-spinner fa-spin mr-2"></i> Fetching operations timeline...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Right Column: Shift Management & Backups -->
  <div class="space-y-6">
    <!-- DB Backups -->
    <div class="bg-parchment border border-slate-800 rounded-lg p-6">
      <h3 class="text-lg font-bold font-cyber text-clay mb-4 uppercase tracking-wider">
        <i class="fa-solid fa-database mr-2"></i>Database Utilities
      </h3>
      <p class="text-xs text-slate-400 mb-4">Export manual SQL schema and data dumps. Restorable on any MySQL compatible database instance.</p>
      
      <!-- Attendant restriction -->
      <?php if ($role === 'SuperAdmin'): ?>
        <div class="space-y-3">
          <button id="btn-trigger-backup" onclick="runDatabaseBackup()" class="w-full btn btn-primary py-3 tracking-wider font-cyber">
            <i class="fa-solid fa-download"></i> Trigger Manual DB Backup
          </button>
          
          <div id="backup-download-container" class="hidden p-3 bg-slate-900 border border-forest/30 rounded text-center text-xs space-y-2">
            <p class="text-forest font-semibold"><i class="fa-solid fa-circle-check mr-1"></i>Backup completed!</p>
            <a href="#" id="backup-download-link" class="inline-block btn btn-success btn-sm w-full">
              <i class="fa-solid fa-file-arrow-down mr-1"></i> Download Backup File
            </a>
          </div>
        </div>
      <?php else: ?>
        <div class="p-3 bg-slate-950 border border-red-500/20 text-red-400 text-xs rounded text-center">
          <i class="fa-solid fa-lock mr-1"></i> Manual backups restricted to System Administrators.
        </div>
      <?php endif; ?>
    </div>
  </div>
</div>

<?php
include 'footer.php';
?>
