(() => {
  const byId = id => document.getElementById(id);

  let scanObjectUrl = null;

  function setScanBusy(busy) {
    const button = byId('scanCardButton');
    const again = byId('scanAgainButton');
    if (button) button.disabled = busy;
    if (again) again.disabled = busy;
    byId('scanProgress')?.classList.toggle('hidden', !busy);
  }

  function setScanResult(message, kind='success') {
    const result = byId('scanResult');
    if (!result) return;
    result.textContent = message || '';
    result.classList.toggle('hidden', !message);
    result.classList.toggle('scan-result-success', kind === 'success');
    result.classList.toggle('scan-result-warning', kind === 'warning');
    result.classList.toggle('scan-result-error', kind === 'error');
  }

  function openCardPicker() {
    if (byId('scanCardButton')?.disabled) return;
    byId('visitingCardInput')?.click();
  }

  function showCardPreview(file) {
    if (scanObjectUrl) URL.revokeObjectURL(scanObjectUrl);
    scanObjectUrl = URL.createObjectURL(file);
    byId('scanPreview').src = scanObjectUrl;
    byId('scanFileName').textContent = file.name || 'visiting-card.jpg';
    byId('scanPreviewWrap').classList.remove('hidden');
  }

  function fillFromVisitingCard(data) {
    const filled = [];
    if (data.name) {
      byId('name').value = data.name;
      setError('name');
      filled.push(window.WTT_I18N.t('name'));
    }
    if (data.mobile_number) {
      byId('mobile_number').value = data.mobile_number;
      setError('mobile_number');
      filled.push(window.WTT_I18N.t('mobile_number'));
    }
    if (data.address) {
      byId('address').value = data.address;
      setError('address');
      filled.push(window.WTT_I18N.t('address'));
    }
    return filled;
  }

  async function scanVisitingCard(file) {
    if (!file) return;
    setScanResult('');
    showCardPreview(file);
    setScanBusy(true);

    try {
      if (!navigator.onLine) {
        throw new Error(window.WTT_I18N.t('scan_requires_internet'));
      }

      const formData = new FormData();
      formData.append('card', file, file.name || 'visiting-card.jpg');
      const response = await fetch('/api/scan-visiting-card', {
        method: 'POST',
        body: formData
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || window.WTT_I18N.t('scan_failed'));
      }

      const filled = fillFromVisitingCard(result.data || {});
      if (filled.length) {
        const prefix = window.WTT_I18N.t('scan_success');
        setScanResult(`${prefix} ${filled.join(', ')}`, 'success');
        showSnackbar(window.WTT_I18N.t('scan_success_snackbar'), 'green', 3000);
      } else {
        setScanResult(window.WTT_I18N.t('scan_no_details'), 'warning');
      }
    } catch (error) {
      console.warn('Visiting card scan failed:', error);
      setScanResult(error.message || window.WTT_I18N.t('scan_failed'), 'error');
      showSnackbar(error.message || window.WTT_I18N.t('scan_failed'), 'red', 3500);
    } finally {
      setScanBusy(false);
      byId('visitingCardInput').value = '';
    }
  }

  function setError(field, keyOrText='') {
    const input = byId(field); const holder = document.querySelector(`[data-error-for="${field}"]`);
    if (input) input.classList.toggle('invalid', !!keyOrText);
    if (holder) holder.textContent = keyOrText ? (window.WTT_I18N.t(keyOrText) || keyOrText) : '';
  }
  function clearErrors() { document.querySelectorAll('.error-text').forEach(x => x.textContent=''); document.querySelectorAll('.invalid').forEach(x => x.classList.remove('invalid')); }
  function updateConditionalFields() {
    const other = byId('soil_type').value === 'others';
    byId('otherSoilWrap').classList.toggle('hidden', !other); if (!other) { byId('other_soil_type').value=''; setError('other_soil_type'); }
    const advance = byId('advance_received').checked;
    byId('advanceAmountWrap').classList.toggle('hidden', !advance); if (!advance) { byId('advance_amount').value=''; setError('advance_amount'); }
  }
  function validate() {
    clearErrors(); let ok = true;
    const required = [['name','name_required'],['mobile_number','mobile_required'],['address','address_required'],['water_requirement','water_required'],['water_source','source_required'],['crops','crops_required'],['acres_of_land','acres_required'],['water_parameters','water_params_required']];
    required.forEach(([f,k]) => { if (!byId(f).value.trim()) { setError(f,k); ok=false; } });
    const mobile = byId('mobile_number').value.replace(/\D/g,''); if (byId('mobile_number').value.trim() && mobile.length < 10) { setError('mobile_number','mobile_valid'); ok=false; }
    [['water_requirement','water_valid'],['acres_of_land','acres_valid']].forEach(([f,k]) => { const v=byId(f).value.trim(); if (v && !Number.isFinite(Number(v))) { setError(f,k); ok=false; } });
    if (!byId('soil_type').value) { setError('soil_type','soil_required'); ok=false; }
    if (byId('soil_type').value === 'others' && !byId('other_soil_type').value.trim()) { setError('other_soil_type','soil_other_required'); ok=false; }
    if (byId('advance_received').checked) { const v=byId('advance_amount').value.trim(); if (!v) { setError('advance_amount','advance_required'); ok=false; } else if (!Number.isFinite(Number(v))) { setError('advance_amount','advance_valid'); ok=false; } }
    return ok;
  }
  function payload() {
    const soilKey = byId('soil_type').value;
    return {
      client_submission_id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: byId('name').value.trim(), mobile_number: byId('mobile_number').value.trim(), address: byId('address').value.trim(),
      water_requirement: byId('water_requirement').value.trim(), water_source: byId('water_source').value.trim(), crops: byId('crops').value.trim(), acres_of_land: byId('acres_of_land').value.trim(),
      soil_type_key: soilKey, soil_type: window.WTT_I18N.t(soilKey), other_soil_type: soilKey==='others' ? byId('other_soil_type').value.trim() : '',
      water_parameters: byId('water_parameters').value.trim(), advance_received: byId('advance_received').checked, advance_amount: byId('advance_received').checked ? byId('advance_amount').value.trim() : '',
      created_at: new Date().toISOString()
    };
  }
  function resetForm() { byId('agricultureForm').reset(); byId('soil_type').value='clay'; updateConditionalFields(); clearErrors(); setScanResult(''); byId('scanPreviewWrap')?.classList.add('hidden'); if (scanObjectUrl) { URL.revokeObjectURL(scanObjectUrl); scanObjectUrl=null; } }
  function setBusy(busy) { byId('submitButton').disabled=busy; byId('submitSpinner').classList.toggle('hidden',!busy); byId('submitLabel').classList.toggle('hidden',busy); }
  async function submit(event) {
    event.preventDefault(); if (!validate()) return;
    const data = payload(); setBusy(true);
    try {
      if (!navigator.onLine) { window.WTT_QUEUE.add(data); showSnackbar(window.WTT_I18N.t('data_saved_offline'),'blue'); resetForm(); return; }
      const response = await fetch('/api/submit', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
      if (!response.ok) { const err=await response.json().catch(()=>({})); throw new Error((err.errors||[response.statusText]).join(', ')); }
      const result = await response.json();
      if (result.fully_synced) showSnackbar(window.WTT_I18N.t('data_sent'),'green'); else showSnackbar(window.WTT_I18N.t('data_saved_retry'),'orange');
      if (result.whatsapp_english || result.whatsapp_tamil) setTimeout(() => showSnackbar('✅ Confirmation messages sent via WhatsApp!','green',3000), 900);
      else setTimeout(() => showSnackbar('⚠️ WhatsApp messages could not be sent','orange',3000), 900);
      resetForm();
    } catch (e) {
      window.WTT_QUEUE.add(data); showSnackbar(window.WTT_I18N.t(navigator.onLine ? 'data_saved_retry' : 'data_saved_offline'), navigator.onLine ? 'orange' : 'blue'); resetForm();
      console.warn(e);
    } finally { setBusy(false); }
  }
  document.addEventListener('DOMContentLoaded', () => {
    byId('soil_type').addEventListener('change', updateConditionalFields); byId('advance_received').addEventListener('change', updateConditionalFields); byId('agricultureForm').addEventListener('submit',submit); byId('scanCardButton')?.addEventListener('click', openCardPicker); byId('scanAgainButton')?.addEventListener('click', openCardPicker); byId('visitingCardInput')?.addEventListener('change', event => scanVisitingCard(event.target.files?.[0])); updateConditionalFields();
  });
})();
