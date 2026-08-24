from __future__ import annotations

import re

from models import ExhibitionLead


def validate_submission(data: ExhibitionLead) -> list[str]:
    p = data.payload
    errors: list[str] = []
    required = {
        "company_name": "Company Name",
        "contact_person": "Contact Person",
        "treatment_required": "Treatment Required",
        "requirement_type": "Requirement Type",
        "industry_application": "Industry / Application",
    }
    for key, label in required.items():
        if not str(p.get(key) or "").strip():
            errors.append(f"{label} is required")

    mobile_raw = str(p.get("mobile_number") or "").strip()
    email = str(p.get("email") or "").strip()
    if not mobile_raw and not email:
        errors.append("Mobile No or Email is required")

    digits = re.sub(r"\D", "", mobile_raw)
    if mobile_raw and len(digits) < 10:
        errors.append("Mobile No must contain at least 10 digits")

    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        errors.append("Please enter a valid email address")

    if str(p.get("industry_application") or "") == "Other" and not str(p.get("other_industry_application") or "").strip():
        errors.append("Please specify the other industry/application")
    return errors
