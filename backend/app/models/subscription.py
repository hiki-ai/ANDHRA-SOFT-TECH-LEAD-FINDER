"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
SUBSCRIPTION DATA MODEL
==============================================================================
Location: backend/app/models/subscription.py
==============================================================================
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, Optional

@dataclass
class Subscription:
    id: str
    user_id: str
    plan_id: str
    billing_cycle: str = "monthly"  # 'monthly' or 'yearly'
    amount_paise: int = 0
    status: str = "active"  # 'active', 'pending', 'expired', 'cancelled', 'failed'
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None
    cancelled_at: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    plan_name: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_id": self.plan_id,
            "plan_name": self.plan_name or self.plan_id.capitalize(),
            "billing_cycle": self.billing_cycle,
            "amount_paise": int(self.amount_paise),
            "status": self.status,
            "started_at": self.started_at,
            "expires_at": self.expires_at,
            "cancelled_at": self.cancelled_at,
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": self.razorpay_payment_id
        }

