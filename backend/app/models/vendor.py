import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..config.database import Base

class Vendor(Base):
    __tablename__ = 'vendors'

    id = Column(String(64), primary_key=True, default=lambda: f"ven_{uuid.uuid4().hex[:12]}")
    business_name = Column(String(255), nullable=False)
    normalized_name = Column(String(255), index=True)
    category = Column(String(100), index=True)
    subcategory = Column(String(100))
    phone = Column(String(50), index=True)
    alternate_phone = Column(String(50))
    email = Column(String(255))
    website = Column(String(500))
    address = Column(Text)
    area = Column(String(150))
    city = Column(String(100), index=True)
    district = Column(String(100))
    state = Column(String(100), default='Andhra Pradesh')
    pincode = Column(String(20), index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    source = Column(String(150))
    source_url = Column(Text)
    status = Column(String(50), default='valid', index=True) # valid, invalid, duplicate, pending_review
    data_quality_score = Column(Integer, default=0)
    dedupe_key = Column(String(255), unique=True, index=True)
    custom_fields = Column(JSONB, default=dict)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_vendor_search', 'business_name', 'city', 'category'),
    )
