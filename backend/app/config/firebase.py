"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
FIREBASE ADMIN SDK & CLOUD FIRESTORE CONFIGURATION
==============================================================================
Location: backend/app/config/firebase.py

Centralized Firebase Admin and Cloud Firestore client manager.
Initializes Firebase Admin exactly once and reuses the initialized client.
Zero hardcoded demo data. Empty state by default.
==============================================================================
"""

import os
import json
from .settings import Settings

_firestore_client = None
_firebase_initialized = False
_is_live_firestore = False

class InMemoryBatch:
    def __init__(self):
        self.operations = []

    def set(self, doc_ref, data, merge=False):
        self.operations.append(('set', doc_ref, data, merge))
        return self

    def update(self, doc_ref, updates):
        self.operations.append(('update', doc_ref, updates))
        return self

    def delete(self, doc_ref):
        self.operations.append(('delete', doc_ref))
        return self

    def commit(self):
        for op in self.operations:
            if op[0] == 'set':
                op[1].set(op[2], merge=op[3])
            elif op[0] == 'update':
                op[1].update(op[2])
            elif op[0] == 'delete':
                op[1].delete()
        self.operations = []

class InMemoryFirestoreCollection:
    """In-memory collection wrapper when cloud credentials are not supplied."""
    def __init__(self, name):
        self.name = name
        self.items = []

    def stream(self):
        for item in list(self.items):
            yield InMemoryDoc(item['id'], item)

    def document(self, doc_id=None):
        return InMemoryDocRef(self, doc_id)

    def where(self, field, op, val):
        return self

    def limit(self, count):
        return self

    def offset(self, count):
        return self

    def order_by(self, field, direction=None):
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
        if merge:
            existing = next((i for i in self.col.items if i.get('id') == self.id), None)
            if existing:
                existing.update(data)
                return
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

    def batch(self):
        return InMemoryBatch()

def init_firebase_admin():
    global _firebase_initialized, _firestore_client, _is_live_firestore
    if _firebase_initialized:
        return _firestore_client

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        has_credentials = False
        if not firebase_admin._apps:
            # 1. Check for full service account JSON string or file path
            if Settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                try:
                    if os.path.isfile(Settings.FIREBASE_SERVICE_ACCOUNT_JSON):
                        cred = credentials.Certificate(Settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                    else:
                        parsed = json.loads(Settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                        cred = credentials.Certificate(parsed)
                    firebase_admin.initialize_app(cred, {
                        'projectId': Settings.FIREBASE_PROJECT_ID,
                        'storageBucket': Settings.FIREBASE_STORAGE_BUCKET,
                    })
                    has_credentials = True
                    print(f"[Firebase Admin] Initialized with Service Account JSON.")
                except Exception as sa_err:
                    print(f"[Firebase Admin] Service Account JSON load notice: {sa_err}")

            # 2. Check for individual Render environment variables
            elif Settings.FIREBASE_CLIENT_EMAIL and Settings.FIREBASE_PRIVATE_KEY and '-----BEGIN' in Settings.FIREBASE_PRIVATE_KEY:
                try:
                    clean_key = Settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n')
                    cred = credentials.Certificate({
                        "project_id": Settings.FIREBASE_PROJECT_ID,
                        "client_email": Settings.FIREBASE_CLIENT_EMAIL,
                        "private_key": clean_key,
                    })
                    firebase_admin.initialize_app(cred, {
                        'projectId': Settings.FIREBASE_PROJECT_ID,
                        'storageBucket': Settings.FIREBASE_STORAGE_BUCKET,
                    })
                    has_credentials = True
                    print(f"[Firebase Admin] Initialized with Service Account for: {Settings.FIREBASE_PROJECT_ID}")
                except Exception as cred_err:
                    print(f"[Firebase Admin] Service Account credentials error: {cred_err}")

            # 3. Check for GOOGLE_APPLICATION_CREDENTIALS file path
            elif os.getenv('GOOGLE_APPLICATION_CREDENTIALS') and os.path.isfile(os.getenv('GOOGLE_APPLICATION_CREDENTIALS')):
                try:
                    cred = credentials.Certificate(os.getenv('GOOGLE_APPLICATION_CREDENTIALS'))
                    firebase_admin.initialize_app(cred, {
                        'projectId': Settings.FIREBASE_PROJECT_ID,
                        'storageBucket': Settings.FIREBASE_STORAGE_BUCKET,
                    })
                    has_credentials = True
                    print(f"[Firebase Admin] Initialized with GOOGLE_APPLICATION_CREDENTIALS file.")
                except Exception as file_err:
                    print(f"[Firebase Admin] Credentials file error: {file_err}")

        if has_credentials and firebase_admin._apps:
            _firestore_client = firestore.client()
            _is_live_firestore = True
            _firebase_initialized = True
            return _firestore_client
        else:
            raise RuntimeError("No valid Firebase credentials configured (set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT_JSON).")
    except Exception as e:
        print(f"[Firebase Admin] Notice: Using in-memory fallback Firestore client: {e}")
        _firestore_client = InMemoryFirestoreClient()
        _is_live_firestore = False
        _firebase_initialized = True
        return _firestore_client

def get_firestore_db():
    global _firestore_client
    if _firestore_client is None:
        init_firebase_admin()
    return _firestore_client

def is_live_firestore():
    global _is_live_firestore
    if _firestore_client is None:
        init_firebase_admin()
    return _is_live_firestore
