from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any


GOOGLE_LABELS: dict[str, str] = {
    "client_submission_id": "Submission ID",
    "created_at": "Created At",
    "company_name": "Company Name",
    "contact_person": "Contact Person",
    "designation": "Designation",
    "mobile_number": "Mobile No",
    "email": "Email",
    "plant_project_location": "Plant / Project Location",
    "plant_capacity": "Plant Capacity",
    "visiting_card_address": "Visiting Card Address",
    "visiting_card_file_name": "Visiting Card File Name",
    "visiting_card_url": "Visiting Card Drive URL",
    "requirement_type": "Requirement Type",
    "product_list": "Product List",
    "remarks": "Remarks",
}


def _clean_value(value: Any) -> Any:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return value


@dataclass(slots=True)
class ExhibitionLead:
    payload: dict[str, Any]
    google_synced: bool = False
    id: int | None = None
    synced_at: str | None = None

    @classmethod
    def from_request(cls, payload: dict[str, Any]) -> "ExhibitionLead":
        clean = {str(k): _clean_value(v) for k, v in payload.items()}
        clean.setdefault("created_at", datetime.now().isoformat(timespec="seconds"))
        return cls(payload=clean)

    @classmethod
    def from_row(cls, row: Any) -> "ExhibitionLead":
        return cls(
            id=int(row["id"]),
            payload=json.loads(row["payload_json"]),
            google_synced=bool(row["google_synced"]),
            synced_at=row["synced_at"],
        )

    @property
    def client_submission_id(self) -> str:
        return str(self.payload.get("client_submission_id") or "")

    @property
    def company_name(self) -> str:
        return str(self.payload.get("company_name") or "")

    @property
    def contact_person(self) -> str:
        return str(self.payload.get("contact_person") or "")

    @property
    def mobile_number(self) -> str:
        return str(self.payload.get("mobile_number") or "")

    def to_db_values(self) -> tuple[str, str, int, str | None]:
        return (
            self.client_submission_id,
            json.dumps(self.payload, ensure_ascii=False, separators=(",", ":")),
            int(self.google_synced),
            self.synced_at,
        )

    def to_google_json(self) -> dict[str, Any]:
        row: dict[str, Any] = {}
        for key, label in GOOGLE_LABELS.items():
            value = self.payload.get(key, "")
            if isinstance(value, list):
                value = "; ".join(str(item) for item in value)
            elif isinstance(value, bool):
                value = "Yes" if value else "No"
            row[label] = value
        return row

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "client_submission_id": self.client_submission_id,
            "company_name": self.company_name,
            "contact_person": self.contact_person,
            "mobile_number": self.mobile_number,
            "requirement_type": str(self.payload.get("requirement_type") or ""),
            "plant_capacity": str(self.payload.get("plant_capacity") or ""),
            "product_list": str(self.payload.get("product_list") or ""),
            "google_synced": self.google_synced,
            "created_at": self.payload.get("created_at", ""),
            "synced_at": self.synced_at,
        }
