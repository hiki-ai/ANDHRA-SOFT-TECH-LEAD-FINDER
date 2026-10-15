"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
SOURCE CAPABILITIES & FIELD MAPPING REGISTRY
==============================================================================
Location: worker/collectors/source_capabilities.py

Audits the actual capability of authorized provider connectors to supply
configured vendor attributes. Prevents data fabrication and blocks collection
when required columns cannot be fulfilled.
==============================================================================
"""

from typing import Dict, Any, List, Optional

SOURCE_FIELD_CAPABILITIES: Dict[str, Dict[str, Dict[str, Any]]] = {
    "google_places": {
        "business_name": {
            "supported": True,
            "source_field": "places.displayName.text",
            "availability": "full",
            "description": "Retrieved directly from Google Places displayName text attribute.",
        },
        "category": {
            "supported": True,
            "source_field": "search query / places.types",
            "availability": "full",
            "description": "Mapped from the collection search query or Google Place types.",
        },
        "phone": {
            "supported": True,
            "source_field": "places.nationalPhoneNumber / places.internationalPhoneNumber",
            "availability": "full",
            "description": "Retrieved from national or international phone number attributes.",
        },
        "address": {
            "supported": True,
            "source_field": "places.formattedAddress",
            "availability": "full",
            "description": "Complete formatted street address from Google Places Platform.",
        },
        "city": {
            "supported": True,
            "source_field": "derived from target location / formattedAddress",
            "availability": "derived",
            "description": "Parsed from target geographic query or address locality.",
        },
        "state": {
            "supported": True,
            "source_field": "derived from target location / formattedAddress",
            "availability": "derived",
            "description": "Derived from administrative area level 1 or target state.",
        },
        "website": {
            "supported": True,
            "source_field": "places.websiteUri",
            "availability": "full",
            "description": "Official company website URL from Google Places.",
        },
        "rating": {
            "supported": True,
            "source_field": "places.rating",
            "availability": "full",
            "description": "Average user rating score (0.0 to 5.0).",
        },
        "review_count": {
            "supported": True,
            "source_field": "places.userRatingCount",
            "availability": "full",
            "description": "Total count of public reviews on Google Maps.",
        },
        "source": {
            "supported": True,
            "source_field": "system provider name",
            "availability": "full",
            "description": "Always set to 'Google Maps / Google Places API'.",
        },
        "source_id": {
            "supported": True,
            "source_field": "places.id",
            "availability": "full",
            "description": "Unique Google Places resource identifier (place_id).",
        },
        "place_id": {
            "supported": True,
            "source_field": "places.id",
            "availability": "full",
            "description": "Unique Google Places resource identifier (place_id).",
        },
        "status": {
            "supported": True,
            "source_field": "validation pipeline",
            "availability": "derived",
            "description": "Set to valid, duplicate, or invalid by the verification pipeline.",
        },
        "data_quality_score": {
            "supported": True,
            "source_field": "scoring pipeline",
            "availability": "derived",
            "description": "Calculated score based on field completeness and phone validity.",
        },
        "created_at": {
            "supported": True,
            "source_field": "system timestamp",
            "availability": "derived",
            "description": "ISO 8601 ingestion timestamp.",
        },
        "updated_at": {
            "supported": True,
            "source_field": "system timestamp",
            "availability": "derived",
            "description": "ISO 8601 record update timestamp.",
        },
        # Explicitly unsupported fields:
        "email": {
            "supported": False,
            "source_field": None,
            "availability": "unavailable",
            "reason": "Google Maps Platform Places API does not provide electronic mail addresses.",
        },
        "alternate_phone": {
            "supported": False,
            "source_field": None,
            "availability": "unavailable",
            "reason": "Google Places API yields a single primary phone number.",
        },
        "pincode": {
            "supported": False,
            "source_field": None,
            "availability": "partial",
            "reason": "Pincode is embedded in formattedAddress string and not provided as an isolated field.",
        },
        "area": {
            "supported": False,
            "source_field": None,
            "availability": "partial",
            "reason": "Neighborhood/Area is embedded in formattedAddress and not separated.",
        },
        "district": {
            "supported": False,
            "source_field": None,
            "availability": "partial",
            "reason": "District name is not broken out by Google Places text search.",
        },
        "subcategory": {
            "supported": False,
            "source_field": None,
            "availability": "unavailable",
            "reason": "Subcategories are not categorized separately by Google Places API.",
        },
    },
    "justdial": {
        "business_name": {"supported": True, "source_field": "company_name", "availability": "full"},
        "category": {"supported": True, "source_field": "category", "availability": "full"},
        "phone": {"supported": True, "source_field": "phone_numbers", "availability": "full"},
        "address": {"supported": True, "source_field": "full_address", "availability": "full"},
        "city": {"supported": True, "source_field": "city", "availability": "full"},
        "state": {"supported": True, "source_field": "state", "availability": "full"},
        "website": {"supported": True, "source_field": "website", "availability": "full"},
        "rating": {"supported": True, "source_field": "rating", "availability": "full"},
        "review_count": {"supported": True, "source_field": "rating_count", "availability": "full"},
        "source": {"supported": True, "source_field": "system", "availability": "full"},
        "source_id": {"supported": True, "source_field": "doc_id", "availability": "full"},
        "status": {"supported": True, "source_field": "derived", "availability": "derived"},
        "data_quality_score": {"supported": True, "source_field": "derived", "availability": "derived"},
        "created_at": {"supported": True, "source_field": "system", "availability": "derived"},
        "updated_at": {"supported": True, "source_field": "system", "availability": "derived"},
        "email": {
            "supported": False,
            "source_field": None,
            "availability": "unavailable",
            "reason": "Justdial public directory does not supply email addresses.",
        },
    },
    "magicpin": {
        "business_name": {"supported": True, "source_field": "merchant_name", "availability": "full"},
        "category": {"supported": True, "source_field": "category", "availability": "full"},
        "phone": {"supported": True, "source_field": "phone", "availability": "full"},
        "address": {"supported": True, "source_field": "location_address", "availability": "full"},
        "city": {"supported": True, "source_field": "city", "availability": "full"},
        "state": {"supported": True, "source_field": "state", "availability": "full"},
        "website": {"supported": True, "source_field": "merchant_website", "availability": "full"},
        "rating": {"supported": True, "source_field": "rating", "availability": "full"},
        "source": {"supported": True, "source_field": "system", "availability": "full"},
        "source_id": {"supported": True, "source_field": "merchant_id", "availability": "full"},
        "status": {"supported": True, "source_field": "derived", "availability": "derived"},
        "data_quality_score": {"supported": True, "source_field": "derived", "availability": "derived"},
        "created_at": {"supported": True, "source_field": "system", "availability": "derived"},
        "updated_at": {"supported": True, "source_field": "system", "availability": "derived"},
        "email": {
            "supported": False,
            "source_field": None,
            "availability": "unavailable",
            "reason": "Magicpin merchant platform does not supply email addresses.",
        },
    },
}


def is_field_supported(source_id: str, field_key: str) -> bool:
    """Returns True if the source connector can legitimately supply the field."""
    source_clean = (source_id or 'google_places').strip().lower()
    source_caps = SOURCE_FIELD_CAPABILITIES.get(source_clean, {})
    field_info = source_caps.get(field_key)
    if not field_info:
        # Custom columns are not supported by standard raw collectors
        return False
    return bool(field_info.get("supported", False))


def get_field_capability_info(source_id: str, field_key: str) -> Dict[str, Any]:
    """Returns diagnostic capability dictionary for a single field on a source."""
    source_clean = (source_id or 'google_places').strip().lower()
    source_caps = SOURCE_FIELD_CAPABILITIES.get(source_clean, {})
    if field_key in source_caps:
        return source_caps[field_key]
    return {
        "supported": False,
        "availability": "unavailable",
        "reason": f"Custom or unmapped field '{field_key}' cannot be supplied by raw {source_clean} connector.",
    }


def check_source_capabilities(
    source_id: str,
    columns: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Validates a set of column definitions against a source connector.
    
    Rules:
    - If a required column cannot be supplied: BLOCKS collection (is_valid = False).
    - If an optional column cannot be supplied: ADDS warning, collection permitted (value stored as null/blank).
    """
    source_clean = (source_id or 'google_places').strip().lower()
    blocking_errors: List[str] = []
    warnings: List[str] = []
    column_statuses: Dict[str, Dict[str, Any]] = {}

    for col in columns:
        # Check enabled columns
        is_enabled = col.get("is_enabled", True)
        if not is_enabled:
            continue

        key = col.get("key") or col.get("name")
        label = col.get("label") or key
        is_required = bool(col.get("is_required", False))

        cap = get_field_capability_info(source_clean, key)
        is_supp = cap.get("supported", False)
        column_statuses[key] = {
            "key": key,
            "label": label,
            "supported": is_supp,
            "is_required": is_required,
            "availability": cap.get("availability", "unavailable"),
            "reason": cap.get("reason", ""),
        }

        if not is_supp:
            if is_required:
                blocking_errors.append(
                    f"Required column '{label}' cannot be supplied by source '{source_clean}'. "
                    f"Reason: {cap.get('reason', 'Unsupported by connector')}"
                )
            else:
                warnings.append(
                    f"Column '{label}' is not supplied by source '{source_clean}' and will remain blank. "
                    f"({cap.get('reason', 'Unsupported')})"
                )

    return {
        "source_id": source_clean,
        "is_valid": len(blocking_errors) == 0,
        "blocking_errors": blocking_errors,
        "warnings": warnings,
        "column_statuses": column_statuses,
    }
