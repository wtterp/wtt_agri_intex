(() => {
  const translations = {
    en: {
      app_title:'WTT Agri Intex', app_subtitle:'Agricultural Data Collection', app_description:'Submit your agricultural details for better water management',
      add_new_entry:'Add New Entry', view_sync_status:'View Sync Status', add_data_title:'Add Agricultural Data',
      scan_card_title:'SCAN VISITING CARD', scan_card_subtitle:'Capture or upload a visiting card to auto-fill Name, Mobile Number and District.', scan_card_button:'Scan Visiting Card', scan_card_hint:'Use camera or choose an image', scan_again:'Scan Again', scanning_card:'Reading visiting card...', scan_requires_internet:'Internet connection is required to scan a visiting card.', scan_failed:'Could not read the visiting card. Please try a clearer photo.', scan_success:'Auto-filled:', scan_success_snackbar:'✅ Visiting card details filled automatically', scan_no_details:'The card was scanned, but Name, Mobile Number or District could not be read confidently.',
      name:'NAME', name_hint:'Enter your full name', mobile_number:'MOBILE NUMBER', mobile_hint:'Enter your mobile number',
      address:'ADDRESS / DISTRICT', address_hint:'Enter your address or district', water_requirement:'WATER REQUIREMENT PER DAY (IN LITERS)', water_requirement_hint:'Enter water requirement in liters',
      water_source:'SOURCE OF WATER', water_source_hint:'e.g., Borewell, River, Canal, Rainwater', crops:'CROPS', crops_hint:'Enter the crops you grow',
      acres_of_land:'ACRES OF LAND', acres_hint:'Enter land size in acres', soil_type:'TYPE OF SOIL', soil_other:'Specify Soil Type', soil_other_hint:'Enter soil type',
      water_parameters:'WATER PARAMETERS', water_parameters_hint:'e.g., pH, TDS, Temperature, Hardness', submit:'SUBMIT', advance_received:'Advance Received', advance_amount:'Advance Amount (₹)', advance_amount_hint:'Enter advance amount in rupees',
      advance_required:'Please enter advance amount', advance_valid:'Please enter a valid amount', clay:'Clay', sandy:'Sandy', silt:'Silt', loam:'Loam', peaty:'Peaty', chalky:'Chalky', others:'Others',
      name_required:'Please enter your name', mobile_required:'Please enter mobile number', mobile_valid:'Please enter a valid mobile number (minimum 10 digits)', address_required:'Please enter your address',
      water_required:'Please enter water requirement', water_valid:'Please enter a valid number', source_required:'Please enter water source', crops_required:'Please enter crops', acres_required:'Please enter land size', acres_valid:'Please enter a valid number',
      soil_required:'Please select soil type', soil_other_required:'Please enter soil type', water_params_required:'Please enter water parameters', data_sent:'✅ Data sent successfully to Google Sheets!', data_saved_offline:'📴 Data saved locally. Will sync when online.',
      data_saved_retry:'⚠️ Data saved locally. Will retry sync.', data_failed:'❌ Failed to save data. Please try again.', error:'❌ Error: ', sync_status_title:'Sync Status', connection:'Connection:', online:'🟢 Online', offline:'🔴 Offline',
      sync_status:'Sync Status:', pending:'📤 Pending: ', items:' items', all_synced:'✅ All data synced', syncing:'🔄 Syncing...', sync_completed:'✅ Sync completed successfully! Data cleared from local storage.', sync_failed:'❌ Sync failed. Please try again.',
      sync_error:'❌ Error: ', no_internet:'No internet connection. Please connect to sync.', all_synced_message:'All data is synced!', no_pending:'No pending data in local storage', sync_items:'Sync ', pending_items:' Pending Items',
      sync_success:'✅ Sync successful! Local data cleared.', sync_failed_message:'❌ Sync failed. Please try again.', loading_error:'Error loading data: ', browser_pending:'Browser offline queue', server_pending:'Server retry queue', google_status:'Google', erp_status:'ERP'
    },
    ta: {
      app_title:'WTT Agri Intex', app_subtitle:'விவசாய தரவு சேகரிப்பு', app_description:'சிறந்த நீர் மேலாண்மைக்கு உங்கள் விவசாய விவரங்களை சமர்ப்பிக்கவும்',
      add_new_entry:'புதிய உள்ளீடு சேர்க்க', view_sync_status:'ஒத்திசைவு நிலையை காண்க', add_data_title:'விவசாய தரவுகளை சேர்க்கவும்',
      scan_card_title:'விசிட்டிங் கார்டை ஸ்கேன் செய்யவும்', scan_card_subtitle:'விசிட்டிங் கார்டை படம் எடுக்கவும் அல்லது பதிவேற்றவும்; பெயர், கைபேசி எண் மற்றும் மாவட்டம் தானாக நிரப்பப்படும்.', scan_card_button:'விசிட்டிங் கார்டை ஸ்கேன் செய்யவும்', scan_card_hint:'கேமராவைப் பயன்படுத்தவும் அல்லது படத்தைத் தேர்ந்தெடுக்கவும்', scan_again:'மீண்டும் ஸ்கேன்', scanning_card:'விசிட்டிங் கார்டை படிக்கிறது...', scan_requires_internet:'விசிட்டிங் கார்டை ஸ்கேன் செய்ய இணைய இணைப்பு தேவை.', scan_failed:'விசிட்டிங் கார்டை படிக்க முடியவில்லை. தெளிவான படத்துடன் மீண்டும் முயற்சிக்கவும்.', scan_success:'தானாக நிரப்பப்பட்டது:', scan_success_snackbar:'✅ விசிட்டிங் கார்டு விவரங்கள் தானாக நிரப்பப்பட்டன', scan_no_details:'கார்டு ஸ்கேன் செய்யப்பட்டது; ஆனால் பெயர், கைபேசி எண் அல்லது மாவட்டத்தை நம்பகமாக படிக்க முடியவில்லை.',
      name:'பெயர்', name_hint:'உங்கள் முழு பெயரை உள்ளிடவும்', mobile_number:'கைபேசி எண்', mobile_hint:'உங்கள் கைபேசி எண்ணை உள்ளிடவும்', address:'முகவரி / மாவட்டம்', address_hint:'உங்கள் முகவரி அல்லது மாவட்டத்தை உள்ளிடவும்',
      water_requirement:'தினசரி தேவையான நீர் (லிட்டர்களில்)', water_requirement_hint:'லிட்டர்களில் நீர் தேவையை உள்ளிடவும்', water_source:'நீர் ஆதாரம்', water_source_hint:'எ.கா., கிணறு, ஆறு, கால்வாய், மழைநீர்', crops:'பயிர்கள்', crops_hint:'நீங்கள் வளர்க்கும் பயிர்களை உள்ளிடவும்',
      acres_of_land:'நிலத்தின் ஏக்கர்', acres_hint:'ஏக்கரில் நிலத்தின் அளவை உள்ளிடவும்', soil_type:'மண்ணின் வகை', soil_other:'மண்ணின் வகையை குறிப்பிடவும்', soil_other_hint:'மண்ணின் வகையை உள்ளிடவும்', water_parameters:'நீர் அளவுருக்கள்', water_parameters_hint:'எ.கா., pH, TDS, வெப்பநிலை, கடினத்தன்மை',
      submit:'சமர்ப்பிக்கவும்', advance_received:'முன்பணம் பெறப்பட்டது', advance_amount:'முன்பணம் தொகை (₹)', advance_amount_hint:'ரூபாயில் முன்பணம் தொகையை உள்ளிடவும்', advance_required:'தயவுசெய்து முன்பணம் தொகையை உள்ளிடவும்', advance_valid:'தயவுசெய்து சரியான தொகையை உள்ளிடவும்',
      clay:'களிமண்', sandy:'மணல் கலந்த', silt:'வண்டல்', loam:'லோம்', peaty:'பீட்', chalky:'சுண்ணாம்பு', others:'மற்றவை', name_required:'தயவுசெய்து உங்கள் பெயரை உள்ளிடவும்', mobile_required:'தயவுசெய்து கைபேசி எண்ணை உள்ளிடவும்', mobile_valid:'தயவுசெய்து சரியான கைபேசி எண்ணை உள்ளிடவும் (குறைந்தது 10 இலக்கங்கள்)',
      address_required:'தயவுசெய்து உங்கள் முகவரியை உள்ளிடவும்', water_required:'தயவுசெய்து நீர் தேவையை உள்ளிடவும்', water_valid:'தயவுசெய்து சரியான எண்ணை உள்ளிடவும்', source_required:'தயவுசெய்து நீர் ஆதாரத்தை உள்ளிடவும்', crops_required:'தயவுசெய்து பயிர்களை உள்ளிடவும்', acres_required:'தயவுசெய்து நிலத்தின் அளவை உள்ளிடவும்', acres_valid:'தயவுசெய்து சரியான எண்ணை உள்ளிடவும்', soil_required:'தயவுசெய்து மண்ணின் வகையை தேர்ந்தெடுக்கவும்', soil_other_required:'தயவுசெய்து மண்ணின் வகையை உள்ளிடவும்', water_params_required:'தயவுசெய்து நீர் அளவுருக்களை உள்ளிடவும்',
      data_sent:'✅ தரவு கூகிள் ஷீட்களுக்கு வெற்றிகரமாக அனுப்பப்பட்டது!', data_saved_offline:'📴 தரவு உள்நாட்டில் சேமிக்கப்பட்டது. ஆன்லைன் வரும்போது ஒத்திசைக்கப்படும்.', data_saved_retry:'⚠️ தரவு உள்நாட்டில் சேமிக்கப்பட்டது. மீண்டும் முயற்சிக்கும்.', data_failed:'❌ தரவை சேமிக்க முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.', error:'❌ பிழை: ',
      sync_status_title:'ஒத்திசைவு நிலை', connection:'இணைப்பு:', online:'🟢 ஆன்லைன்', offline:'🔴 ஆஃப்லைன்', sync_status:'ஒத்திசைவு நிலை:', pending:'📤 நிலுவையில் உள்ளது: ', items:' உருப்படிகள்', all_synced:'✅ அனைத்து தரவுகளும் ஒத்திசைக்கப்பட்டது', syncing:'🔄 ஒத்திசைக்கிறது...', sync_completed:'✅ ஒத்திசைவு வெற்றிகரமாக முடிந்தது! உள்ளூர் தரவு அழிக்கப்பட்டது.', sync_failed:'❌ ஒத்திசைவு தோல்வியடைந்தது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.', sync_error:'❌ பிழை: ', no_internet:'இணைய இணைப்பு இல்லை. ஒத்திசைக்க இணைக்கவும்.', all_synced_message:'அனைத்து தரவுகளும் ஒத்திசைக்கப்பட்டது!', no_pending:'உள்ளூர் சேமிப்பில் நிலுவையில் உள்ள தரவு இல்லை', sync_items:'ஒத்திசைக்கவும் ', pending_items:' நிலுவையில் உள்ள உருப்படிகள்', sync_success:'✅ ஒத்திசைவு வெற்றிகரமானது! உள்ளூர் தரவு அழிக்கப்பட்டது.', sync_failed_message:'❌ ஒத்திசைவு தோல்வியடைந்தது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.', loading_error:'தரவை ஏற்றுவதில் பிழை: ', browser_pending:'உலாவி ஆஃப்லைன் வரிசை', server_pending:'சர்வர் மீண்டும் முயற்சி வரிசை', google_status:'Google', erp_status:'ERP'
    }
  };
  const soilKeys = ['clay','sandy','silt','loam','peaty','chalky','others'];
  let language = localStorage.getItem('language') || 'en';
  if (!translations[language]) language = 'en';

  function t(key) { return (translations[language] && translations[language][key]) || key; }
  function getLanguage() { return language; }
  function updateSoilOptions() {
    const select = document.getElementById('soil_type');
    if (!select) return;
    const previous = select.value || 'clay';
    select.innerHTML = '';
    soilKeys.forEach(key => {
      const opt = document.createElement('option'); opt.value = key; opt.textContent = t(key); select.appendChild(opt);
    });
    select.value = soilKeys.includes(previous) ? previous : 'clay';
    select.dispatchEvent(new Event('change'));
  }
  function apply() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    const toggle = document.getElementById('languageToggle'); if (toggle) toggle.checked = language === 'ta';
    const label = document.getElementById('languageLabel'); if (label) label.textContent = language === 'ta' ? 'தமிழ்' : 'EN';
    updateSoilOptions();
  }
  function setLanguage(next) {
    language = translations[next] ? next : 'en';
    localStorage.setItem('language', language); apply();
    document.dispatchEvent(new CustomEvent('languagechanged', {detail:{language}}));
  }
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    const toggle = document.getElementById('languageToggle'); if (toggle) toggle.addEventListener('change', () => setLanguage(toggle.checked ? 'ta' : 'en'));
  });
  window.WTT_I18N = {t, getLanguage, setLanguage, apply, soilKeys};
})();
