/*
WTT EXHIBITION LEAD TRACKER - GOOGLE SHEETS / DRIVE / WHATSAPP

This project does NOT require ERPNext.

WHAT THIS SCRIPT DOES
1. Stores each exhibition enquiry in a dedicated Google Spreadsheet.
2. Prevents duplicate rows by using Submission ID as the unique key.
3. Stores uploaded visiting cards / lab reports in Google Drive and returns URLs.
4. Sends an automatic WhatsApp confirmation through UltraMsg after the lead is saved.
5. Writes WhatsApp Status / Detail / Sent At back into the same spreadsheet row.
6. Accepts SMTP email delivery status updates from the Flask backend.

SETUP
A. Create a NEW Google Spreadsheet for exhibition leads.
B. Copy the spreadsheet ID from the URL and paste it into SPREADSHEET_ID below.
C. Apps Script -> Project Settings -> Script Properties, add:
     ULTRAMSG_TOKEN       = your token
     ULTRAMSG_INSTANCE_ID = your instance number/id
   Optional:
     ULTRAMSG_HOST        = api.ultramsg.com
     WHATSAPP_ENABLED     = true
D. Run setupExhibitionSheet() once and approve permissions.
E. Deploy -> New deployment -> Web app -> Execute as Me -> Who has access: Anyone.
F. Put the FULL web app URL in Flask/Vercel as EXHIBITION_GOOGLE_SCRIPT_URL.
*/

const SPREADSHEET_ID = '1M84uQ3xLEdqpMiW-OjPIpAF-eA_d0dODF_2LsrbYadc';
const SHEET_NAME = 'Exhibition Leads';
const ROOT_UPLOAD_FOLDER_NAME = 'WTT Exhibition Lead Tracker';

const WHATSAPP_STATUS_HEADER = 'WhatsApp Status';
const WHATSAPP_DETAIL_HEADER = 'WhatsApp Detail';
const WHATSAPP_SENT_AT_HEADER = 'WhatsApp Sent At';
const EMAIL_STATUS_HEADER = 'Email Status';
const EMAIL_DETAIL_HEADER = 'Email Detail';
const EMAIL_SENT_AT_HEADER = 'Email Sent At';

const DEFAULT_HEADERS = [
  'Submission ID',
  'Created At',
  'Company Name',
  'Contact Person',
  'Designation',
  'Mobile No',
  'Email',
  'Plant / Project Location',
  'Visiting Card Address',
  'Visiting Card File Name',
  'Visiting Card Drive URL',
  'Treatment Required',
  'Requirement Type',
  'Industry / Application',
  'Other Industry / Application',
  'Key Requirement / Discussion',
  'Process / Application',
  'Required Capacity (KLD)',
  'Average Flow (KLD)',
  'Peak Flow (KLD)',
  'Peak Requirement (KLD)',
  'Population / Occupancy',
  'Production Capacity',
  'Production Capacity Unit',
  'Water / Effluent Parameters',
  'Analysis Report Status',
  'Lab Report File Name',
  'Lab Report Drive URL',
  'Existing Plant Capacity (KLD)',
  'Existing Technology / Process',
  'Existing Plant Current Status',
  'Existing Plant Main Requirement / Problem',
  'Existing Plant Remarks',
  'Treated Water Destination / Use',
  'Specific Outlet Requirement',
  'Required Norms / Outlet Quality',
  'Industry Specific Process / Product / Area',
  'Industry Specific Capacity',
  'Industry Specific Capacity Unit',
  'Industry Specific Question',
  'Industry Specific Answer',
  'Major Wastewater Source',
  'STP Sewage Source',
  'STP Population / Occupancy',
  'STP Required Capacity (KLD)',
  'STP Treated Water Use',
  'WTP Raw Water Source',
  'WTP Required Capacity (KLD)',
  'WTP Application',
  'WTP Raw Water Parameters',
  'Project Stage',
  'Expected Timeline',
  'Internal Remarks',
  WHATSAPP_STATUS_HEADER,
  WHATSAPP_DETAIL_HEADER,
  WHATSAPP_SENT_AT_HEADER,
  EMAIL_STATUS_HEADER,
  EMAIL_DETAIL_HEADER,
  EMAIL_SENT_AT_HEADER,
];

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function assertConfigured() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('PASTE_') === 0) {
    throw new Error('Set SPREADSHEET_ID in Code.gs first.');
  }
}

