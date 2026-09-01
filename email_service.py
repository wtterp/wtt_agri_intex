from __future__ import annotations

import html
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from config import Config
from models import ExhibitionLead
from services import ServiceResult


def _display(value: object) -> str:
    if isinstance(value, list):
        return "; ".join(str(item) for item in value if str(item).strip())
    return str(value or "").strip()


def _email_body_html(data: ExhibitionLead) -> str:
    p = data.payload
    name = html.escape(_display(p.get("contact_person")) or "Customer")
    submission_id = html.escape(data.client_submission_id)

    rows: list[str] = []
    for label, key in (
        ("Company", "company_name"),
        ("Contact Person", "contact_person"),
        ("Designation", "designation"),
        ("Mobile No", "mobile_number"),
        ("Requirement", "requirement_type"),
        ("Product List", "product_list"),
        ("Project Location", "plant_project_location"),
        ("Plant Capacity", "plant_capacity"),
        ("Remarks", "remarks"),
    ):
        value = _display(p.get(key))
        if value:
            rows.append(
                '<tr>'
                f'<td style="padding:6px 16px 6px 0;color:#5b6570;vertical-align:top;">{html.escape(label)}</td>'
                f'<td style="padding:6px 0;font-weight:600;vertical-align:top;">{html.escape(value)}</td>'
                '</tr>'
            )

    return f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f7f7;font-family:Arial,Helvetica,sans-serif;color:#17212b;line-height:1.55;">
    <div style="max-width:680px;margin:24px auto;background:#ffffff;border:1px solid #e3e8e8;border-radius:12px;overflow:hidden;">
      <div style="background:#087657;color:#ffffff;padding:20px 28px;">
        <div style="font-size:20px;font-weight:700;">WTT INTERNATIONAL</div>
        <div style="font-size:14px;margin-top:3px;">Exhibition Enquiry Confirmation</div>
      </div>
      <div style="padding:28px;">
        <p>Dear {name},</p>
        <p>Thank you for visiting <strong>WTT INTERNATIONAL</strong>.</p>
        <p>Your water / wastewater treatment enquiry has been recorded successfully. Our team will review the requirement and contact you shortly.</p>
        <table style="border-collapse:collapse;margin:18px 0 22px 0;">{''.join(rows)}</table>
        <p style="font-size:12px;color:#68737d;">Reference: {submission_id}</p>
        <p style="margin-top:24px;">Regards,<br><strong>WTT INTERNATIONAL</strong></p>
      </div>
    </div>
  </body>
</html>"""


def _email_body_text(data: ExhibitionLead) -> str:
    p = data.payload
    name = _display(p.get("contact_person")) or "Customer"
    lines = [
        f"Dear {name},",
        "",
        "Thank you for visiting WTT INTERNATIONAL.",
        "Your water / wastewater treatment enquiry has been recorded successfully.",
        "Our team will review the requirement and contact you shortly.",
        "",
    ]
    for label, key in (
        ("Company", "company_name"),
        ("Contact Person", "contact_person"),
        ("Designation", "designation"),
        ("Mobile No", "mobile_number"),
        ("Requirement", "requirement_type"),
        ("Product List", "product_list"),
        ("Project Location", "plant_project_location"),
        ("Plant Capacity", "plant_capacity"),
        ("Remarks", "remarks"),
    ):
        value = _display(p.get(key))
        if value:
            lines.append(f"{label}: {value}")
    lines.extend(["", f"Reference: {data.client_submission_id}", "", "Regards,", "WTT INTERNATIONAL"])
    return "\n".join(lines)


def send_customer_email(data: ExhibitionLead) -> ServiceResult:
    """Send one acknowledgement email to the customer through Microsoft 365 SMTP.

    Email is intentionally best-effort. The lead remains safely stored in
    Google Sheets even when SMTP is disabled, missing, or temporarily fails.
    """
    recipient = _display(data.payload.get("email"))
    if not recipient:
        return ServiceResult(
            True,
            detail="Lead saved; customer email address was not provided.",
            data={"sent": False, "status": "Skipped - No Email"},
        )

    if not Config.SMTP_ENABLED:
        return ServiceResult(
            False,
            detail="SMTP email automation is disabled.",
            data={"sent": False, "status": "Disabled"},
        )

    if not Config.smtp_configured():
        return ServiceResult(
            False,
            detail="SMTP is not configured. Set SMTP_USER, SMTP_PASSWORD and SMTP_FROM_EMAIL.",
            data={"sent": False, "status": "Not Configured"},
        )

    msg = EmailMessage()
    msg["Subject"] = "WTT International - Exhibition Enquiry Received"
    msg["From"] = formataddr((Config.SMTP_FROM_NAME, Config.SMTP_FROM_EMAIL))
    msg["To"] = recipient
    msg.set_content(_email_body_text(data))
    msg.add_alternative(_email_body_html(data), subtype="html")

    try:
        with smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT, timeout=Config.SMTP_TIMEOUT) as smtp:
            smtp.ehlo()
            if Config.SMTP_USE_TLS:
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
            smtp.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
            smtp.send_message(msg)

        return ServiceResult(
            True,
            status_code=250,
            detail=f"Email confirmation sent to {recipient}.",
            data={"sent": True, "status": "Sent"},
        )
    except smtplib.SMTPAuthenticationError as exc:
        return ServiceResult(
            False,
            status_code=getattr(exc, "smtp_code", None),
            detail="Office 365 SMTP authentication failed. Check the mailbox password and Authenticated SMTP setting.",
            data={"sent": False, "status": "Failed"},
        )
    except (smtplib.SMTPException, OSError) as exc:
        return ServiceResult(
            False,
            detail=f"SMTP send failed: {exc}",
            data={"sent": False, "status": "Failed"},
        )
