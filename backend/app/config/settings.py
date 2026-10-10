import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_default_secret_key_ast_leads_2026')
    DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')
    PORT = int(os.getenv('PORT', 5000))
    HOST = os.getenv('HOST', '0.0.0.0')

    # Firebase Admin SDK & Cloud Firestore Configuration
    FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID', 'andhra-soft-tech-lead-finder')
    FIREBASE_STORAGE_BUCKET = os.getenv('FIREBASE_STORAGE_BUCKET', 'andhra-soft-tech-lead-finder.firebasestorage.app')
    FIREBASE_CLIENT_EMAIL = os.getenv('FIREBASE_CLIENT_EMAIL', '')
    FIREBASE_PRIVATE_KEY = os.getenv('FIREBASE_PRIVATE_KEY', '')
    FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON', '')

    # Admin Authorization Allowlist
    ADMIN_EMAILS = [email.strip().lower() for email in os.getenv('ADMIN_EMAILS', 'admin@andhrasofttech.com').split(',') if email.strip()]

    # CORS
    CORS_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')]

    # Internal Service Bindings (injected by Vercel)
    WORKER_URL = os.getenv('WORKER_URL', '')

    # Testing flag
    TESTING = os.getenv('TESTING', 'False').lower() in ('true', '1', 't')

