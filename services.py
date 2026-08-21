from __future__ import annotations

import http.client
import json
import logging
import re
import socket
import ssl
from urllib.parse import urlencode
from dataclasses import dataclass
from typing import Any

import requests
from config import Config
from models import AgricultureData

log = logging.getLogger(__name__)




class _FixedIPHTTPSConnection(http.client.HTTPSConnection):
    """HTTPS connection that bypasses DNS while keeping TLS SNI/hostname."""

    def __init__(self, host: str, ip: str, timeout: int):
        super().__init__(host=host, port=443, timeout=timeout, context=ssl.create_default_context())
        self._fixed_ip = ip

    def connect(self) -> None:
        raw = socket.create_connection((self._fixed_ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(raw, server_hostname=self.host)


def _post_fixed_ip(host: str, ip: str, path: str, *, headers: dict[str, str], body: bytes) -> tuple[int, str]:
    conn = _FixedIPHTTPSConnection(host, ip, Config.REQUEST_TIMEOUT)
    try:
        request_headers = {"Host": host, "Connection": "close", **headers}
        conn.request("POST", path, body=body, headers=request_headers)
        response = conn.getresponse()
        content = response.read().decode("utf-8", errors="replace")
        return response.status, content
    finally:
        conn.close()


@dataclass(slots=True)
class ServiceResult:
    ok: bool
    status_code: int | None = None
    detail: str = ""


def send_to_google_sheets(data: AgricultureData) -> ServiceResult:
    if not Config.GOOGLE_SCRIPT_ID:
        return ServiceResult(False, detail="GOOGLE_SCRIPT_ID is not configured")

    body = json.dumps({"action": "append", "data": [data.to_google_json()]}).encode("utf-8")
    path = f"/macros/s/{Config.GOOGLE_SCRIPT_ID}/exec"
    errors: list[str] = []

    # First preserve the Flutter DNS-bypass behavior, but keep the correct TLS
    # SNI hostname while physically connecting to the configured Google IP.
    if Config.GOOGLE_SCRIPT_IP:
        try:
            status, _ = _post_fixed_ip(
                Config.GOOGLE_SCRIPT_HOST,
                Config.GOOGLE_SCRIPT_IP,
                path,
                headers={"Content-Type": "application/json", "Content-Length": str(len(body))},
                body=body,
            )
            if status in {200, 302}:
                return ServiceResult(True, status, "Google Sheets accepted the submission")
            errors.append(f"IP/SNI HTTP {status}")
        except (OSError, ssl.SSLError, http.client.HTTPException) as exc:
            errors.append(f"IP/SNI: {exc}")

    try:
        response = requests.post(
            f"https://{Config.GOOGLE_SCRIPT_HOST}{path}",
            headers={"Content-Type": "application/json"},
            data=body,
            timeout=Config.REQUEST_TIMEOUT,
            allow_redirects=False,
        )
        if response.status_code in {200, 302}:
            return ServiceResult(True, response.status_code, "Google Sheets accepted the submission")
        errors.append(f"Domain HTTP {response.status_code}")
    except requests.RequestException as exc:
        errors.append(f"Domain: {exc}")

    return ServiceResult(False, detail="; ".join(errors) or "Google Sheets request failed")


def send_to_frappe(data: AgricultureData) -> ServiceResult:
    url = f"{Config.FRAPPE_BASE_URL}{Config.FRAPPE_ENDPOINT}"
    try:
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json=data.to_frappe_payload(),
            timeout=Config.REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            return ServiceResult(False, response.status_code, f"ERP HTTP {response.status_code}")

        try:
            payload: dict[str, Any] = response.json()
        except ValueError:
            return ServiceResult(False, response.status_code, "ERP returned non-JSON response")

        message = payload.get("message")
        if isinstance(message, dict) and message.get("status") == "success":
            return ServiceResult(True, response.status_code, str(message.get("message", "ERP success")))
        return ServiceResult(False, response.status_code, f"ERP response: {message}")
    except requests.RequestException as exc:
        return ServiceResult(False, detail=str(exc))


def _clean_india_phone(value: str) -> str:
    cleaned = re.sub(r"[^0-9]", "", value or "")
    if cleaned and not cleaned.startswith("91"):
        cleaned = f"91{cleaned}"
    return cleaned


def _ultramsg_request(to: str, body: str) -> ServiceResult:
    if not Config.ULTRAMSG_TOKEN or not Config.ULTRAMSG_INSTANCE_ID:
        return ServiceResult(False, detail="UltraMsg is not configured")

    number = _clean_india_phone(to)
    if not number:
        return ServiceResult(False, detail="Invalid phone number")

    form = {
        "token": Config.ULTRAMSG_TOKEN,
        "to": number,
        "body": body,
        "priority": "10",
    }
    encoded = urlencode(form).encode("utf-8")
    path = f"/instance{Config.ULTRAMSG_INSTANCE_ID}/messages/chat"
    errors: list[str] = []

    try:
        response = requests.post(
            f"https://{Config.ULTRAMSG_HOST}{path}",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data=encoded,
            timeout=Config.REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            try:
                payload = response.json()
            except ValueError:
                payload = {}
            sent = payload.get("sent")
            if sent is True or str(sent).lower() == "true":
                return ServiceResult(True, response.status_code, "WhatsApp sent")
            errors.append(str(payload.get("message", "UltraMsg did not confirm sent=true")))
        else:
            errors.append(f"Domain HTTP {response.status_code}")
    except requests.RequestException as exc:
        errors.append(f"Domain: {exc}")

    # Match the Flutter fallback: connect to a known IP while sending TLS SNI
    # and Host for api.ultramsg.com.
    if Config.ULTRAMSG_IP:
        try:
            status, content = _post_fixed_ip(
                Config.ULTRAMSG_HOST,
                Config.ULTRAMSG_IP,
                path,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": str(len(encoded)),
                },
                body=encoded,
            )
            if status == 200:
                try:
                    payload = json.loads(content)
                except ValueError:
                    payload = {}
                sent = payload.get("sent")
                if sent is True or str(sent).lower() == "true":
                    return ServiceResult(True, status, "WhatsApp sent")
                errors.append(str(payload.get("message", "UltraMsg IP fallback did not confirm sent=true")))
            else:
                errors.append(f"IP/SNI HTTP {status}")
        except (OSError, ssl.SSLError, http.client.HTTPException) as exc:
            errors.append(f"IP/SNI: {exc}")

    return ServiceResult(False, detail="; ".join(errors) or "WhatsApp request failed")


def build_confirmation_messages(data: AgricultureData) -> tuple[str, str]:
    name = data.name or "Customer"
    english = f"""✅ *Form Submitted Successfully!*

Dear {name},

Thank you for visiting the WTT International stall at Agri Intex 2026. We appreciate your interest in our RO90 & RO70.

We have received the following information:
• 📱 Mobile: {data.mobile_number}
• 🌾 Crops: {data.crops}
• 💧 Water Requirement: {data.water_requirement} L/day
• 🌍 Address: {data.address}

Our team will review your details and get back to you soon.

For further details, please feel free to contact us - 04214414454, +91 4214414454

- WTT Agri Intex Team"""

    tamil = f"""✅ *படிவம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!*

அன்புள்ள {name},

அக்ரி இன்டெக்ஸ் 2026 இல் WTT இன்டர்நேஷனல் அரங்கிற்கு வருகை தந்ததற்கு நன்றி. எங்களின் RO90 & RO70 பற்றிய உங்கள் ஆர்வத்தை நாங்கள் பாராட்டுகிறோம்.

நாங்கள் பின்வரும் தகவல்களைப் பெற்றுள்ளோம்:
• 📱 கைபேசி: {data.mobile_number}
• 🌾 பயிர்கள்: {data.crops}
• 💧 நீர் தேவை: {data.water_requirement} லிட்டர்/நாள்
• 🌍 முகவரி: {data.address}

எங்கள் குழு உங்கள் விவரங்களை மதிப்பாய்வு செய்து விரைவில் உங்களை தொடர்பு கொள்ளும்.

மேலும் விவரங்களுக்கு, எங்களை தொடர்பு கொள்ளவும் - 04214414454, +91 4214414454

- WTT அக்ரி இன்டெக்ஸ் குழு"""
    return english, tamil


def send_confirmation_whatsapp(data: AgricultureData) -> tuple[ServiceResult, ServiceResult]:
    english, tamil = build_confirmation_messages(data)
    return _ultramsg_request(data.mobile_number, english), _ultramsg_request(data.mobile_number, tamil)
