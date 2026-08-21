from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import database
from models import AgricultureData
from services import ServiceResult, send_to_frappe, send_to_google_sheets


@dataclass(slots=True)
class SubmitSyncResult:
    fully_synced: bool
    queued: bool
    google: ServiceResult
    erp: ServiceResult
    record_id: int | None = None


def submit_online(data: AgricultureData) -> SubmitSyncResult:
    receipt = database.get_receipt(data.client_submission_id)
    if receipt is not None and receipt["state"] == "synced":
        return SubmitSyncResult(
            fully_synced=True,
            queued=False,
            google=ServiceResult(True, detail="Already processed"),
            erp=ServiceResult(True, detail="Already processed"),
        )

    existing = database.get_pending_by_client_id(data.client_submission_id)
    if existing is not None and existing.id is not None:
        google = ServiceResult(existing.google_synced, detail="Previously synced" if existing.google_synced else "Pending")
        erp = ServiceResult(existing.erp_synced, detail="Previously synced" if existing.erp_synced else "Pending")

        if not existing.google_synced:
            google = send_to_google_sheets(existing)
            if google.ok:
                database.update_sync_flags(existing.id, google_synced=True)

        # A repeated browser delivery is a retry, so use the Flutter retry rule:
        # ERP may be attempted independently once the item is in the queue.
        if not existing.erp_synced:
            erp = send_to_frappe(existing)
            if erp.ok:
                database.update_sync_flags(existing.id, erp_synced=True)

        if google.ok and erp.ok:
            database.delete_record(existing.id)
            database.set_receipt(data.client_submission_id, "synced")
            return SubmitSyncResult(True, False, google, erp)

        database.set_receipt(data.client_submission_id, "pending")
        return SubmitSyncResult(False, True, google, erp, existing.id)

    google = send_to_google_sheets(data)
    erp = ServiceResult(False, detail="ERP not attempted because Google Sheets did not sync")
    if google.ok:
        erp = send_to_frappe(data)

    if google.ok and erp.ok:
        database.set_receipt(data.client_submission_id, "synced")
        return SubmitSyncResult(True, False, google, erp)

    data.google_synced = google.ok
    data.erp_synced = erp.ok
    record_id = database.insert_pending(data)
    database.set_receipt(data.client_submission_id, "pending")
    return SubmitSyncResult(False, True, google, erp, record_id)


def sync_pending_data() -> dict[str, int | bool]:
    pending = database.get_pending()
    attempted = 0
    completed = 0

    for data in pending:
        if data.id is None:
            continue
        attempted += 1
        google_ok = data.google_synced
        erp_ok = data.erp_synced

        if not google_ok:
            google_result = send_to_google_sheets(data)
            google_ok = google_result.ok
            if google_ok:
                database.update_sync_flags(data.id, google_synced=True)

        # Flutter's retry path attempts ERP independently of Google state.
        if not erp_ok:
            erp_result = send_to_frappe(data)
            erp_ok = erp_result.ok
            if erp_ok:
                database.update_sync_flags(data.id, erp_synced=True)

        if google_ok and erp_ok:
            database.delete_record(data.id)
            database.set_receipt(data.client_submission_id, "synced")
            completed += 1

    remaining = database.get_pending_count()
    return {
        "success": True,
        "attempted": attempted,
        "completed": completed,
        "remaining": remaining,
    }
