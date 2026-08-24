# WTT Exhibition Lead Tracker - Microsoft 365 SMTP Email

## Flow

1. Lead is first saved/upserted in Google Sheets.
2. Apps Script sends WhatsApp (when Mobile No is available).
3. Flask sends the customer acknowledgement email through Microsoft 365 SMTP (when Email is available).
4. Flask writes `Email Status`, `Email Detail`, and `Email Sent At` back to the same Google Sheet row.
5. An SMTP failure does not lose or reject an already-saved exhibition lead.

## Local `.env`

Add these values to your existing `.env` (do not commit `.env` to GitHub):

```env
SMTP_ENABLED=1
SMTP_SERVER=smtp.office365.com
SMTP_PORT=587
SMTP_USER=noreply@wttint.com
SMTP_PASSWORD=YOUR_REAL_MAILBOX_PASSWORD
SMTP_USE_TLS=1
SMTP_FROM_EMAIL=noreply@wttint.com
SMTP_FROM_NAME=WTT INTERNATIONAL
SMTP_TIMEOUT=30
```

Keep your existing working `EXHIBITION_GOOGLE_SCRIPT_URL` and OpenAI settings unchanged.

## Google Apps Script update

Replace the Apps Script `Code.gs` with the supplied `google_apps_script/Code.gs`.

Then:

1. Save the script.
2. Run `setupExhibitionSheet()` once. It will add `Email Status`, `Email Detail`, and `Email Sent At` headers if they do not already exist.
3. Deploy the Apps Script again as a new version of the web app.
4. If you edit the existing deployment and create a new version, the `/exec` URL normally remains the same. If you create a completely new deployment, update `EXHIBITION_GOOGLE_SCRIPT_URL` in local `.env` and Vercel.

## Vercel environment variables

Add the SMTP values under Vercel -> Project -> Settings -> Environment Variables:

- `SMTP_ENABLED` = `1`
- `SMTP_SERVER` = `smtp.office365.com`
- `SMTP_PORT` = `587`
- `SMTP_USER` = `noreply@wttint.com`
- `SMTP_PASSWORD` = your real mailbox password
- `SMTP_USE_TLS` = `1`
- `SMTP_FROM_EMAIL` = `noreply@wttint.com`
- `SMTP_FROM_NAME` = `WTT INTERNATIONAL`
- `SMTP_TIMEOUT` = `30`

Redeploy Vercel after changing environment variables.

## Expected spreadsheet status

For a lead with email:

- `Email Status` = `Sent`
- `Email Detail` = `Email confirmation sent to customer@example.com.`
- `Email Sent At` = timestamp

For a lead with only mobile and no email:

- `Email Status` = `Skipped - No Email`

## Microsoft 365 note

The mailbox must allow Authenticated SMTP. If Microsoft 365 returns an SMTP authentication error, verify that Authenticated SMTP is enabled for `noreply@wttint.com` and that the account/password are valid.
