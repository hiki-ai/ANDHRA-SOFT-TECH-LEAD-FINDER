import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from ..config.database import Base

class CustomColumn(Base):
    __tablename__ = 'custom_columns'

    id = Column(String(64), primary_key=True, default=lambda: f"coldef_{uuid.uuid4().hex[:8]}")
    name = Column(String(100), unique=True, nullable=False)
    label = Column(String(150), nullable=False)
    data_type = Column(String(50), default='text') # text, number, phone, email, date, boolean
    position = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)
    is_required = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
