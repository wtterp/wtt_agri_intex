(() => {
  const translations = {
    en: {
      home_title: 'Water & Wastewater Treatment', home_desc: 'Exhibition enquiry and lead capture for WTT requirements.',
      new_enquiry: 'New Exhibition Enquiry', sync_status: 'View Sync Status',
      sync_title: 'Exhibition Lead Sync Status', connection: 'Connection:', online: '🟢 Online', sheet_sync: 'Spreadsheet Sync:', synced: '✅ All leads synced',
      all_synced: 'All enquiries are synced!', no_pending: 'No pending exhibition enquiries.', sync_pending: 'Sync Pending Enquiries', page_title: 'WTT Exhibition Lead Tracker', language: 'Language', back: 'Back'
    },
    es: {
      home_title: 'Tratamiento de agua y aguas residuales', home_desc: 'Registro de consultas y clientes de exposición para WTT.',
      new_enquiry: 'Nueva consulta de exposición', sync_status: 'Ver estado de sincronización',
      sync_title: 'Estado de sincronización de consultas', connection: 'Conexión:', online: '🟢 En línea', sheet_sync: 'Sincronización con hoja:', synced: '✅ Todas las consultas sincronizadas',
      all_synced: '¡Todas las consultas están sincronizadas!', no_pending: 'No hay consultas pendientes.', sync_pending: 'Sincronizar consultas pendientes', page_title: 'WTT Exhibition Lead Tracker', language: 'Idioma', back: 'Atrás'
    }
  };
  function apply() {
    const l = localStorage.getItem('wtt_language') || 'en';
    const dict = translations[l] || translations.en;
    document.documentElement.lang = l;
    document.querySelectorAll('[data-site-i18n]').forEach(el => { const k = el.dataset.siteI18n; if (dict[k]) el.textContent = dict[k]; });
    document.querySelectorAll('[data-site-i18n-aria]').forEach(el => { const k = el.dataset.siteI18nAria; if (dict[k]) el.setAttribute('aria-label', dict[k]); });
    const sel = document.getElementById('languageSelect'); if (sel) sel.value = l;
  }
  window.WTT_LANGUAGE = { translations, apply };
  document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('languageSelect');
    if (sel) sel.addEventListener('change', () => { localStorage.setItem('wtt_language', sel.value); apply(); });
    apply();
  });
})();
