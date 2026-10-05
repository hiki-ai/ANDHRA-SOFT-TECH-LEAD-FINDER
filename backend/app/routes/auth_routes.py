from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth

auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    user = getattr(request, 'current_user', {})
    return jsonify({
        "success": True,
        "data": {
            "uid": user.get('uid'),
            "email": user.get('email'),
            "role": user.get('role', 'admin')
        }
    })
