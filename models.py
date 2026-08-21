from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True)
class AgricultureData:
    name: str
    mobile_number: str
    address: str
    water_requirement: str
    water_source: str
    crops: str
    acres_of_land: str
    soil_type: str
    water_parameters: str
    other_soil_type: str | None = None
    advance_received: bool = False
    advance_amount: str | None = None
    google_synced: bool = False
    erp_synced: bool = False
    created_at: str | None = None
    synced_at: str | None = None
    id: int | None = None
    client_submission_id: str | None = None

    def __post_init__(self) -> None:
        if not self.created_at:
            self.created_at = datetime.now().isoformat(timespec="seconds")

    @classmethod
    def from_request(cls, payload: dict[str, Any]) -> "AgricultureData":
        def text(key: str) -> str:
            value = payload.get(key, "")
            return str(value).strip() if value is not None else ""

        advance_received = payload.get("advance_received", False)
        if isinstance(advance_received, str):
            advance_received = advance_received.lower() in {"1", "true", "yes", "on"}

        return cls(
            name=text("name"),
            mobile_number=text("mobile_number"),
            address=text("address"),
            water_requirement=text("water_requirement"),
            water_source=text("water_source"),
            crops=text("crops"),
            acres_of_land=text("acres_of_land"),
            soil_type=text("soil_type"),
            other_soil_type=text("other_soil_type") or None,
            water_parameters=text("water_parameters"),
            advance_received=bool(advance_received),
            advance_amount=text("advance_amount") or None,
            client_submission_id=text("client_submission_id") or None,
        )

    @classmethod
    def from_row(cls, row: Any) -> "AgricultureData":
        return cls(
            id=row["id"],
            client_submission_id=row["client_submission_id"],
            name=row["name"],
            mobile_number=row["mobile_number"],
            address=row["address"],
            water_requirement=row["water_requirement"],
            water_source=row["water_source"],
            crops=row["crops"],
            acres_of_land=row["acres_of_land"],
            soil_type=row["soil_type"],
            other_soil_type=row["other_soil_type"],
            water_parameters=row["water_parameters"],
            advance_received=bool(row["advance_received"]),
            advance_amount=row["advance_amount"],
            google_synced=bool(row["google_synced"]),
            erp_synced=bool(row["erp_synced"]),
            created_at=row["created_at"],
            synced_at=row["synced_at"],
        )

    def to_db_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["advance_received"] = int(self.advance_received)
        data["google_synced"] = int(self.google_synced)
        data["erp_synced"] = int(self.erp_synced)
        data.pop("id", None)
        return data

    def to_google_json(self) -> dict[str, Any]:
        return {
            "Name": self.name,
            "Mobile Number": self.mobile_number,
            "Address/District": self.address,
            "Water Requirement (Liters/Day)": self.water_requirement,
            "Source of Water": self.water_source,
            "Crops": self.crops,
            "Acres of Land": self.acres_of_land,
            "Type of Soil": self.other_soil_type if self.soil_type in {"Others", "மற்றவை"} and self.other_soil_type else self.soil_type,
            "Water Parameters": self.water_parameters,
            "Advance Received": "Yes" if self.advance_received else "No",
            "Advance Amount": self.advance_amount or "",
        }

    def to_frappe_payload(self) -> dict[str, Any]:
        try:
            acres = float(self.acres_of_land)
        except (TypeError, ValueError):
            acres = 0
        try:
            advance = float(self.advance_amount or 0)
        except (TypeError, ValueError):
            advance = 0

        return {
            "customer_name": self.name,
            "mobile_number": self.mobile_number,
            "address": self.address,
            "water_requirement": self.water_requirement,
            "source_of_water": self.water_source,
            "crops": self.crops,
            "acres_of_land": acres,
            "soil_type": self.soil_type,
            "water_parameters": self.water_parameters,
            "advance_received": 1 if self.advance_received else 0,
            "advance_amount": advance,
        }

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "client_submission_id": self.client_submission_id,
            "name": self.name,
            "mobile_number": self.mobile_number,
            "address": self.address,
            "water_requirement": self.water_requirement,
            "water_source": self.water_source,
            "crops": self.crops,
            "acres_of_land": self.acres_of_land,
            "soil_type": self.soil_type,
            "other_soil_type": self.other_soil_type,
            "water_parameters": self.water_parameters,
            "advance_received": self.advance_received,
            "advance_amount": self.advance_amount,
            "google_synced": self.google_synced,
            "erp_synced": self.erp_synced,
            "created_at": self.created_at,
            "synced_at": self.synced_at,
        }
