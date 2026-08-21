from __future__ import annotations

import base64
import json
import logging
import re
from dataclasses import dataclass, asdict

import requests

from config import Config

log = logging.getLogger(__name__)

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


class VisitingCardError(RuntimeError):
    """Raised when a visiting card cannot be scanned safely/reliably."""


@dataclass
class VisitingCardData:
    name: str = ""
    mobile_number: str = ""
    district: str = ""
    raw_address: str = ""

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

    # Keep a leading + when present, but remove spaces, dashes, brackets, etc.
    has_plus = text.lstrip().startswith("+")
    digits = re.sub(r"\D", "", text)
    if not digits:
        return ""

    # Indian cards often print +91 / 91 before a 10-digit mobile number.
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}" if has_plus else digits[-10:]
    return f"+{digits}" if has_plus else digits


def _extract_output_text(api_payload: dict) -> str:
    # The Responses API normally returns message content items of type output_text.
    for item in api_payload.get("output", []) or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []) or []:
            if not isinstance(content, dict):
                continue
            if content.get("type") == "output_text" and content.get("text"):
                return str(content["text"])

    # Some SDK/API representations surface output_text at the top level.
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
        # Defensive fallback if the model wrapped the JSON in a short sentence.
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
        raise VisitingCardError(
            f"Image is too large. Maximum allowed size is {Config.OPENAI_MAX_IMAGE_MB} MB"
        )

    encoded = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:{mime_type};base64,{encoded}"

    instructions = """
You are extracting contact information from a photographed visiting/business card for an agricultural field-data form in India.
Read only information supported by the card image. Do not invent missing information.
Return ONLY one JSON object with exactly these string keys:
{
  "name": "person's full name",
  "mobile_number": "best personal/mobile phone number",
  "district": "district or concise city/location suitable for the District field",
  "raw_address": "printed postal/business address"
}
Rules:
- Prefer the person's name, not the company name.
- Prefer a mobile/cell number. If several phone numbers exist, choose the most likely direct mobile number.
- For district, use a district explicitly printed on the card. If district is not printed but a clearly identifiable Indian city/town/location is present in the address, return that concise location. Otherwise return an empty string.
- Preserve useful spelling from the card. Do not add facts from general knowledge.
- If a field cannot be read confidently, return an empty string for that field.
""".strip()

    payload = {
        "model": Config.OPENAI_VISION_MODEL,
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": instructions},
                    {"type": "input_image", "image_url": data_url, "detail": "original"},
                ],
            }
        ],
        "reasoning": {"effort": "low"},
        "text": {
            "format": {
                "type": "json_schema",
                "name": "visiting_card_contact",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "mobile_number": {"type": "string"},
                        "district": {"type": "string"},
                        "raw_address": {"type": "string"},
                    },
                    "required": ["name", "mobile_number", "district", "raw_address"],
                    "additionalProperties": False,
                },
            }
        },
        "max_output_tokens": 300,
    }

    try:
        response = requests.post(
            "https://api.openai.com/v1/responses",
            headers={
                "Authorization": f"Bearer {Config.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=Config.OPENAI_REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        log.warning("OpenAI visiting-card request failed: %s", exc)
        raise VisitingCardError("Could not reach OpenAI. Please check the internet connection") from exc

    if not response.ok:
        detail = ""
        try:
            body = response.json()
            detail = _clean_text((body.get("error") or {}).get("message"))
        except Exception:
            detail = _clean_text(response.text[:300])
        log.warning("OpenAI visiting-card scan returned HTTP %s: %s", response.status_code, detail)
        if response.status_code == 401:
            raise VisitingCardError("OpenAI API key is invalid or not authorized")
        if response.status_code == 429:
            raise VisitingCardError("OpenAI rate limit or quota reached. Please try again shortly")
        raise VisitingCardError(detail or "OpenAI could not scan this visiting card")

    try:
        api_payload = response.json()
        output_text = _extract_output_text(api_payload)
        if not output_text:
            raise ValueError("OpenAI returned no text output")
        extracted = _parse_json_object(output_text)
    except (ValueError, json.JSONDecodeError, TypeError) as exc:
        log.warning("Could not parse visiting-card response: %s", exc)
        raise VisitingCardError("The visiting card could not be read clearly. Please try another photo") from exc

    return VisitingCardData(
        name=_clean_text(extracted.get("name")),
        mobile_number=_clean_mobile(extracted.get("mobile_number")),
        district=_clean_text(extracted.get("district")),
        raw_address=_clean_text(extracted.get("raw_address")),
    )
