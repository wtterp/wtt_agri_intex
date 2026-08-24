import unittest
from visiting_card import _clean_mobile, _parse_json_object


class VisitingCardHelpersTest(unittest.TestCase):
    def test_mobile_cleanup(self):
        self.assertEqual(_clean_mobile('+91 98765-43210'), '+919876543210')

    def test_json_parse(self):
        value = _parse_json_object('{"company_name":"WTT","contact_person":"A"}')
        self.assertEqual(value["company_name"], "WTT")


if __name__ == '__main__':
    unittest.main()
