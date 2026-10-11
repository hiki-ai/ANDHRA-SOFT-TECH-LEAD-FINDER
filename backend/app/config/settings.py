import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_default_secret_key_ast_leads_2026')
    DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')
    PORT = int(os.getenv('PORT', 5000))
    HOST = os.getenv('HOST', '0.0.0.0')

    # Firebase Admin SDK & Cloud Firestore Configuration
    FIREBASE_PROJECT_ID = (
        os.getenv('FIREBASE_PROJECT_ID') or
        os.getenv('PROJECT_ID') or
        os.getenv('GCP_PROJECT_ID') or
        'andhra-soft-tech-lead-finder'
    ).strip()

    FIREBASE_STORAGE_BUCKET = (
        os.getenv('FIREBASE_STORAGE_BUCKET') or
        os.getenv('STORAGE_BUCKET') or
        'andhra-soft-tech-lead-finder.firebasestorage.app'
    ).strip()

    FIREBASE_CLIENT_EMAIL = (
        os.getenv('FIREBASE_CLIENT_EMAIL') or
        os.getenv('FIREBASE_CLIENT_EMAIL_ADDRESS') or
        os.getenv('CLIENT_EMAIL') or
        ''
    ).strip()

    FIREBASE_PRIVATE_KEY = (
        os.getenv('FIREBASE_PRIVATE_KEY') or
        os.getenv('PRIVATE_KEY') or
        ''
    ).strip()

    FIREBASE_SERVICE_ACCOUNT_JSON = (
        os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON') or
        os.getenv('FIREBASE_SERVICE_ACCOUNT') or
        os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY') or
        os.getenv('FIREBASE_CREDENTIALS') or
        os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON') or
        ''
    ).strip()

    # Admin Authorization Allowlist
    ADMIN_EMAILS = [
        email.strip().lower()
        for email in (os.getenv('ADMIN_EMAILS') or os.getenv('ADMIN_EMAIL') or 'admin@andhrasofttech.com').split(',')
        if email.strip()
    ]

    @classmethod
    def get_firebase_project_id(cls) -> str:
        return (
            os.getenv('FIREBASE_PROJECT_ID') or
            os.getenv('PROJECT_ID') or
            os.getenv('GCP_PROJECT_ID') or
            cls.FIREBASE_PROJECT_ID or
            'andhra-soft-tech-lead-finder'
        ).strip()

    @classmethod
    def get_firebase_storage_bucket(cls) -> str:
        return (
            os.getenv('FIREBASE_STORAGE_BUCKET') or
            os.getenv('STORAGE_BUCKET') or
            cls.FIREBASE_STORAGE_BUCKET or
            'andhra-soft-tech-lead-finder.firebasestorage.app'
        ).strip()

    @classmethod
    def get_firebase_client_email(cls) -> str:
        return (
            os.getenv('FIREBASE_CLIENT_EMAIL') or
            os.getenv('FIREBASE_CLIENT_EMAIL_ADDRESS') or
            os.getenv('CLIENT_EMAIL') or
            cls.FIREBASE_CLIENT_EMAIL or
            ''
        ).strip()

    @classmethod
    def get_firebase_private_key(cls) -> str:
        return (
            os.getenv('FIREBASE_PRIVATE_KEY') or
            os.getenv('PRIVATE_KEY') or
            cls.FIREBASE_PRIVATE_KEY or
            ''
        ).strip()

    @classmethod
    def get_firebase_service_account_json(cls) -> str:
        return (
            os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON') or
            os.getenv('FIREBASE_SERVICE_ACCOUNT') or
            os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY') or
            os.getenv('FIREBASE_CREDENTIALS') or
            os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON') or
            cls.FIREBASE_SERVICE_ACCOUNT_JSON or
            ''
        ).strip()

    @classmethod
    def get_admin_emails(cls) -> list:
        raw = os.getenv('ADMIN_EMAILS') or os.getenv('ADMIN_EMAIL') or 'admin@andhrasofttech.com'
        emails = [e.strip().lower() for e in raw.split(',') if e.strip()]
        return emails if emails else cls.ADMIN_EMAILS

    # Source Connector Credentials
    GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', os.getenv('GOOGLE_PLACES_API_KEY', '')).strip()
    JUSTDIAL_API_KEY = os.getenv('JUSTDIAL_API_KEY', '').strip()
    MAGICPIN_API_KEY = os.getenv('MAGICPIN_API_KEY', '').strip()

    # CORS Allowed Origins
    _DEFAULT_ORIGINS = [
        'https://andhra-soft-tech-lead-finder.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
    ]

    _configured_origins = os.getenv('CORS_ORIGINS') or os.getenv('FRONTEND_ORIGINS') or ''
    _extra_origins = [o.strip() for o in _configured_origins.split(',') if o.strip()]

    CORS_ORIGINS = list(dict.fromkeys(_DEFAULT_ORIGINS + _extra_origins))

    # Internal Service Bindings / Worker URL
    WORKER_URL = os.getenv('WORKER_URL', '').strip()

    # Testing flag
    TESTING = os.getenv('TESTING', 'False').lower() in ('true', '1', 't')

    @classmethod
    def is_allowed_origin(cls, origin: str) -> bool:
        if not origin:
            return False
        clean_origin = origin.strip().rstrip('/')
        # Check exact matches
        for allowed in cls.CORS_ORIGINS:
            if clean_origin == allowed.rstrip('/'):
                return True
        # Check validated Vercel preview domain pattern for this project
        import re
        if re.match(r"^https://andhra-soft-tech(-[a-zA-Z0-9_-]+)?\.vercel\.app$", clean_origin):
            return True
        return False

