// Appointments Scheduling Client Action Script

let allAppointments = [];

document.addEventListener('DOMContentLoaded', () => {
  loadAppointments();
  loadStationsDropdown();

  // Initialize Flatpickr instances
  window.fpStart = flatpickr("#crud-appt-start-time", {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    minDate: "today",
    theme: "dark"
  });
  window.fpEnd = flatpickr("#crud-appt-end-time", {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    minDate: "today",
    theme: "dark"
  });

  // Bind Form Submit
  const apptForm = document.getElementById('form-appointment-crud');
  if (apptForm) {
    apptForm.addEventListener('submit', handleApptFormSubmit);
  }
});

// Load appointments list
async function loadAppointments() {
  const tbody = document.getElementById('appointments-table-body');
  if (!tbody) return;

  try {
    const data = await apiFetch('/appointments');
    if (data.success) {
      allAppointments = data.appointments;
      renderAppointmentsTable();
    }
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-6 text-neonRed font-bold">Failed to load schedule: ${err.message}</td>
      </tr>
    `;
  }
}

// Render appointments grid
function renderAppointmentsTable() {
  const tbody = document.getElementById('appointments-table-body');
  if (!tbody) return;

  const statusFilter = document.getElementById('filter-appt-status').value;

  const filtered = statusFilter === 'ALL'
    ? allAppointments
    : allAppointments.filter(a => a.status === statusFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-6 text-slate-500">No scheduled appointments found matching selection.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach(appt => {
    const tr = document.createElement('tr');
    tr.id = `row-appt-${appt.id}`;

    // Format times
    const start = new Date(appt.start_time);
    const end = new Date(appt.end_time);
    const dateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const timeSlotStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let statusBadge = '';
    let quickActionsHTML = '';

    // Action button layouts according to status
    if (appt.status === 'Pending') {
      statusBadge = '<span class="badge badge-gold">Pending</span>';
      quickActionsHTML = `
        <button onclick="updateApptStatus(${appt.id}, 'Confirmed')" class="btn btn-success btn-sm" title="Confirm Appointment"><i class="fa-solid fa-circle-check"></i></button>
        <button onclick="updateApptStatus(${appt.id}, 'Cancelled')" class="btn btn-danger btn-sm" title="Cancel Appointment"><i class="fa-solid fa-circle-xmark"></i></button>
      `;
    } else if (appt.status === 'Confirmed') {
      statusBadge = '<span class="badge badge-cyan">Confirmed</span>';
      quickActionsHTML = `
        <button onclick="updateApptStatus(${appt.id}, 'Completed')" class="btn btn-success btn-sm" title="Mark Completed"><i class="fa-solid fa-check-double"></i></button>
        <button onclick="updateApptStatus(${appt.id}, 'Cancelled')" class="btn btn-danger btn-sm" title="Cancel Appointment"><i class="fa-solid fa-circle-xmark"></i></button>
      `;
    } else if (appt.status === 'Completed') {
      statusBadge = '<span class="badge badge-green">Completed</span>';
    } else if (appt.status === 'Cancelled') {
      statusBadge = '<span class="badge badge-red">Cancelled</span>';
    }

    const editDeleteActions = `
      <button onclick="triggerEditAppointment(${appt.id})" class="btn btn-secondary btn-sm" title="Edit Booking"><i class="fa-solid fa-pen-to-square text-neonCyan"></i></button>
      ${window.CURRENT_USER_ROLE !== 'Attendant' ? `<button onclick="deleteAppointment(${appt.id})" class="btn btn-secondary btn-sm" title="Delete Booking"><i class="fa-solid fa-trash text-neonPink"></i></button>` : ''}
    `;

    tr.innerHTML = `
      <td class="font-mono text-xs text-slate-500">#${appt.id}</td>
      <td class="font-bold text-white">${appt.player_name}</td>
      <td class="font-mono text-xs text-slate-400">${appt.player_phone}</td>
      <td>
        <div class="font-bold text-xs">${appt.station_name}</div>
        <div class="text-[10px] text-slate-500 uppercase tracking-widest font-mono">${appt.station_type}</div>
      </td>
      <td class="text-xs text-slate-300 font-cyber font-bold">${dateStr}</td>
      <td class="font-mono text-xs text-neonCyan">${timeSlotStr}</td>
      <td>${statusBadge}</td>
      <td class="text-xs text-slate-400 max-w-xs truncate" title="${appt.notes || ''}">${appt.notes || '<span class="italic text-slate-600">None</span>'}</td>
      <td>
        <div class="flex gap-1">
          ${quickActionsHTML}
          ${editDeleteActions}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Load stations list into form select dropdown
async function loadStationsDropdown() {
  const select = document.getElementById('crud-appt-station-id');
  if (!select) return;

  try {
    const data = await apiFetch('/stations');
    if (data.success) {
      select.innerHTML = '<option value="">-- Choose Station --</option>';
      data.stations.forEach(st => {
        const opt = document.createElement('option');
        opt.value = st.id;
        opt.innerText = `${st.name} (${st.type}) - ${st.status}`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load stations for booking form:', err);
  }
}

// Trigger Add Appointment Modal
function triggerAddAppointment() {
  document.getElementById('crud-appt-id').value = '';
  document.getElementById('appt-modal-title').innerText = 'Schedule New Appointment';

  // Reset inputs
  document.getElementById('crud-appt-player-name').value = '';
  document.getElementById('crud-appt-player-phone').value = '';
  document.getElementById('crud-appt-station-id').value = '';
  
  if (window.fpStart) {
    window.fpStart.setDate(new Date());
  } else {
    document.getElementById('crud-appt-start-time').value = '';
  }
  if (window.fpEnd) {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    window.fpEnd.setDate(nextHour);
  } else {
    document.getElementById('crud-appt-end-time').value = '';
  }
  
  document.getElementById('crud-appt-notes').value = '';

  // Hide status editor for brand-new bookings (forced Pending)
  document.getElementById('crud-appt-status-group').style.display = 'none';

  openModal('modal-appointment-crud');
}

// Trigger Edit Appointment Modal
function triggerEditAppointment(id) {
  const appt = allAppointments.find(a => a.id === id);
  if (!appt) return;

  document.getElementById('crud-appt-id').value = appt.id;
  document.getElementById('appt-modal-title').innerText = `Edit Appointment Slot #${appt.id}`;

  document.getElementById('crud-appt-player-name').value = appt.player_name;
  document.getElementById('crud-appt-player-phone').value = appt.player_phone;
  document.getElementById('crud-appt-station-id').value = appt.station_id;
  
  // Format Date and Time for inputs
  const start = new Date(appt.start_time);
  const end = new Date(appt.end_time);

  const formatDateTimeStr = (d) => {
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const Min = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD} ${HH}:${Min}`;
  };

  const startStr = formatDateTimeStr(start);
  if (window.fpStart) {
    window.fpStart.setDate(startStr);
  } else {
    document.getElementById('crud-appt-start-time').value = startStr;
  }

  const endStr = formatDateTimeStr(end);
  if (window.fpEnd) {
    window.fpEnd.setDate(endStr);
  } else {
    document.getElementById('crud-appt-end-time').value = endStr;
  }

  document.getElementById('crud-appt-notes').value = appt.notes || '';
  
  // Show status select dropdown for editing
  document.getElementById('crud-appt-status-group').style.display = 'block';
  document.getElementById('crud-appt-status').value = appt.status;

  openModal('modal-appointment-crud');
}

// Handle Form Submission
async function handleApptFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('crud-appt-id').value;
  const playerName = document.getElementById('crud-appt-player-name').value.trim();
  const playerPhone = document.getElementById('crud-appt-player-phone').value.trim();
  const stationId = parseInt(document.getElementById('crud-appt-station-id').value);
  const notes = document.getElementById('crud-appt-notes').value.trim();

  const startTimeVal = document.getElementById('crud-appt-start-time').value;
  const endTimeVal = document.getElementById('crud-appt-end-time').value;

  const startTime = startTimeVal.includes('T') ? startTimeVal : startTimeVal.replace(' ', 'T') + ':00';
  const endTime = endTimeVal.includes('T') ? endTimeVal : endTimeVal.replace(' ', 'T') + ':00';

  const body = {
    playerName,
    playerPhone,
    stationId,
    startTime,
    endTime,
    notes
  };

  try {
    if (id) {
      // Edit
      body.status = document.getElementById('crud-appt-status').value;
      const data = await apiFetch(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      showToast(data.message, 'success');
    } else {
      // Add
      const data = await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      showToast(data.message, 'success');
    }

    closeModal('modal-appointment-crud');
    loadAppointments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Update Status Quick-Toggle
async function updateApptStatus(id, status) {
  try {
    const data = await apiFetch(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    showToast(data.message, 'success');
    loadAppointments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delete Appointment Booking
function deleteAppointment(id) {
  showConfirm('Delete Appointment', `Are you sure you want to delete appointment booking #${id}?`, async () => {
    try {
      const data = await apiFetch(`/appointments/${id}`, {
        method: 'DELETE'
      });
      showToast(data.message, 'success');
      loadAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
