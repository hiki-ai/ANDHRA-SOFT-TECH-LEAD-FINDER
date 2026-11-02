"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
PREMIUM SUBSCRIPTION PLANS MODEL & SEED
==============================================================================
Location: backend/app/models/plan.py
==============================================================================
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

INITIAL_PLANS = [
    {
        "plan_id": "basic",
        "name": "Basic Plan",
        "description": "Essential lead extraction for startups and individual consultants.",
        "monthly_price_paise": 49900,  # ₹499
        "yearly_price_paise": 499000,  # ₹4,990
        "discount_label": "Save 17%",
        "features": [
            "5,000 lead extraction records per month",
            "Google Maps / Places API access",
            "CSV & Excel (XLSX) lead exports",
            "Basic deduplication & data quality scoring",
            "Standard email support"
        ],
        "limits": {
            "extraction_limit": 5000,
            "collection_limit": 20,
            "preset_limit": 3,
            "team_members": 1,
            "can_export": True,
            "can_analytics": False
        },
        "is_active": True,
        "is_popular": False,
        "display_order": 1,
        "cta_text": "Choose Basic"
    },
    {
        "plan_id": "pro",
        "name": "Pro Plan",
        "description": "Comprehensive lead intelligence for growing agencies and sales teams.",
        "monthly_price_paise": 99900,  # ₹999
        "yearly_price_paise": 999000,  # ₹9,990
        "discount_label": "Save 17%",
        "features": [
            "25,000 lead extraction records per month",
            "Google Maps, Justdial & Magicpin connectors",
            "Unlimited CSV & Excel exports",
            "Advanced Table Editor & custom column presets",
            "Automated deduplication & high-fidelity phone validation",
            "Advanced billing & lead analytics",
            "Priority technical support"
        ],
        "limits": {
            "extraction_limit": 25000,
            "collection_limit": 100,
            "preset_limit": 15,
            "team_members": 5,
            "can_export": True,
            "can_analytics": True
        },
        "is_active": True,
        "is_popular": True,
        "display_order": 2,
        "cta_text": "Get Pro Now"
    },
    {
        "plan_id": "business",
        "name": "Business Plan",
        "description": "Maximum extraction volume, high-speed concurrency, and custom integrations.",
        "monthly_price_paise": 199900,  # ₹1,999
        "yearly_price_paise": 1999000,  # ₹19,990
        "discount_label": "Save 17%",
        "features": [
            "100,000 lead extraction records per month",
            "All official data source connectors",
            "Unlimited concurrent collection jobs",
            "Unlimited custom column presets & schemas",
            "Automated phone/address normalization & deduplication",
            "Dedicated account manager & 24/7 priority support",
            "Full API access & team seats"
        ],
        "limits": {
            "extraction_limit": 100000,
            "collection_limit": -1,
            "preset_limit": -1,
            "team_members": 20,
            "can_export": True,
            "can_analytics": True
        },
        "is_active": True,
        "is_popular": False,
        "display_order": 3,
        "cta_text": "Choose Business"
    }
]

@dataclass
class Plan:
    plan_id: str
    name: str
    description: str
    monthly_price_paise: int
    yearly_price_paise: int
    features: List[str] = field(default_factory=list)
    limits: Dict[str, Any] = field(default_factory=dict)
    discount_label: str = "Save 17%"
    is_active: bool = True
    is_popular: bool = False
    display_order: int = 1
    cta_text: str = "Choose Plan"
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plan_id": self.plan_id,
            "name": self.name,
            "description": self.description,
            "monthly_price_paise": int(self.monthly_price_paise),
            "yearly_price_paise": int(self.yearly_price_paise),
            "discount_label": self.discount_label,
            "features": list(self.features),
            "limits": dict(self.limits),
            "is_active": bool(self.is_active),
            "is_popular": bool(self.is_popular),
            "display_order": int(self.display_order),
            "cta_text": self.cta_text,
            "updated_at": self.updated_at
        }