function getSheet() {
  assertConfigured();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet, incomingKeys) {
  let headers = [];
  const lastColumn = sheet.getLastColumn();
  if (lastColumn > 0) {
    headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  }

  const required = DEFAULT_HEADERS.concat(incomingKeys || []);
  required.forEach(function(key) {
    if (key && headers.indexOf(key) === -1) headers.push(key);
  });

  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#d9ead3');
    sheet.setFrozenRows(1);
  }
  return headers;
}

function headerMap(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    map[header] = index + 1;
  });
  return map;
}

function findSubmissionRow(sheet, headers, submissionId) {
  if (!submissionId) return 0;
  const map = headerMap(headers);
  const idColumn = map['Submission ID'];
  if (!idColumn || sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(submissionId).trim()) return i + 2;
  }
  return 0;
}

function writeRecordToRow(sheet, headers, rowNumber, record) {
  const current = rowNumber <= sheet.getLastRow()
    ? sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0]
    : new Array(headers.length).fill('');

  headers.forEach(function(header, i) {
    if (Object.prototype.hasOwnProperty.call(record, header)) {
      const value = record[header];
      current[i] = value == null ? '' : value;
    }
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([current]);
}

function getRowValue(sheet, rowNumber, map, header) {
  const col = map[header];
  if (!col) return '';
  return String(sheet.getRange(rowNumber, col).getDisplayValue() || '').trim();
}

function setRowValue(sheet, rowNumber, map, header, value) {
  const col = map[header];
  if (col) sheet.getRange(rowNumber, col).setValue(value == null ? '' : value);
}

function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.substring(1);
  if (digits.length === 10) digits = '91' + digits;
  return digits;
}

function whatsappConfig() {
  const props = PropertiesService.getScriptProperties();
  const enabled = String(props.getProperty('WHATSAPP_ENABLED') || 'true').toLowerCase() !== 'false';
  return {
    enabled: enabled,
    token: String(props.getProperty('ULTRAMSG_TOKEN') || '').trim(),
    instanceId: String(props.getProperty('ULTRAMSG_INSTANCE_ID') || '').trim(),
    host: String(props.getProperty('ULTRAMSG_HOST') || 'api.ultramsg.com').trim(),
  };
}

function buildWhatsappMessage(record) {
  const name = String(record['Contact Person'] || 'Customer').trim() || 'Customer';
  const company = String(record['Company Name'] || '').trim();
  const treatment = String(record['Treatment Required'] || '').trim();
  const requirementType = String(record['Requirement Type'] || '').trim();
  const location = String(record['Plant / Project Location'] || '').trim();

  const lines = [
    '✅ *Exhibition Enquiry Received*',
    '',
    'Dear ' + name + ',',
    '',
    'Thank you for visiting WTT International. We have recorded your water / wastewater treatment enquiry successfully.',
    '',
  ];
  if (company) lines.push('• Company: ' + company);
  if (treatment) lines.push('• Treatment: ' + treatment);
  if (requirementType) lines.push('• Requirement: ' + requirementType);
  if (location) lines.push('• Project Location: ' + location);
  lines.push('', 'Our team will review the requirement and contact you shortly.', '', '- WTT International');
  return lines.join('\n');
}

function sendWhatsApp(record) {
  const mobile = normalizePhone(record['Mobile No']);
  if (!mobile) {
    return {sent: false, status: 'Skipped - No Mobile', detail: 'Lead saved; customer mobile number was not provided.'};
  }

  const cfg = whatsappConfig();
  if (!cfg.enabled) {
    return {sent: false, status: 'Disabled', detail: 'WhatsApp automation is disabled in Script Properties.'};
  }
  if (!cfg.token || !cfg.instanceId) {
    return {sent: false, status: 'Not Configured', detail: 'Set ULTRAMSG_TOKEN and ULTRAMSG_INSTANCE_ID in Apps Script Properties.'};
  }

  const url = 'https://' + cfg.host + '/instance' + cfg.instanceId + '/messages/chat';
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      payload: {
        token: cfg.token,
        to: mobile,
        body: buildWhatsappMessage(record),
        priority: '10',
      },
      muteHttpExceptions: true,
    });
    const statusCode = response.getResponseCode();
    const text = response.getContentText();
    let body = {};
    try { body = JSON.parse(text || '{}'); } catch (ignore) {}
    const sent = body.sent === true || String(body.sent || '').toLowerCase() === 'true';
    if (statusCode === 200 && sent) {
      return {sent: true, status: 'Sent', detail: 'WhatsApp confirmation sent successfully.'};
    }
    return {
      sent: false,
      status: 'Failed',
      detail: 'UltraMsg HTTP ' + statusCode + ': ' + String(body.message || text || 'Message not confirmed').substring(0, 500),
    };
  } catch (error) {
    return {sent: false, status: 'Failed', detail: String(error && error.message ? error.message : error)};
  }
}

