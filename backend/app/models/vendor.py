from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, Any

@dataclass
class Vendor:
    business_name: str
    id: Optional[str] = None
    normalized_name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: str = "Andhra Pradesh"
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rating: float = 0.0
    review_count: int = 0
    source: Optional[str] = None
    source_url: Optional[str] = None
    status: str = "valid"  # valid, invalid, duplicate, pending_review
    data_quality_score: int = 0
    dedupe_key: Optional[str] = None
    custom_fields: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            k: v for k, v in self.__dict__.items() if not k.startswith('_')
        }
