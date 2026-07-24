// Real-time Event Stream Listener using Server-Sent Events (SSE)

function initRealtimeStream() {
  const eventSource = new EventSource(`${window.BACKEND_URL}/realtime/stream`, { withCredentials: true });

  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const { type, data } = payload;

      switch (type) {
        case 'connected':
          console.log('[SSE Stream]', data.message || data);
          break;
        case 'station_update':
          console.log('[SSE Station Update]', data);
          // Dispatch a custom window event so dashboard.js can react
          window.dispatchEvent(new CustomEvent('stationStatusChanged', { detail: data }));
          break;
        case 'session_tick':
          // Dispatch ticking timer events
          window.dispatchEvent(new CustomEvent('sessionTimerTick', { detail: data }));
          break;
        case 'activity_feed':
          addActivityItem(data);
          break;
        case 'new_quick_order':
          console.log('[SSE New Quick Order]', data);
          showToast(`🍔 Order from ${data.location}: ${data.itemsSummary}`, 'success');
          if (window.SoundEffects) {
            window.SoundEffects.playNewAppointment();
          }
          break;
        case 'timer_ended':
          console.log('[SSE Timer Ended]', data);
          showToast(`Timer ended for session #${data.sessionId} (${data.playerName}) on ${data.stationName}`, 'warning');
          if (window.SoundEffects) {
            window.SoundEffects.playTimerEnded();
          }
          break;
        case 'new_appointment':
          console.log('[SSE New Appointment]', data);
          showToast(`New slot reservation requested by ${data.playerName}`, 'info');
          if (window.SoundEffects) {
            window.SoundEffects.playNewAppointment();
          }
          window.dispatchEvent(new CustomEvent('appointmentCreated', { detail: data }));
          break;
        case 'whatsapp_status':
          console.log('[SSE WhatsApp Status]', data);
          window.dispatchEvent(new CustomEvent('whatsappStatusChanged', { detail: data }));
          break;
        case 'whatsapp_message':
          console.log('[SSE WhatsApp Message]', data);
          window.dispatchEvent(new CustomEvent('whatsappMessageReceived', { detail: data }));
          break;
      }
    } catch (err) {
      console.error('[SSE Parse Error]:', err);
    }
  };

  eventSource.onerror = (err) => {
    console.error('[SSE Connection Error]: Stream disconnected. Reconnecting...');
  };
}

function addActivityItem(activity) {
  const list = document.getElementById('activity-feed-list');
  if (!list) return;

  const item = document.createElement('li');
  item.className = 'activity-item border-b border-slate-800 pb-3 opacity-0 transform translate-x-2 transition duration-300';
  
  const date = new Date(activity.timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  item.innerHTML = `
    <div class="activity-time">${timeStr}</div>
    <div class="activity-action text-clay">${activity.action}</div>
    <div class="activity-desc">${activity.details}</div>
  `;

  // Insert on top
  list.insertBefore(item, list.firstChild);

  // Trigger animation
  setTimeout(() => {
    item.classList.remove('opacity-0', 'translate-x-2');
  }, 10);

  // Keep max 25 activity log items
  if (list.children.length > 25) {
    list.removeChild(list.lastChild);
  }
}

// Start Stream on window load
document.addEventListener('DOMContentLoaded', () => {
  initRealtimeStream();
});