function submitLead(record) {
  if (!record || typeof record !== 'object') throw new Error('No lead data supplied.');
  const submissionId = String(record['Submission ID'] || '').trim();
  if (!submissionId) throw new Error('Submission ID is required.');

  const sheet = getSheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const headers = ensureHeaders(sheet, Object.keys(record));
    const map = headerMap(headers);
    let rowNumber = findSubmissionRow(sheet, headers, submissionId);
    const inserted = !rowNumber;
    if (!rowNumber) rowNumber = Math.max(sheet.getLastRow() + 1, 2);

    // Save the lead first. Existing Submission IDs are updated instead of
    // creating duplicate rows.
    writeRecordToRow(sheet, headers, rowNumber, record);

    let existingWhatsappStatus = getRowValue(sheet, rowNumber, map, WHATSAPP_STATUS_HEADER);
    let whatsapp = {
      sent: existingWhatsappStatus === 'Sent',
      status: existingWhatsappStatus || 'Pending',
      detail: getRowValue(sheet, rowNumber, map, WHATSAPP_DETAIL_HEADER),
    };

    // Never send a second message for a lead already marked Sent.
    if (existingWhatsappStatus !== 'Sent') {
      whatsapp = sendWhatsApp(record);
      setRowValue(sheet, rowNumber, map, WHATSAPP_STATUS_HEADER, whatsapp.status);
      setRowValue(sheet, rowNumber, map, WHATSAPP_DETAIL_HEADER, whatsapp.detail);
      if (whatsapp.sent) {
        setRowValue(sheet, rowNumber, map, WHATSAPP_SENT_AT_HEADER, new Date());
      }
    }

    SpreadsheetApp.flush();
    return {
      success: true,
      message: inserted ? 'Lead inserted' : 'Lead updated',
      inserted: inserted,
      updated: !inserted,
      row: rowNumber,
      whatsapp_sent: Boolean(whatsapp.sent),
      whatsapp_status: whatsapp.status,
      whatsapp_detail: whatsapp.detail,
      email_status: getRowValue(sheet, rowNumber, map, EMAIL_STATUS_HEADER),
      email_detail: getRowValue(sheet, rowNumber, map, EMAIL_DETAIL_HEADER),
      email_sent_at: getRowValue(sheet, rowNumber, map, EMAIL_SENT_AT_HEADER),
    };
  } finally {
    lock.releaseLock();
  }
}

