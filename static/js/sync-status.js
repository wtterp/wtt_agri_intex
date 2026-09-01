(() => {
  const $ = id => document.getElementById(id); let busy=false;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function connection() { const online=navigator.onLine; $('connectionText').textContent=online?'🟢 Online':'🔴 Offline'; $('connectionBar').classList.toggle('status-online',online); $('connectionBar').classList.toggle('status-offline',!online); }
  async function serverItems() { if (!navigator.onLine) return []; const r=await fetch('/api/pending',{cache:'no-store'}); if(!r.ok) throw new Error('Unable to load server queue'); return (await r.json()).items || []; }
  function card(item,index,kind) {
    const date=item.created_at || item.browser_queued_at || '';
    const company=item.company_name || item.contact_person || 'Exhibition Enquiry';
    const requirement=item.requirement_type || '';
    const products=item.product_list || '';
    const status=kind==='server'?'<div class="pending-flags">Spreadsheet: ⏳</div>':'';
    return `<article class="pending-card"><div class="pending-index">${index}</div><div><div class="pending-name">${esc(company)}</div><div class="pending-meta">👤 ${esc(item.contact_person||'')}<br>📱 ${esc(item.mobile_number||'')}<br>💧 ${esc(requirement)}${products ? '<br>📦 ' + esc(products) : ''}<br>📅 ${esc(String(date).replace('T',' ').split('.')[0])}</div>${status}</div><div class="pending-icon">◷</div></article>`;
  }
  async function load() {
    connection(); $('loadingState').classList.remove('hidden'); $('emptyState').classList.add('hidden'); $('pendingList').classList.add('hidden'); $('syncFooter').classList.add('hidden');
    try {
      if (navigator.onLine) await window.WTT_QUEUE.flush();
      const browser=window.WTT_QUEUE.load(); const server=await serverItems().catch(()=>[]); const total=browser.length+server.length;
      $('loadingState').classList.add('hidden');
      if(!total){$('emptyState').classList.remove('hidden');$('syncStatusText').textContent='✅ All leads synced';return;}
      $('syncStatusText').textContent=`📤 Pending: ${total}`;
      const html=[]; let n=1;
      if(browser.length){html.push('<div class="queue-heading">Browser offline queue</div>');browser.forEach(x=>html.push(card(x,n++,'browser')));}
      if(server.length){html.push('<div class="queue-heading">Server retry queue</div>');server.forEach(x=>html.push(card(x,n++,'server')));}
      $('pendingList').innerHTML=html.join(''); $('pendingList').classList.remove('hidden'); $('syncFooter').classList.remove('hidden'); $('syncButtonText').textContent=`Sync ${total} Pending Lead${total===1?'':'s'}`;
    } catch(e){$('loadingState').classList.add('hidden');showSnackbar(`Error loading sync status: ${e.message}`,'red');}
  }
  async function syncNow(){if(busy)return;if(!navigator.onLine){showSnackbar('No internet connection.','orange');return;}busy=true;$('syncNowButton').disabled=true;$('syncButtonSpinner').classList.remove('hidden');$('syncStatusText').textContent='🔄 Syncing...';try{await window.WTT_QUEUE.flush();const r=await fetch('/api/sync',{method:'POST'});const result=await r.json().catch(()=>({}));if(!r.ok||!result.success)throw new Error(result.error||'Sync failed');showSnackbar('✅ Sync completed.','green');await load();}catch(e){showSnackbar(`❌ ${e.message}`,'red');}finally{busy=false;$('syncNowButton').disabled=false;$('syncButtonSpinner').classList.add('hidden');}}
  document.addEventListener('DOMContentLoaded',()=>{$('refreshButton').addEventListener('click',load);$('syncNowButton').addEventListener('click',syncNow);load();});
  window.addEventListener('online',load); window.addEventListener('offline',connection); window.addEventListener('wttqueuechanged',load);
})();
