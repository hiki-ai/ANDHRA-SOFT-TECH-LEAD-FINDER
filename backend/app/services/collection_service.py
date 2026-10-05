"""
Backend Collection Extraction Service using Firebase Cloud Firestore.
"""
from ..config.firebase import get_firestore_db

class CollectionService:
    @staticmethod
    def get_by_id(collection_id: str):
        db = get_firestore_db()
        doc = db.collection('collections').document(collection_id).get()
        if doc and doc.to_dict():
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None

    @staticmethod
    def update_job_status(collection_id: str, updates: dict):
        db = get_firestore_db()
        db.collection('collections').document(collection_id).update(updates)
        return True
