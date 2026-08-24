from __future__ import annotations

from dataclasses import dataclass

import database
from models import ExhibitionLead
from services import ServiceResult, send_to_exhibition_sheet


@dataclass(slots=True)
class SubmitSyncResult:
    fully_synced: bool
    queued: bool
    google: ServiceResult
    record_id: int | None = None


def submit_online(data: ExhibitionLead) -> SubmitSyncResult:
    # Always upsert the lead to Apps Script, even if a local receipt says the
    # Submission ID was already synced. Apps Script is idempotent by Submission
    # ID and returns the current WhatsApp/Email status. This prevents duplicate
    # customer email when the browser retries after a network interruption.
    existing = database.get_pending_by_client_id(data.client_submission_id)
    if existing is not None and existing.id is not None:
        google = send_to_exhibition_sheet(existing)
        if google.ok:
            database.mark_google_synced(existing.id)
            database.delete_record(existing.id)
            database.set_receipt(data.client_submission_id, "synced")
            return SubmitSyncResult(True, False, google)
        database.set_receipt(data.client_submission_id, "pending")
        return SubmitSyncResult(False, True, google, existing.id)

    google = send_to_exhibition_sheet(data)
    if google.ok:
        database.set_receipt(data.client_submission_id, "synced")
        return SubmitSyncResult(True, False, google)

    record_id = database.insert_pending(data)
    database.set_receipt(data.client_submission_id, "pending")
    return SubmitSyncResult(False, True, google, record_id)


def sync_pending_data() -> dict[str, int | bool]:
    pending = database.get_pending()
    attempted = 0
    completed = 0
    for data in pending:
        if data.id is None:
            continue
        attempted += 1
        result = send_to_exhibition_sheet(data)
        if result.ok:
            database.mark_google_synced(data.id)
            database.delete_record(data.id)
            database.set_receipt(data.client_submission_id, "synced")
            completed += 1
    return {
        "success": True,
        "attempted": attempted,
        "completed": completed,
        "remaining": database.get_pending_count(),
    }
