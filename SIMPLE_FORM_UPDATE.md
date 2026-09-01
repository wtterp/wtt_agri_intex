# Current Exhibition Enquiry Form

The current main form is intentionally **one section only**: `1 - Customer Details`.

Fields:
- Company Name *
- Contact Person *
- Designation
- Mobile No.
- Email
- Contact note: Mobile No. or Email is required
- Plant / Project Location
- Requirement Type *
- Product List (placeholder: e.g. RO 90)
- Remarks

## Scanning
- Take Photo / Attach Visiting Card uses OpenAI Vision to extract company, person, designation, mobile, email and address.
- Scan QR Code accepts a camera/image capture. The browser attempts to decode the QR and passes the decoded payload plus the image to OpenAI Vision. This supports vCard, MECARD, mailto, tel, URL and contact-style QR data.
- The scanned image is stored in Google Drive on submission; the spreadsheet stores its Drive URL.

## Language
English/Spanish UI remains available. The `Requirement Type` option values sent to Google Sheets stay in English canonical form; translated labels are display-only.

## Spreadsheet
The Apps Script stores only the fields used by the current form, plus WhatsApp and email delivery status columns. Existing old columns are not deleted automatically.


## Current compact form update

The single Customer Details section now includes `Plant Capacity` directly below `Plant / Project Location`. The current Apps Script uses an exact compact header schema and `setupExhibitionSheet()` backs up an older wide `Exhibition Leads` sheet before migrating matching data into the new columns.
