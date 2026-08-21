from __future__ import annotations

import logging
import re
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, render_template, request, send_from_directory

import database
from config import Config
from models import AgricultureData
from services import send_confirmation_whatsapp
from sync_manager import submit_online, sync_pending_data
from translations import TRANSLATIONS
from visiting_card import VisitingCardError, scan_visiting_card

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)


def validate_submission(data: AgricultureData, soil_type_key: str = "") -> list[str]:
    errors: list[str] = []
    required = {
        "name": data.name,
        "mobile_number": data.mobile_number,
        "address": data.address,
        "water_requirement": data.water_requirement,
        "water_source": data.water_source,
        "crops": data.crops,
        "acres_of_land": data.acres_of_land,
        "soil_type": data.soil_type,
        "water_parameters": data.water_parameters,
    }
    for key, value in required.items():
        if not value:
            errors.append(f"{key} is required")

    mobile_digits = re.sub(r"[^0-9]", "", data.mobile_number)
    if data.mobile_number and len(mobile_digits) < 10:
        errors.append("mobile_number must contain at least 10 digits")

    for key, value in (("water_requirement", data.water_requirement), ("acres_of_land", data.acres_of_land)):
        if value:
            try:
                float(value)
            except ValueError:
                errors.append(f"{key} must be a number")

    if soil_type_key == "others" and not data.other_soil_type:
        errors.append("other_soil_type is required when Others is selected")

    if data.advance_received:
        if not data.advance_amount:
            errors.append("advance_amount is required")
        else:
            try:
                float(data.advance_amount)
            except ValueError:
                errors.append("advance_amount must be a number")
    return errors


def create_app() -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)
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

    @app.get("/api/translations")
    def translations():
        return jsonify(TRANSLATIONS)

    @app.get("/api/pending")
    def pending():
        rows = [item.to_public_dict() for item in database.get_pending()]
        return jsonify({"success": True, "count": len(rows), "items": rows})

    @app.get("/api/health")
    def health():
        return jsonify({"success": True, "status": "online"})


    @app.post("/api/scan-visiting-card")
    def scan_visiting_card_api():
        image = request.files.get("card")
        if image is None or not image.filename:
            return jsonify({"success": False, "error": "Please capture or upload a visiting card image"}), 400

        mime_type = (image.mimetype or "").lower().strip()
        image_bytes = image.read(Config.OPENAI_MAX_IMAGE_BYTES + 1)
        try:
            card = scan_visiting_card(image_bytes, mime_type)
        except VisitingCardError as exc:
            message = str(exc)
            status = 503 if "OPENAI_API_KEY" in message else 400
            return jsonify({"success": False, "error": message}), status
        except Exception:
            log.exception("Unexpected visiting-card scan error")
            return jsonify({"success": False, "error": "Could not scan the visiting card"}), 500

        data = card.to_dict()
        # The existing Flutter/Flask form has one Address / District field.
        # Prefer the concise district/location; use the printed address as fallback.
        data["address"] = card.district or card.raw_address
        found = [key for key in ("name", "mobile_number", "address") if data.get(key)]
        return jsonify({"success": True, "found": found, "data": data})

    @app.post("/api/submit")
    def submit():
        payload = request.get_json(silent=True) or {}
        if not payload.get("client_submission_id"):
            payload["client_submission_id"] = str(uuid4())
        data = AgricultureData.from_request(payload)
        errors = validate_submission(data, str(payload.get("soil_type_key", "")))
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        result = submit_online(data)

        whatsapp_english = False
        whatsapp_tamil = False
        receipt = database.get_receipt(data.client_submission_id)
        already_sent = bool(receipt and receipt["whatsapp_sent"])
        if not already_sent:
            try:
                english, tamil = send_confirmation_whatsapp(data)
                whatsapp_english = english.ok
                whatsapp_tamil = tamil.ok
                if english.ok or tamil.ok:
                    database.set_receipt(
                        data.client_submission_id,
                        "synced" if result.fully_synced else "pending",
                        whatsapp_sent=True,
                    )
            except Exception:
                log.exception("WhatsApp confirmation failed")

        return jsonify(
            {
                "success": True,
                "fully_synced": result.fully_synced,
                "queued": result.queued,
                "record_id": result.record_id,
                "google_synced": result.google.ok,
                "erp_synced": result.erp.ok,
                "whatsapp_english": whatsapp_english,
                "whatsapp_tamil": whatsapp_tamil,
            }
        )

    @app.post("/api/sync")
    def sync_now():
        try:
            result = sync_pending_data()
            return jsonify(result)
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
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
