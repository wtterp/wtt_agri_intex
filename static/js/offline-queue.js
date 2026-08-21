(() => {
  const KEY = 'wtt_agri_intex_offline_queue_v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; } }
  function save(items, notify=true) { localStorage.setItem(KEY, JSON.stringify(items)); if (notify) window.dispatchEvent(new CustomEvent('wttqueuechanged')); }
  function add(payload) {
    const items = load();
    if (!payload.client_submission_id) payload.client_submission_id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    payload.browser_queued_at = payload.browser_queued_at || new Date().toISOString();
    if (!items.some(x => x.client_submission_id === payload.client_submission_id)) items.push(payload);
    save(items); return payload;
  }
  function remove(id) { save(load().filter(x => x.client_submission_id !== id)); }
  async function flush() {
    if (!navigator.onLine) return {sent:0, remaining:load().length};
    const items = load(); const remaining=[]; let sent=0;
    for (let i=0; i<items.length; i++) {
      const item=items[i];
      try {
        const response = await fetch('/api/submit', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...item, from_offline_queue:true})});
        if (response.ok) sent += 1;
        else remaining.push(item);
      } catch (_) {
        remaining.push(item, ...items.slice(i+1));
        break;
      }
    }
    save(remaining, sent > 0 || remaining.length !== items.length);
    return {sent, remaining:remaining.length};
  }
  window.WTT_QUEUE = {load, add, remove, flush};
})();
