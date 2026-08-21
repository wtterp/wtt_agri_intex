from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "change-me")
    DEBUG = os.getenv("FLASK_DEBUG", "0").strip().lower() in {"1", "true", "yes", "on"}
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "5000"))
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))

    # Visiting-card scanner (server-side only; never expose the API key to JavaScript).
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
    OPENAI_VISION_MODEL = os.getenv("OPENAI_VISION_MODEL", "gpt-5.6-luna").strip() or "gpt-5.6-luna"
    OPENAI_REQUEST_TIMEOUT = int(os.getenv("OPENAI_REQUEST_TIMEOUT", "45"))
    OPENAI_MAX_IMAGE_MB = int(os.getenv("OPENAI_MAX_IMAGE_MB", "10"))
    OPENAI_MAX_IMAGE_BYTES = OPENAI_MAX_IMAGE_MB * 1024 * 1024

    _db_value = os.getenv("DATABASE_PATH", "instance/wtt_agri_intex.db")
    DATABASE_PATH = str((BASE_DIR / _db_value).resolve()) if not os.path.isabs(_db_value) else _db_value

    FRAPPE_BASE_URL = os.getenv("FRAPPE_BASE_URL", "https://erp.wttint.com").rstrip("/")
    FRAPPE_ENDPOINT = os.getenv(
        "FRAPPE_ENDPOINT",
        "/api/method/wtt_module.customization.custom.mobile_web.submit_agriculture_data",
    )

    GOOGLE_SCRIPT_ID = os.getenv("GOOGLE_SCRIPT_ID", "")
    GOOGLE_SCRIPT_IP = os.getenv("GOOGLE_SCRIPT_IP", "")
    GOOGLE_SCRIPT_HOST = os.getenv("GOOGLE_SCRIPT_HOST", "script.google.com")

    ULTRAMSG_TOKEN = os.getenv("ULTRAMSG_TOKEN", "")
    ULTRAMSG_INSTANCE_ID = os.getenv("ULTRAMSG_INSTANCE_ID", "")
    ULTRAMSG_HOST = os.getenv("ULTRAMSG_HOST", "api.ultramsg.com")
    ULTRAMSG_IP = os.getenv("ULTRAMSG_IP", "")
