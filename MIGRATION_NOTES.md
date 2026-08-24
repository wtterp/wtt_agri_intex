# Final Storage Decision

The project now uses a spreadsheet-only business-data architecture.

Removed from the required workflow:
- ERPNext
- `Exhibition Enquiry` DocType
- Frappe API submission
- ERPNext custom-field import

Permanent destinations:
- Lead data -> Google Sheets
- Uploaded visiting cards/reports -> Google Drive
- WhatsApp automation -> UltraMsg called by Google Apps Script

The local/Vercel SQLite file is only a secondary transient retry queue. The browser offline queue keeps unsynced lead JSON until Google Sheets confirms success.

## Microsoft 365 SMTP email confirmation

This build adds automatic customer email after Google Sheets accepts the lead. SMTP runs in Flask/Vercel using `smtp.office365.com:587` with STARTTLS. Google Apps Script now stores `Email Status`, `Email Detail`, and `Email Sent At` in the same lead row. The production PWA cache was bumped so the new frontend delivery message is picked up after deployment.
