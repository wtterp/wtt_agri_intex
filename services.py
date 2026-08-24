from __future__ import annotations

import base64
import http.client
import json
import socket
import ssl
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import requests

from config import Config
from models import ExhibitionLead


class _FixedIPHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host: str, ip: str, timeout: int):
        super().__init__(host=host, port=443, timeout=timeout, context=ssl.create_default_context())
        self._fixed_ip = ip

    def connect(self) -> None:
        raw = socket.create_connection((self._fixed_ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(raw, server_hostname=self.host)


def _post_fixed_ip(host: str, ip: str, path: str, *, headers: dict[str, str], body: bytes) -> tuple[int, str]:
    conn = _FixedIPHTTPSConnection(host, ip, Config.REQUEST_TIMEOUT)
    try:
        conn.request("POST", path, body=body, headers={"Host": host, "Connection": "close", **headers})
        response = conn.getresponse()
        return response.status, response.read().decode("utf-8", errors="replace")
    finally:
        conn.close()


@dataclass(slots=True)
class ServiceResult:
    ok: bool
    status_code: int | None = None
    detail: str = ""
    data: dict[str, Any] | None = None


def _script_url() -> str:
    return Config.google_script_url()


def _post_script(payload: dict[str, Any], *, timeout: int | None = None) -> ServiceResult:
    url = _script_url()
    if not url:
        return ServiceResult(
            False,
            detail="Google Sheet is not configured. Set EXHIBITION_GOOGLE_SCRIPT_URL or EXHIBITION_GOOGLE_SCRIPT_ID.",
        )

    request_timeout = timeout or Config.REQUEST_TIMEOUT
    errors: list[str] = []

    # Normal domain route. Apps Script often redirects from script.google.com
    # to googleusercontent.com; redirects must be followed to obtain JSON.
    try:
        response = requests.post(
            url,
            json=payload,
            timeout=request_timeout,
            allow_redirects=True,
        )
        try:
            body = response.json()
        except ValueError:
            body = None
        if response.ok and isinstance(body, dict):
            if body.get("success") is True:
                return ServiceResult(True, response.status_code, str(body.get("message") or "OK"), body)
            return ServiceResult(False, response.status_code, str(body.get("error") or "Apps Script rejected request"), body)
        if response.ok:
            errors.append(f"Apps Script returned non-JSON response: {response.text[:160]}")
        else:
            errors.append(f"HTTP {response.status_code}: {response.text[:160]}")
    except requests.RequestException as exc:
        errors.append(f"Domain: {exc}")

    # Optional fixed-IP fallback retained from the original application.
    parsed = urlparse(url)
    if Config.EXHIBITION_GOOGLE_SCRIPT_IP and parsed.hostname == Config.EXHIBITION_GOOGLE_SCRIPT_HOST:
        try:
            body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            status, content = _post_fixed_ip(
                parsed.hostname,
                Config.EXHIBITION_GOOGLE_SCRIPT_IP,
                parsed.path + (f"?{parsed.query}" if parsed.query else ""),
                headers={"Content-Type": "application/json", "Content-Length": str(len(body_bytes))},
                body=body_bytes,
            )
            if status == 200:
                try:
                    body = json.loads(content)
                except ValueError:
                    body = None
                if isinstance(body, dict) and body.get("success") is True:
                    return ServiceResult(True, status, str(body.get("message") or "OK"), body)
                errors.append(str((body or {}).get("error") if isinstance(body, dict) else content[:160]))
            elif status in {301, 302, 303, 307, 308}:
                # A redirect means the Apps Script endpoint was reached. We do
                # not call this a success because the JSON result/WhatsApp
                # status cannot be verified on the fixed-IP path.
                errors.append(f"IP/SNI redirect HTTP {status}; result could not be verified")
            else:
                errors.append(f"IP/SNI HTTP {status}")
        except (OSError, ssl.SSLError, http.client.HTTPException) as exc:
            errors.append(f"IP/SNI: {exc}")

    return ServiceResult(False, detail="; ".join(errors) or "Google Apps Script request failed")


def send_to_exhibition_sheet(data: ExhibitionLead) -> ServiceResult:
    """Store/upsert one lead in Google Sheets.

    The Apps Script also performs duplicate protection and sends the customer
    WhatsApp message (when a mobile number is available and UltraMsg is
    configured in Apps Script Properties).
    """
    return _post_script(
        {
            "action": "submit_lead",
            "data": data.to_google_json(),
        },
        timeout=max(Config.REQUEST_TIMEOUT, 45),
    )


def upload_exhibition_file(
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    *,
    category: str,
    submission_id: str = "",
) -> tuple[ServiceResult, str]:
    """Upload an attachment to Google Drive through the exhibition Apps Script.

    The spreadsheet stores only the returned Drive URL; binary files are not
    placed inside spreadsheet cells.
    """
    payload = {
        "action": "upload_file",
        "category": category,
        "submission_id": submission_id,
        "filename": filename,
        "mime_type": mime_type or "application/octet-stream",
        "base64": base64.b64encode(file_bytes).decode("ascii"),
    }
    result = _post_script(payload, timeout=max(Config.REQUEST_TIMEOUT, 75))
    if not result.ok:
        return result, ""
    data = result.data or {}
    url = str(data.get("url") or "")
    if not url:
        return ServiceResult(False, result.status_code, "Drive upload returned no URL", data), ""
    return result, url


def update_email_status(
    submission_id: str,
    *,
    status: str,
    detail: str = "",
    sent_at: str = "",
) -> ServiceResult:
    """Write SMTP email delivery status back to the lead's spreadsheet row."""
    return _post_script(
        {
            "action": "update_email_status",
            "submission_id": submission_id,
            "status": status,
            "detail": detail,
            "sent_at": sent_at,
        },
        timeout=max(Config.REQUEST_TIMEOUT, 45),
    )
