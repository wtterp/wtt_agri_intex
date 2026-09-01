(() => {
  const $ = id => document.getElementById(id);
  let scanObjectUrl = null;
  let visitingCardFile = null;
  let qrMode = false;
  const makeSubmissionId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  let currentSubmissionId = makeSubmissionId();

  const I18N = {
    en: {
      page_title: 'Exhibition Enquiry Form', language: 'Language', back: 'Back',
      customer_details: 'Customer Details', customer_details_help: 'Capture the visiting card or enter the contact information.',
      visiting_card: 'VISITING CARD', visiting_card_help: 'Take a photo or attach a card. AI fills contact details; the card image is stored in Google Drive when the lead is submitted.',
      scan_card: 'Take Photo / Attach Visiting Card', verify_details: 'Verify the extracted details before submitting',
      scan_qr: 'Scan QR Code', scan_qr_help: 'AI reads the QR/contact details and fills the form', scan_again: 'Scan Again', reading_card: 'Reading visiting card / QR...',
      company_name_required: 'Company Name *', contact_person_required: 'Contact Person *', designation: 'Designation', mobile_no: 'Mobile No.', email: 'Email',
      contact_note: '* Enter at least one contact method: Mobile No. or Email.', plant_location: 'Plant / Project Location', plant_location_placeholder: 'Actual treatment-plant location', plant_capacity: 'Plant Capacity', plant_capacity_placeholder: 'e.g. 500 KLD',
      requirement_type_required: 'Requirement Type *', product_list: 'Product List', product_list_placeholder: 'e.g. RO 90', remarks: 'Remarks', remarks_placeholder: 'Enter remarks',
      select: 'Select', new_plant: 'New Plant', upgrade: 'Existing Plant Upgrade / Modification', capacity_expansion: 'Capacity Expansion', replacement: 'Replacement of Existing Plant',
      submit: 'SUBMIT EXHIBITION ENQUIRY', auto_filled: 'Auto-filled', card_read: 'Contact details read successfully.', no_details: 'Card/QR scanned, but no contact details were read confidently.',
      qr_found: 'QR data detected and sent to AI for contact extraction.', scan_failed: 'Could not scan the card/QR.',
      saved: 'Exhibition enquiry saved successfully.', whatsapp_sent: 'WhatsApp confirmation sent.', email_sent: 'Email confirmation sent.',
      whatsapp_skipped: 'WhatsApp skipped (no mobile).', email_skipped: 'Email skipped (no email address).',
      saved_offline: 'Enquiry saved offline. It will sync when internet is available.',
      required_error: 'Please complete the required fields.', contact_error: 'Enter a mobile number or email address',
      valid_mobile: 'Please enter a valid mobile number', valid_email: 'Please enter a valid email address',
      no_internet_scan: 'Internet connection is required for visiting-card/QR scanning.',
      upload_internet: 'Internet is required to upload the selected visiting card. Connect and submit again.'
    },
    es: {
      page_title: 'Formulario de consulta de exposición', language: 'Idioma', back: 'Atrás',
      customer_details: 'Datos del cliente', customer_details_help: 'Capture la tarjeta de visita o introduzca los datos de contacto.',
      visiting_card: 'TARJETA DE VISITA', visiting_card_help: 'Tome una foto o adjunte una tarjeta. La IA completa los datos de contacto; la imagen se guarda en Google Drive al enviar la consulta.',
      scan_card: 'Tomar foto / Adjuntar tarjeta', verify_details: 'Verifique los datos extraídos antes de enviar',
      scan_qr: 'Escanear código QR', scan_qr_help: 'La IA lee los datos del QR/contacto y completa el formulario', scan_again: 'Escanear de nuevo', reading_card: 'Leyendo tarjeta / QR...',
      company_name_required: 'Nombre de la empresa *', contact_person_required: 'Persona de contacto *', designation: 'Cargo', mobile_no: 'N.º de móvil', email: 'Correo electrónico',
      contact_note: '* Introduzca al menos un método de contacto: móvil o correo electrónico.', plant_location: 'Ubicación de la planta / proyecto', plant_location_placeholder: 'Ubicación real de la planta de tratamiento', plant_capacity: 'Capacidad de la planta', plant_capacity_placeholder: 'p. ej. 500 KLD',
      requirement_type_required: 'Tipo de requisito *', product_list: 'Lista de productos', product_list_placeholder: 'p. ej. RO 90', remarks: 'Observaciones', remarks_placeholder: 'Introduzca observaciones',
      select: 'Seleccionar', new_plant: 'Planta nueva', upgrade: 'Actualización / modificación de planta existente', capacity_expansion: 'Ampliación de capacidad', replacement: 'Sustitución de planta existente',
      submit: 'ENVIAR CONSULTA DE EXPOSICIÓN', auto_filled: 'Completado automáticamente', card_read: 'Los datos de contacto se han leído correctamente.', no_details: 'Se escaneó la tarjeta/QR, pero no se pudieron leer los datos con suficiente confianza.',
      qr_found: 'Se detectaron datos QR y se enviaron a la IA para extraer el contacto.', scan_failed: 'No se pudo escanear la tarjeta/QR.',
      saved: 'Consulta de exposición guardada correctamente.', whatsapp_sent: 'Se envió la confirmación por WhatsApp.', email_sent: 'Se envió la confirmación por correo electrónico.',
      whatsapp_skipped: 'WhatsApp omitido (sin móvil).', email_skipped: 'Correo omitido (sin dirección de correo).',
      saved_offline: 'Consulta guardada sin conexión. Se sincronizará cuando haya internet.',
      required_error: 'Complete los campos obligatorios.', contact_error: 'Introduzca un número de móvil o una dirección de correo',
      valid_mobile: 'Introduzca un número de móvil válido', valid_email: 'Introduzca una dirección de correo válida',
      no_internet_scan: 'Se necesita conexión a internet para escanear la tarjeta/QR.',
      upload_internet: 'Se necesita internet para cargar la tarjeta seleccionada. Conéctese y vuelva a enviar.'
    }
  };

  function lang() { return localStorage.getItem('wtt_language') || 'en'; }
  function t(key) { return (I18N[lang()] || I18N.en)[key] || key; }

  function applyLanguage() {
    const current = lang();
    document.documentElement.lang = current === 'es' ? 'es' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (I18N[current][key]) el.textContent = I18N[current][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (I18N[current][key]) el.placeholder = I18N[current][key];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.dataset.i18nAria;
      if (I18N[current][key]) el.setAttribute('aria-label', I18N[current][key]);
    });
    const select = $('languageSelect');
    if (select) select.value = current;
  }

  function setError(field, message = '') {
    const input = $(field);
    const holder = document.querySelector(`[data-error-for="${field}"]`);
    if (input) input.classList.toggle('invalid', Boolean(message));
    if (holder) holder.textContent = message;
  }

  function clearErrors() {
    document.querySelectorAll('.error-text').forEach(el => el.textContent = '');
    document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  }

  function setBusy(busy) {
    $('submitButton').disabled = busy;
    $('submitSpinner').classList.toggle('hidden', !busy);
    $('submitLabel').classList.toggle('hidden', busy);
  }

  function setScanBusy(busy) {
    $('scanCardButton').disabled = busy;
    $('scanQrButton').disabled = busy;
    $('scanAgainButton').disabled = busy;
    $('scanProgress').classList.toggle('hidden', !busy);
  }

  function setScanResult(message, kind = 'success') {
    const el = $('scanResult');
    el.textContent = message || '';
    el.classList.toggle('hidden', !message);
    el.classList.toggle('scan-result-success', kind === 'success');
    el.classList.toggle('scan-result-warning', kind === 'warning');
    el.classList.toggle('scan-result-error', kind === 'error');
  }

  function showCardPreview(file) {
    if (scanObjectUrl) URL.revokeObjectURL(scanObjectUrl);
    scanObjectUrl = URL.createObjectURL(file);
    $('scanPreview').src = scanObjectUrl;
    $('scanFileName').textContent = file.name || 'visiting-card.jpg';
    $('scanPreviewWrap').classList.remove('hidden');
  }

  function decodeQr(file) {
    if (!window.jsQR) return '';
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const max = 1800;
          const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
          resolve(result?.data || '');
        } catch (_) { resolve(''); }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
      img.src = url;
    });
  }

  function fillCard(data) {
    const map = {
      company_name: 'Company', contact_person: 'Contact Person', designation: 'Designation', mobile_number: 'Mobile', email: 'Email', plant_project_location: 'Plant / Project Location'
    };
    const filled = [];
    Object.entries(map).forEach(([key, label]) => {
      if (data[key] && $(key)) {
        $(key).value = data[key];
        setError(key);
        filled.push(label);
      }
    });
    return filled;
  }

  async function scanContact(file, isQr) {
    if (!file) return;
    visitingCardFile = file;
    qrMode = isQr;
    showCardPreview(file);
    setScanResult('');
    setScanBusy(true);
    try {
      if (!navigator.onLine) throw new Error(t('no_internet_scan'));
      const qrText = await decodeQr(file);
      const form = new FormData();
      form.append('card', file, file.name || (isQr ? 'qr-contact.jpg' : 'visiting-card.jpg'));
      if (qrText) form.append('qr_text', qrText);
      const response = await fetch('/api/scan-visiting-card', { method: 'POST', body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || t('scan_failed'));
      const filled = fillCard(result.data || {});
      const qrNote = qrText ? ` ${t('qr_found')}` : '';
      setScanResult(filled.length ? `${t('auto_filled')}: ${filled.join(', ')}. ${t('card_read')}${qrNote}` : t('no_details'), filled.length ? 'success' : 'warning');
    } catch (error) {
      setScanResult(error.message || t('scan_failed'), 'error');
      showSnackbar(error.message || t('scan_failed'), 'red');
    } finally {
      setScanBusy(false);
      $('visitingCardInput').value = '';
      $('qrInput').value = '';
    }
  }

  function payload() {
    return {
      client_submission_id: currentSubmissionId,
      company_name: $('company_name').value.trim(),
      contact_person: $('contact_person').value.trim(),
      designation: $('designation').value.trim(),
      mobile_number: $('mobile_number').value.trim(),
      email: $('email').value.trim(),
      plant_project_location: $('plant_project_location').value.trim(),
      plant_capacity: $('plant_capacity').value.trim(),
      requirement_type: $('requirement_type').value,
      product_list: $('product_list').value.trim(),
      remarks: $('remarks').value.trim()
    };
  }

  function validate() {
    clearErrors();
    let ok = true;
    [['company_name', t('company_name_required').replace(' *', ''), 'required'], ['contact_person', t('contact_person_required').replace(' *', ''), 'required'], ['requirement_type', t('requirement_type_required').replace(' *', ''), 'required']].forEach(([field, label]) => {
      const el = $(field);
      if (!el || !String(el.value || '').trim()) { setError(field, `${label} is required`); ok = false; }
    });
    const mobile = $('mobile_number').value.trim();
    const email = $('email').value.trim();
    if (!mobile && !email) { setError('mobile_number', t('contact_error')); setError('email', t('contact_error')); ok = false; }
    if (mobile && String(mobile).replace(/\D/g, '').length < 10) { setError('mobile_number', t('valid_mobile')); ok = false; }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError('email', t('valid_email')); ok = false; }
    return ok;
  }

  async function uploadAttachment(file, category, submissionId) {
    if (!file) return { url: '', filename: '' };
    const form = new FormData();
    form.append('file', file, file.name || 'attachment');
    form.append('category', category);
    form.append('submission_id', submissionId || '');
    const response = await fetch('/api/upload-exhibition-file', { method: 'POST', body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || 'Attachment upload failed');
    return result;
  }

  async function submitLead(event) {
    event.preventDefault();
    if (!validate()) { showSnackbar(t('required_error'), 'red'); return; }
    const data = payload();
    if (!navigator.onLine && visitingCardFile) { showSnackbar(t('upload_internet'), 'orange', 6000); return; }
    setBusy(true);
    try {
      if (navigator.onLine && visitingCardFile) {
        const uploaded = await uploadAttachment(visitingCardFile, 'Visiting Cards', data.client_submission_id);
        data.visiting_card_file_name = uploaded.filename || visitingCardFile.name || '';
        data.visiting_card_url = uploaded.url || '';
      }
      if (!navigator.onLine) {
        window.WTT_QUEUE.add(data);
        showSnackbar(t('saved_offline'), 'blue', 6000);
        resetForm();
        return;
      }
      const response = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((result.errors || [result.error || response.statusText]).join(', '));
      let message = t('saved');
      let kind = 'green';
      if (data.mobile_number) {
        if (result.whatsapp_sent) message += ` ${t('whatsapp_sent')}`;
        else { message += ` ${result.whatsapp_status || t('whatsapp_skipped')}.`; kind = 'orange'; }
      } else message += ` ${t('whatsapp_skipped')}`;
      if (data.email) {
        if (result.email_sent) message += ` ${t('email_sent')}`;
        else { message += ` ${result.email_status || 'Email not sent'}.`; kind = 'orange'; }
      } else message += ` ${t('email_skipped')}`;
      showSnackbar(message, kind, 8000);
      resetForm();
    } catch (error) {
      window.WTT_QUEUE.add(data);
      showSnackbar(`⚠️ ${error.message || 'Could not sync now'}. Lead kept in browser queue for retry.`, 'orange', 7000);
    } finally { setBusy(false); }
  }

  function resetForm() {
    $('leadForm').reset();
    currentSubmissionId = makeSubmissionId();
    visitingCardFile = null;
    qrMode = false;
    clearErrors();
    setScanResult('');
    $('scanPreviewWrap').classList.add('hidden');
    if (scanObjectUrl) { URL.revokeObjectURL(scanObjectUrl); scanObjectUrl = null; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyLanguage();
    const languageSelect = $('languageSelect');
    if (languageSelect) languageSelect.addEventListener('change', () => { localStorage.setItem('wtt_language', languageSelect.value); applyLanguage(); });
    $('leadForm').addEventListener('submit', submitLead);
    $('scanCardButton').addEventListener('click', () => { qrMode = false; $('visitingCardInput').click(); });
    $('scanQrButton').addEventListener('click', () => { qrMode = true; $('qrInput').click(); });
    $('scanAgainButton').addEventListener('click', () => (qrMode ? $('qrInput') : $('visitingCardInput')).click());
    $('visitingCardInput').addEventListener('change', event => scanContact(event.target.files?.[0], false));
    $('qrInput').addEventListener('change', event => scanContact(event.target.files?.[0], true));
  });
})();
