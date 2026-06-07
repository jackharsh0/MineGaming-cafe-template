// Stations Administration Client actions

document.addEventListener('DOMContentLoaded', () => {
  loadStationsList();
});

async function loadStationsList() {
  const tbody = document.getElementById('stations-table-body');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-6 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading station configs...
      </td>
    </tr>
  `;

  try {
    const data = await apiFetch('/stations');
    if (data.success && data.stations.length > 0) {
      tbody.innerHTML = '';
      data.stations.forEach(station => {
        const tr = document.createElement('tr');
        
        let specString = '<span class="text-slate-500 italic">No hardware logged</span>';
        if (station.specs_cpu || station.specs_gpu || station.specs_ram) {
          specString = `<span class="font-semibold text-xs">${station.specs_cpu || '-'} / ${station.specs_gpu || '-'} / ${station.specs_ram || '-'}</span>`;
        }

        let statusBadge = '';
        if (station.status === 'Available') {
          statusBadge = '<span class="badge badge-green">Free</span>';
        } else if (station.status === 'Occupied') {
          statusBadge = '<span class="badge badge-cyan">Active</span>';
        } else {
          statusBadge = '<span class="badge badge-gold">Maintenance</span>';
        }

        let actionsHTML = '';
        if (window.CURRENT_USER_ROLE === 'SuperAdmin') {
          actionsHTML = `
            <div class="flex gap-2">
              <button onclick="triggerEditStation(${station.id})" class="btn btn-secondary btn-sm" title="Edit Specs">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button onclick="deleteStation(${station.id}, '${station.name}')" class="btn btn-danger btn-sm" title="Delete">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          `;
        }
 
        tr.innerHTML = `
          <td class="font-bold text-white font-cyber">${station.name}</td>
          <td><span class="station-type-badge">${station.type}</span></td>
          <td>${specString}</td>
          <td class="font-mono text-xs">${station.ip_address || '-'}</td>
          <td class="font-mono text-xs">${station.mac_address || '-'}</td>
          <td class="text-xs max-w-xs truncate">${station.specs_peripherals || '-'}</td>
          <td>${statusBadge}</td>
          ${window.CURRENT_USER_ROLE === 'SuperAdmin' ? `<td>${actionsHTML}</td>` : ''}
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-6 text-slate-500">No stations registered in database.</td>
        </tr>
      `;
    }
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-6 text-neonRed font-bold">Failed to load station list: ${err.message}</td>
      </tr>
    `;
  }
}

function triggerAddStation() {
  document.getElementById('crud-station-id').value = '';
  document.getElementById('station-modal-title').innerText = 'Add New Station';
  
  // Clear fields
  document.getElementById('crud-name').value = '';
  document.getElementById('crud-type').value = 'PC';
  document.getElementById('crud-ip').value = '';
  document.getElementById('crud-mac').value = '';
  document.getElementById('crud-cpu').value = '';
  document.getElementById('crud-gpu').value = '';
  document.getElementById('crud-ram').value = '';
  document.getElementById('crud-peripherals').value = '';

  openModal('modal-station-crud');
}

async function triggerEditStation(id) {
  try {
    const data = await apiFetch('/stations');
    if (data.success) {
      const station = data.stations.find(st => st.id === id);
      if (station) {
        document.getElementById('crud-station-id').value = station.id;
        document.getElementById('station-modal-title').innerText = `Edit Station: ${station.name}`;
        
        document.getElementById('crud-name').value = station.name;
        document.getElementById('crud-type').value = station.type;
        document.getElementById('crud-ip').value = station.ip_address || '';
        document.getElementById('crud-mac').value = station.mac_address || '';
        document.getElementById('crud-cpu').value = station.specs_cpu || '';
        document.getElementById('crud-gpu').value = station.specs_gpu || '';
        document.getElementById('crud-ram').value = station.specs_ram || '';
        document.getElementById('crud-peripherals').value = station.specs_peripherals || '';

        openModal('modal-station-crud');
      }
    }
  } catch (err) {
    showToast('Failed to load station details', 'error');
  }
}

document.getElementById('form-station-crud').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('crud-station-id').value;
  const name = document.getElementById('crud-name').value.trim();
  const type = document.getElementById('crud-type').value;
  const ip_address = document.getElementById('crud-ip').value.trim() || null;
  const mac_address = document.getElementById('crud-mac').value.trim() || null;
  const specs_cpu = document.getElementById('crud-cpu').value.trim() || null;
  const specs_gpu = document.getElementById('crud-gpu').value.trim() || null;
  const specs_ram = document.getElementById('crud-ram').value.trim() || null;
  const specs_peripherals = document.getElementById('crud-peripherals').value.trim() || null;

  const endpoint = id ? `/stations/${id}` : '/stations';
  const method = id ? 'PUT' : 'POST';

  try {
    await apiFetch(endpoint, {
      method,
      body: JSON.stringify({
        name,
        type,
        ip_address,
        mac_address,
        specs_cpu,
        specs_gpu,
        specs_ram,
        specs_peripherals
      })
    });

    closeModal('modal-station-crud');
    showToast(id ? 'Station updated successfully!' : 'Station added successfully!', 'success');
    loadStationsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function deleteStation(id, name) {
  showConfirm('Delete Terminal', `Are you absolutely sure you want to delete terminal ${name}?`, async () => {
    try {
      await apiFetch(`/stations/${id}`, { method: 'DELETE' });
      showToast(`Terminal ${name} deleted successfully!`, 'success');
      loadStationsList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
