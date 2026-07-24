// Stations Administration Client actions

let allExistingStations = [];

document.addEventListener('DOMContentLoaded', () => {
  loadStationsList();
  // Listen for type changes to auto-suggest name prefix
  document.getElementById('crud-type').addEventListener('change', onStationTypeChanged);
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
    if (data.success) {
      allExistingStations = data.stations;
      tbody.innerHTML = '';
      if (data.stations.length > 0) {
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
            <td class="font-bold text-slate-100 font-cyber">${station.name}</td>
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
            <td colspan="8" class="text-center py-12 text-slate-500">
              <i class="fa-solid fa-desktop text-3xl text-slate-600 mb-2"></i>
              <p class="font-cyber text-sm">No stations registered yet.</p>
              ${window.CURRENT_USER_ROLE === 'SuperAdmin' ? '<p class="text-xs mt-1">Click "Add Station" to create your first station.</p>' : ''}
            </td>
          </tr>
        `;
      }
    }
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-6 text-rust font-bold">Failed to load station list: ${err.message}</td>
      </tr>
    `;
  }
}

// Auto-detect next available number for a given type prefix
function getNextAvailableNumber(type, namePrefix) {
  const prefix = namePrefix || type;
  const regex = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-(\\d+)$', 'i');
  let maxNum = 0;
  allExistingStations.forEach(s => {
    const match = s.name.match(regex);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNum) maxNum = num;
    }
  });
  return maxNum + 1;
}

// When type changes, auto-fill name prefix if empty
function onStationTypeChanged() {
  const id = document.getElementById('crud-station-id').value;
  if (id) return; // Edit mode - don't auto-change
  const type = document.getElementById('crud-type').value;
  const nameInput = document.getElementById('crud-name');
  const currentName = nameInput.value.trim();
  if (!currentName || currentName.match(/^(PS5|PS4|Xbox|Pool|Dining|Other)$/)) {
    const nextNum = getNextAvailableNumber(type, type);
    document.getElementById('crud-startnum').value = nextNum;
    nameInput.value = type;
    nameInput.placeholder = `e.g. ${type}-${String(nextNum).padStart(2, '0')}`;
    updateBatchPreview();
  }
}

// When count changes
function onStationCountChanged() {
  updateBatchPreview();
}

// When name changes, update preview
function onStationNameChanged() {
  const id = document.getElementById('crud-station-id').value;
  if (id) return; // Edit mode
  const type = document.getElementById('crud-type').value;
  const name = document.getElementById('crud-name').value.trim();
  if (name && name !== type) {
    const nextNum = getNextAvailableNumber(type, name);
    document.getElementById('crud-startnum').value = nextNum;
  }
  updateBatchPreview();
}

function updateBatchPreview() {
  try {
    const idEl = document.getElementById('crud-station-id');
    const countEl = document.getElementById('crud-count');
    const nameEl = document.getElementById('crud-name');
    const startNumEl = document.getElementById('crud-startnum');
    if (!idEl || !countEl || !nameEl || !startNumEl) return;

    const id = idEl.value;
    const count = parseInt(countEl.value) || 1;
    const namePrefix = nameEl.value.trim();
    const startNum = parseInt(startNumEl.value) || 1;
  const previewSection = document.getElementById('crud-preview-section');
  const previewNames = document.getElementById('crud-preview-names');
  const nameLabel = document.getElementById('crud-name-label');
  const startNumGroup = document.getElementById('crud-startnum-group');
  const networkSection = document.getElementById('crud-network-section');
  const equipmentSection = document.getElementById('crud-equipment-section');
  const submitBtn = document.getElementById('crud-submit-btn');

  if (id) {
    // Edit mode - single station, hide batch UI
    if (previewSection) previewSection.style.display = 'none';
    if (startNumGroup) startNumGroup.style.display = 'none';
    if (nameLabel) nameLabel.innerText = 'Station Name';
    if (networkSection) networkSection.style.display = '';
    if (equipmentSection) equipmentSection.style.display = '';
    if (submitBtn) submitBtn.innerText = 'Save Station Details';
    document.getElementById('crud-name').required = true;
    document.getElementById('crud-count').value = 1;
    return;
  }

  // Add mode
  if (count > 1) {
    if (nameLabel) nameLabel.innerText = 'Name Prefix';
    if (startNumGroup) startNumGroup.style.display = '';
    if (networkSection) networkSection.style.display = 'none';
    if (equipmentSection) equipmentSection.style.display = 'none';
    if (submitBtn) submitBtn.innerText = `Add ${count} Stations`;
    document.getElementById('crud-name').required = true;
  } else {
    if (nameLabel) nameLabel.innerText = 'Station Name';
    if (startNumGroup) startNumGroup.style.display = 'none';
    if (networkSection) networkSection.style.display = '';
    if (equipmentSection) equipmentSection.style.display = '';
    if (submitBtn) submitBtn.innerText = 'Save Station Details';
    document.getElementById('crud-name').required = true;
  }

  // Show preview for count > 1
  if (count > 1 && namePrefix) {
    if (previewSection) previewSection.style.display = 'block';
    let html = '';
    for (let i = 0; i < count; i++) {
      const num = startNum + i;
      const padded = String(num).padStart(2, '0');
      const fullName = `${namePrefix}-${padded}`;
      html += `<span class="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-100">${fullName}</span>`;
    }
    if (previewNames) previewNames.innerHTML = html;
  } else if (count <= 1) {
    if (previewSection) previewSection.style.display = 'none';
  }
  } catch(e) {
    console.error('updateBatchPreview error:', e);
  }
}

