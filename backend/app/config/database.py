"""
Database configuration module.
NOTE: PostgreSQL / SQLAlchemy has been completely migrated to Firebase Cloud Firestore.
This module provides backward-compatibility stubs pointing to Firestore.
"""
from .firebase import get_firestore_db

def get_db():
    """Yields the active Firebase Firestore client."""
    db = get_firestore_db()
    yield db
