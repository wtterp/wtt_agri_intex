(() => {
  let timer;

  window.showSnackbar = function(message, color='green', duration=3500) {
    const el = document.getElementById('snackbar');
    if (!el) return;
    clearTimeout(timer);
    el.textContent = message;
    el.className = `snackbar ${color} show`;
    timer = setTimeout(() => { el.className = 'snackbar'; }, duration);
  };

  async function configureServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    const host = window.location.hostname;
    const isLocal = host === '127.0.0.1' || host === 'localhost';

    if (isLocal) {
      // Development must always load the latest Flask files.
      // Remove any service worker/cache previously installed on localhost.
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      } catch (error) {
        console.warn('Local service-worker cleanup failed', error);
      }

      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        } catch (error) {
          console.warn('Local cache cleanup failed', error);
        }
      }
      return;
    }

    // PWA/offline caching is enabled only outside localhost (for example Vercel).
    try {
      await navigator.serviceWorker.register('/service-worker.js');
    } catch (error) {
      console.warn('Service worker registration failed', error);
    }
  }

  document.addEventListener('DOMContentLoaded', configureServiceWorker);
  window.addEventListener('online', () => window.WTT_QUEUE?.flush());
  setInterval(() => {
    if (navigator.onLine) window.WTT_QUEUE?.flush();
  }, 30000);
})();
