from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, Any

@dataclass
class Collection:
    category: str
    location: str
    target_count: int = 1000
    id: Optional[str] = None
    found: int = 0
    valid: int = 0
    duplicate: int = 0
    failed: int = 0
    progress: int = 0  # 0-100%
    status: str = "pending"  # pending, running, paused, completed, failed, cancelled
    current_source: Optional[str] = None
    error_log: Optional[str] = None
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            k: v for k, v in self.__dict__.items() if not k.startswith('_')
        }
