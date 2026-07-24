// Staff Shift Logs and Backup Actions

document.addEventListener('DOMContentLoaded', () => {
  loadAuditLogs();
});
async function loadAuditLogs() {
  const tbody = document.getElementById('audit-logs-tbody');
  if (!tbody) return;

  if (window.CURRENT_USER_ROLE === 'Attendant') {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-6 text-rust font-bold">
          <i class="fa-solid fa-lock mr-2"></i> Access Restricted
          <p class="text-xs text-slate-500 font-normal mt-1">Audit logs can only be viewed by Managers or Super Administrators.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center py-6 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading audits...
      </td>
    </tr>
  `;

  try {
    const data = await apiFetch('/system/audit-logs');
    if (data.success) {
      if (data.logs.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center py-6 text-slate-500">No action audits recorded.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = '';
      data.logs.forEach(log => {
        const tr = document.createElement('tr');
        const stamp = new Date(log.timestamp).toLocaleString();
        
        let roleBadge = '';
        if (log.role === 'SuperAdmin') {
          roleBadge = '<span class="badge badge-pink font-cyber text-[9px]">Admin</span>';
        } else if (log.role === 'Manager') {
          roleBadge = '<span class="badge badge-gold font-cyber text-[9px]">Manager</span>';
        } else {
          roleBadge = '<span class="badge badge-cyan font-cyber text-[9px]">Attendant</span>';
        }

        tr.innerHTML = `
          <td class="font-mono text-[10px] text-slate-400">${stamp}</td>
          <td>
            <div class="font-bold text-slate-100 text-xs">${log.full_name}</div>
            <div class="flex items-center gap-1 mt-0.5"><span class="text-[10px] text-slate-500">@${log.username}</span> ${roleBadge}</div>
          </td>
          <td class="font-bold text-clay text-xs uppercase tracking-wider font-cyber">${log.action}</td>
          <td class="text-xs text-slate-300 max-w-sm truncate" title="${log.details}">${log.details}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-6 text-rust font-bold">Failed to load audits: ${err.message}</td>
      </tr>
    `;
  }
}

// Database manual backup utility triggers (Admins only)
async function runDatabaseBackup() {
  if (window.CURRENT_USER_ROLE !== 'SuperAdmin') {
    showToast('Only System Administrators can trigger database backups.', 'error');
    return;
  }

  const btn = document.getElementById('btn-trigger-backup');
  const downloadContainer = document.getElementById('backup-download-container');
  const downloadLink = document.getElementById('backup-download-link');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> DUMPING DATABASE...';
  downloadContainer.classList.add('hidden');

  try {
    const data = await apiFetch('/system/backup', { method: 'POST' });
    if (data.success) {
      showToast('Database SQL dump compiled successfully!', 'success');
      
      // Setup download handler using fetch to avoid token leakage in query parameters
      downloadLink.href = '#';
      downloadLink.onclick = async (e) => {
        e.preventDefault();
        try {
          showToast('Downloading backup file...', 'info');
          const response = await fetch(`${window.BACKEND_URL}/system/backup/download/${data.filename}`, {
            headers: {
              'Authorization': `Bearer ${window.JWT_TOKEN}`
            }
          });
          if (!response.ok) throw new Error('Download failed');
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const tempLink = document.createElement('a');
          tempLink.href = downloadUrl;
          tempLink.download = data.filename;
          document.body.appendChild(tempLink);
          tempLink.click();
          document.body.removeChild(tempLink);
          window.URL.revokeObjectURL(downloadUrl);
        } catch (downloadErr) {
          showToast('Failed to download backup: ' + downloadErr.message, 'error');
        }
      };
      downloadContainer.classList.remove('hidden');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-download mr-1"></i> Trigger Manual DB Backup';
  }
}
