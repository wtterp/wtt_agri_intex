from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from config import Config
from email_service import send_customer_email
from models import ExhibitionLead


class EmailSMTPTests(unittest.TestCase):
    def make_lead(self) -> ExhibitionLead:
        return ExhibitionLead.from_request(
            {
                "client_submission_id": "EMAIL-TEST-001",
                "company_name": "Example Industries",
                "contact_person": "Test Customer",
                "email": "customer@example.com",
                "mobile_number": "9876543210",
                "treatment_required": "ETP",
                "requirement_type": "New Plant",
                "industry_application": "Textile",
                "plant_project_location": "Chennai",
            }
        )

    def test_email_skips_when_customer_email_missing(self):
        lead = self.make_lead()
        lead.payload["email"] = ""
        result = send_customer_email(lead)
        self.assertTrue(result.ok)
        self.assertFalse((result.data or {}).get("sent"))
        self.assertEqual((result.data or {}).get("status"), "Skipped - No Email")

    @patch("email_service.smtplib.SMTP")
    def test_office365_smtp_uses_starttls_login_and_send(self, smtp_cls):
        old = {
            "SMTP_ENABLED": Config.SMTP_ENABLED,
            "SMTP_SERVER": Config.SMTP_SERVER,
            "SMTP_PORT": Config.SMTP_PORT,
            "SMTP_USER": Config.SMTP_USER,
            "SMTP_PASSWORD": Config.SMTP_PASSWORD,
            "SMTP_USE_TLS": Config.SMTP_USE_TLS,
            "SMTP_FROM_EMAIL": Config.SMTP_FROM_EMAIL,
        }
        try:
            Config.SMTP_ENABLED = True
            Config.SMTP_SERVER = "smtp.office365.com"
            Config.SMTP_PORT = 587
            Config.SMTP_USER = "noreply@wttint.com"
            Config.SMTP_PASSWORD = "test-password"
            Config.SMTP_USE_TLS = True
            Config.SMTP_FROM_EMAIL = "noreply@wttint.com"

            smtp = MagicMock()
            smtp_cls.return_value.__enter__.return_value = smtp
            result = send_customer_email(self.make_lead())

            self.assertTrue(result.ok)
            self.assertTrue((result.data or {}).get("sent"))
            self.assertEqual((result.data or {}).get("status"), "Sent")
            smtp_cls.assert_called_once_with("smtp.office365.com", 587, timeout=Config.SMTP_TIMEOUT)
            smtp.starttls.assert_called_once()
            smtp.login.assert_called_once_with("noreply@wttint.com", "test-password")
            smtp.send_message.assert_called_once()
        finally:
            for key, value in old.items():
                setattr(Config, key, value)


if __name__ == "__main__":
    unittest.main()
