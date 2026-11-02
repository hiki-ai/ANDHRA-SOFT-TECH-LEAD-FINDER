"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
FREE TRIAL DATA MODEL
==============================================================================
Location: backend/app/models/trial.py
==============================================================================
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

DEFAULT_TRIAL_LIMIT = 30  # Default 30 unique vendor records

@dataclass
class Trial:
    user_id: str
    trial_status: str = "active"  # 'active', 'completed', 'expired', 'disabled'
    trial_limit: int = DEFAULT_TRIAL_LIMIT
    trial_used: int = 0
    trial_remaining: int = DEFAULT_TRIAL_LIMIT
    trial_started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    trial_expires_at: Optional[str] = None
    trial_completed_at: Optional[str] = None
    unique_vendor_hashes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "trial_status": self.trial_status,
            "trial_limit": int(self.trial_limit),
            "trial_used": int(self.trial_used),
            "trial_remaining": max(0, int(self.trial_limit) - int(self.trial_used)),
            "trial_started_at": self.trial_started_at,
            "trial_expires_at": self.trial_expires_at,
            "trial_completed_at": self.trial_completed_at,
            "unique_vendor_hashes": list(self.unique_vendor_hashes)
        }

