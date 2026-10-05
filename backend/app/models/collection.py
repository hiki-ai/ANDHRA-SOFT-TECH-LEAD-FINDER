import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text
from ..config.database import Base

class Collection(Base):
    __tablename__ = 'collections'

    id = Column(String(64), primary_key=True, default=lambda: f"col_{uuid.uuid4().hex[:10]}")
    category = Column(String(100), nullable=False)
    location = Column(String(150), nullable=False)
    target_count = Column(Integer, nullable=False, default=1000)
    found = Column(Integer, default=0)
    valid = Column(Integer, default=0)
    duplicate = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    progress = Column(Integer, default=0) # 0-100%
    status = Column(String(50), default='pending') # pending, running, paused, completed, failed, cancelled
    current_source = Column(String(150))
    error_log = Column(Text)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
