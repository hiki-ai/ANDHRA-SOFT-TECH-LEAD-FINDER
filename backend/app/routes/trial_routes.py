"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
FREE TRIAL API ROUTES
==============================================================================
Location: backend/app/routes/trial_routes.py
==============================================================================
"""

from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_user_auth
from ..services.trial_service import TrialService

trial_bp = Blueprint('trial', __name__, url_prefix='/api/trial')

@trial_bp.route('/status', methods=['GET'])
@require_user_auth
def get_trial_status():
    """Returns trial status and remaining quota for authenticated user."""
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')
    if not user_id:
        return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "User not authenticated"}}), 401

    trial = TrialService.get_user_trial(user_id)
    if not trial:
        settings = TrialService.get_trial_settings()
        return jsonify({
            "success": True,
            "data": {
                "has_trial": False,
                "trial_status": "not_started",
                "trial_limit": settings.get('default_trial_record_limit', 30),
                "trial_used": 0,
                "trial_remaining": settings.get('default_trial_record_limit', 30),
                "free_trial_enabled": settings.get('free_trial_enabled', True)
            }
        })

    # Sanitize response
    resp_data = dict(trial)
    resp_data['has_trial'] = True
    resp_data.pop('unique_vendor_hashes', None)

    return jsonify({
        "success": True,
        "data": resp_data
    })

@trial_bp.route('/start', methods=['POST'])
@require_user_auth
def start_free_trial():
    """Activates the Free Trial of 30 unique records for the authenticated user."""
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')
    user_email = user.get('email')

    if not user_id:
        return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "User not authenticated"}}), 401

    try:
        trial = TrialService.start_user_trial(user_id, user_email)
        resp_data = dict(trial)
        resp_data['has_trial'] = True
        resp_data.pop('unique_vendor_hashes', None)

        return jsonify({
            "success": True,
            "message": "Free Trial activated successfully! You can extract up to 30 unique vendor records.",
            "data": resp_data
        }), 201
    except ValueError as ve:
        return jsonify({
            "success": False,
            "error": {"code": "TRIAL_ERROR", "message": str(ve)}
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {"code": "SERVER_ERROR", "message": f"Failed to activate trial: {str(e)}"}
        }), 500

