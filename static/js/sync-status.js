(() => {
  const byId=id=>document.getElementById(id); let busy=false;
  function esc(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function updateConnection() {
    const online=navigator.onLine; byId('connectionText').textContent=window.WTT_I18N.t(online?'online':'offline');
    byId('connectionBar').classList.toggle('status-online',online); byId('connectionBar').classList.toggle('status-offline',!online);
  }
  function browserItems() { return window.WTT_QUEUE ? window.WTT_QUEUE.load() : []; }
  async function serverItems() {
    if (!navigator.onLine) return [];
    const r=await fetch('/api/pending',{cache:'no-store'}); if (!r.ok) throw new Error('Unable to load server pending data'); return (await r.json()).items || [];
  }
  function card(item,index,kind) {
    const date=item.created_at || item.browser_queued_at || 'N/A';
    let flags=''; if (kind==='server') flags=`<div class="pending-flags">${esc(window.WTT_I18N.t('google_status'))}: ${item.google_synced?'✅':'⏳'} &nbsp; ${esc(window.WTT_I18N.t('erp_status'))}: ${item.erp_synced?'✅':'⏳'}</div>`;
    return `<article class="pending-card"><div class="pending-index">${index}</div><div><div class="pending-name">${esc(item.name)}</div><div class="pending-meta">📱 ${esc(window.WTT_I18N.t('mobile_number'))}: ${esc(item.mobile_number)}<br>🌾 ${esc(window.WTT_I18N.t('crops'))}: ${esc(item.crops)}<br>📅 ${esc(String(date).replace('T',' ').split('.')[0])}</div>${flags}</div><div class="pending-icon">◷</div></article>`;
  }
  async function load({autoSync=false}={}) {
    byId('loadingState').classList.remove('hidden'); byId('emptyState').classList.add('hidden'); byId('pendingList').classList.add('hidden'); byId('syncFooter').classList.add('hidden'); updateConnection();
    try {
      if (navigator.onLine) await window.WTT_QUEUE.flush();
      const browser=browserItems(); const server=await serverItems().catch(()=>[]); const total=browser.length+server.length;
      byId('loadingState').classList.add('hidden');
      if (!total) { byId('emptyState').classList.remove('hidden'); byId('syncStatusText').textContent=window.WTT_I18N.t('all_synced'); return; }
      byId('syncStatusText').textContent=`${window.WTT_I18N.t('pending')}${total}${window.WTT_I18N.t('items')}`;
      const parts=[]; let n=1;
      if (browser.length) { parts.push(`<div class="queue-heading">${esc(window.WTT_I18N.t('browser_pending'))}</div>`); browser.forEach(x=>parts.push(card(x,n++,'browser'))); }
      if (server.length) { parts.push(`<div class="queue-heading">${esc(window.WTT_I18N.t('server_pending'))}</div>`); server.forEach(x=>parts.push(card(x,n++,'server'))); }
      byId('pendingList').innerHTML=parts.join(''); byId('pendingList').classList.remove('hidden'); byId('syncFooter').classList.remove('hidden');
      byId('syncButtonText').textContent=`${window.WTT_I18N.t('sync_items')}${total}${window.WTT_I18N.t('pending_items')}`;
      if (autoSync && navigator.onLine) await syncNow();
    } catch (e) { byId('loadingState').classList.add('hidden'); showSnackbar(`${window.WTT_I18N.t('loading_error')}${e.message}`,'red'); }
  }
  function setBusy(v) { busy=v; byId('syncNowButton').disabled=v; byId('refreshButton').disabled=v; byId('syncButtonSpinner').classList.toggle('hidden',!v); }
  async function syncNow() {
    if (busy) return; if (!navigator.onLine) { showSnackbar(window.WTT_I18N.t('no_internet'),'orange'); return; }
    setBusy(true); byId('syncStatusText').textContent=window.WTT_I18N.t('syncing');
    try {
      await window.WTT_QUEUE.flush();
      const r=await fetch('/api/sync',{method:'POST'}); if (!r.ok) throw new Error('Sync request failed'); const result=await r.json(); if (!result.success) throw new Error(result.error || 'Sync failed');
      showSnackbar(window.WTT_I18N.t('sync_success'),'green'); await load();
    } catch (e) { byId('syncStatusText').textContent=window.WTT_I18N.t('sync_failed'); showSnackbar(window.WTT_I18N.t('sync_failed_message'),'red'); }
    finally { setBusy(false); }
  }
  document.addEventListener('DOMContentLoaded',()=>{ byId('refreshButton').addEventListener('click',()=>load()); byId('syncNowButton').addEventListener('click',syncNow); load({autoSync:true}); });
  document.addEventListener('languagechanged',()=>load()); window.addEventListener('online',()=>load({autoSync:true})); window.addEventListener('offline',updateConnection); window.addEventListener('wttqueuechanged',()=>load());
})();
