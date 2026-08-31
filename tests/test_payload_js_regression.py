from pathlib import Path


def test_payload_uses_safe_dom_accessors_for_optional_fields():
    js = Path(__file__).parents[1].joinpath('static', 'js', 'add-data.js').read_text(encoding='utf-8')
    assert "production_capacity: trimmedValueOf('production_capacity')" in js
    assert "production_capacity_unit: valueOf('production_capacity_unit')" in js
    assert "visiting_card_address: valueOf('visiting_card_address')" in js
