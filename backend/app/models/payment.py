"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
PAYMENT DATA MODEL
==============================================================================
Location: backend/app/models/payment.py
==============================================================================
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, Optional

@dataclass
class Payment:
    id: str
    user_id: str
    user_email: str
    plan_id: str
    billing_cycle: str
    amount_paise: int
    currency: str = "INR"
    status: str = "created"  # 'created', 'pending', 'successful', 'failed', 'refunded'
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    payment_method: Optional[str] = None
    receipt: Optional[str] = None
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_email": self.user_email,
            "plan_id": self.plan_id,
            "billing_cycle": self.billing_cycle,
            "amount_paise": int(self.amount_paise),
            "amount_inr": round(self.amount_paise / 100, 2),
            "currency": self.currency,
            "status": self.status,
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": self.razorpay_payment_id,
            "razorpay_signature": self.razorpay_signature,
            "payment_method": self.payment_method,
            "receipt": self.receipt,
            "error_code": self.error_code,
            "error_description": self.error_description,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

