# Current Exhibition Form and Google Sheet

## Section 1 - Customer Details

- Visiting Card / QR scan with AI contact extraction
- Company Name *
- Contact Person *
- Designation
- Mobile No.
- Email
- At least one contact method: Mobile No. or Email
- Plant / Project Location
- Plant Capacity
- Requirement Type *
- Product List (placeholder: `e.g. RO 90`)
- Remarks

## Exact Google Sheet headers

1. Submission ID
2. Created At
3. Company Name
4. Contact Person
5. Designation
6. Mobile No
7. Email
8. Plant / Project Location
9. Plant Capacity
10. Visiting Card Address
11. Visiting Card File Name
12. Visiting Card Drive URL
13. Requirement Type
14. Product List
15. Remarks
16. WhatsApp Status
17. WhatsApp Detail
18. WhatsApp Sent At
19. Email Status
20. Email Detail
21. Email Sent At

Run `setupExhibitionSheet()` once after replacing `Code.gs`. If the existing `Exhibition Leads` sheet still has the old wide headers, the script first creates a backup sheet and then migrates matching data into this exact 21-column layout.
