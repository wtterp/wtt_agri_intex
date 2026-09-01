# Spreadsheet-Only Setup Checklist

1. Create a new Google Spreadsheet.
2. Open Extensions -> Apps Script.
3. Paste `google_apps_script/Code.gs`.
4. Put the spreadsheet ID into `SPREADSHEET_ID`.
5. Apps Script Project Settings -> Script Properties:
   - `ULTRAMSG_TOKEN`
   - `ULTRAMSG_INSTANCE_ID`
   - optional `ULTRAMSG_HOST=api.ultramsg.com`
   - optional `WHATSAPP_ENABLED=true`
6. Run `setupExhibitionSheet()` once and approve permissions.
7. Deploy Apps Script as Web App: Execute as Me, access Anyone.
8. Copy the full `/exec` URL.
9. Local `.env` / Vercel:
   - `FLASK_SECRET_KEY`
   - `OPENAI_API_KEY`
   - `EXHIBITION_GOOGLE_SCRIPT_URL=<full /exec URL>`
10. Redeploy Vercel.
11. Test `/api/health`.
12. Submit one test customer with a mobile number.
13. Confirm:
   - one row in `Exhibition Leads`
   - Drive URLs present when files were attached
   - WhatsApp Status = `Sent`

No ERPNext DocType is required.


## Current compact form update

The single Customer Details section now includes `Plant Capacity` directly below `Plant / Project Location`. The current Apps Script uses an exact compact header schema and `setupExhibitionSheet()` backs up an older wide `Exhibition Leads` sheet before migrating matching data into the new columns.
