# WTT Exhibition Lead Tracker - Spreadsheet-Only Edition

This Flask/PWA project stores exhibition enquiries without ERPNext.

## Final architecture

```text
Mobile / Browser
      |
      v
Flask Web Application (Vercel or local PC)
      |
      +--> OpenAI -> Visiting-card field extraction
      |
      +--> Google Apps Script
              |
              +--> Google Sheets -> all enquiry data
              +--> Google Drive  -> visiting cards / reports / attachments
              +--> UltraMsg      -> automatic customer WhatsApp
```

ERPNext / `Exhibition Enquiry` DocType is **not required** in this edition.

## Important file-storage rule

Google Sheets is a table, not a binary file store. JPG, PNG, PDF, DOCX, XLSX, etc. should not be placed directly inside a cell.

This project uploads selected files to Google Drive and writes the Drive URL into the spreadsheet:

- `Visiting Card Drive URL`
- `Lab Report Drive URL`

The default web upload limit is 4 MB per file to stay compatible with common serverless request limits. Change `EXHIBITION_MAX_FILE_MB` only if your hosting path supports larger requests.

## Form rules implemented

- Customer Details is Section 1.
- Treatment Requirement is Section 2.
- Industry / Application is Section 3.
- Customer Requirement appears immediately after Section 3.
- Visible sections are renumbered continuously as 1, 2, 3, 4... when conditional sections hide/show.
- From Customer Requirement onward, fields are optional.
- Mobile No **or** Email: at least one is required.
- Existing Plant has no separate Yes/No question.
- Requirement Type = `New Plant` -> Existing Plant section hidden.
- Other Requirement Types -> Existing Plant section opens automatically.
- ETP/STP/WTP and industry-specific fields remain dynamic.

## Spreadsheet + WhatsApp behavior

When a lead is submitted online:

1. Visiting card/report files are uploaded to Google Drive, if selected.
2. Lead data is inserted/upserted into `Exhibition Leads` Google Sheet.
3. `Submission ID` prevents duplicate spreadsheet rows during retries.
4. If Mobile No exists, Google Apps Script sends the customer WhatsApp using UltraMsg.
5. The same row gets:
   - `WhatsApp Status`
   - `WhatsApp Detail`
   - `WhatsApp Sent At`
6. If only Email was entered, the lead is saved and WhatsApp is marked `Skipped - No Mobile`.
7. `setupExhibitionSheet()` installs a 10-minute Apps Script retry trigger for WhatsApp rows that were not successfully sent.

If Google Sheets is temporarily unavailable, the browser keeps the lead in its local retry queue. The Flask SQLite database is only a secondary retry queue; it is not the permanent business database.

## 1. Create the Google Spreadsheet

Create a new spreadsheet, for example:

`WTT - EXHIBITION - LEAD TRACKER`

The URL looks like:

```text
https://docs.google.com/spreadsheets/d/1AbCdEf...XYZ/edit
```

Copy only the text between `/d/` and `/edit`. That is the Spreadsheet ID.

## 2. Configure Google Apps Script

Open the spreadsheet -> **Extensions -> Apps Script**.

Replace the default code with:

`google_apps_script/Code.gs`

At the top change:

```javascript
const SPREADSHEET_ID = 'PASTE_NEW_EXHIBITION_SPREADSHEET_ID_HERE';
```

to your real spreadsheet ID.

Example:

```javascript
const SPREADSHEET_ID = '1AbCdEf123456789XYZ';
```

Then run this function once from the Apps Script editor:

```text
setupExhibitionSheet
```

Approve Google Sheets, Google Drive, external-request and trigger permissions. This creates/normalizes the `Exhibition Leads` headers and installs the WhatsApp retry trigger.

## 3. Configure WhatsApp in Apps Script

Go to:

**Apps Script -> Project Settings -> Script Properties**

Add:

```text
ULTRAMSG_TOKEN        your-ultramsg-token
ULTRAMSG_INSTANCE_ID  your-instance-id
ULTRAMSG_HOST         api.ultramsg.com
WHATSAPP_ENABLED      true
```

`ULTRAMSG_HOST` and `WHATSAPP_ENABLED` are optional; the shown values are the defaults.

Do not put UltraMsg secrets in browser JavaScript.

## 4. Deploy Apps Script

Use:

```text
Deploy -> New deployment -> Web app
Execute as: Me
Who has access: Anyone
```

Copy the **full Web App URL**, for example:

```text
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec
```

## 5. Local Flask configuration

Create `.env` from `.env.example` and set:

```env
FLASK_SECRET_KEY=your-random-secret
OPENAI_API_KEY=your-openai-key
EXHIBITION_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec
```

Then:

```bash
pip install -r requirements.txt
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

## 6. Vercel environment variables

Add under **Vercel -> Project -> Settings -> Environment Variables**:

```text
FLASK_SECRET_KEY
OPENAI_API_KEY
EXHIBITION_GOOGLE_SCRIPT_URL
```

Optional:

```text
OPENAI_VISION_MODEL
REQUEST_TIMEOUT
EXHIBITION_MAX_FILE_MB
```

Do not manually create blank numeric variables. Do not manually add `VERCEL`.

After environment-variable changes, redeploy.

## 7. Health test

Open:

```text
https://YOUR-VERCEL-DOMAIN/api/health
```

Expected structure:

```json
{
  "success": true,
  "status": "online",
  "storage": "Google Sheets + Google Drive",
  "erpnext_required": false,
  "sheet_configured": true
}
```

## Attachment notes

- Visiting card scanner accepts image files because OpenAI vision reads the image.
- Lab Report / Attachment accepts image, PDF and common office/text formats.
- Files are uploaded only when internet is available.
- If a file is selected while offline, the form asks the user to connect before submitting, preventing silent attachment loss.

## WhatsApp notes

Automatic WhatsApp is sent only when a Mobile No is present. Because the form allows **Phone OR Email**, an email-only lead is valid but cannot receive a WhatsApp message.

The default message can be edited in `buildWhatsappMessage()` inside `google_apps_script/Code.gs`.

## Microsoft 365 automatic email confirmation

This build sends a customer acknowledgement email after the lead has been safely saved to Google Sheets. Configure the Office 365 SMTP settings in `.env` / Vercel Environment Variables. See `EMAIL_SMTP_SETUP.md` for the exact values and Apps Script redeployment steps.

The Google Sheet now tracks `Email Status`, `Email Detail`, and `Email Sent At` for each Submission ID. Email delivery is best-effort: an SMTP failure never deletes or rejects a lead already stored in Google Sheets.


## Current compact form update

The single Customer Details section now includes `Plant Capacity` directly below `Plant / Project Location`. The current Apps Script uses an exact compact header schema and `setupExhibitionSheet()` backs up an older wide `Exhibition Leads` sheet before migrating matching data into the new columns.
