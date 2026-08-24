WTT EXHIBITION LEAD TRACKER - SPREADSHEET ONLY

NO ERPNEXT DOCTYPE IS REQUIRED.

1. Create a NEW Google Spreadsheet.
2. Open Extensions > Apps Script.
3. Paste google_apps_script/Code.gs.
4. In Code.gs paste your Spreadsheet ID into SPREADSHEET_ID.
5. Apps Script > Project Settings > Script Properties:
   ULTRAMSG_TOKEN = your token
   ULTRAMSG_INSTANCE_ID = your instance id
6. Run setupExhibitionSheet() once and approve permissions.
7. Deploy Apps Script as Web App: Execute as Me, access Anyone.
8. Copy the FULL deployment /exec URL.
9. Local .env / Vercel Environment Variables:
   FLASK_SECRET_KEY
   OPENAI_API_KEY
   EXHIBITION_GOOGLE_SCRIPT_URL = full /exec URL
10. Redeploy Vercel.

Files:
- Lead data -> Google Sheet
- Visiting cards / reports -> Google Drive
- File URLs -> Google Sheet
- Customer WhatsApp -> UltraMsg from Google Apps Script

Phone OR Email is required. WhatsApp is sent only when Mobile No exists.
