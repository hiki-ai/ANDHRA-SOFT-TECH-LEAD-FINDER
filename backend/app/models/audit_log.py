"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
ADMIN AUDIT LOG MODEL
==============================================================================
Location: backend/app/models/audit_log.py
==============================================================================
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, Optional

@dataclass
class AuditLog:
    id: str
    admin_uid: str
    admin_email: str
    action: str  # e.g., 'UPDATE_PLAN', 'UPDATE_TRIAL_SETTINGS', 'CANCEL_SUBSCRIPTION'
    resource_type: str  # 'plan', 'trial_settings', 'subscription', 'payment'
    resource_id: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    ip_address: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "admin_uid": self.admin_uid,
            "admin_email": self.admin_email,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp
        }