function triggerAddStation() {
  document.getElementById('crud-station-id').value = '';
  document.getElementById('station-modal-title').innerText = 'Add New Station';
  
  const type = document.getElementById('crud-type').value;
  const nextNum = getNextAvailableNumber(type, type);
  document.getElementById('crud-name').value = type;
  document.getElementById('crud-name').placeholder = `e.g. ${type}-${String(nextNum).padStart(2, '0')}`;
  document.getElementById('crud-type').value = type;
  document.getElementById('crud-count').value = '1';
  document.getElementById('crud-startnum').value = nextNum;
  document.getElementById('crud-ip').value = '';
  document.getElementById('crud-mac').value = '';
  document.getElementById('crud-cpu').value = '';
  document.getElementById('crud-gpu').value = '';
  document.getElementById('crud-ram').value = '';
  document.getElementById('crud-peripherals').value = '';
  document.getElementById('crud-preview-section').style.display = 'none';
  document.getElementById('crud-startnum-group').style.display = 'none';
  document.getElementById('crud-network-section').style.display = '';
  document.getElementById('crud-equipment-section').style.display = '';
  document.getElementById('crud-submit-btn').innerText = 'Save Station Details';
  document.getElementById('crud-name-label').innerText = 'Station Name';
  document.getElementById('crud-count-group').style.display = '';

  openModal('modal-station-crud');
}

async function triggerEditStation(id) {
  try {
    const data = await apiFetch('/stations');
    if (data.success) {
      allExistingStations = data.stations;
      const station = data.stations.find(st => st.id === id);
      if (station) {
        document.getElementById('crud-station-id').value = station.id;
        document.getElementById('station-modal-title').innerText = `Edit Station: ${station.name}`;
        
        document.getElementById('crud-name').value = station.name;
        document.getElementById('crud-type').value = station.type;
        document.getElementById('crud-count').value = '1';
        document.getElementById('crud-ip').value = station.ip_address || '';
        document.getElementById('crud-mac').value = station.mac_address || '';
        document.getElementById('crud-cpu').value = station.specs_cpu || '';
        document.getElementById('crud-gpu').value = station.specs_gpu || '';
        document.getElementById('crud-ram').value = station.specs_ram || '';
        document.getElementById('crud-peripherals').value = station.specs_peripherals || '';

        // Hide batch UI for edit
        document.getElementById('crud-preview-section').style.display = 'none';
        document.getElementById('crud-startnum-group').style.display = 'none';
        document.getElementById('crud-count-group').style.display = 'none';
        document.getElementById('crud-network-section').style.display = '';
        document.getElementById('crud-equipment-section').style.display = '';
        document.getElementById('crud-submit-btn').innerText = 'Save Station Details';
        document.getElementById('crud-name-label').innerText = 'Station Name';
        document.getElementById('crud-name').required = true;

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
  const count = parseInt(document.getElementById('crud-count').value) || 1;
  const name = document.getElementById('crud-name').value.trim();
  const type = document.getElementById('crud-type').value;
  const startNum = parseInt(document.getElementById('crud-startnum').value) || 1;

  // Edit mode
  if (id) {
    const ip_address = document.getElementById('crud-ip').value.trim() || null;
    const mac_address = document.getElementById('crud-mac').value.trim() || null;
    const specs_cpu = document.getElementById('crud-cpu').value.trim() || null;
    const specs_gpu = document.getElementById('crud-gpu').value.trim() || null;
    const specs_ram = document.getElementById('crud-ram').value.trim() || null;
    const specs_peripherals = document.getElementById('crud-peripherals').value.trim() || null;

    try {
      await apiFetch(`/stations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, type, ip_address, mac_address, specs_cpu, specs_gpu, specs_ram, specs_peripherals })
      });
      closeModal('modal-station-crud');
      showToast('Station updated successfully!', 'success');
      loadStationsList();
    } catch (err) {
      showToast(err.message, 'error');
    }
    return;
  }

  // Add mode - batch or single
  if (count > 1) {
    if (!name) { showToast('Please enter a name prefix', 'error'); return; }
    try {
      const data = await apiFetch('/stations/batch', {
        method: 'POST',
        body: JSON.stringify({ name_prefix: name, type, count, start_number: startNum })
      });
      closeModal('modal-station-crud');
      showToast(data.message || `${count} stations added successfully!`, 'success');
      loadStationsList();
    } catch (err) {
      showToast(err.message, 'error');
    }
    return;
  }

  // Single add
  if (!name) { showToast('Station name is required', 'error'); return; }
  const ip_address = document.getElementById('crud-ip').value.trim() || null;
  const mac_address = document.getElementById('crud-mac').value.trim() || null;
  const specs_cpu = document.getElementById('crud-cpu').value.trim() || null;
  const specs_gpu = document.getElementById('crud-gpu').value.trim() || null;
  const specs_ram = document.getElementById('crud-ram').value.trim() || null;
  const specs_peripherals = document.getElementById('crud-peripherals').value.trim() || null;

  try {
    await apiFetch('/stations', {
      method: 'POST',
      body: JSON.stringify({ name, type, ip_address, mac_address, specs_cpu, specs_gpu, specs_ram, specs_peripherals })
    });
    closeModal('modal-station-crud');
    showToast('Station added successfully!', 'success');
    loadStationsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function deleteStation(id, name) {
  showConfirm('Delete Station', `Are you absolutely sure you want to delete station ${name}?`, async () => {
    try {
      await apiFetch(`/stations/${id}`, { method: 'DELETE' });
      showToast(`Station ${name} deleted successfully!`, 'success');
      loadStationsList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
