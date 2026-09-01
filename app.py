from __future__ import annotations

import logging
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4

from flask import Flask, jsonify, render_template, request, send_from_directory

import database
from config import Config
from email_service import send_customer_email
from models import ExhibitionLead
from services import ServiceResult, update_email_status, upload_exhibition_file
from sync_manager import submit_online, sync_pending_data
from validation import validate_submission
from visiting_card import VisitingCardError, scan_qr_contact, scan_visiting_card

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)


def create_app() -> Flask:
    if Config.IS_VERCEL:
        app = Flask(__name__, instance_relative_config=True, instance_path="/tmp/wtt_exhibition_sheet_instance")
    else:
        app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    @app.after_request
    def disable_local_browser_cache(response):
        # Local development must always receive current Flask/templates/static files.
        host = (request.host or "").split(":", 1)[0].lower()
        if host in {"127.0.0.1", "localhost"}:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    database.init_database()

    @app.get("/")
    def home():
        return render_template("home.html")

    @app.get("/add")
    def add_data():
        return render_template("add_data.html")

    @app.get("/sync-status")
    def sync_status():
        return render_template("sync_status.html")

    @app.get("/api/health")
    def health():
        return jsonify(
            {
                "success": True,
                "status": "online",
                "app": "WTT Exhibition Lead Tracker",
                "storage": "Google Sheets + Google Drive",
                "erpnext_required": False,
                "vercel": Config.IS_VERCEL,
                "sheet_configured": bool(Config.google_script_url()),
                "smtp_configured": Config.smtp_configured(),
            }
        )

    @app.get("/api/pending")
    def pending():
        rows = [item.to_public_dict() for item in database.get_pending()]
        return jsonify({"success": True, "count": len(rows), "items": rows})

    @app.post("/api/scan-visiting-card")
    def scan_visiting_card_api():
        image = request.files.get("card")
        if image is None or not image.filename:
            return jsonify({"success": False, "error": "Please capture or upload a visiting card image"}), 400
        mime_type = (image.mimetype or "").lower().strip()
        image_bytes = image.read(Config.OPENAI_MAX_IMAGE_BYTES + 1)
        if len(image_bytes) > Config.OPENAI_MAX_IMAGE_BYTES:
            return jsonify(
                {
                    "success": False,
                    "error": f"Visiting card image must be {Config.OPENAI_MAX_IMAGE_MB} MB or smaller",
                }
            ), 400
        try:
            qr_text = (request.form.get("qr_text") or "").strip()
            card = scan_visiting_card(image_bytes, mime_type, qr_text=qr_text)
        except VisitingCardError as exc:
            status = 503 if "OPENAI_API_KEY" in str(exc) else 400
            return jsonify({"success": False, "error": str(exc)}), status
        except Exception:
            log.exception("Unexpected visiting-card scan error")
            return jsonify({"success": False, "error": "Could not scan the visiting card"}), 500
        data = card.to_dict()
        return jsonify({"success": True, "found": [k for k, v in data.items() if v], "data": data})

    @app.post("/api/scan-qr-contact")
    def scan_qr_contact_api():
        payload = request.get_json(silent=True) or {}
        qr_text = str(payload.get("qr_text") or "").strip()
        if not qr_text:
            return jsonify({"success": False, "error": "No QR data was detected"}), 400
        try:
            card = scan_qr_contact(qr_text)
        except VisitingCardError as exc:
            status = 503 if "OPENAI_API_KEY" in str(exc) else 400
            return jsonify({"success": False, "error": str(exc)}), status
        except Exception:
            log.exception("Unexpected QR contact scan error")
            return jsonify({"success": False, "error": "Could not read the QR contact data"}), 500
        data = card.to_dict()
        return jsonify({"success": True, "found": [k for k, v in data.items() if v], "data": data})

    @app.post("/api/upload-exhibition-file")
    def upload_exhibition_attachment():
        file = request.files.get("file")
        if file is None or not file.filename:
            return jsonify({"success": False, "error": "No file selected"}), 400

        category = (request.form.get("category") or "Other Attachments").strip()
        if category not in {"Visiting Cards", "Lab Reports", "Other Attachments"}:
            category = "Other Attachments"
        submission_id = (request.form.get("submission_id") or "").strip()

        content = file.read(Config.EXHIBITION_MAX_FILE_BYTES + 1)
        if len(content) > Config.EXHIBITION_MAX_FILE_BYTES:
            return jsonify(
                {
                    "success": False,
                    "error": f"File must be {Config.EXHIBITION_MAX_FILE_MB} MB or smaller for web upload",
                }
            ), 400

        result, url = upload_exhibition_file(
            content,
            file.filename,
            file.mimetype or "application/octet-stream",
            category=category,
            submission_id=submission_id,
        )
        if not result.ok:
            return jsonify({"success": False, "error": result.detail}), 502
        return jsonify(
            {
                "success": True,
                "url": url,
                "filename": file.filename,
                "category": category,
                "drive_file_id": (result.data or {}).get("id", ""),
            }
        )

    # Backward-compatible endpoint for older cached frontend builds.
    @app.post("/api/upload-lab-report")
    def upload_lab_report_compat():
        file = request.files.get("file")
        if file is None or not file.filename:
            return jsonify({"success": False, "error": "No lab report file selected"}), 400
        content = file.read(Config.EXHIBITION_MAX_FILE_BYTES + 1)
        if len(content) > Config.EXHIBITION_MAX_FILE_BYTES:
            return jsonify(
                {
                    "success": False,
                    "error": f"File must be {Config.EXHIBITION_MAX_FILE_MB} MB or smaller for web upload",
                }
            ), 400
        result, url = upload_exhibition_file(
            content,
            file.filename,
            file.mimetype or "application/octet-stream",
            category="Lab Reports",
        )
        if not result.ok:
            return jsonify({"success": False, "error": result.detail}), 502
        return jsonify({"success": True, "url": url, "filename": file.filename})

    @app.post("/api/submit")
    def submit():
        payload = request.get_json(silent=True) or {}
        if not payload.get("client_submission_id"):
            payload["client_submission_id"] = str(uuid4())
        data = ExhibitionLead.from_request(payload)
        errors = validate_submission(data)
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        # 1) Save/upsert the lead in Google Sheets. Apps Script also handles
        #    Google Drive attachments and WhatsApp. Email is attempted only
        #    after the spreadsheet has safely accepted the lead.
        result = submit_online(data)
        sheet_data = result.google.data or {}

        if not result.google.ok:
            response_payload = {
                "success": False,
                "fully_synced": False,
                "queued": result.queued,
                "record_id": result.record_id,
                "google_synced": False,
                "google_detail": result.google.detail,
                "error": result.google.detail or "Spreadsheet sync failed",
            }
            return jsonify(response_payload), 503

        # 2) Send customer acknowledgement through Microsoft 365 SMTP.
        #    Apps Script returns the current Email Status so a retry of the
        #    same Submission ID does not send a duplicate message.
        existing_email_status = str(sheet_data.get("email_status") or "").strip()
        if existing_email_status == "Sent":
            email_result = ServiceResult(
                True,
                detail=str(sheet_data.get("email_detail") or "Email already sent."),
                data={"sent": True, "status": "Sent"},
            )
        else:
            email_result = send_customer_email(data)
            email_data_now = email_result.data or {}
            email_status_now = str(
                email_data_now.get("status") or ("Sent" if email_result.ok else "Failed")
            )
            sent_at = datetime.now(timezone.utc).isoformat(timespec="seconds") if email_data_now.get("sent") else ""
            status_result = update_email_status(
                data.client_submission_id,
                status=email_status_now,
                detail=email_result.detail,
                sent_at=sent_at,
            )
            if not status_result.ok:
                log.warning("Could not write email status to spreadsheet: %s", status_result.detail)

        email_data = email_result.data or {}
        email_status = str(email_data.get("status") or ("Sent" if email_result.ok else "Failed"))

        response_payload = {
            "success": True,
            "fully_synced": result.fully_synced,
            "queued": False,
            "record_id": result.record_id,
            "google_synced": True,
            "google_detail": result.google.detail,
            "sheet_inserted": bool(sheet_data.get("inserted")),
            "sheet_updated": bool(sheet_data.get("updated")),
            "sheet_row": int(sheet_data.get("row") or 0),
            "whatsapp_sent": bool(sheet_data.get("whatsapp_sent")),
            "whatsapp_status": str(sheet_data.get("whatsapp_status") or ""),
            "whatsapp_detail": str(sheet_data.get("whatsapp_detail") or ""),
            "email_sent": bool(email_data.get("sent")),
            "email_status": email_status,
            "email_detail": email_result.detail,
        }
        # Lead save remains successful even if SMTP fails. The spreadsheet
        # records the SMTP failure so the enquiry itself is never lost.
        return jsonify(response_payload)

    @app.post("/api/sync")
    def sync_now():
        try:
            return jsonify(sync_pending_data())
        except Exception as exc:
            log.exception("Manual sync failed")
            return jsonify({"success": False, "error": str(exc)}), 500

    @app.get("/manifest.webmanifest")
    def manifest():
        return send_from_directory(app.static_folder, "manifest.webmanifest", mimetype="application/manifest+json")

    @app.get("/service-worker.js")
    def service_worker():
        response = send_from_directory(app.static_folder, "service-worker.js", mimetype="application/javascript")
        response.headers["Cache-Control"] = "no-cache"
        return response

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG, use_reloader=False)
