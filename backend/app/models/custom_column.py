import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, Any

@dataclass
class CustomColumn:
    name: str
    label: str
    id: str = field(default_factory=lambda: f"coldef_{uuid.uuid4().hex[:8]}")
    data_type: str = "text"  # text, number, phone, email, date, boolean
    position: int = 0
    is_visible: bool = True
    is_required: bool = False
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}
