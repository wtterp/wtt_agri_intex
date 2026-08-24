from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from config import Config
import database
from validation import validate_submission
from models import ExhibitionLead


class ExhibitionLeadTests(unittest.TestCase):
    def make_payload(self):
        return {
            "client_submission_id": "test-123",
            "company_name": "Example Industries",
            "contact_person": "A Person",
            "mobile_number": "9876543210",
            "email": "person@example.com",
            "treatment_required": "ETP",
            "requirement_type": "New Plant",
            "industry_application": "Textile",
            "required_capacity_kld": "300",
            "customer_requirement": "Need a 300 KLD ETP",
            "project_stage": "Initial Enquiry",
            "expected_timeline": "1–3 Months",
            "treated_water_destination": ["Reuse in Plant", "Gardening"],
            "visiting_card_file_name": "card.jpg",
            "visiting_card_url": "https://drive.google.com/file/d/card/view",
            "lab_report_file_name": "report.pdf",
            "lab_report_url": "https://drive.google.com/file/d/report/view",
        }

    def test_validation_accepts_valid_lead(self):
        lead = ExhibitionLead.from_request(self.make_payload())
        self.assertEqual(validate_submission(lead), [])

    def test_sections_four_onward_are_optional(self):
        payload = self.make_payload()
        for field in (
            "customer_requirement",
            "required_capacity_kld",
            "project_stage",
            "expected_timeline",
        ):
            payload[field] = ""
        errors = validate_submission(ExhibitionLead.from_request(payload))
        self.assertEqual(errors, [])

    def test_email_alone_satisfies_contact_requirement(self):
        payload = self.make_payload()
        payload["mobile_number"] = ""
        errors = validate_submission(ExhibitionLead.from_request(payload))
        self.assertEqual(errors, [])

    def test_mobile_alone_satisfies_contact_requirement(self):
        payload = self.make_payload()
        payload["email"] = ""
        errors = validate_submission(ExhibitionLead.from_request(payload))
        self.assertEqual(errors, [])

    def test_validation_requires_phone_or_email(self):
        payload = self.make_payload()
        payload["mobile_number"] = ""
        payload["email"] = ""
        errors = validate_submission(ExhibitionLead.from_request(payload))
        self.assertTrue(any("Mobile No or Email" in e for e in errors))

    def test_validation_rejects_short_mobile(self):
        payload = self.make_payload()
        payload["email"] = ""
        payload["mobile_number"] = "123"
        errors = validate_submission(ExhibitionLead.from_request(payload))
        self.assertTrue(any("Mobile" in e for e in errors))

    def test_google_mapping_joins_lists_and_includes_drive_links(self):
        row = ExhibitionLead.from_request(self.make_payload()).to_google_json()
        self.assertEqual(row["Company Name"], "Example Industries")
        self.assertEqual(row["Treated Water Destination / Use"], "Reuse in Plant; Gardening")
        self.assertEqual(row["Visiting Card Drive URL"], "https://drive.google.com/file/d/card/view")
        self.assertEqual(row["Lab Report Drive URL"], "https://drive.google.com/file/d/report/view")
        self.assertNotIn("Existing Treatment Plant", row)

    def test_pending_database_is_deduplicated(self):
        old = Config.DATABASE_PATH
        try:
            with tempfile.TemporaryDirectory() as tmp:
                Config.DATABASE_PATH = str(Path(tmp) / "test.db")
                database.init_database()
                lead = ExhibitionLead.from_request(self.make_payload())
                first = database.insert_pending(lead)
                second = database.insert_pending(lead)
                self.assertEqual(first, second)
                self.assertEqual(database.get_pending_count(), 1)
        finally:
            Config.DATABASE_PATH = old

    def test_full_script_url_takes_priority(self):
        old_url = Config.EXHIBITION_GOOGLE_SCRIPT_URL
        old_id = Config.EXHIBITION_GOOGLE_SCRIPT_ID
        try:
            Config.EXHIBITION_GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/ABC/exec"
            Config.EXHIBITION_GOOGLE_SCRIPT_ID = "OTHER"
            self.assertEqual(Config.google_script_url(), "https://script.google.com/macros/s/ABC/exec")
        finally:
            Config.EXHIBITION_GOOGLE_SCRIPT_URL = old_url
            Config.EXHIBITION_GOOGLE_SCRIPT_ID = old_id


if __name__ == "__main__":
    unittest.main()
