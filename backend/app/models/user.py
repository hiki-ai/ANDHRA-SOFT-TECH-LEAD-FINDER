from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, Any

@dataclass
class User:
    id: str  # Firebase UID
    email: str
    display_name: Optional[str] = None
    role: str = "admin"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}