function updateEmailStatus(payload) {
  const submissionId = String(payload.submission_id || '').trim();
  if (!submissionId) throw new Error('Submission ID is required.');

  const sheet = getSheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const headers = ensureHeaders(sheet, DEFAULT_HEADERS);
    const map = headerMap(headers);
    const rowNumber = findSubmissionRow(sheet, headers, submissionId);
    if (!rowNumber) throw new Error('Submission ID not found in Exhibition Leads sheet.');

    const status = String(payload.status || '').trim();
    const detail = String(payload.detail || '').trim();
    const sentAt = String(payload.sent_at || '').trim();

    setRowValue(sheet, rowNumber, map, EMAIL_STATUS_HEADER, status);
    setRowValue(sheet, rowNumber, map, EMAIL_DETAIL_HEADER, detail);
    if (sentAt) {
      setRowValue(sheet, rowNumber, map, EMAIL_SENT_AT_HEADER, sentAt);
    } else if (status === 'Sent') {
      setRowValue(sheet, rowNumber, map, EMAIL_SENT_AT_HEADER, new Date());
    }

    SpreadsheetApp.flush();
    return {
      success: true,
      message: 'Email status updated',
      row: rowNumber,
      email_status: status,
      email_detail: detail,
    };
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateChildFolder(parent, name) {
  const iterator = parent.getFoldersByName(name);
  return iterator.hasNext() ? iterator.next() : parent.createFolder(name);
}

function getRootUploadFolder() {
  const iterator = DriveApp.getFoldersByName(ROOT_UPLOAD_FOLDER_NAME);
  return iterator.hasNext() ? iterator.next() : DriveApp.createFolder(ROOT_UPLOAD_FOLDER_NAME);
}

function safeCategory(value) {
  const category = String(value || '').trim();
  if (category === 'Visiting Cards') return 'Visiting Cards';
  if (category === 'Lab Reports') return 'Lab Reports';
  return 'Other Attachments';
}

function safeFilename(value) {
  const name = String(value || 'attachment').replace(/[\\/:*?"<>|]/g, '_').trim();
  return name || 'attachment';
}

function uploadFile(payload) {
  if (!payload || !payload.base64) throw new Error('No file content supplied.');
  const category = safeCategory(payload.category);
  const bytes = Utilities.base64Decode(payload.base64);
  const root = getRootUploadFolder();
  const folder = getOrCreateChildFolder(root, category);
  const submissionId = String(payload.submission_id || '').trim();
  const originalName = safeFilename(payload.filename);
  const filename = submissionId ? submissionId + ' - ' + originalName : originalName;
  const blob = Utilities.newBlob(bytes, payload.mime_type || 'application/octet-stream', filename);
  const file = folder.createFile(blob);
  return {
    success: true,
    id: file.getId(),
    url: file.getUrl(),
    name: file.getName(),
    category: category,
  };
}

function rowToRecord(sheet, headers, rowNumber) {
  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getDisplayValues()[0];
  const record = {};
  headers.forEach(function(header, index) { record[header] = values[index]; });
  return record;
}

function retryPendingWhatsApp() {
  const sheet = getSheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const headers = ensureHeaders(sheet, DEFAULT_HEADERS);
    const map = headerMap(headers);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return 0;
    let retried = 0;
    for (let row = 2; row <= lastRow && retried < 25; row++) {
      const status = getRowValue(sheet, row, map, WHATSAPP_STATUS_HEADER);
      if (status === 'Sent' || status === 'Skipped - No Mobile') continue;
      const record = rowToRecord(sheet, headers, row);
      if (!String(record['Submission ID'] || '').trim()) continue;
      const result = sendWhatsApp(record);
      setRowValue(sheet, row, map, WHATSAPP_STATUS_HEADER, result.status);
      setRowValue(sheet, row, map, WHATSAPP_DETAIL_HEADER, result.detail);
      if (result.sent) setRowValue(sheet, row, map, WHATSAPP_SENT_AT_HEADER, new Date());
      retried++;
    }
    SpreadsheetApp.flush();
    return retried;
  } finally {
    lock.releaseLock();
  }
}

function installWhatsAppRetryTrigger() {
  const handler = 'retryPendingWhatsApp';
  const exists = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === handler;
  });
  if (!exists) {
    ScriptApp.newTrigger(handler).timeBased().everyMinutes(10).create();
  }
}

function setupExhibitionSheet() {
  const sheet = getSheet();
  ensureHeaders(sheet, DEFAULT_HEADERS);
  sheet.autoResizeColumns(1, DEFAULT_HEADERS.length);
  installWhatsAppRetryTrigger();
  return 'Exhibition Leads sheet is ready and WhatsApp retry trigger is installed.';
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');

    if (payload.action === 'submit_lead') {
      return jsonResponse(submitLead(payload.data || {}));
    }

    // Compatibility with earlier Flask build.
    if (payload.action === 'append') {
      const records = Array.isArray(payload.data) ? payload.data : [];
      if (!records.length) throw new Error('No lead data supplied.');
      const results = records.map(function(record) { return submitLead(record); });
      return jsonResponse({success: true, appended: results.length, results: results});
    }

    if (payload.action === 'update_email_status') {
      return jsonResponse(updateEmailStatus(payload));
    }

    if (payload.action === 'upload_file') {
      return jsonResponse(uploadFile(payload));
    }

    // Compatibility with earlier Lab Report endpoint.
    if (payload.action === 'upload_lab_report') {
      payload.category = 'Lab Reports';
      return jsonResponse(uploadFile(payload));
    }

    return jsonResponse({success: false, error: 'Unsupported action'});
  } catch (error) {
    return jsonResponse({success: false, error: String(error && error.message ? error.message : error)});
  }
}

function doGet() {
  let configured = true;
  try { assertConfigured(); } catch (error) { configured = false; }
  const cfg = whatsappConfig();
  return jsonResponse({
    success: true,
    app: 'WTT Exhibition Lead Tracker',
    sheet: SHEET_NAME,
    spreadsheet_configured: configured,
    whatsapp_configured: Boolean(cfg.enabled && cfg.token && cfg.instanceId),
  });
}
