"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
BILLING AND TRIAL SYSTEM SETTINGS MODEL
==============================================================================
Location: backend/app/models/billing_settings.py
==============================================================================
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any

DEFAULT_TRIAL_SETTINGS = {
    "free_trial_enabled": True,
    "default_trial_record_limit": 30,
    "trial_duration_days": 14,
    "prevent_duplicate_accounts": True,
    "tax_rate_percent": 18.0,
    "currency": "INR",
    "updated_at": datetime.now(timezone.utc).isoformat()
}

@dataclass
class BillingSettings:
    free_trial_enabled: bool = True
    default_trial_record_limit: int = 30
    trial_duration_days: int = 14
    prevent_duplicate_accounts: bool = True
    tax_rate_percent: float = 18.0
    currency: str = "INR"
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "free_trial_enabled": bool(self.free_trial_enabled),
            "default_trial_record_limit": int(self.default_trial_record_limit),
            "trial_duration_days": int(self.trial_duration_days),
            "prevent_duplicate_accounts": bool(self.prevent_duplicate_accounts),
            "tax_rate_percent": float(self.tax_rate_percent),
            "currency": self.currency,
            "updated_at": self.updated_at
        }

