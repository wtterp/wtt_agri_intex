(() => {
  let snackbarTimer;
  window.showSnackbar = function(message, color='green', duration=3500) {
    const el = document.getElementById('snackbar'); if (!el) return;
    clearTimeout(snackbarTimer); el.textContent = message; el.className = `snackbar ${color} show`;
    snackbarTimer = setTimeout(() => { el.className = 'snackbar'; }, duration);
  };
  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('/service-worker.js'); } catch (e) { console.warn('Service worker registration failed', e); } }
  }
  document.addEventListener('DOMContentLoaded', registerServiceWorker);
  window.addEventListener('online', () => { if (window.WTT_QUEUE) window.WTT_QUEUE.flush(); });
  setInterval(() => { if (navigator.onLine && window.WTT_QUEUE) window.WTT_QUEUE.flush(); }, 30000);
})();
