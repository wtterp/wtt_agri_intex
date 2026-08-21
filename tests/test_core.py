from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import database
import sync_manager
from config import Config
from models import AgricultureData
from services import ServiceResult
from translations import TRANSLATIONS


class CoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        Config.DATABASE_PATH = str(Path(self.temp.name) / "test.db")
        database.init_database()

    def tearDown(self):
        self.temp.cleanup()

    def sample(self, submission_id="test-1"):
        return AgricultureData(
            client_submission_id=submission_id,
            name="Farmer One",
            mobile_number="9876543210",
            address="Coimbatore",
            water_requirement="2500",
            water_source="Borewell",
            crops="Banana",
            acres_of_land="3.5",
            soil_type="Clay",
            water_parameters="pH 7, TDS 900",
            advance_received=True,
            advance_amount="5000",
        )

    def test_database_deduplicates_client_submission(self):
        data = self.sample()
        first = database.insert_pending(data)
        second = database.insert_pending(data)
        self.assertEqual(first, second)
        self.assertEqual(database.get_pending_count(), 1)

    def test_partial_then_retry_sync(self):
        old_google = sync_manager.send_to_google_sheets
        old_erp = sync_manager.send_to_frappe
        try:
            sync_manager.send_to_google_sheets = lambda data: ServiceResult(True, 200, "ok")
            sync_manager.send_to_frappe = lambda data: ServiceResult(False, 500, "fail")
            result = sync_manager.submit_online(self.sample("retry-1"))
            self.assertFalse(result.fully_synced)
            self.assertEqual(database.get_pending_count(), 1)
            row = database.get_pending()[0]
            self.assertTrue(row.google_synced)
            self.assertFalse(row.erp_synced)

            sync_manager.send_to_frappe = lambda data: ServiceResult(True, 200, "ok")
            outcome = sync_manager.sync_pending_data()
            self.assertEqual(outcome["remaining"], 0)
            self.assertEqual(database.get_pending_count(), 0)
        finally:
            sync_manager.send_to_google_sheets = old_google
            sync_manager.send_to_frappe = old_erp

    def test_translation_keys_match(self):
        self.assertEqual(set(TRANSLATIONS["en"]), set(TRANSLATIONS["ta"]))

    def test_google_payload_uses_other_soil_description(self):
        data = self.sample("soil-1")
        data.soil_type = "Others"
        data.other_soil_type = "Red soil"
        self.assertEqual(data.to_google_json()["Type of Soil"], "Red soil")


if __name__ == "__main__":
    unittest.main()
