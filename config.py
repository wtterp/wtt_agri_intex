from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _int_env(name: str, default: int) -> int:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _bool_env(name: str, default: bool = False) -> bool:
    raw = (os.getenv(name) or "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY") or "change-me-in-production"
    DEBUG = _bool_env("FLASK_DEBUG", False)
    HOST = os.getenv("HOST") or "0.0.0.0"
    PORT = _int_env("PORT", 5000)
    REQUEST_TIMEOUT = _int_env("REQUEST_TIMEOUT", 30)

    IS_VERCEL = bool(os.getenv("VERCEL"))
    if IS_VERCEL:
        # Secondary retry queue only. Permanent business data is stored in
        # Google Sheets/Drive, not in this SQLite file.
        DATABASE_PATH = "/tmp/wtt_exhibition_sheet_retry.db"
    else:
        _db_value = os.getenv("DATABASE_PATH") or "instance/wtt_exhibition_sheet_retry.db"
        DATABASE_PATH = str((BASE_DIR / _db_value).resolve()) if not os.path.isabs(_db_value) else _db_value

    # OpenAI visiting-card extraction. Keep the key server-side only.
    OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
    OPENAI_VISION_MODEL = (os.getenv("OPENAI_VISION_MODEL") or "gpt-5.6-luna").strip()
    OPENAI_REQUEST_TIMEOUT = _int_env("OPENAI_REQUEST_TIMEOUT", 45)
    OPENAI_MAX_IMAGE_MB = _int_env("OPENAI_MAX_IMAGE_MB", 4)
    OPENAI_MAX_IMAGE_BYTES = OPENAI_MAX_IMAGE_MB * 1024 * 1024

    # Keep uploads below typical serverless request limits. Files themselves
    # are stored in Google Drive; only their Drive URLs are written to Sheets.
    EXHIBITION_MAX_FILE_MB = _int_env("EXHIBITION_MAX_FILE_MB", 4)
    EXHIBITION_MAX_FILE_BYTES = EXHIBITION_MAX_FILE_MB * 1024 * 1024

    # Spreadsheet-only architecture. You may set either the full deployed
    # Google Apps Script Web App URL (easiest) or only its deployment ID.
    EXHIBITION_GOOGLE_SCRIPT_URL = (os.getenv("EXHIBITION_GOOGLE_SCRIPT_URL") or "").strip()
    EXHIBITION_GOOGLE_SCRIPT_ID = (os.getenv("EXHIBITION_GOOGLE_SCRIPT_ID") or "").strip()
    EXHIBITION_GOOGLE_SCRIPT_HOST = (os.getenv("EXHIBITION_GOOGLE_SCRIPT_HOST") or "script.google.com").strip()
    EXHIBITION_GOOGLE_SCRIPT_IP = (os.getenv("EXHIBITION_GOOGLE_SCRIPT_IP") or "").strip()

    # Microsoft 365 / Office 365 SMTP customer confirmation email.
    SMTP_ENABLED = _bool_env("SMTP_ENABLED", True)
    SMTP_SERVER = (os.getenv("SMTP_SERVER") or "smtp.office365.com").strip()
    SMTP_PORT = _int_env("SMTP_PORT", 587)
    SMTP_USER = (os.getenv("SMTP_USER") or "").strip()
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD") or ""
    SMTP_USE_TLS = _bool_env("SMTP_USE_TLS", True)
    SMTP_FROM_EMAIL = (os.getenv("SMTP_FROM_EMAIL") or SMTP_USER).strip()
    SMTP_FROM_NAME = (os.getenv("SMTP_FROM_NAME") or "WTT INTERNATIONAL").strip()
    SMTP_TIMEOUT = _int_env("SMTP_TIMEOUT", 30)

    @classmethod
    def google_script_url(cls) -> str:
        if cls.EXHIBITION_GOOGLE_SCRIPT_URL:
            return cls.EXHIBITION_GOOGLE_SCRIPT_URL
        if cls.EXHIBITION_GOOGLE_SCRIPT_ID:
            return f"https://{cls.EXHIBITION_GOOGLE_SCRIPT_HOST}/macros/s/{cls.EXHIBITION_GOOGLE_SCRIPT_ID}/exec"
        return ""

    @classmethod
    def smtp_configured(cls) -> bool:
        return bool(
            cls.SMTP_ENABLED
            and cls.SMTP_SERVER
            and cls.SMTP_PORT
            and cls.SMTP_USER
            and cls.SMTP_PASSWORD
            and cls.SMTP_FROM_EMAIL
        )
