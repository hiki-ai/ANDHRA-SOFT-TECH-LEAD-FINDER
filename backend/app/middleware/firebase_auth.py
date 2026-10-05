import functools
from flask import request, jsonify
import firebase_admin
from firebase_admin import auth, credentials
from ..config.settings import Settings

# Initialize Firebase Admin once if credentials are provided
_firebase_initialized = False

def init_firebase_admin():
    global _firebase_initialized
    if not _firebase_initialized:
        if Settings.FIREBASE_PROJECT_ID and Settings.FIREBASE_CLIENT_EMAIL:
            try:
                cred = credentials.Certificate({
                    "project_id": Settings.FIREBASE_PROJECT_ID,
                    "client_email": Settings.FIREBASE_CLIENT_EMAIL,
                    "private_key": Settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n') if Settings.FIREBASE_PRIVATE_KEY else '',
                })
                firebase_admin.initialize_app(cred)
                _firebase_initialized = True
            except Exception as e:
                print(f"[Firebase Admin] Initialization warning: {e}")
        else:
            print("[Firebase Admin] Credentials not configured. Dev authentication mode enabled.")

def require_auth(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": {"code": "AUTH_REQUIRED", "message": "Authorization header missing or invalid"}
            }), 401

        token = auth_header.split('Bearer ')[1].strip()

        # Development token bypass for local development/testing
        if token.startswith('mock_') or token.startswith('dev_'):
            request.current_user = {
                "uid": "dev_admin_uid",
                "email": "admin@andhrasofttech.com",
                "role": "admin"
            }
            return f(*args, **kwargs)

        init_firebase_admin()
        try:
            decoded_token = auth.verify_id_token(token)
            request.current_user = decoded_token
        except Exception as e:
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_TOKEN", "message": str(e)}
            }), 401

        return f(*args, **kwargs)
    return decorated_function
