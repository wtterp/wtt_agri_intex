(() => {
  const STORAGE_KEY = 'wtt_exhibition_language';
  const translations = {
    'English': 'English',
    'Español': 'Español',
    'Back': 'Volver',
    'Sync Status': 'Estado de sincronización',
    'Refresh': 'Actualizar',
    'WTT Exhibition Lead Tracker': 'Registro de clientes de exposición WTT',
    'Water & Wastewater Treatment': 'Tratamiento de agua y aguas residuales',
    'Exhibition enquiry and lead capture for ETP, STP and WTP requirements.': 'Registro de consultas y clientes para requisitos de ETP, STP y WTP.',
    'New Exhibition Enquiry': 'Nueva consulta de exposición',
    'View Sync Status': 'Ver estado de sincronización',
    'Exhibition Enquiry Form': 'Formulario de consulta de exposición',
    'Water & Wastewater Treatment — Exhibition Enquiry': 'Tratamiento de agua y aguas residuales — Consulta de exposición',
    'Customer Details': 'Datos del cliente',
    'Capture the visiting card or enter the contact information.': 'Capture la tarjeta de visita o introduzca los datos de contacto.',
    'VISITING CARD': 'TARJETA DE VISITA',
    'Take a photo or attach a card. AI fills contact details; the card image is stored in Google Drive when the lead is submitted.': 'Tome una foto o adjunte una tarjeta. La IA completa los datos de contacto; la imagen se guarda en Google Drive al enviar el cliente.',
    'Take Photo / Attach Visiting Card': 'Tomar foto / Adjuntar tarjeta de visita',
    'Verify the extracted details before submitting': 'Verifique los datos extraídos antes de enviar',
    'Scan Again': 'Escanear de nuevo',
    'Reading visiting card...': 'Leyendo la tarjeta de visita...',
    'Company Name *': 'Nombre de la empresa *',
    'Contact Person *': 'Persona de contacto *',
    'Designation': 'Cargo',
    'Mobile No.': 'N.º de móvil',
    'Email': 'Correo electrónico',
    'Plant / Project Location': 'Ubicación de la planta / proyecto',
    'Actual treatment-plant location': 'Ubicación real de la planta de tratamiento',
    'Enter at least one contact method: Mobile No. or Email.': 'Introduzca al menos un medio de contacto: móvil o correo electrónico.',
    'Treatment Requirement': 'Requisito de tratamiento',
    'What treatment is required? *': '¿Qué tratamiento se requiere? *',
    'Requirement Type *': 'Tipo de requisito *',
    'Select': 'Seleccionar',
    'New Plant': 'Planta nueva',
    'Existing Plant Upgrade / Modification': 'Mejora / modificación de planta existente',
    'Capacity Expansion': 'Ampliación de capacidad',
    'Replacement of Existing Plant': 'Sustitución de planta existente',
    'Industry / Application': 'Industria / Aplicación',
    'Select treatment first *': 'Seleccione primero el tratamiento *',
    'Select treatment first': 'Seleccione primero el tratamiento',
    'Other Industry / Application *': 'Otra industria / aplicación *',
    'Customer Requirement': 'Requisito del cliente',
    'Capture the key requirement or discussion. This field is optional.': 'Capture el requisito principal o la conversación. Este campo es opcional.',
    'Key Requirement / Discussion': 'Requisito principal / Conversación',
    'Example: Existing 300 KLD ETP. COD outlet issue. Expansion planned to 500 KLD. Requires upgrade proposal.': 'Ejemplo: ETP existente de 300 KLD. Problema de COD en la salida. Ampliación prevista a 500 KLD. Se requiere una propuesta de mejora.',
    'Process / Application': 'Proceso / Aplicación',
    'Manufacturing process, sewage source or raw-water application.': 'Proceso de fabricación, fuente de aguas residuales o aplicación de agua bruta.',
    'Describe the process / application': 'Describa el proceso / aplicación',
    'Capacity / Flow': 'Capacidad / Caudal',
    'Required Capacity (KLD)': 'Capacidad requerida (KLD)',
    'Average Flow (KLD)': 'Caudal medio (KLD)',
    'Peak Flow (KLD)': 'Caudal máximo (KLD)',
    'Population / Occupancy': 'Población / Ocupación',
    'Peak Requirement (KLD)': 'Requisito máximo (KLD)',
    'Production Capacity': 'Capacidad de producción',
    'Production Capacity Unit': 'Unidad de capacidad de producción',
    'Water / Effluent Parameters': 'Parámetros de agua / efluente',
    'Enter any available parameter and value. Keep this flexible.': 'Introduzca cualquier parámetro y valor disponible. Mantenga este campo flexible.',
    'Available Parameters': 'Parámetros disponibles',
    'Example: pH 7.5 | BOD 600 mg/L | COD 1500 mg/L | TSS 300 mg/L | TDS 2500 mg/L': 'Ejemplo: pH 7,5 | DBO 600 mg/L | DQO 1500 mg/L | SST 300 mg/L | SDT 2500 mg/L',
    'Analysis Report': 'Informe de análisis',
    'Customer has analysis report': 'El cliente tiene informe de análisis',
    'Parameters to be shared later': 'Los parámetros se compartirán posteriormente',
    'Not available': 'No disponible',
    'Optional Lab Report / Attachment': 'Informe de laboratorio / archivo adjunto opcional',
    'Any file type can be uploaded within the web size limit. The file is stored in Google Drive; the spreadsheet stores its Drive link, not the binary file.': 'Se puede cargar cualquier tipo de archivo dentro del límite web. El archivo se guarda en Google Drive; la hoja de cálculo almacena su enlace de Drive, no el archivo binario.',
    'Existing Plant': 'Planta existente',
    'This section opens automatically for upgrade, expansion or replacement requirements. It is hidden for New Plant.': 'Esta sección se abre automáticamente para requisitos de mejora, ampliación o sustitución. Está oculta para una planta nueva.',
    'Existing Plant Capacity (KLD)': 'Capacidad de la planta existente (KLD)',
    'Existing Technology / Process': 'Tecnología / Proceso existente',
    'Current Status': 'Estado actual',
    'Running Properly': 'Funcionando correctamente',
    'Partially Working': 'Funcionando parcialmente',
    'Not Working': 'No funciona',
    'Not Meeting Standards': 'No cumple las normas',
    'Main Requirement / Problem': 'Requisito principal / Problema',
    'Capacity Increase': 'Aumento de capacidad',
    'Outlet Quality Issue': 'Problema de calidad del efluente',
    'Upgrade / Modification': 'Mejora / Modificación',
    'Expansion': 'Ampliación',
    'Plant Not Working': 'La planta no funciona',
    'Existing Plant Remarks': 'Observaciones de la planta existente',
    'Discharge / Treated Water Requirement': 'Requisito de descarga / agua tratada',
    'Required Discharge / Outlet Quality': 'Calidad requerida de descarga / salida',
    'Specific discharge / treated-water requirement?': '¿Existe un requisito específico de descarga / agua tratada?',
    'Required Norms / Outlet Quality': 'Normas requeridas / Calidad de salida',
    'Examples: TNPCB norms, CETP norms, BOD < 30, COD < 250, customer specification': 'Ejemplos: normas TNPCB, normas CETP, DBO < 30, DQO < 250, especificación del cliente',
    'Industry-Specific Details': 'Detalles específicos de la industria',
    'Only the relevant 2–3 questions are shown.': 'Solo se muestran las 2–3 preguntas relevantes.',
    'Unit': 'Unidad',
    'STP – Additional Details': 'STP – Detalles adicionales',
    'Sewage Source': 'Fuente de aguas residuales',
    'Treated Water Use': 'Uso del agua tratada',
    'WTP – Additional Details': 'WTP – Detalles adicionales',
    'Raw Water Source': 'Fuente de agua bruta',
    'Application': 'Aplicación',
    'Raw Water Parameters': 'Parámetros del agua bruta',
    'Project Details': 'Detalles del proyecto',
    'Project Stage': 'Etapa del proyecto',
    'Initial Enquiry': 'Consulta inicial',
    'Requirement Finalized': 'Requisito finalizado',
    'RFQ': 'Solicitud de cotización (RFQ)',
    'Tender': 'Licitación',
    'Budgetary Quote': 'Cotización presupuestaria',
    'Expected Timeline': 'Plazo previsto',
    'Immediate': 'Inmediato',
    '1–3 Months': '1–3 meses',
    '3–6 Months': '3–6 meses',
    '6–12 Months': '6–12 meses',
    'Not Decided': 'No decidido',
    'Internal Remarks': 'Observaciones internas',
    'SUBMIT EXHIBITION LEAD': 'ENVIAR CLIENTE DE EXPOSICIÓN',
    'Please complete the required fields.': 'Complete los campos obligatorios.',
    'Please enter company name': 'Introduzca el nombre de la empresa',
    'Please enter contact person': 'Introduzca la persona de contacto',
    'Please select treatment required': 'Seleccione el tratamiento requerido',
    'Please select requirement type': 'Seleccione el tipo de requisito',
    'Please select industry / application': 'Seleccione la industria / aplicación',
    'Enter a mobile number or email address': 'Introduzca un número de móvil o una dirección de correo electrónico',
    'Please enter a valid mobile number': 'Introduzca un número de móvil válido',
    'Please enter a valid email address': 'Introduzca una dirección de correo electrónico válida',
    'Please specify the other industry / application': 'Especifique la otra industria / aplicación',
    'Internet connection is required for visiting-card scanning.': 'Se necesita conexión a Internet para escanear la tarjeta de visita.',
    'Could not read visiting card.': 'No se pudo leer la tarjeta de visita.',
    'Could not scan visiting card.': 'No se pudo escanear la tarjeta de visita.',
    'Card scanned, but no contact details were read confidently.': 'Tarjeta escaneada, pero no se pudieron leer los datos de contacto con suficiente confianza.',
    'Auto-filled: ': 'Completado automáticamente: ',
    'Plant/Project Location is intentionally left for verification.': 'La ubicación de la planta/proyecto se deja intencionadamente para su verificación.',
    'Exhibition lead saved to Google Sheets.': 'Cliente de exposición guardado en Google Sheets.',
    'WhatsApp confirmation sent.': 'Confirmación de WhatsApp enviada.',
    'WhatsApp skipped because no mobile number was entered.': 'WhatsApp omitido porque no se introdujo un número de móvil.',
    'No internet connection.': 'No hay conexión a Internet.',
    'Sync completed.': 'Sincronización completada.',
    'Sync failed': 'Error de sincronización',
    'Error loading sync status: ': 'Error al cargar el estado de sincronización: ',
    'All leads synced': 'Todos los clientes están sincronizados',
    'Pending: ': 'Pendientes: ',
    'Sync Pending Leads': 'Sincronizar clientes pendientes',
    'Pending Lead': 'Cliente pendiente',
    'Pending Leads': 'Clientes pendientes',
    'Browser offline queue': 'Cola sin conexión del navegador',
    'Server retry queue': 'Cola de reintento del servidor',
    'Spreadsheet: ⏳': 'Hoja de cálculo: ⏳',
    'Exhibition Lead': 'Cliente de exposición',
    'All leads are synced!': '¡Todos los clientes están sincronizados!',
    'No pending exhibition leads.': 'No hay clientes de exposición pendientes.',
    'Connection:': 'Conexión:',
    'Spreadsheet Sync:': 'Sincronización de hoja de cálculo:',
    'Online': 'En línea',
    'Offline': 'Sin conexión',
    'Syncing...': 'Sincronizando...',
    'Unable to load server queue': 'No se puede cargar la cola del servidor',
    'Could not sync now': 'No se pudo sincronizar ahora',
    'Lead kept in browser queue for retry.': 'El cliente se mantiene en la cola del navegador para reintentar.',
    'Lead saved offline. It will sync to Google Sheets when internet is available.': 'Cliente guardado sin conexión. Se sincronizará con Google Sheets cuando haya Internet.',
    'Internet is required to upload the selected visiting card / report. Connect and submit again.': 'Se necesita Internet para cargar la tarjeta de visita / informe seleccionado. Conéctese y vuelva a enviar.',
    'Visiting card image must be': 'La imagen de la tarjeta de visita debe ser de',
    'MB or smaller': 'MB o menos',
    'File must be': 'El archivo debe ser',
    'for web upload': 'o menos para la carga web',
    'Visiting card image': 'Imagen de tarjeta de visita',
    'Could not sync now.': 'No se pudo sincronizar ahora.'
  };

  Object.assign(translations, {
    'Other': 'Otro',
    'ETP': 'ETP',
    'STP': 'STP',
    'WTP': 'WTP',
    'ETP Industry *': 'Industria ETP *',
    'STP Application *': 'Aplicación STP *',
    'WTP Application *': 'Aplicación WTP *',
    'Textile': 'Textil',
    'Tannery': 'Curtiduría',
    'Food & Beverages': 'Alimentos y bebidas',
    'Paper & Pulp': 'Papel y pulpa',
    'Pharmaceutical': 'Farmacéutica',
    'Automobile': 'Automoción',
    'Electronics & Semiconductor': 'Electrónica y semiconductores',
    'Refinery': 'Refinería',
    'Plastic Recycling': 'Reciclaje de plástico',
    'Iron & Steel': 'Hierro y acero',
    'Dairy': 'Lácteos',
    'Power & Energy': 'Energía y generación eléctrica',
    'Residential / Apartment': 'Residencial / Apartamento',
    'Hotel': 'Hotel',
    'Hospital': 'Hospital',
    'Commercial / Office': 'Comercial / Oficina',
    'School / College': 'Escuela / Universidad',
    'Industrial Township': 'Complejo residencial industrial',
    'Process Water': 'Agua de proceso',
    'Drinking / Potable Water': 'Agua potable',
    'Boiler Feed': 'Alimentación de caldera',
    'Cooling Tower': 'Torre de refrigeración',
    'RO / DM / DI Feed': 'Alimentación de RO / DM / DI',
    'Utility Water': 'Agua de servicios',
    'CETP': 'CETP',
    'Sewer': 'Alcantarillado',
    'Water Body': 'Cuerpo de agua',
    'Land / Irrigation': 'Terreno / Riego',
    'Reuse in Plant': 'Reutilización en planta',
    'Gardening': 'Jardinería',
    'Toilet Flushing': 'Descarga de inodoros',
    'Process': 'Proceso',
    'Drinking / Potable': 'Agua potable',
    'Boiler': 'Caldera',
    'RO / DM / DI': 'RO / DM / DI',
    'Cooling': 'Refrigeración',
    'Discharge': 'Descarga',
    'Reuse': 'Reutilización',
    'Borewell': 'Pozo',
    'River': 'Río',
    'Lake': 'Lago',
    'Municipal': 'Municipal',
    'Sea': 'Mar',
    'TPD': 'TPD',
    'MTPD': 'MTPD',
    'KLD': 'KLD',
    'MW': 'MW',
    'Dyeing': 'Teñido',
    'Printing': 'Impresión',
    'Washing': 'Lavado',
    'Processing': 'Procesamiento',
    'Garment': 'Confección',
    'Tanning': 'Curtido',
    'Finishing': 'Acabado',
    'Complete Process': 'Proceso completo',
    'API': 'API',
    'Formulation': 'Formulación',
    'Chemical Synthesis': 'Síntesis química',
    'Painting': 'Pintura',
    'Pretreatment': 'Pretratamiento',
    'Metal Finishing': 'Acabado de metales',
    'Components': 'Componentes',
    'PCB': 'PCB',
    'Semiconductor': 'Semiconductor',
    'Plating': 'Galvanoplastia',
    'Etching': 'Grabado',
    'Refining': 'Refinación',
    'Desalter': 'Desalador',
    'Milk': 'Leche',
    'Cheese': 'Queso',
    'Ice Cream': 'Helado',
    'Thermal Power Generation': 'Generación termoeléctrica',
    'Running Properly': 'Funcionando correctamente',
    'Partially Working': 'Funcionando parcialmente',
    'Not Working': 'No funciona',
    'Not Meeting Standards': 'No cumple las normas',
    'Yes': 'Sí',
    'No': 'No',
    'Not Sure': 'No estoy seguro',
    'Capacity Increase': 'Aumento de capacidad',
    'Outlet Quality Issue': 'Problema de calidad de salida',
    'Upgrade / Modification': 'Mejora / Modificación',
    'Expansion': 'Ampliación',
    'Plant Not Working': 'La planta no funciona',
    'Initial Enquiry': 'Consulta inicial',
    'Requirement Finalized': 'Requisito finalizado',
    'RFQ': 'Solicitud de cotización (RFQ)',
    'Tender': 'Licitación',
    'Budgetary Quote': 'Cotización presupuestaria',
    'Immediate': 'Inmediato',
    '1–3 Months': '1–3 meses',
    '3–6 Months': '3–6 meses',
    '6–12 Months': '6–12 meses',
    'Not Decided': 'No decidido',
    'Dairy': 'Lácteos',
    'Thermal Power Generation': 'Generación termoeléctrica',
    'Milk Processing Capacity': 'Capacidad de procesamiento de leche',
    'Product / Process': 'Producto / Proceso',
    'Process / Product': 'Proceso / Producto',
    'Process / Area': 'Proceso / Área',
    'Plant Capacity': 'Capacidad de planta',
    'Plant Type': 'Tipo de planta',
    'ZLD Required?': '¿Se requiere ZLD?',
    'CETP Connection?': '¿Conexión a CETP?',
    'CIP / Cleaning Wastewater?': '¿Aguas residuales de CIP / limpieza?',
    'Water Reuse Required?': '¿Se requiere reutilización del agua?',
    'High TDS / High COD?': '¿TDS alto / DQO alta?',
    'Oil / Metal Contamination?': '¿Contaminación por aceite / metales?',
    'Chemical / Heavy Metal Wastewater?': '¿Aguas residuales químicas / con metales pesados?',
    'Oil / Hydrocarbon in Effluent?': '¿Aceite / hidrocarburos en el efluente?',
    'Heavy Metals / Oil Present?': '¿Hay metales pesados / aceite?',
    'CIP Wastewater?': '¿Aguas residuales de CIP?',
    'Major Wastewater Source': 'Fuente principal de aguas residuales',
    'Cooling Tower': 'Torre de refrigeración',
    'DM / RO': 'DM / RO',
    'Select treatment first': 'Seleccione primero el tratamiento',
    'Select': 'Seleccionar',
  });

  const fragmentTranslations = [
    ['Could not sync now', 'No se pudo sincronizar ahora'],
    ['Lead kept in browser queue for retry.', 'El cliente se mantiene en la cola del navegador para reintentar.'],
    ['Exhibition lead saved to Google Sheets.', 'Cliente de exposición guardado en Google Sheets.'],
    ['WhatsApp confirmation sent.', 'Confirmación de WhatsApp enviada.'],
    ['WhatsApp skipped because no mobile number was entered.', 'WhatsApp omitido porque no se introdujo un número de móvil.'],
    ['Lead saved offline. It will sync to Google Sheets when internet is available.', 'Cliente guardado sin conexión. Se sincronizará con Google Sheets cuando haya Internet.'],
    ['Internet is required to upload the selected visiting card / report. Connect and submit again.', 'Se necesita Internet para cargar la tarjeta de visita / informe seleccionado. Conéctese y vuelva a enviar.'],
    ['Card scanned, but no contact details were read confidently.', 'Tarjeta escaneada, pero no se pudieron leer los datos de contacto con suficiente confianza.'],
    ['Auto-filled: ', 'Completado automáticamente: '],
    ['Card address read: ', 'Dirección de la tarjeta leída: '],
    ['. Plant/Project Location is intentionally left for verification.', '. La ubicación de la planta/proyecto se deja intencionadamente para su verificación.'],
    ['Please complete the required fields.', 'Complete los campos obligatorios.'],
    ['Sync completed.', 'Sincronización completada.'],
    ['No internet connection.', 'No hay conexión a Internet.'],
    ['Reading visiting card...', 'Leyendo la tarjeta de visita...'],
    ['Could not scan visiting card.', 'No se pudo escanear la tarjeta de visita.'],
    ['Could not read visiting card.', 'No se pudo leer la tarjeta de visita.'],
    ['Error loading sync status: ', 'Error al cargar el estado de sincronización: '],
    ['Syncing...', 'Sincronizando...'],
    ['Sync failed', 'Error de sincronización'],
  ];

  const languageNames = { en: 'English', es: 'Español' };

  function getLanguage() {
    return localStorage.getItem(STORAGE_KEY) === 'es' ? 'es' : 'en';
  }

  function setLanguage(lang) {
    const normalized = lang === 'es' ? 'es' : 'en';
    localStorage.setItem(STORAGE_KEY, normalized);
    document.documentElement.lang = normalized === 'es' ? 'es' : 'en';
    translatePage();
    window.dispatchEvent(new CustomEvent('wttlanguagechange', { detail: normalized }));
  }

  function normalize(text) {
    return String(text ?? '').replace(/\s+/g, ' ').trim();
  }

  // Always translate from the original English source text. This prevents
  // English -> Spanish -> English from getting stuck on the Spanish value.
  const reverseTranslations = Object.create(null);
  Object.keys(translations).forEach((key) => {
    const translated = translations[key];
    if (translated && translated !== key && !reverseTranslations[translated]) {
      reverseTranslations[translated] = key;
    }
  });

  function sourceTextForElement(el) {
    let source = el.getAttribute('data-i18n-source-text');
    if (source !== null) return source;

    const current = normalize(el.textContent);
    source = reverseTranslations[current] || current;
    el.setAttribute('data-i18n-source-text', source);
    return source;
  }

  function t(text) {
    const value = String(text ?? '');
    if (getLanguage() !== 'es') {
      const reverse = reverseTranslations[normalize(value)];
      return reverse !== undefined ? reverse : value;
    }

    const source = normalize(value);
    const exact = translations[source];
    if (exact !== undefined) return exact;

    // If a caller passes an already-translated Spanish value, normalize it
    // back to English before translating again. This makes repeated language
    // changes safe for dynamically-created UI text.
    const englishSource = reverseTranslations[source] || value;
    const exactEnglish = translations[normalize(englishSource)];
    if (exactEnglish !== undefined) return exactEnglish;

    let result = englishSource;
    fragmentTranslations
      .slice()
      .sort((a, b) => b[0].length - a[0].length)
      .forEach(([from, to]) => { result = result.split(from).join(to); });
    const pendingMatch = result.match(/📤\s*Pending:\s*(\d+)/);
    if (pendingMatch) result = result.replace(pendingMatch[0], `📤 Pendientes: ${pendingMatch[1]}`);
    const syncMatch = result.match(/Sync\s+(\d+)\s+Pending\s+Lead(s?)/i);
    if (syncMatch) result = result.replace(syncMatch[0], `Sincronizar ${syncMatch[1]} cliente${syncMatch[2] ? 's' : ''} pendiente${syncMatch[2] ? 's' : ''}`);
    return result;
  }

  function translateAttribute(el, attr) {
    const sourceAttr = `data-i18n-${attr}`;
    const source = el.getAttribute(sourceAttr) !== null
      ? el.getAttribute(sourceAttr)
      : (el.getAttribute(attr) || '');
    if (!el.hasAttribute(sourceAttr)) el.setAttribute(sourceAttr, source);
    el.setAttribute(attr, t(source));
  }

  function translatePage() {
    const lang = getLanguage();
    document.title = lang === 'es' ? 'Nueva consulta de exposición - WTT' : 'New Exhibition Enquiry - WTT';
    document.documentElement.lang = lang === 'es' ? 'es' : 'en';
    const selector = 'h1,h2,h3,p,label,button,button span,.btn span,small,.scan-title,.scan-subtitle,.field-note,.btn,.queue-heading,.status-bar strong,.status-bar span,.center-state h2,.center-state p,.topbar-title,.form-intro,.scan-card-button strong,.scan-card-button small,.scan-again-button';
    document.querySelectorAll(selector).forEach(el => {
      if (el.closest('script,style')) return;
      if (el.id === 'languageLabel') return;
      if (el.dataset.i18nHtml) {
        el.innerHTML = lang === 'es' ? el.dataset.i18nHtml : el.dataset.i18nHtmlEn;
        return;
      }
      const source = sourceTextForElement(el);
      const translated = t(source);
      if (el.children.length === 0) {
        if (normalize(el.textContent) !== normalize(translated)) el.textContent = translated;
      } else if (el.dataset.translateText === 'true') {
        el.textContent = translated;
      }
    });

    document.querySelectorAll('option').forEach(option => {
      const source = option.getAttribute('data-i18n-source') || reverseTranslations[normalize(option.textContent)] || option.textContent;
      if (!option.hasAttribute('data-i18n-source')) option.setAttribute('data-i18n-source', source);
      option.textContent = t(source);
    });

    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el => translateAttribute(el, 'placeholder'));
    document.querySelectorAll('[aria-label]').forEach(el => translateAttribute(el, 'aria-label'));
    document.querySelectorAll('[title]').forEach(el => translateAttribute(el, 'title'));

    const select = document.getElementById('languageSelect');
    if (select) select.value = lang;
    const languageLabel = document.getElementById('languageLabel');
    if (languageLabel) languageLabel.textContent = lang === 'es' ? 'Idioma' : 'Language';
  }

  function captureInitialSources() {
    const selector = 'h1,h2,h3,p,label,button,button span,.btn span,small,.scan-title,.scan-subtitle,.field-note,.btn,.queue-heading,.status-bar strong,.status-bar span,.center-state h2,.center-state p,.topbar-title,.form-intro,.scan-card-button strong,.scan-card-button small,.scan-again-button';
    document.querySelectorAll(selector).forEach(el => {
      if (!el.closest('script,style') && !el.hasAttribute('data-i18n-source-text')) {
        el.setAttribute('data-i18n-source-text', normalize(el.textContent));
      }
    });
    document.querySelectorAll('option').forEach(option => {
      if (!option.hasAttribute('data-i18n-source')) {
        option.setAttribute('data-i18n-source', option.textContent);
      }
    });
  }

  function init() {
    const select = document.getElementById('languageSelect');
    if (select) {
      select.addEventListener('change', () => setLanguage(select.value));
      select.value = getLanguage();
    }
    // Capture the English DOM before the first translation is applied.
    captureInitialSources();
    translatePage();
  }

  window.WTT_I18N = { getLanguage, setLanguage, t, translatePage, languageNames };
  document.addEventListener('DOMContentLoaded', init);
})();
