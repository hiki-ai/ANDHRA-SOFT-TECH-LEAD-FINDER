import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, Any

@dataclass
class Source:
    name: str
    connector_type: str
    id: str = field(default_factory=lambda: f"src_{uuid.uuid4().hex[:8]}")
    base_url: Optional[str] = None
    rate_limit_per_min: int = 60
    is_active: bool = True
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}
