import re
from typing import Dict, List

ADDRESS_NOISE = re.compile(r"[\u2022|]+")
PHONE_PATTERN = re.compile(r"(?:\+?91[-\s]?)?0?[6-9]\d{9}")
MULTISPACE_PATTERN = re.compile(r"\s+")
PINCODE_PATTERN = re.compile(r"\b\d{6}\b")
ADDRESS_HINT_PATTERN = re.compile(
    r"(road|rd|street|st|lane|ln|nagar|colony|phase|block|plot|flat|apartment|apt|house|h[-\s]?no|near|opp|opposite|village|mandal|district|hyderabad|telangana|india)",
    re.IGNORECASE,
)


def _clean_segment(segment: str) -> str:
    segment = segment.strip(" ,.-")
    segment = re.sub(r"(?i)\bh\s*[-:]?\s*no\b", "House No", segment)
    segment = re.sub(r"^\d+\s+(?=[A-Za-z])", "", segment)
    segment = MULTISPACE_PATTERN.sub(" ", segment)
    return segment.strip()


def normalize_address_text(raw_address: str) -> Dict[str, str]:
    raw_address = (raw_address or "").strip()
    if not raw_address:
        return {
            "original": "",
            "label": "",
            "phone_number": "",
            "normalized": "",
            "geocode_query": "",
            "short_display": "",
        }

    normalized = ADDRESS_NOISE.sub(", ", raw_address.replace("\n", ", ").replace(";", ", "))
    normalized = re.sub(r",+", ",", normalized)

    phone_match = PHONE_PATTERN.search(normalized)
    phone_number = phone_match.group(0) if phone_match else ""
    if phone_number:
        normalized = normalized.replace(phone_number, " ")

    segments = [_clean_segment(part) for part in normalized.split(",")]
    segments = [part for part in segments if part]

    label = ""
    if len(segments) > 1:
        first = segments[0]
        if not PINCODE_PATTERN.search(first) and not ADDRESS_HINT_PATTERN.search(first):
            label = first
            segments = segments[1:]

    deduped_segments = []
    seen = set()
    for segment in segments:
        lowered = segment.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        deduped_segments.append(segment)

    normalized_address = ", ".join(deduped_segments)
    normalized_address = MULTISPACE_PATTERN.sub(" ", normalized_address).strip(" ,")

    geocode_candidates = build_geocode_candidates(normalized_address)
    geocode_query = geocode_candidates[0] if geocode_candidates else normalized_address

    short_display = normalized_address
    if label:
        short_display = f"{label}, {normalized_address}" if normalized_address else label

    return {
        "original": raw_address,
        "label": label,
        "phone_number": phone_number,
        "normalized": normalized_address,
        "geocode_query": geocode_query,
        "short_display": short_display,
    }


def build_geocode_candidates(normalized_address: str) -> List[str]:
    normalized_address = MULTISPACE_PATTERN.sub(" ", (normalized_address or "").strip(" ,"))
    if not normalized_address:
        return []

    parts = [part.strip() for part in normalized_address.split(",") if part.strip()]
    candidates = [normalized_address]

    if len(parts) >= 4:
        candidates.append(", ".join(parts[-4:]))
    if len(parts) >= 3:
        candidates.append(", ".join(parts[-3:]))

    pincode_match = PINCODE_PATTERN.search(normalized_address)
    locality_parts = [part for part in parts if len(part) > 2]
    if pincode_match and locality_parts:
        candidates.append(f"{', '.join(locality_parts[-3:])} {pincode_match.group(0)}")

    candidates.append(normalized_address.replace(",", " "))

    unique_candidates = []
    seen = set()
    for candidate in candidates:
        compact = MULTISPACE_PATTERN.sub(" ", candidate).strip(" ,")
        if compact and compact.lower() not in seen:
            seen.add(compact.lower())
            unique_candidates.append(compact)

    return unique_candidates
