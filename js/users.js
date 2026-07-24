// Users Management Client Actions

let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
  loadUsersList();
});

async function loadUsersList() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-6 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading user configs...
      </td>
    </tr>
  `;

  try {
    const data = await apiFetch('/users');
    if (data.success && data.users.length > 0) {
      allUsers = data.users;
      tbody.innerHTML = '';
      allUsers.forEach(user => {
        const tr = document.createElement('tr');
        
        let statusBadge = '';
        if (user.status === 'Active') {
          statusBadge = '<span class="badge badge-green">Active</span>';
        } else {
          statusBadge = '<span class="badge badge-red">Inactive</span>';
        }

        const dateStr = new Date(user.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        
        const isSelf = parseInt(user.id) === parseInt(window.CURRENT_USER_ID);
        
        // Actions
        const actionsHTML = `
          <div class="flex gap-2">
            <button onclick="triggerEditUser(${user.id})" class="btn btn-secondary btn-sm" title="Edit Account">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button onclick="toggleUserStatus(${user.id}, '${user.status}')" class="btn ${user.status === 'Active' ? 'btn-warning' : 'btn-success'} btn-sm" title="${user.status === 'Active' ? 'Deactivate' : 'Activate'}" ${isSelf ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
              <i class="fa-solid ${user.status === 'Active' ? 'fa-user-slash' : 'fa-user-check'}"></i>
            </button>
            <button onclick="deleteUser(${user.id}, '${user.username}')" class="btn btn-danger btn-sm" title="Delete" ${isSelf ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        `;

        tr.innerHTML = `
          <td class="font-bold text-slate-100">${user.full_name} ${isSelf ? '<span class="text-[9px] tracking-widest uppercase font-mono text-wood ml-1">(You)</span>' : ''}</td>
          <td class="font-mono text-xs text-slate-300">${user.username}</td>
          <td><span class="station-type-badge ${user.role === 'SuperAdmin' ? 'border-wood text-wood' : user.role === 'Manager' ? 'border-clay text-clay' : 'border-slate-500 text-slate-400'}">${user.role}</span></td>
          <td>${statusBadge}</td>
          <td class="text-xs text-slate-400 font-mono">${dateStr}</td>
          <td>${actionsHTML}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-12 text-slate-500">
            <i class="fa-solid fa-user-gear text-3xl text-slate-600 mb-2"></i>
            <p class="font-cyber text-sm">No staff accounts yet.</p>
            <p class="text-xs mt-1">Click "Add Account" to create one.</p>
          </td>
        </tr>
      `;
    }
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6 text-rust font-bold">Failed to load user list: ${err.message}</td>
      </tr>
    `;
  }
}

function triggerAddUser() {
  document.getElementById('crud-user-id').value = '';
  document.getElementById('user-modal-title').innerText = 'Create New Account';
  
  // Clear fields
  document.getElementById('crud-fullname').value = '';
  document.getElementById('crud-username').value = '';
  document.getElementById('crud-role').value = 'Attendant';
  document.getElementById('crud-password').value = '';
  document.getElementById('crud-password').required = true;
  document.getElementById('password-help-text').innerText = 'Required for new accounts.';

  openModal('modal-user-crud');
}

function triggerEditUser(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;

  document.getElementById('crud-user-id').value = user.id;
  document.getElementById('user-modal-title').innerText = `Edit Account: ${user.username}`;
  
  document.getElementById('crud-fullname').value = user.full_name;
  document.getElementById('crud-username').value = user.username;
  document.getElementById('crud-role').value = user.role;
  document.getElementById('crud-password').value = '';
  document.getElementById('crud-password').required = false;
  document.getElementById('password-help-text').innerText = 'Leave blank to retain current password on edits.';

  openModal('modal-user-crud');
}

document.getElementById('form-user-crud').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('crud-user-id').value;
  const full_name = document.getElementById('crud-fullname').value.trim();
  const username = document.getElementById('crud-username').value.trim();
  const role = document.getElementById('crud-role').value;
  const password = document.getElementById('crud-password').value;

  const endpoint = id ? `/users/${id}` : '/users';
  const method = id ? 'PUT' : 'POST';

  const payload = {
    full_name,
    username,
    role
  };

  if (password) {
    payload.password = password;
  }

  try {
    await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    });

    closeModal('modal-user-crud');
    showToast(id ? 'Account updated successfully!' : 'Account created successfully!', 'success');
    loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function toggleUserStatus(id, currentStatus) {
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  try {
    await apiFetch(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Account status updated to ${newStatus}`, 'success');
    loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function deleteUser(id, username) {
  showConfirm('Delete Staff Account', `Are you absolutely sure you want to delete staff account: ${username}?`, async () => {
    try {
      const data = await apiFetch(`/users/${id}`, { method: 'DELETE' });
      showToast(data.message || `Account ${username} deleted successfully!`, 'success');
      loadUsersList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
