"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
CUSTOMER USER PROFILE & DASHBOARD ROUTES
==============================================================================
Location: backend/app/routes/user_routes.py
==============================================================================
"""

from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_user_auth
from ..config.firebase import get_firestore_db
from ..services.subscription_service import SubscriptionService
from ..services.trial_service import TrialService

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

@user_bp.route('/profile', methods=['GET'])
@require_user_auth
def get_user_profile():
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')
    if not user_id:
        return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "User not authenticated"}}), 401

    db = get_firestore_db()
    user_doc = db.collection('users').document(user_id).get()
    profile = user_doc.to_dict() if user_doc and getattr(user_doc, 'exists', True) else {}

    # Never expose other users' info or system keys
    return jsonify({
        "success": True,
        "data": {
            "uid": user_id,
            "email": profile.get('email') or user.get('email', ''),
            "fullName": profile.get('fullName') or user.get('displayName', 'Valued Customer'),
            "role": profile.get('role', 'user'),
            "status": profile.get('status', 'active'),
            "createdAt": profile.get('createdAt') or profile.get('created_at')
        }
    })

@user_bp.route('/dashboard', methods=['GET'])
@require_user_auth
def get_user_dashboard():
    """
    Returns authentic dashboard summary metrics for the logged-in customer.
    Confidential: returns data STRICTLY for this user.
    """
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')
    if not user_id:
        return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "User not authenticated"}}), 401

    # 1. Active Subscription
    sub = SubscriptionService.get_current_subscription(user_id)

    # 2. Free Trial Status
    trial = TrialService.get_user_trial(user_id)

    # 3. User's Collections Stats
    db = get_firestore_db()
    total_collections = 0
    successful_collections = 0
    user_records_count = 0

    try:
        for doc in db.collection('collections').stream():
            d = doc.to_dict() or {}
            if d.get('user_id') == user_id:
                total_collections += 1
                if d.get('status') == 'completed':
                    successful_collections += 1
                user_records_count += int(d.get('valid_count', 0) or d.get('valid', 0) or 0)
    except Exception as e:
        print(f"[UserDashboard] Collections stream notice: {e}")

    # Build response cards
    current_plan_name = "Free Plan"
    sub_status = "none"
    expiry_date = None

    if sub and sub.get('status') == 'active':
        current_plan_name = sub.get('plan_name') or sub.get('plan_id', '').capitalize()
        sub_status = "active"
        expiry_date = sub.get('expires_at')
    elif trial and trial.get('trial_status') == 'active':
        current_plan_name = "Free Trial (30 Records)"
        sub_status = "trial_active"
        expiry_date = trial.get('trial_expires_at')
    elif trial and trial.get('trial_status') == 'completed':
        current_plan_name = "Free Trial (Completed)"
        sub_status = "trial_completed"
    elif trial and trial.get('trial_status') == 'expired':
        current_plan_name = "Free Trial (Expired)"
        sub_status = "trial_expired"

    trial_used = trial.get('trial_used', 0) if trial else 0
    trial_limit = trial.get('trial_limit', 30) if trial else 30
    trial_remaining = max(0, trial_limit - trial_used) if trial else trial_limit

    return jsonify({
        "success": True,
        "data": {
            "current_plan": current_plan_name,
            "subscription_status": sub_status,
            "has_active_subscription": bool(sub and sub.get('status') == 'active'),
            "has_trial": bool(trial),
            "trial_status": trial.get('trial_status', 'not_started') if trial else 'not_started',
            "trial_used": trial_used,
            "trial_limit": trial_limit,
            "trial_remaining": trial_remaining,
            "total_collections": total_collections,
            "successful_collections": successful_collections,
            "total_leads_collected": user_records_count,
            "plan_expiry_date": expiry_date,
            "subscription": sub,
            "trial": {
                "trial_status": trial.get('trial_status') if trial else 'not_started',
                "trial_used": trial_used,
                "trial_remaining": trial_remaining,
                "trial_limit": trial_limit,
                "trial_started_at": trial.get('trial_started_at') if trial else None,
                "trial_expires_at": trial.get('trial_expires_at') if trial else None,
            } if trial else None
        }
    })

