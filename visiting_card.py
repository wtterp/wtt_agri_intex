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


def scan_visiting_card(image_bytes: bytes, mime_type: str) -> VisitingCardData:
    if not Config.OPENAI_API_KEY:
        raise VisitingCardError("OPENAI_API_KEY is not configured on the server")
    if mime_type not in SUPPORTED_IMAGE_TYPES:
        raise VisitingCardError("Unsupported image format. Please use JPG, PNG, or WEBP")
    if not image_bytes:
        raise VisitingCardError("The visiting card image is empty")
    if len(image_bytes) > Config.OPENAI_MAX_IMAGE_BYTES:
        raise VisitingCardError(f"Image is too large. Maximum allowed size is {Config.OPENAI_MAX_IMAGE_MB} MB")

    data_url = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('ascii')}"
    instructions = """
Extract contact information from this photographed business/visiting card for a WTT water and wastewater exhibition lead form.
Use only text supported by the image. Never invent missing facts.
Return exactly these string fields:
- company_name: printed company / organization name
- contact_person: person's full name
- designation: person's printed job title / designation
- mobile_number: best direct/mobile phone number
- email: printed email address
- address: printed business/postal address or concise city/location if only that is available
If a field cannot be read confidently, return an empty string.
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
        "text": {"format": {"type": "json_schema", "name": "exhibition_visiting_card", "strict": True, "schema": schema}},
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
        raise VisitingCardError(detail or "OpenAI could not scan this visiting card")

    try:
        output_text = _extract_output_text(response.json())
        extracted = _parse_json_object(output_text)
    except Exception as exc:
        log.warning("Could not parse visiting-card response: %s", exc)
        raise VisitingCardError("The visiting card could not be read clearly. Please try another photo") from exc

    return VisitingCardData(
        company_name=_clean_text(extracted.get("company_name")),
        contact_person=_clean_text(extracted.get("contact_person")),
        designation=_clean_text(extracted.get("designation")),
        mobile_number=_clean_mobile(extracted.get("mobile_number")),
        email=_clean_text(extracted.get("email")),
        address=_clean_text(extracted.get("address")),
    )
