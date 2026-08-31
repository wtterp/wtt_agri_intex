(() => {
  const $ = id => document.getElementById(id);
  const valueOf = (id) => { const el = $(id); return el ? String(el.value ?? '') : ''; };
  const trimmedValueOf = (id) => valueOf(id).trim();
  const fileOf = (id) => { const el = $(id); return el && el.files && el.files.length ? el.files[0] : null; };
  let scanObjectUrl = null;
  let visitingCardFile = null;
  const makeSubmissionId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  let currentSubmissionId = makeSubmissionId();

  const applications = {
    ETP: ['Textile','Tannery','Food & Beverages','Paper & Pulp','Pharmaceutical','Automobile','Electronics & Semiconductor','Refinery','Plastic Recycling','Iron & Steel','Dairy','Power & Energy','Other'],
    STP: ['Residential / Apartment','Hotel','Hospital','Commercial / Office','School / College','Industrial Township','Other'],
    WTP: ['Process Water','Drinking / Potable Water','Boiler Feed','Cooling Tower','RO / DM / DI Feed','Utility Water','Other']
  };

  const applicationLabels = {
    ETP: 'ETP Industry *', STP: 'STP Application *', WTP: 'WTP Application *'
  };

  const dischargeOptions = {
    ETP: ['CETP','Sewer','Water Body','Land / Irrigation','Reuse in Plant','Gardening','Toilet Flushing','Other'],
    STP: ['CETP','Sewer','Water Body','Land / Irrigation','Reuse in Plant','Gardening','Toilet Flushing','Other'],
    WTP: ['Process','Drinking / Potable','Boiler','Cooling Tower','RO / DM / DI','Utility','Other']
  };

  const industryDetails = {
    'Textile': {label:'Process', options:['Dyeing','Printing','Washing','Processing','Garment','Other'], unit:'TPD', question:'ZLD Required?'},
    'Tannery': {label:'Process', options:['Tanning','Dyeing','Finishing','Complete Process'], unit:'TPD', question:'CETP Connection?'},
    'Food & Beverages': {label:'Product / Process', text:true, unit:'TPD / KLD', question:'CIP / Cleaning Wastewater?'},
    'Paper & Pulp': {label:'Process', options:['Pulp','Paper','Recycled Paper','Other'], unit:'TPD', question:'Water Reuse Required?'},
    'Pharmaceutical': {label:'Process', options:['API','Formulation','Chemical Synthesis','Other'], unit:'TPD', question:'High TDS / High COD?'},
    'Automobile': {label:'Process', options:['Painting','Pretreatment','Metal Finishing','Components','Other'], unit:'', question:'Oil / Metal Contamination?'},
    'Electronics & Semiconductor': {label:'Process', options:['PCB','Semiconductor','Plating','Etching','Other'], unit:'', question:'Chemical / Heavy Metal Wastewater?'},
    'Refinery': {label:'Process / Area', options:['Refining','Desalter','Cooling','Other'], unit:'', question:'Oil / Hydrocarbon in Effluent?'},
    'Plastic Recycling': {label:'Process', options:['Washing','Recycling','Granulation','Other'], unit:'TPD', question:'Water Reuse Required?'},
    'Iron & Steel': {label:'Process', options:['Pickling','Rolling','Galvanizing','Metal Finishing','Other'], unit:'TPD', question:'Heavy Metals / Oil Present?'},
    'Dairy': {label:'Process / Product', options:['Milk','Cheese','Ice Cream','Other'], unit:'KLD', question:'CIP Wastewater?'},
    'Power & Energy': {label:'Plant Type', options:['Thermal Power Generation','Other'], unit:'MW', wastewater:['Cooling Tower','Boiler','DM / RO','Other']}
  };

  function setError(field, message='') {
    const input = $(field);
    const holder = document.querySelector(`[data-error-for="${field}"]`);
    if (input) input.classList.toggle('invalid', Boolean(message));
    if (holder) holder.textContent = window.WTT_I18N ? window.WTT_I18N.t(message) : message;
  }

  function clearErrors() {
    document.querySelectorAll('.error-text').forEach(el => el.textContent = '');
    document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  }

  function makeCheckboxes(container, name, options) {
    if (!container) return;
    container.innerHTML = options.map((option, i) => `
      <label class="choice-chip" for="${name}_${i}">
        <input id="${name}_${i}" type="checkbox" name="${name}" value="${escapeHtml(option)}">
        <span>${escapeHtml(option)}</span>
      </label>`).join('');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function selectedValues(name) {
    return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);
  }

  // Keep section numbers continuous even when conditional sections are hidden.
  function renumberSections() {
    let number = 1;
    document.querySelectorAll('#leadForm > section.form-section').forEach(section => {
      if (section.classList.contains('hidden')) return;
      const badge = section.querySelector('.section-heading > span');
      if (badge) badge.textContent = String(number++);
    });
  }

  function updateTreatment() {
    const treatment = $('treatment_required').value;
    document.querySelectorAll('.treatment-etp').forEach(el => el.classList.toggle('hidden', treatment !== 'ETP'));
    document.querySelectorAll('.treatment-stp').forEach(el => el.classList.toggle('hidden', treatment !== 'STP'));
    document.querySelectorAll('.treatment-wtp').forEach(el => el.classList.toggle('hidden', treatment !== 'WTP'));
    $('stpAdditionalSection').classList.toggle('hidden', treatment !== 'STP');
    $('wtpAdditionalSection').classList.toggle('hidden', treatment !== 'WTP');

    const select = $('industry_application');
    select.innerHTML = '<option value="">Select</option>';
    if (applications[treatment]) {
      applications[treatment].forEach(value => select.add(new Option(value, value)));
      select.disabled = false;
      $('industryApplicationLabel').textContent = applicationLabels[treatment];
    } else {
      select.disabled = true;
      select.innerHTML = '<option value="">Select treatment first</option>';
      $('industryApplicationLabel').textContent = 'Select treatment first *';
    }
    $('otherIndustryWrap').classList.add('hidden');
    $('other_industry_application').value = '';
    renderIndustrySpecific();
    makeCheckboxes($('treatedDestinationOptions'), 'treated_water_destination', dischargeOptions[treatment] || []);
    renumberSections();
    window.WTT_I18N?.translatePage();
  }

  function updateIndustry() {
    const industry = valueOf('industry_application');
    $('otherIndustryWrap').classList.toggle('hidden', industry !== 'Other');
    if (industry !== 'Other') $('other_industry_application').value = '';
    renderIndustrySpecific();
    renumberSections();
    window.WTT_I18N?.translatePage();
  }

  function renderIndustrySpecific() {
    const treatment = $('treatment_required').value;
    const industry = valueOf('industry_application');
    const section = $('industrySpecificSection');
    const target = $('industrySpecificFields');
    target.innerHTML = '';
    if (treatment !== 'ETP' || !industryDetails[industry]) {
      section.classList.add('hidden');
      renumberSections();
      return;
    }
    section.classList.remove('hidden');
    const def = industryDetails[industry];

    let first = '';
    if (def.text) {
      first = `<div class="field-group full"><label for="industry_specific_process">${escapeHtml(def.label)}</label><input id="industry_specific_process" name="industry_specific_process" type="text"></div>`;
    } else {
      first = `<div class="field-group full"><label>${escapeHtml(def.label)}</label><div class="check-grid compact">${def.options.map((v,i)=>`<label class="choice-chip" for="industry_process_${i}"><input id="industry_process_${i}" type="checkbox" name="industry_specific_process_choice" value="${escapeHtml(v)}"><span>${escapeHtml(v)}</span></label>`).join('')}</div></div>`;
    }

    const capacity = `<div class="field-group"><label for="industry_specific_capacity">${industry === 'Refinery' ? 'Plant Capacity' : industry === 'Dairy' ? 'Milk Processing Capacity' : 'Production Capacity'}</label><input id="industry_specific_capacity" name="industry_specific_capacity" type="text" inputmode="decimal"></div><div class="field-group"><label for="industry_specific_capacity_unit">Unit</label><input id="industry_specific_capacity_unit" name="industry_specific_capacity_unit" type="text" value="${escapeHtml(def.unit || '')}" placeholder="Unit"></div>`;

    let third = '';
    if (def.question) {
      third = `<div class="field-group full"><label for="industry_specific_answer">${escapeHtml(def.question)}</label><select id="industry_specific_answer" name="industry_specific_answer"><option value="">Select</option><option>Yes</option><option>No</option><option>Not Sure</option></select></div>`;
    }
    if (def.wastewater) {
      third = `<div class="field-group full"><label>Major Wastewater Source</label><div class="check-grid compact">${def.wastewater.map((v,i)=>`<label class="choice-chip" for="wastewater_${i}"><input id="wastewater_${i}" type="checkbox" name="major_wastewater_source_choice" value="${escapeHtml(v)}"><span>${escapeHtml(v)}</span></label>`).join('')}</div></div>`;
    }
    target.innerHTML = first + capacity + third;
    renumberSections();
  }

  // Existing Plant is controlled only by Requirement Type.
  // No separate Yes/No question is shown.
  function updateExistingPlant() {
    const requirementType = $('requirement_type').value;
    const showExistingPlant = Boolean(requirementType) && requirementType !== 'New Plant';
    $('existingPlantSection').classList.toggle('hidden', !showExistingPlant);

    if (!showExistingPlant) {
      $('existingPlantDetails').querySelectorAll('input,select,textarea').forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
        else el.value = '';
      });
    }
    renumberSections();
  }

  function validate() {
    clearErrors();
    let ok = true;

    // Only sections 1–3 contain mandatory user-entered fields.
    const required = [
      ['company_name','Please enter company name'],
      ['contact_person','Please enter contact person'],
      ['treatment_required','Please select treatment required'],
      ['requirement_type','Please select requirement type'],
      ['industry_application','Please select industry / application']
    ];
    required.forEach(([field,msg]) => {
      const el = $(field);
      if (!el || !String(el.value || '').trim()) {
        setError(field,msg);
        ok = false;
      }
    });

    // Phone OR email: at least one must be supplied.
    const mobileRaw = $('mobile_number').value.trim();
    const mobile = mobileRaw.replace(/\D/g,'');
    const email = $('email').value.trim();
    if (!mobileRaw && !email) {
      setError('mobile_number','Enter a mobile number or email address');
      setError('email','Enter a mobile number or email address');
      ok = false;
    }
    if (mobileRaw && mobile.length < 10) {
      setError('mobile_number','Please enter a valid mobile number');
      ok = false;
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('email','Please enter a valid email address');
      ok = false;
    }

    if ($('industry_application').value === 'Other' && !$('other_industry_application').value.trim()) {
      setError('other_industry_application','Please specify the other industry / application');
      ok = false;
    }
    return ok;
  }

  function getIndustryProcess() {
    const direct = $('industry_specific_process');
    if (direct) return direct.value.trim();
    return selectedValues('industry_specific_process_choice');
  }

  function payload() {
    const industry = $('industry_application').value;
    const industryDef = industryDetails[industry] || {};
    return {
      client_submission_id: currentSubmissionId,
      created_at: new Date().toISOString(),
      company_name: trimmedValueOf('company_name'),
      contact_person: trimmedValueOf('contact_person'),
      designation: trimmedValueOf('designation'),
      mobile_number: trimmedValueOf('mobile_number'),
      email: trimmedValueOf('email'),
      visiting_card_address: valueOf('visiting_card_address'),
      visiting_card_file_name: visitingCardFile?.name || '',
      visiting_card_url: '',
      plant_project_location: trimmedValueOf('plant_project_location'),
      treatment_required: valueOf('treatment_required'),
      requirement_type: valueOf('requirement_type'),
      industry_application: industry,
      other_industry_application: trimmedValueOf('other_industry_application'),
      customer_requirement: trimmedValueOf('customer_requirement'),
      process_application: trimmedValueOf('process_application'),
      required_capacity_kld: trimmedValueOf('required_capacity_kld'),
      average_flow_kld: trimmedValueOf('average_flow_kld'),
      peak_flow_kld: trimmedValueOf('peak_flow_kld'),
      peak_requirement_kld: trimmedValueOf('peak_requirement_kld'),
      population_occupancy: trimmedValueOf('population_occupancy'),
      production_capacity: trimmedValueOf('production_capacity'),
      production_capacity_unit: valueOf('production_capacity_unit'),
      water_effluent_parameters: trimmedValueOf('water_effluent_parameters'),
      analysis_report_status: valueOf('analysis_report_status'),
      lab_report_file_name: fileOf('lab_report_file')?.name || '',
      lab_report_url: '',
      existing_plant_capacity_kld: trimmedValueOf('existing_plant_capacity_kld'),
      existing_technology_process: trimmedValueOf('existing_technology_process'),
      existing_plant_status: valueOf('existing_plant_status'),
      existing_main_problem: valueOf('existing_main_problem'),
      existing_plant_remarks: trimmedValueOf('existing_plant_remarks'),
      treated_water_destination: selectedValues('treated_water_destination'),
      specific_outlet_requirement: valueOf('specific_outlet_requirement'),
      required_norms_outlet_quality: trimmedValueOf('required_norms_outlet_quality'),
      industry_specific_process: getIndustryProcess(),
      industry_specific_capacity: trimmedValueOf('industry_specific_capacity'),
      industry_specific_capacity_unit: trimmedValueOf('industry_specific_capacity_unit'),
      industry_specific_question: industryDef.question || '',
      industry_specific_answer: valueOf('industry_specific_answer'),
      major_wastewater_source: selectedValues('major_wastewater_source_choice'),
      stp_sewage_source: trimmedValueOf('stp_sewage_source'),
      stp_population_occupancy: trimmedValueOf('stp_population_occupancy'),
      stp_required_capacity_kld: trimmedValueOf('stp_required_capacity_kld'),
      stp_treated_water_use: selectedValues('stp_treated_water_use'),
      wtp_raw_water_source: valueOf('wtp_raw_water_source'),
      wtp_required_capacity_kld: trimmedValueOf('wtp_required_capacity_kld'),
      wtp_application: selectedValues('wtp_application_choice'),
      wtp_raw_water_parameters: trimmedValueOf('wtp_raw_water_parameters'),
      project_stage: valueOf('project_stage'),
      expected_timeline: valueOf('expected_timeline'),
      internal_remarks: trimmedValueOf('internal_remarks')
    };
  }

  function setBusy(busy) {
    $('submitButton').disabled = busy;
    $('submitSpinner').classList.toggle('hidden', !busy);
    $('submitLabel').classList.toggle('hidden', busy);
  }

  function resetForm() {
    $('leadForm').reset();
    if ($('visiting_card_address')) $('visiting_card_address').value = '';
    visitingCardFile = null;
    currentSubmissionId = makeSubmissionId();
    updateTreatment();
    updateExistingPlant();
    clearErrors();
    setScanResult('');
    $('scanPreviewWrap').classList.add('hidden');
    if (scanObjectUrl) {
      URL.revokeObjectURL(scanObjectUrl);
      scanObjectUrl = null;
    }
    renumberSections();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  async function uploadAttachment(file, category, submissionId) {
    if (!file) return {url:'', filename:''};
    const form = new FormData();
    form.append('file', file, file.name || 'attachment');
    form.append('category', category);
    form.append('submission_id', submissionId || '');
    const response = await fetch('/api/upload-exhibition-file', {method:'POST', body:form});
    const result = await response.json().catch(()=>({}));
    if (!response.ok || !result.success) throw new Error(result.error || `${category} upload failed`);
    return result;
  }

  async function submitLead(event) {
    event.preventDefault();
    if (!validate()) {
      showSnackbar('Please complete the required fields.','red');
      return;
    }
    const data = payload();
    const labReportFile = fileOf('lab_report_file');

    // Binary attachments cannot be kept safely in localStorage. If a file is
    // selected, require internet so it reaches Google Drive before the row is
    // saved to the spreadsheet.
    if (!navigator.onLine && (visitingCardFile || labReportFile)) {
      showSnackbar('📎 Internet is required to upload the selected visiting card / report. Connect and submit again.', 'orange', 6000);
      return;
    }

    setBusy(true);
    try {
      if (navigator.onLine && visitingCardFile) {
        const uploaded = await uploadAttachment(visitingCardFile, 'Visiting Cards', data.client_submission_id);
        data.visiting_card_file_name = uploaded.filename || visitingCardFile.name || '';
        data.visiting_card_url = uploaded.url || '';
      }

      if (navigator.onLine && labReportFile) {
        const uploaded = await uploadAttachment(labReportFile, 'Lab Reports', data.client_submission_id);
        data.lab_report_file_name = uploaded.filename || labReportFile.name || '';
        data.lab_report_url = uploaded.url || '';
      }

      if (!navigator.onLine) {
        window.WTT_QUEUE.add(data);
        showSnackbar('📴 Lead saved offline. It will sync to Google Sheets when internet is available.','blue');
        resetForm();
        return;
      }

      const response = await fetch('/api/submit', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
      });
      const result = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error((result.errors || [result.error || response.statusText]).join(', '));

      let message = '✅ Exhibition lead saved to Google Sheets.';
      let kind = 'green';

      if (data.mobile_number) {
        if (result.whatsapp_sent) message += ' WhatsApp confirmation sent.';
        else {
          message += ` WhatsApp: ${result.whatsapp_status || 'not sent'}.`;
          kind = 'orange';
        }
      } else {
        message += ' WhatsApp skipped (no mobile).';
      }

      if (data.email) {
        if (result.email_sent) message += ' Email confirmation sent.';
        else {
          message += ` Email: ${result.email_status || 'not sent'}.`;
          kind = 'orange';
        }
      } else {
        message += ' Email skipped (no email address).';
      }

      showSnackbar(message, kind, 8000);
      resetForm();
    } catch (error) {
      // The API returns non-200 when Google Sheets did not actually accept the
      // lead. Keep a browser copy so Vercel /tmp expiry cannot lose the data.
      window.WTT_QUEUE.add(data);
      showSnackbar(`⚠️ ${error.message || 'Could not sync now'}. Lead kept in browser queue for retry.`, 'orange', 6000);
      // Keep attachments/form visible so the user can retry file upload rather
      // than silently losing a selected attachment.
    } finally {
      setBusy(false);
    }
  }

  function setScanBusy(busy) {
    $('scanCardButton').disabled = busy;
    $('scanAgainButton').disabled = busy;
    $('scanProgress').classList.toggle('hidden', !busy);
  }

  function setScanResult(message, kind='success') {
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
    $('scanFileName').textContent = file.name || (window.WTT_I18N ? window.WTT_I18N.t('visiting-card.jpg') : 'visiting-card.jpg');
    $('scanPreviewWrap').classList.remove('hidden');
  }

  function fillCard(data) {
    const map = {
      company_name:'Company',
      contact_person:'Contact Person',
      designation:'Designation',
      mobile_number:'Mobile',
      email:'Email'
    };
    const filled = [];
    Object.entries(map).forEach(([key,label]) => {
      if (data[key] && $(key)) {
        $(key).value = data[key];
        setError(key);
        filled.push(label);
      }
    });
    if ($('visiting_card_address')) $('visiting_card_address').value = data.address || '';
    return filled;
  }

  async function scanCard(file) {
    if (!file) return;
    visitingCardFile = file;
    showCardPreview(file);
    setScanResult('');
    setScanBusy(true);
    try {
      if (!navigator.onLine) throw new Error('Internet connection is required for visiting-card scanning.');
      const form = new FormData();
      form.append('card', file, file.name || 'visiting-card.jpg');
      const response = await fetch('/api/scan-visiting-card', {method:'POST', body:form});
      const result = await response.json().catch(()=>({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not read visiting card.');
      const filled = fillCard(result.data || {});
      const addressNote = result.data?.address ? ` Card address read: ${result.data.address}. Plant/Project Location is intentionally left for verification.` : '';
      setScanResult(
        window.WTT_I18N ? window.WTT_I18N.t(filled.length ? `Auto-filled: ${filled.join(', ')}.${addressNote}` : 'Card scanned, but no contact details were read confidently.') : (filled.length ? `Auto-filled: ${filled.join(', ')}.${addressNote}` : 'Card scanned, but no contact details were read confidently.'),
        filled.length ? 'success' : 'warning'
      );
    } catch (error) {
      setScanResult(error.message || 'Could not scan visiting card.', 'error');
      showSnackbar(error.message || 'Could not scan visiting card.', 'red');
    } finally {
      setScanBusy(false);
      $('visitingCardInput').value = '';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const hiddenAddress = document.createElement('input');
    hiddenAddress.type = 'hidden';
    hiddenAddress.id = 'visiting_card_address';
    hiddenAddress.name = 'visiting_card_address';
    $('leadForm').appendChild(hiddenAddress);

    makeCheckboxes($('stpTreatedUseOptions'), 'stp_treated_water_use', ['Discharge','Gardening','Toilet Flushing','Reuse','Other']);
    makeCheckboxes($('wtpApplicationOptions'), 'wtp_application_choice', ['Process','Drinking','Boiler','Cooling','RO / DM / DI','Other']);

    $('treatment_required').addEventListener('change', updateTreatment);
    $('industry_application').addEventListener('change', updateIndustry);
    $('requirement_type').addEventListener('change', updateExistingPlant);
    $('leadForm').addEventListener('submit', submitLead);
    $('scanCardButton').addEventListener('click', () => $('visitingCardInput').click());
    $('scanAgainButton').addEventListener('click', () => $('visitingCardInput').click());
    $('visitingCardInput').addEventListener('change', event => scanCard(event.target.files?.[0]));

    updateTreatment();
    updateExistingPlant();
    renumberSections();
    window.WTT_I18N?.translatePage();
  });
})();
