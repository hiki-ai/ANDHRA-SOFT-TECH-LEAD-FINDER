"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
TABLE PRESET & COLUMN DEFINITION MODEL
==============================================================================
Location: backend/app/models/table_preset.py

Defines schema for customizable table presets, default column definitions,
and initial preset templates (e.g., Furniture Leads).
==============================================================================
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# Supported data types
VALID_DATA_TYPES = [
    'text',
    'phone',
    'email',
    'url',
    'number',
    'rating',
    'date',
    'boolean',
]

# Canonical Default Columns mapping to existing database/vendor fields
DEFAULT_COLUMNS: List[Dict[str, Any]] = [
    {
        "key": "business_name",
        "name": "business_name",
        "label": "Business Name",
        "data_type": "text",
        "position": 0,
        "is_enabled": True,
        "is_required": True,
        "is_custom": False,
        "description": "Official business or company name",
    },
    {
        "key": "category",
        "name": "category",
        "label": "Category",
        "data_type": "text",
        "position": 1,
        "is_enabled": True,
        "is_required": False,
        "is_custom": False,
        "description": "Primary industry classification",
    },
    {
        "key": "phone",
        "name": "phone",
        "label": "Phone",
        "data_type": "phone",
        "position": 2,
        "is_enabled": True,
        "is_required": False,
        "is_custom": False,
        "description": "Primary contact telephone or mobile number",
    },
    {
        "key": "address",
        "name": "address",
        "label": "Address",
        "data_type": "text",
        "position": 3,
        "is_enabled": True,
        "is_required": False,
        "is_custom": False,
        "description": "Full street address or storefront location",
    },
    {
        "key": "city",
        "name": "city",
        "label": "City",
        "data_type": "text",
        "position": 4,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "City or municipality",
    },
    {
        "key": "state",
        "name": "state",
        "label": "State",
        "data_type": "text",
        "position": 5,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "State or administrative region",
    },
    {
        "key": "website",
        "name": "website",
        "label": "Website",
        "data_type": "url",
        "position": 6,
        "is_enabled": True,
        "is_required": False,
        "is_custom": False,
        "description": "Official company website or web profile",
    },
    {
        "key": "email",
        "name": "email",
        "label": "Email",
        "data_type": "email",
        "position": 7,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "Electronic mail contact address",
    },
    {
        "key": "rating",
        "name": "rating",
        "label": "Rating",
        "data_type": "rating",
        "position": 8,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "Customer feedback average score (0 to 5)",
    },
    {
        "key": "review_count",
        "name": "review_count",
        "label": "Review Count",
        "data_type": "number",
        "position": 9,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "Total count of public reviews",
    },
    {
        "key": "source",
        "name": "source",
        "label": "Source",
        "data_type": "text",
        "position": 10,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "Source provider name",
    },
    {
        "key": "source_id",
        "name": "source_id",
        "label": "Source ID",
        "data_type": "text",
        "position": 11,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "Provider external record identifier (place_id)",
    },
    {
        "key": "status",
        "name": "status",
        "label": "Status",
        "data_type": "text",
        "position": 12,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "Lead verification status (valid, duplicate, invalid)",
    },
    {
        "key": "data_quality_score",
        "name": "data_quality_score",
        "label": "Data Quality",
        "data_type": "number",
        "position": 13,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "Automated data completeness score (0-100)",
    },
    {
        "key": "created_at",
        "name": "created_at",
        "label": "Created At",
        "data_type": "date",
        "position": 14,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "Record creation timestamp",
    },
    {
        "key": "updated_at",
        "name": "updated_at",
        "label": "Updated At",
        "data_type": "date",
        "position": 15,
        "is_enabled": False,
        "is_required": False,
        "is_custom": False,
        "description": "Record last updated timestamp",
    },
]

def build_furniture_leads_columns() -> List[Dict[str, Any]]:
    """
    Constructs the ordered column definitions for the 'Furniture Leads' preset.
    Exact enabled order:
    1. Business Name
    2. Category
    3. Phone
    4. Address
    5. Website
    All other default columns are present but disabled.
    """
    ordered_keys = ["business_name", "category", "phone", "address", "website"]
    columns = []

    # 1. Add enabled columns in exact order
    for idx, key in enumerate(ordered_keys):
        base = next((c for c in DEFAULT_COLUMNS if c["key"] == key), None)
        if base:
            col = dict(base)
            col["position"] = idx
            col["is_enabled"] = True
            col["is_required"] = (key == "business_name")
            columns.append(col)

    # 2. Add remaining default columns in disabled state
    cur_pos = len(ordered_keys)
    for base in DEFAULT_COLUMNS:
        if base["key"] not in ordered_keys:
            col = dict(base)
            col["position"] = cur_pos
            col["is_enabled"] = False
            col["is_required"] = False
            columns.append(col)
            cur_pos += 1

    return columns


def build_all_columns() -> List[Dict[str, Any]]:
    """Constructs column definitions with all standard vendor attributes enabled."""
    columns = []
    for idx, base in enumerate(DEFAULT_COLUMNS):
        col = dict(base)
        col["position"] = idx
        col["is_enabled"] = True
        col["is_required"] = (base["key"] == "business_name")
        columns.append(col)
    return columns


# Canonical System Presets
INITIAL_PRESETS: List[Dict[str, Any]] = [
    {
        "id": "preset_furniture_leads",
        "name": "Furniture Leads",
        "description": "Optimized preset for furniture vendor lead extraction with essential contact details.",
        "is_system": True,
        "is_default": True,
        "columns": build_furniture_leads_columns(),
        "enabled_columns": ["business_name", "category", "phone", "address", "website"],
        "required_columns": ["business_name"],
        "extraction_config": {
            "source": "google_places",
            "enforce_required": True,
        },
        "export_config": {
            "include_headers": True,
            "format": "xlsx",
        },
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": "preset_all_columns",
        "name": "All Columns (Standard)",
        "description": "Complete vendor schema with all default attributes enabled.",
        "is_system": True,
        "is_default": False,
        "columns": build_all_columns(),
        "enabled_columns": [c["key"] for c in DEFAULT_COLUMNS],
        "required_columns": ["business_name"],
        "extraction_config": {
            "source": "google_places",
            "enforce_required": True,
        },
        "export_config": {
            "include_headers": True,
            "format": "xlsx",
        },
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    },
]


@dataclass
class TablePreset:
    name: str
    id: str = field(default_factory=lambda: f"preset_{uuid.uuid4().hex[:8]}")
    description: Optional[str] = ""
    columns: List[Dict[str, Any]] = field(default_factory=list)
    enabled_columns: List[str] = field(default_factory=list)
    required_columns: List[str] = field(default_factory=list)
    extraction_config: Dict[str, Any] = field(default_factory=dict)
    export_config: Dict[str, Any] = field(default_factory=dict)
    is_system: bool = False
    is_default: bool = False
    user_id: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}
