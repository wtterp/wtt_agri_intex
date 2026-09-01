import unittest
from unittest.mock import Mock, patch

from config import Config
from visiting_card import _clean_mobile, _parse_json_object, scan_qr_contact


class VisitingCardHelpersTest(unittest.TestCase):
    def test_mobile_cleanup(self):
        self.assertEqual(_clean_mobile('+91 98765-43210'), '+919876543210')

    def test_json_parse(self):
        value = _parse_json_object('{"company_name":"WTT","contact_person":"A"}')
        self.assertEqual(value["company_name"], "WTT")

    def test_qr_text_extraction_uses_text_only_openai_response(self):
        old_key = Config.OPENAI_API_KEY
        Config.OPENAI_API_KEY = "test-key"
        response = Mock()
        response.ok = True
        response.json.return_value = {
            "output": [{
                "content": [{
                    "type": "output_text",
                    "text": '{"company_name":"Example Ltd","contact_person":"Ana Ruiz","designation":"Manager","mobile_number":"+34 600 123 456","email":"ana@example.com","address":"Madrid"}'
                }]
            }]
        }
        try:
            with patch("visiting_card.requests.post", return_value=response) as post:
                card = scan_qr_contact("BEGIN:VCARD\nFN:Ana Ruiz\nORG:Example Ltd\nEND:VCARD")
            self.assertEqual(card.company_name, "Example Ltd")
            self.assertEqual(card.contact_person, "Ana Ruiz")
            self.assertEqual(card.mobile_number, "+34600123456")
            payload = post.call_args.kwargs["json"]
            self.assertEqual(payload["input"][0]["content"][0]["type"], "input_text")
            self.assertEqual(len(payload["input"][0]["content"]), 1)
        finally:
            Config.OPENAI_API_KEY = old_key


if __name__ == '__main__':
    unittest.main()
