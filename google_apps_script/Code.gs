/*
WTT EXHIBITION ENQUIRY - GOOGLE SHEETS / DRIVE / WHATSAPP

Single-section form:
1. Customer Details + visiting card/QR scanner
   Company Name, Contact Person, Designation, Mobile, Email,
   Plant / Project Location, Plant Capacity, Requirement Type, Product List, Remarks.

The web app sends canonical English values to this script regardless of the
UI language selected in the browser. User-entered free text is preserved as typed.
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
  'Submission ID', 'Created At', 'Company Name', 'Contact Person', 'Designation',
  'Mobile No', 'Email', 'Plant / Project Location', 'Plant Capacity', 'Visiting Card Address',
  'Visiting Card File Name', 'Visiting Card Drive URL', 'Requirement Type',
  'Product List', 'Remarks', WHATSAPP_STATUS_HEADER, WHATSAPP_DETAIL_HEADER,
  WHATSAPP_SENT_AT_HEADER, EMAIL_STATUS_HEADER, EMAIL_DETAIL_HEADER, EMAIL_SENT_AT_HEADER
];

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function assertConfigured() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('PASTE_') === 0) throw new Error('Set SPREADSHEET_ID in Code.gs first.');
}

function getSheet() {
  assertConfigured();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function sameHeaders(left, right) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (String(left[i] || '').trim() !== String(right[i] || '').trim()) return false;
  }
  return true;
}

function uniqueBackupName(ss) {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyyMMdd-HHmmss');
  let name = SHEET_NAME + ' Backup ' + stamp;
  let suffix = 2;
  while (ss.getSheetByName(name)) name = SHEET_NAME + ' Backup ' + stamp + ' (' + (suffix++) + ')';
  return name;
}

function migrateToCurrentHeaders(sheet) {
  const ss = sheet.getParent();
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const oldHeaders = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(value) { return String(value || '').trim(); })
    : [];

  if (sameHeaders(oldHeaders, DEFAULT_HEADERS)) {
    sheet.getRange(1, 1, 1, DEFAULT_HEADERS.length).setFontWeight('bold').setBackground('#d9ead3');
    sheet.setFrozenRows(1);
    return DEFAULT_HEADERS.slice();
  }

  // Keep a complete backup before removing old/unused columns.
  if (lastColumn > 0 && oldHeaders.some(function(header) { return header; })) {
    const backup = sheet.copyTo(ss);
    backup.setName(uniqueBackupName(ss));
  }

  const oldMap = {};
  oldHeaders.forEach(function(header, index) {
    if (header && !Object.prototype.hasOwnProperty.call(oldMap, header)) oldMap[header] = index;
  });

  const oldRows = lastRow > 1 && lastColumn > 0
    ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
    : [];
  const migratedRows = oldRows.map(function(row) {
    return DEFAULT_HEADERS.map(function(header) {
      const index = oldMap[header];
      return index === undefined ? '' : row[index];
    });
  });

  sheet.clearContents();
  if (sheet.getMaxColumns() < DEFAULT_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), DEFAULT_HEADERS.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, DEFAULT_HEADERS.length).setValues([DEFAULT_HEADERS]);
  if (migratedRows.length) {
    sheet.getRange(2, 1, migratedRows.length, DEFAULT_HEADERS.length).setValues(migratedRows);
  }
  if (sheet.getMaxColumns() > DEFAULT_HEADERS.length) {
    sheet.deleteColumns(DEFAULT_HEADERS.length + 1, sheet.getMaxColumns() - DEFAULT_HEADERS.length);
  }
  sheet.getRange(1, 1, 1, DEFAULT_HEADERS.length).setFontWeight('bold').setBackground('#d9ead3');
  sheet.setFrozenRows(1);
  return DEFAULT_HEADERS.slice();
}

function ensureHeaders(sheet) {
  return migrateToCurrentHeaders(sheet);
}

function headerMap(headers) {
  const map = {};
  headers.forEach(function(header, index) { map[header] = index + 1; });
  return map;
}

function findSubmissionRow(sheet, headers, submissionId) {
  if (!submissionId || sheet.getLastRow() < 2) return 0;
  const col = headerMap(headers)['Submission ID'];
  if (!col) return 0;
  const values = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) if (String(values[i][0]).trim() === String(submissionId).trim()) return i + 2;
  return 0;
}

function writeRecordToRow(sheet, headers, rowNumber, record) {
  const current = rowNumber <= sheet.getLastRow() ? sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0] : new Array(headers.length).fill('');
  headers.forEach(function(header, i) {
    if (Object.prototype.hasOwnProperty.call(record, header)) current[i] = record[header] == null ? '' : record[header];
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([current]);
}

function getRowValue(sheet, rowNumber, map, header) {
  const col = map[header];
  return col ? String(sheet.getRange(rowNumber, col).getDisplayValue() || '').trim() : '';
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
  return {
    enabled: String(props.getProperty('WHATSAPP_ENABLED') || 'true').toLowerCase() !== 'false',
    token: String(props.getProperty('ULTRAMSG_TOKEN') || '').trim(),
    instanceId: String(props.getProperty('ULTRAMSG_INSTANCE_ID') || '').trim(),
    host: String(props.getProperty('ULTRAMSG_HOST') || 'api.ultramsg.com').trim()
  };
}

function buildWhatsappMessage(record) {
  const name = String(record['Contact Person'] || 'Customer').trim() || 'Customer';
  const company = String(record['Company Name'] || '').trim();
  const requirement = String(record['Requirement Type'] || '').trim();
  const products = String(record['Product List'] || '').trim();
  const location = String(record['Plant / Project Location'] || '').trim();
  const capacity = String(record['Plant Capacity'] || '').trim();
  const lines = ['✅ *Exhibition Enquiry Received*', '', 'Dear ' + name + ',', '', 'Thank you for visiting WTT International. We have recorded your enquiry successfully.', ''];
  if (company) lines.push('• Company: ' + company);
  if (requirement) lines.push('• Requirement: ' + requirement);
  if (products) lines.push('• Product List: ' + products);
  if (location) lines.push('• Project Location: ' + location);
  if (capacity) lines.push('• Plant Capacity: ' + capacity);
  lines.push('', 'Our team will review the requirement and contact you shortly.', '', '- WTT International');
  return lines.join('\n');
}

function sendWhatsApp(record) {
  const mobile = normalizePhone(record['Mobile No']);
  if (!mobile) return {sent:false, status:'Skipped - No Mobile', detail:'Lead saved; customer mobile number was not provided.'};
  const cfg = whatsappConfig();
  if (!cfg.enabled) return {sent:false, status:'Disabled', detail:'WhatsApp automation is disabled in Script Properties.'};
  if (!cfg.token || !cfg.instanceId) return {sent:false, status:'Not Configured', detail:'Set ULTRAMSG_TOKEN and ULTRAMSG_INSTANCE_ID in Apps Script Properties.'};
  const url = 'https://' + cfg.host + '/instance' + cfg.instanceId + '/messages/chat';
  try {
    const response = UrlFetchApp.fetch(url, {method:'post', payload:{token:cfg.token, to:mobile, body:buildWhatsappMessage(record), priority:'10'}, muteHttpExceptions:true});
    const statusCode = response.getResponseCode();
    const text = response.getContentText();
    let body = {}; try { body = JSON.parse(text || '{}'); } catch (_) {}
    const sent = body.sent === true || String(body.sent || '').toLowerCase() === 'true';
    if (statusCode === 200 && sent) return {sent:true, status:'Sent', detail:'WhatsApp confirmation sent successfully.'};
    return {sent:false, status:'Failed', detail:'UltraMsg HTTP ' + statusCode + ': ' + String(body.message || text || 'Message not confirmed').substring(0,500)};
  } catch (error) {
    return {sent:false, status:'Failed', detail:String(error && error.message ? error.message : error)};
  }
}

function submitLead(record) {
  if (!record || typeof record !== 'object') throw new Error('No enquiry data supplied.');
  const submissionId = String(record['Submission ID'] || '').trim();
  if (!submissionId) throw new Error('Submission ID is required.');
  const sheet = getSheet();
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const headers = ensureHeaders(sheet);
    const map = headerMap(headers);
    let rowNumber = findSubmissionRow(sheet, headers, submissionId);
    const inserted = !rowNumber;
    if (!rowNumber) rowNumber = Math.max(sheet.getLastRow() + 1, 2);
    writeRecordToRow(sheet, headers, rowNumber, record);
    let existingWhatsappStatus = getRowValue(sheet, rowNumber, map, WHATSAPP_STATUS_HEADER);
    let whatsapp = {sent: existingWhatsappStatus === 'Sent', status: existingWhatsappStatus || 'Pending', detail: getRowValue(sheet, rowNumber, map, WHATSAPP_DETAIL_HEADER)};
    if (existingWhatsappStatus !== 'Sent') {
      whatsapp = sendWhatsApp(record);
      setRowValue(sheet, rowNumber, map, WHATSAPP_STATUS_HEADER, whatsapp.status);
      setRowValue(sheet, rowNumber, map, WHATSAPP_DETAIL_HEADER, whatsapp.detail);
      if (whatsapp.sent) setRowValue(sheet, rowNumber, map, WHATSAPP_SENT_AT_HEADER, new Date());
    }
    SpreadsheetApp.flush();
    return {success:true, message:inserted ? 'Lead inserted' : 'Lead updated', inserted:inserted, updated:!inserted, row:rowNumber, whatsapp_sent:Boolean(whatsapp.sent), whatsapp_status:whatsapp.status, whatsapp_detail:whatsapp.detail};
  } finally { lock.releaseLock(); }
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
  return category === 'Visiting Cards' ? 'Visiting Cards' : 'Other Attachments';
}

function safeFilename(value) {
  const name = String(value || 'attachment').replace(/[\\/:*?"<>|]/g, '_').trim();
  return name || 'attachment';
}

function uploadFile(payload) {
  if (!payload || !payload.base64) throw new Error('No file content supplied.');
  const category = safeCategory(payload.category);
  const bytes = Utilities.base64Decode(payload.base64);
  const folder = getOrCreateChildFolder(getRootUploadFolder(), category);
  const submissionId = String(payload.submission_id || '').trim();
  const originalName = safeFilename(payload.filename);
  const filename = submissionId ? submissionId + ' - ' + originalName : originalName;
  const blob = Utilities.newBlob(bytes, payload.mime_type || 'application/octet-stream', filename);
  const file = folder.createFile(blob);
  return {success:true, id:file.getId(), url:file.getUrl(), name:file.getName(), category:category};
}

function updateEmailStatus(submissionId, status, detail, sentAt) {
  const sheet = getSheet();
  const headers = ensureHeaders(sheet);
  const row = findSubmissionRow(sheet, headers, submissionId);
  if (!row) throw new Error('Submission ID not found: ' + submissionId);
  const map = headerMap(headers);
  setRowValue(sheet, row, map, EMAIL_STATUS_HEADER, status);
  setRowValue(sheet, row, map, EMAIL_DETAIL_HEADER, detail || '');
  if (sentAt) setRowValue(sheet, row, map, EMAIL_SENT_AT_HEADER, sentAt);
  SpreadsheetApp.flush();
  return {success:true, row:row};
}

function retryPendingWhatsApp() {
  const sheet = getSheet(); const headers = ensureHeaders(sheet); const map = headerMap(headers);
  const lastRow = sheet.getLastRow(); if (lastRow < 2) return 0;
  let retried = 0;
  for (let row = 2; row <= lastRow && retried < 25; row++) {
    const status = getRowValue(sheet, row, map, WHATSAPP_STATUS_HEADER);
    if (status === 'Sent' || status === 'Skipped - No Mobile') continue;
    const values = sheet.getRange(row, 1, 1, headers.length).getDisplayValues()[0];
    const record = {}; headers.forEach((h,i) => record[h] = values[i]);
    if (!String(record['Submission ID'] || '').trim()) continue;
    const result = sendWhatsApp(record);
    setRowValue(sheet, row, map, WHATSAPP_STATUS_HEADER, result.status);
    setRowValue(sheet, row, map, WHATSAPP_DETAIL_HEADER, result.detail);
    if (result.sent) setRowValue(sheet, row, map, WHATSAPP_SENT_AT_HEADER, new Date());
    retried++;
  }
  SpreadsheetApp.flush(); return retried;
}

function installWhatsAppRetryTrigger() {
  const handler = 'retryPendingWhatsApp';
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === handler);
  if (!exists) ScriptApp.newTrigger(handler).timeBased().everyMinutes(10).create();
}

function setupExhibitionSheet() {
  const sheet = getSheet(); ensureHeaders(sheet); sheet.autoResizeColumns(1, DEFAULT_HEADERS.length); installWhatsAppRetryTrigger();
  return 'Exhibition Leads sheet is ready with the current compact headers. Any previous wide layout was backed up before migration.';
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (payload.action === 'submit_lead') return jsonResponse(submitLead(payload.data || {}));
    if (payload.action === 'upload_file') return jsonResponse(uploadFile(payload));
    if (payload.action === 'update_email_status') return jsonResponse(updateEmailStatus(payload.submission_id, payload.status, payload.detail, payload.sent_at));
    return jsonResponse({success:false, error:'Unsupported action'});
  } catch (error) { return jsonResponse({success:false, error:String(error && error.message ? error.message : error)}); }
}

function doGet() {
  const cfg = whatsappConfig();
  let configured = true; try { assertConfigured(); } catch (_) { configured = false; }
  return jsonResponse({success:true, app:'WTT Exhibition Lead Tracker', sheet:SHEET_NAME, spreadsheet_configured:configured, whatsapp_configured:Boolean(cfg.enabled && cfg.token && cfg.instanceId)});
}
