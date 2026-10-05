import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from ..config.database import Base

class Source(Base):
    __tablename__ = 'sources'

    id = Column(String(64), primary_key=True, default=lambda: f"src_{uuid.uuid4().hex[:8]}")
    name = Column(String(150), nullable=False)
    connector_type = Column(String(100), nullable=False)
    base_url = Column(String(500))
    rate_limit_per_min = Column(Integer, default=60)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
