"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
CUSTOMER SUBSCRIPTIONS API ROUTES
==============================================================================
Location: backend/app/routes/subscription_routes.py
==============================================================================
"""

from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_user_auth
from ..services.subscription_service import SubscriptionService
from ..services.plan_service import PlanService
from ..services.payment_service import PaymentService

sub_bp = Blueprint('subscriptions', __name__, url_prefix='/api/subscriptions')

@sub_bp.route('/current', methods=['GET'])
@require_user_auth
def get_current_subscription():
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')
    if not user_id:
        return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "User not authenticated"}}), 401

    sub = SubscriptionService.get_current_subscription(user_id)
    if not sub:
        return jsonify({
            "success": True,
            "data": {
                "has_active_subscription": False,
                "status": "none",
                "plan_id": "free",
                "plan_name": "Free Plan"
            }
        })

    resp = dict(sub)
    resp['has_active_subscription'] = True
    return jsonify({
        "success": True,
        "data": resp
    })

@sub_bp.route('/history', methods=['GET'])
@require_user_auth
def get_subscription_history():
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')
    if not user_id:
        return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "User not authenticated"}}), 401

    history = SubscriptionService.get_user_subscription_history(user_id)
    return jsonify({
        "success": True,
        "data": history
    })

@sub_bp.route('/checkout', methods=['POST'])
@require_user_auth
def checkout_subscription():
    """
    Initiates subscription checkout by creating a Razorpay payment order for the chosen plan and billing cycle.
    Validates plan and billing cycle on backend. Never trusts frontend-supplied price!
    """
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')
    user_email = user.get('email')

    if not user_id:
        return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "User not authenticated"}}), 401

    payload = request.get_json() or {}
    plan_id = str(payload.get('plan_id') or '').strip().lower()
    billing_cycle = str(payload.get('billing_cycle') or 'monthly').strip().lower()

    if billing_cycle not in ('monthly', 'yearly'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid billing cycle. Must be 'monthly' or 'yearly'"}}), 400

    plan = PlanService.get_plan_by_id(plan_id)
    if not plan or not plan.get('is_active', True):
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": f"Plan '{plan_id}' does not exist or is inactive"}}), 404

    # Determine authentic price from backend plan record in integer paise
    if billing_cycle == 'yearly':
        amount_paise = int(plan.get('yearly_price_paise', 0))
    else:
        amount_paise = int(plan.get('monthly_price_paise', 0))

    try:
        order = PaymentService.create_order(
            user_id=user_id,
            user_email=user_email,
            plan_id=plan_id,
            billing_cycle=billing_cycle,
            amount_paise=amount_paise
        )

        return jsonify({
            "success": True,
            "data": {
                "order_id": order['order_id'],
                "amount_paise": order['amount_paise'],
                "amount_inr": order['amount_inr'],
                "currency": order['currency'],
                "key_id": order['key_id'],
                "plan_id": plan_id,
                "plan_name": plan.get('name'),
                "billing_cycle": billing_cycle,
                "user_name": user.get('displayName', ''),
                "user_email": user_email
            }
        }), 201
    except ValueError as ve:
        return jsonify({"success": False, "error": {"code": "PAYMENT_INIT_ERROR", "message": str(ve)}}), 400
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "SERVER_ERROR", "message": f"Checkout failed: {str(e)}"}}), 500

@sub_bp.route('/cancel', methods=['POST'])
@require_user_auth
def cancel_subscription():
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')
    if not user_id:
        return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "User not authenticated"}}), 401

    payload = request.get_json(silent=True) or {}
    sub_id = payload.get('subscription_id')

    success = SubscriptionService.cancel_subscription(user_id, sub_id)
    if success:
        return jsonify({
            "success": True,
            "message": "Your subscription has been cancelled. You retain access until the end of the billing period."
        })
    else:
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": "Active subscription not found to cancel"}
        }), 404
