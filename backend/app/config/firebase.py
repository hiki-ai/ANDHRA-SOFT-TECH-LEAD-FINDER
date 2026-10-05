"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
FIREBASE ADMIN SDK & CLOUD FIRESTORE CONFIGURATION
==============================================================================
Location: backend/app/config/firebase.py

Centralized Firebase Admin and Cloud Firestore client manager.
==============================================================================
"""

import os
from .settings import Settings

_firestore_client = None
_firebase_initialized = False

# Default seed data for development/offline testing
DEV_SEED_VENDORS = [
    {
        "id": "ven_1001",
        "business_name": "Godavari Teak & Rosewood Emporium",
        "category": "Furniture",
        "phone": "+91 883 245 8920",
        "email": "info@godavariteak.com",
        "location": "Main Road, Rajahmundry",
        "city": "Rajahmundry",
        "district": "East Godavari",
        "state": "Andhra Pradesh",
        "website": "https://godavariteak.com",
        "rating": 4.8,
        "review_count": 312,
        "source": "Official Public Directory (Source A)",
        "status": "valid",
        "data_quality_score": 95,
        "custom_fields": {"gst_registered": True, "verified_on": "2026-03-15"},
        "dedupe_key": "godavari_teak_+918832458920_rajahmundry"
    },
    {
        "id": "ven_1002",
        "business_name": "Visakha Multi-Speciality Dental Hospital",
        "category": "Hospitals",
        "phone": "+91 891 254 7800",
        "email": "contact@visakhadental.org",
        "location": "MVP Colony, Visakhapatnam",
        "city": "Visakhapatnam",
        "district": "Visakhapatnam",
        "state": "Andhra Pradesh",
        "website": "https://visakhadental.org",
        "rating": 4.6,
        "review_count": 520,
        "source": "Health Registry API (Source B)",
        "status": "valid",
        "data_quality_score": 92,
        "custom_fields": {"emergency_24x7": True, "bed_count": 85},
        "dedupe_key": "visakha_multi_+918912547800_visakhapatnam"
    },
    {
        "id": "ven_1003",
        "business_name": "Krishna Delta Gourmet Restaurant",
        "category": "Restaurants",
        "phone": "+91 866 248 1122",
        "email": "manager@krishnagourmet.in",
        "location": "MG Road, Vijayawada",
        "city": "Vijayawada",
        "district": "Krishna",
        "state": "Andhra Pradesh",
        "website": "https://krishnagourmet.in",
        "rating": 4.4,
        "review_count": 890,
        "source": "Commercial Registry (Source A)",
        "status": "valid",
        "data_quality_score": 88,
        "custom_fields": {"seating_capacity": 120, "ac": True},
        "dedupe_key": "krishna_delta_+918662481122_vijayawada"
    },
    {
        "id": "ven_1004",
        "business_name": "Amaravati Skyline Heights & Builders",
        "category": "Real Estate",
        "phone": "+91 863 223 9901",
        "email": "sales@amaravatiskyline.com",
        "location": "Brodipet, Guntur",
        "city": "Guntur",
        "district": "Guntur",
        "state": "Andhra Pradesh",
        "website": "https://amaravatiskyline.com",
        "rating": 4.2,
        "review_count": 145,
        "source": "Licensed Property Registry",
        "status": "valid",
        "data_quality_score": 84,
        "custom_fields": {"rera_approved": True},
        "dedupe_key": "amaravati_skyline_+918632239901_guntur"
    },
    {
        "id": "ven_1005",
        "business_name": "Konaseema Grand Heritage Residency",
        "category": "Hotels",
        "phone": "+91 884 237 4455",
        "email": "reservations@konaseemagrand.com",
        "location": "Cinema Road, Kakinada",
        "city": "Kakinada",
        "district": "Kakinada",
        "state": "Andhra Pradesh",
        "website": "https://konaseemagrand.com",
        "rating": 4.7,
        "review_count": 410,
        "source": "Hospitality Registry",
        "status": "valid",
        "data_quality_score": 90,
        "custom_fields": {"rooms": 45, "banquet_hall": True},
        "dedupe_key": "konaseema_grand_+918842374455_kakinada"
    }
]

class InMemoryFirestoreCollection:
    """Mock/dev collection wrapper if live cloud credentials are not supplied."""
    def __init__(self, name):
        self.name = name
        self.items = list(DEV_SEED_VENDORS) if name == 'vendors' else []

    def stream(self):
        for item in self.items:
            yield InMemoryDoc(item['id'], item)

    def document(self, doc_id=None):
        return InMemoryDocRef(self, doc_id)

    def where(self, field, op, val):
        return self

    def limit(self, count):
        return self

    def offset(self, count):
        return self

class InMemoryDoc:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self._data = data

    def to_dict(self):
        return self._data

class InMemoryDocRef:
    def __init__(self, col, doc_id):
        self.col = col
        self.id = doc_id or f"doc_{len(col.items)+1}"

    def get(self):
        item = next((i for i in self.col.items if i.get('id') == self.id), None)
        return InMemoryDoc(self.id, item) if item else InMemoryEmptyDoc()

    def set(self, data, merge=False):
        data['id'] = self.id
        self.col.items = [i for i in self.col.items if i.get('id') != self.id] + [data]

    def update(self, updates):
        for i in self.col.items:
            if i.get('id') == self.id:
                i.update(updates)

    def delete(self):
        self.col.items = [i for i in self.col.items if i.get('id') != self.id]

class InMemoryEmptyDoc:
    exists = False
    def to_dict(self):
        return None

class InMemoryFirestoreClient:
    def __init__(self):
        self._collections = {}

    def collection(self, name):
        if name not in self._collections:
            self._collections[name] = InMemoryFirestoreCollection(name)
        return self._collections[name]

def init_firebase_admin():
    global _firebase_initialized, _firestore_client
    if _firebase_initialized:
        return _firestore_client

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            if Settings.FIREBASE_PROJECT_ID and Settings.FIREBASE_CLIENT_EMAIL and Settings.FIREBASE_PRIVATE_KEY:
                cred = credentials.Certificate({
                    "project_id": Settings.FIREBASE_PROJECT_ID,
                    "client_email": Settings.FIREBASE_CLIENT_EMAIL,
                    "private_key": Settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
                })
                firebase_admin.initialize_app(cred, {
                    'projectId': Settings.FIREBASE_PROJECT_ID,
                    'storageBucket': Settings.FIREBASE_STORAGE_BUCKET,
                })
                print(f"[Firebase Admin] Initialized with Service Account for: {Settings.FIREBASE_PROJECT_ID}")
            else:
                # Initialize with project ID (Cloud Run / Application Default Credentials)
                firebase_admin.initialize_app(options={
                    'projectId': Settings.FIREBASE_PROJECT_ID,
                    'storageBucket': Settings.FIREBASE_STORAGE_BUCKET,
                })
                print(f"[Firebase Admin] Initialized with Project ID: {Settings.FIREBASE_PROJECT_ID}")

        _firestore_client = firestore.client()
        _firebase_initialized = True
        return _firestore_client
    except Exception as e:
        print(f"[Firebase Admin] Notice: Using in-memory fallback Firestore client: {e}")
        _firestore_client = InMemoryFirestoreClient()
        _firebase_initialized = True
        return _firestore_client

def get_firestore_db():
    global _firestore_client
    if _firestore_client is None:
        init_firebase_admin()
    return _firestore_client
