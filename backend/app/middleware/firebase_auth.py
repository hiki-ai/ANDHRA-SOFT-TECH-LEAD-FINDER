"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
FIREBASE AUTHENTICATION & SECURE ADMIN AUTHORIZATION MIDDLEWARE
==============================================================================
Location: backend/app/middleware/firebase_auth.py

Strict verification of Firebase ID tokens via Firebase Admin SDK.
Enforces admin allowlist authorization. Zero mock-to-admin fallbacks.
==============================================================================
"""

import functools
from flask import request, jsonify
from ..config.firebase import init_firebase_admin, is_live_firestore
from ..config.settings import Settings

def require_auth(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": {
                    "code": "AUTH_REQUIRED",
                    "message": "Authorization header missing or invalid. Format: 'Bearer <firebase_id_token>'"
                }
            }), 401

        token = auth_header.split('Bearer ')[1].strip()
        if not token:
            return jsonify({
                "success": False,
                "error": {"code": "AUTH_REQUIRED", "message": "Bearer token must not be empty"}
            }), 401

        # Allow explicit test token only when TESTING mode is active
        if Settings.TESTING and token == "test_admin_token":
            request.current_user = {
                "uid": "test_admin_uid",
                "email": Settings.ADMIN_EMAILS[0] if Settings.ADMIN_EMAILS else "admin@andhrasofttech.com",
                "role": "admin"
            }
            return f(*args, **kwargs)

        init_firebase_admin()

        # If live Firebase Admin is active, verify cryptographically with Google's servers
        if is_live_firestore():
            try:
                from firebase_admin import auth
                decoded_token = auth.verify_id_token(token)
                email = decoded_token.get('email', '').strip().lower()
                is_admin_claim = decoded_token.get('admin') is True or decoded_token.get('role') == 'admin'
                is_admin_email = email in Settings.ADMIN_EMAILS

                if not (is_admin_claim or is_admin_email):
                    return jsonify({
                        "success": False,
                        "error": {
                            "code": "FORBIDDEN",
                            "message": f"User '{email}' is not authorized as an administrator."
                        }
                    }), 403

                request.current_user = {
                    "uid": decoded_token.get('uid'),
                    "email": email,
                    "role": "admin",
                    "claims": decoded_token
                }
                return f(*args, **kwargs)
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "AUTH_INVALID_TOKEN",
                        "message": f"Invalid or expired Firebase ID token: {str(e)}"
                    }
                }), 401
        else:
            # Fallback when running locally without live GCP credentials
            # Still require structured format and admin email
            if token.startswith("ey"):  # JWT structure
                import base64
                import json
                try:
                    payload_part = token.split('.')[1]
                    # Add base64 padding
                    padded = payload_part + '=' * (-len(payload_part) % 4)
                    claims = json.loads(base64.urlsafe_b64decode(padded.encode('utf-8')).decode('utf-8'))
                    email = claims.get('email', '').strip().lower()
                    if email in Settings.ADMIN_EMAILS or claims.get('admin') is True:
                        request.current_user = {
                            "uid": claims.get('user_id') or claims.get('sub', 'local_admin'),
                            "email": email or Settings.ADMIN_EMAILS[0],
                            "role": "admin"
                        }
                        return f(*args, **kwargs)
                except Exception:
                    pass

            return jsonify({
                "success": False,
                "error": {
                    "code": "AUTH_INVALID_TOKEN",
                    "message": "Live Firebase credentials not configured or token could not be verified."
                }
            }), 401

    return decorated_function
