"""
Backend Vendor Service using Firebase Cloud Firestore.
"""
from ..config.firebase import get_firestore_db

class VendorService:
    @staticmethod
    def get_by_id(vendor_id: str):
        db = get_firestore_db()
        doc = db.collection('vendors').document(vendor_id).get()
        if doc and doc.to_dict():
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None

    @staticmethod
    def upsert_vendor(vendor_data: dict):
        db = get_firestore_db()
        doc_id = vendor_data.get('id') or vendor_data.get('dedupe_key')
        doc_ref = db.collection('vendors').document(doc_id)
        doc_ref.set(vendor_data, merge=True)
        return vendor_data
