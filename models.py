from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any


# These labels become Google Sheet column headers. Keep them stable because
# Google Apps Script uses "Submission ID", "Mobile No" and the WhatsApp
# status columns for duplicate protection and automatic messaging.
GOOGLE_LABELS: dict[str, str] = {
    "client_submission_id": "Submission ID",
    "created_at": "Created At",
    "company_name": "Company Name",
    "contact_person": "Contact Person",
    "designation": "Designation",
    "mobile_number": "Mobile No",
    "email": "Email",
    "plant_project_location": "Plant / Project Location",
    "visiting_card_address": "Visiting Card Address",
    "visiting_card_file_name": "Visiting Card File Name",
    "visiting_card_url": "Visiting Card Drive URL",
    "treatment_required": "Treatment Required",
    "requirement_type": "Requirement Type",
    "industry_application": "Industry / Application",
    "other_industry_application": "Other Industry / Application",
    "process_application": "Process / Application",
    "required_capacity_kld": "Required Capacity (KLD)",
    "average_flow_kld": "Average Flow (KLD)",
    "peak_flow_kld": "Peak Flow (KLD)",
    "peak_requirement_kld": "Peak Requirement (KLD)",
    "population_occupancy": "Population / Occupancy",
    "production_capacity": "Production Capacity",
    "production_capacity_unit": "Production Capacity Unit",
    "water_effluent_parameters": "Water / Effluent Parameters",
    "analysis_report_status": "Analysis Report Status",
    "lab_report_file_name": "Lab Report File Name",
    "lab_report_url": "Lab Report Drive URL",
    "existing_plant_capacity_kld": "Existing Plant Capacity (KLD)",
    "existing_technology_process": "Existing Technology / Process",
    "existing_plant_status": "Existing Plant Current Status",
    "existing_main_problem": "Existing Plant Main Requirement / Problem",
    "existing_plant_remarks": "Existing Plant Remarks",
    "treated_water_destination": "Treated Water Destination / Use",
    "specific_outlet_requirement": "Specific Outlet Requirement",
    "required_norms_outlet_quality": "Required Norms / Outlet Quality",
    "industry_specific_process": "Industry Specific Process / Product / Area",
    "industry_specific_capacity": "Industry Specific Capacity",
    "industry_specific_capacity_unit": "Industry Specific Capacity Unit",
    "industry_specific_question": "Industry Specific Question",
    "industry_specific_answer": "Industry Specific Answer",
    "major_wastewater_source": "Major Wastewater Source",
    "stp_sewage_source": "STP Sewage Source",
    "stp_population_occupancy": "STP Population / Occupancy",
    "stp_required_capacity_kld": "STP Required Capacity (KLD)",
    "stp_treated_water_use": "STP Treated Water Use",
    "wtp_raw_water_source": "WTP Raw Water Source",
    "wtp_required_capacity_kld": "WTP Required Capacity (KLD)",
    "wtp_application": "WTP Application",
    "wtp_raw_water_parameters": "WTP Raw Water Parameters",
    "customer_requirement": "Key Requirement / Discussion",
    "project_stage": "Project Stage",
    "expected_timeline": "Expected Timeline",
    "internal_remarks": "Internal Remarks",
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

    @property
    def treatment_required(self) -> str:
        return str(self.payload.get("treatment_required") or "")

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
            "treatment_required": self.treatment_required,
            "google_synced": self.google_synced,
            "created_at": self.payload.get("created_at", ""),
            "synced_at": self.synced_at,
        }
