from datetime import datetime
from sqlalchemy import Column, String, DateTime
from ..config.database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(String(128), primary_key=True) # Firebase UID
    email = Column(String(255), unique=True, nullable=False)
    display_name = Column(String(150))
    role = Column(String(50), default='admin')
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)
