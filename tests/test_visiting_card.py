from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from config import Config
import visiting_card


class FakeResponse:
    ok = True
    status_code = 200
    text = ""

    def json(self):
        return {
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": '{"name":"Ravi Kumar","mobile_number":"+91 98765 43210","district":"Coimbatore","raw_address":"Coimbatore, Tamil Nadu"}',
                        }
                    ],
                }
            ]
        }


class VisitingCardTests(unittest.TestCase):
    def test_scan_builds_vision_structured_output_request(self):
        old_key = Config.OPENAI_API_KEY
        old_post = visiting_card.requests.post
        captured = {}

        def fake_post(url, **kwargs):
            captured["url"] = url
            captured.update(kwargs)
            return FakeResponse()

        try:
            Config.OPENAI_API_KEY = "test-only-key"
            visiting_card.requests.post = fake_post
            result = visiting_card.scan_visiting_card(b"fake-jpeg", "image/jpeg")
        finally:
            Config.OPENAI_API_KEY = old_key
            visiting_card.requests.post = old_post

        self.assertEqual(result.name, "Ravi Kumar")
        self.assertEqual(result.mobile_number, "+919876543210")
        self.assertEqual(result.district, "Coimbatore")
        self.assertEqual(captured["url"], "https://api.openai.com/v1/responses")
        payload = captured["json"]
        self.assertEqual(payload["model"], Config.OPENAI_VISION_MODEL)
        image_part = payload["input"][0]["content"][1]
        self.assertEqual(image_part["type"], "input_image")
        self.assertEqual(image_part["detail"], "original")
        self.assertTrue(image_part["image_url"].startswith("data:image/jpeg;base64,"))
        self.assertEqual(payload["text"]["format"]["type"], "json_schema")
        self.assertTrue(payload["text"]["format"]["strict"])

    def test_rejects_unsupported_image_type(self):
        old_key = Config.OPENAI_API_KEY
        try:
            Config.OPENAI_API_KEY = "test-only-key"
            with self.assertRaises(visiting_card.VisitingCardError):
                visiting_card.scan_visiting_card(b"fake", "image/heic")
        finally:
            Config.OPENAI_API_KEY = old_key


if __name__ == "__main__":
    unittest.main()
