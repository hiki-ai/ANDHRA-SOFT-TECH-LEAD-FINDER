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

def normalize_private_key(raw_key: str) -> str:
    """Safely normalizes private key PEM formatting across diverse deployment platforms."""
    if not raw_key:
        return ""
    k = raw_key.strip()
    if (k.startswith('"') and k.endswith('"')) or (k.startswith("'") and k.endswith("'")):
        k = k[1:-1].strip()
    k = k.replace('\\r\\n', '\n').replace('\\n', '\n').replace('\r\n', '\n').replace('\r', '\n')
    if "-----BEGIN" not in k:
        k = f"-----BEGIN PRIVATE KEY-----\n{k}\n-----END PRIVATE KEY-----\n"
    if not k.endswith('\n'):
        k += '\n'
    return k

def parse_service_account_json(raw_json: str):
    """Parses raw JSON string, file path, unescaped JSON, or base64 into a dict."""
    if not raw_json:
        return None
    s = raw_json.strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()

    # 1. File path check
    if os.path.isfile(s):
        try:
            with open(s, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    if 'private_key' in data:
                        data['private_key'] = normalize_private_key(data['private_key'])
                    return data
        except Exception:
            pass

    # 2. Direct JSON string parse
    try:
        data = json.loads(s)
        if isinstance(data, dict):
            if 'private_key' in data:
                data['private_key'] = normalize_private_key(data['private_key'])
            return data
    except Exception:
        pass

    # 3. Unescaped quotes/newlines parse
    try:
        unescaped = s.replace('\\"', '"').replace('\\n', '\n')
        data = json.loads(unescaped)
        if isinstance(data, dict):
            if 'private_key' in data:
                data['private_key'] = normalize_private_key(data['private_key'])
            return data
    except Exception:
        pass

    # 4. Base64 decoded JSON parse
    try:
        import base64
        decoded = base64.b64decode(s).decode('utf-8')
        data = json.loads(decoded)
        if isinstance(data, dict):
            if 'private_key' in data:
                data['private_key'] = normalize_private_key(data['private_key'])
            return data
    except Exception:
        pass

    return None

def init_firebase_admin(force_reinit: bool = False):
    global _firebase_initialized, _firestore_client, _is_live_firestore
    if _firebase_initialized and not force_reinit and _is_live_firestore:
        return _firestore_client

    import firebase_admin
    from firebase_admin import credentials, firestore

    # 0. Check if an app is already initialized in firebase_admin
    if firebase_admin._apps:
        try:
            _firestore_client = firestore.client()
            _is_live_firestore = True
            _firebase_initialized = True
            return _firestore_client
        except Exception:
            pass

    cred = None
    project_id = Settings.get_firebase_project_id()
    storage_bucket = Settings.get_firebase_storage_bucket()

    # 1. Attempt Service Account JSON string or file path
    sa_json_raw = Settings.get_firebase_service_account_json()
    if sa_json_raw:
        parsed_dict = parse_service_account_json(sa_json_raw)
        if parsed_dict:
            try:
                cred = credentials.Certificate(parsed_dict)
                print(f"[Firebase Admin] Loaded credentials from Service Account JSON.")
            except Exception as e:
                print(f"[Firebase Admin] Notice: Could not construct Certificate from Service Account JSON: {e}")

    # 2. If no valid cred yet, attempt split credentials (client email + private key)
    if cred is None:
        client_email = Settings.get_firebase_client_email()
        raw_private_key = Settings.get_firebase_private_key()
        if client_email and raw_private_key:
            clean_key = normalize_private_key(raw_private_key)
            if "-----BEGIN" in clean_key:
                try:
                    cred_dict = {
                        "type": "service_account",
                        "project_id": project_id,
                        "client_email": client_email,
                        "private_key": clean_key,
                        "token_uri": "https://oauth2.googleapis.com/token",
                    }
                    cred = credentials.Certificate(cred_dict)
                    print(f"[Firebase Admin] Loaded credentials from split environment variables for: {client_email}")
                except Exception as e:
                    print(f"[Firebase Admin] Notice: Could not construct Certificate from split credentials: {e}")

    # 3. If no valid cred yet, check GOOGLE_APPLICATION_CREDENTIALS file path
    if cred is None:
        gac_file = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '').strip()
        if gac_file and os.path.isfile(gac_file):
            try:
                cred = credentials.Certificate(gac_file)
                print(f"[Firebase Admin] Loaded credentials from GOOGLE_APPLICATION_CREDENTIALS file.")
            except Exception as e:
                print(f"[Firebase Admin] Notice: Could not construct Certificate from GOOGLE_APPLICATION_CREDENTIALS: {e}")

    # 4. If credentials obtained, initialize Firebase Admin app
    if cred is not None:
        try:
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred, {
                    'projectId': project_id,
                    'storageBucket': storage_bucket,
                })
            _firestore_client = firestore.client()
            _is_live_firestore = True
            _firebase_initialized = True
            print(f"[Firebase Admin] Initialized live Cloud Firestore for project: {project_id}")
            return _firestore_client
        except Exception as e:
            print(f"[Firebase Admin] Notice: Firebase Admin live initialization error: {e}")

    # Fallback to in-memory Firestore when running locally without credentials
    _firestore_client = InMemoryFirestoreClient()
    _is_live_firestore = False
    _firebase_initialized = True
    print("[Firebase Admin] Notice: Using in-memory fallback Firestore client (credentials not configured).")
    return _firestore_client

def get_firestore_db():
    global _firestore_client
    if _firestore_client is None:
        init_firebase_admin()
    return _firestore_client

def is_live_firestore():
    global _is_live_firestore
    if _firestore_client is None or not _is_live_firestore:
        init_firebase_admin()
    return _is_live_firestore

