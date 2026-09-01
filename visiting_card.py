from __future__ import annotations

import base64
import json
import logging
import re
from dataclasses import asdict, dataclass

import requests

from config import Config

log = logging.getLogger(__name__)
SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


class VisitingCardError(RuntimeError):
    pass


@dataclass
class VisitingCardData:
    company_name: str = ""
    contact_person: str = ""
    designation: str = ""
    mobile_number: str = ""
    email: str = ""
    address: str = ""

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


def _clean_text(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def _clean_mobile(value: object) -> str:
    text = _clean_text(value)
    if not text:
        return ""
    has_plus = text.lstrip().startswith("+")
    digits = re.sub(r"\D", "", text)
    if not digits:
        return ""
    return f"+{digits}" if has_plus else digits


def _extract_output_text(api_payload: dict) -> str:
    for item in api_payload.get("output", []) or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []) or []:
            if isinstance(content, dict) and content.get("type") == "output_text" and content.get("text"):
                return str(content["text"])
    if api_payload.get("output_text"):
        return str(api_payload["output_text"])
    return ""


def _parse_json_object(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        value = json.loads(cleaned)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            value = json.loads(cleaned[start : end + 1])
            return value if isinstance(value, dict) else {}
        raise


def scan_visiting_card(image_bytes: bytes, mime_type: str, qr_text: str = "") -> VisitingCardData:
    if not Config.OPENAI_API_KEY:
        raise VisitingCardError("OPENAI_API_KEY is not configured on the server")
    if mime_type not in SUPPORTED_IMAGE_TYPES:
        raise VisitingCardError("Unsupported image format. Please use JPG, PNG, or WEBP")
    if not image_bytes:
        raise VisitingCardError("The visiting card image is empty")
    if len(image_bytes) > Config.OPENAI_MAX_IMAGE_BYTES:
        raise VisitingCardError(f"Image is too large. Maximum allowed size is {Config.OPENAI_MAX_IMAGE_MB} MB")

    data_url = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('ascii')}"
    qr_hint = _clean_text(qr_text)
    qr_section = ""
    if qr_hint:
        qr_section = f"\nA QR decoder also found this encoded text from the image. Treat it as supporting evidence and extract contact details from it when it is a vCard, MECARD, mailto, tel, URL, or contact record:\n{qr_hint}\n"

    instructions = f"""
Extract contact information from this photographed business/visiting card for a WTT exhibition enquiry.
The image may contain a normal printed visiting card, a QR code, or both.
Read printed text and use the QR information below when available.
Use only information supported by the image or QR payload. Never invent missing facts.
Return exactly these string fields:
- company_name: printed company / organization name
- contact_person: person's full name
- designation: person's printed job title / designation
- mobile_number: best direct/mobile phone number
- email: printed or QR-provided email address
- address: printed or QR-provided business/postal address, city, district, or location
If a field cannot be read confidently, return an empty string.
{qr_section}
""".strip()

    schema = {
        "type": "object",
        "properties": {key: {"type": "string"} for key in [
            "company_name", "contact_person", "designation", "mobile_number", "email", "address"
        ]},
        "required": ["company_name", "contact_person", "designation", "mobile_number", "email", "address"],
        "additionalProperties": False,
    }
    payload = {
        "model": Config.OPENAI_VISION_MODEL,
        "input": [{"role": "user", "content": [
            {"type": "input_text", "text": instructions},
            {"type": "input_image", "image_url": data_url, "detail": "original"},
        ]}],
        "reasoning": {"effort": "low"},
        "text": {"format": {"type": "json_schema", "name": "exhibition_contact_scan", "strict": True, "schema": schema}},
        "max_output_tokens": 500,
    }

    try:
        response = requests.post(
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {Config.OPENAI_API_KEY}", "Content-Type": "application/json"},
            json=payload,
            timeout=Config.OPENAI_REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise VisitingCardError("Could not reach OpenAI. Please check the internet connection") from exc

    if not response.ok:
        detail = ""
        try:
            detail = _clean_text((response.json().get("error") or {}).get("message"))
        except Exception:
            detail = _clean_text(response.text[:300])
        if response.status_code == 401:
            raise VisitingCardError("OpenAI API key is invalid or not authorized")
        if response.status_code == 429:
            raise VisitingCardError("OpenAI rate limit or quota reached. Please try again shortly")
        raise VisitingCardError(detail or "OpenAI could not scan this visiting card or QR code")

    try:
        output_text = _extract_output_text(response.json())
        extracted = _parse_json_object(output_text)
    except Exception as exc:
        log.warning("Could not parse contact scan response: %s", exc)
        raise VisitingCardError("The card/QR could not be read clearly. Please try another image") from exc

    return VisitingCardData(
        company_name=_clean_text(extracted.get("company_name")),
        contact_person=_clean_text(extracted.get("contact_person")),
        designation=_clean_text(extracted.get("designation")),
        mobile_number=_clean_mobile(extracted.get("mobile_number")),
        email=_clean_text(extracted.get("email")),
        address=_clean_text(extracted.get("address")),
    )


def scan_qr_contact(qr_text: str) -> VisitingCardData:
    """Extract contact details from already-decoded QR text.

    This is intentionally text-only so the live QR camera can close immediately
    after detection and does not need to upload a photographed QR frame to OpenAI.
    """
    if not Config.OPENAI_API_KEY:
        raise VisitingCardError("OPENAI_API_KEY is not configured on the server")

    qr_hint = _clean_text(qr_text)
    if not qr_hint:
        raise VisitingCardError("No QR data was detected")

    instructions = f"""
Extract contact information from this decoded QR payload for a WTT exhibition enquiry.
The payload may be a vCard, MECARD, mailto link, tel link, contact URL, plain text,
or another contact-card format.
Use only information explicitly supported by the QR payload. Never invent missing facts.
Return exactly these string fields:
- company_name: company / organization name
- contact_person: person's full name
- designation: person's job title / designation
- mobile_number: best direct/mobile phone number
- email: email address
- address: business/postal address, city, district, or location
If a field is not present, return an empty string.

Decoded QR payload:
{qr_hint}
""".strip()

    schema = {
        "type": "object",
        "properties": {key: {"type": "string"} for key in [
            "company_name", "contact_person", "designation", "mobile_number", "email", "address"
        ]},
        "required": ["company_name", "contact_person", "designation", "mobile_number", "email", "address"],
        "additionalProperties": False,
    }
    payload = {
        "model": Config.OPENAI_VISION_MODEL,
        "input": [{"role": "user", "content": [{"type": "input_text", "text": instructions}]}],
        "reasoning": {"effort": "low"},
        "text": {"format": {"type": "json_schema", "name": "exhibition_qr_contact", "strict": True, "schema": schema}},
        "max_output_tokens": 400,
    }

    try:
        response = requests.post(
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {Config.OPENAI_API_KEY}", "Content-Type": "application/json"},
            json=payload,
            timeout=Config.OPENAI_REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise VisitingCardError("Could not reach OpenAI. Please check the internet connection") from exc

    if not response.ok:
        detail = ""
        try:
            detail = _clean_text((response.json().get("error") or {}).get("message"))
        except Exception:
            detail = _clean_text(response.text[:300])
        if response.status_code == 401:
            raise VisitingCardError("OpenAI API key is invalid or not authorized")
        if response.status_code == 429:
            raise VisitingCardError("OpenAI rate limit or quota reached. Please try again shortly")
        raise VisitingCardError(detail or "OpenAI could not read the QR contact data")

    try:
        output_text = _extract_output_text(response.json())
        extracted = _parse_json_object(output_text)
    except Exception as exc:
        log.warning("Could not parse QR contact response: %s", exc)
        raise VisitingCardError("The QR contact data could not be interpreted") from exc

    return VisitingCardData(
        company_name=_clean_text(extracted.get("company_name")),
        contact_person=_clean_text(extracted.get("contact_person")),
        designation=_clean_text(extracted.get("designation")),
        mobile_number=_clean_mobile(extracted.get("mobile_number")),
        email=_clean_text(extracted.get("email")),
        address=_clean_text(extracted.get("address")),
    )
