"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
ADMIN BILLING, PLANS, SUBSCRIPTIONS & ANALYTICS ROUTES
==============================================================================
Location: backend/app/routes/admin_billing_routes.py
==============================================================================
"""

from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth
from ..services.plan_service import PlanService
from ..services.trial_service import TrialService
from ..services.subscription_service import SubscriptionService
from ..services.payment_service import PaymentService
from ..services.audit_service import AuditService
from ..config.firebase import get_firestore_db

admin_billing_bp = Blueprint('admin_billing', __name__, url_prefix='/api/admin')

# -----------------------------------------------------------------------------
# 1. Premium Plans Management
# -----------------------------------------------------------------------------
@admin_billing_bp.route('/plans', methods=['GET'])
@require_auth
def get_admin_plans():
    plans = PlanService.get_all_plans()
    return jsonify({"success": True, "data": plans})

@admin_billing_bp.route('/plans', methods=['POST'])
@require_auth
def create_admin_plan():
    user = getattr(request, 'current_user', {})
    payload = request.get_json() or {}
    try:
        saved = PlanService.save_plan(payload)
        AuditService.log_action(
            admin_uid=user.get('uid', 'admin'),
            admin_email=user.get('email', 'admin@andhrasofttech.com'),
            action="CREATE_PLAN",
            resource_type="plan",
            resource_id=saved.get('plan_id'),
            details={"name": saved.get('name'), "monthly_paise": saved.get('monthly_price_paise')}
        )
        return jsonify({"success": True, "data": saved, "message": "Plan created successfully"}), 201
    except ValueError as ve:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": str(ve)}}), 400
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "SERVER_ERROR", "message": str(e)}}), 500

@admin_billing_bp.route('/plans/<plan_id>', methods=['PUT'])
@require_auth
def update_admin_plan(plan_id):
    user = getattr(request, 'current_user', {})
    payload = request.get_json() or {}
    payload['plan_id'] = plan_id
    try:
        saved = PlanService.save_plan(payload)
        AuditService.log_action(
            admin_uid=user.get('uid', 'admin'),
            admin_email=user.get('email', 'admin@andhrasofttech.com'),
            action="UPDATE_PLAN",
            resource_type="plan",
            resource_id=plan_id,
            details=payload
        )
        return jsonify({"success": True, "data": saved, "message": f"Plan '{plan_id}' updated successfully"})
    except ValueError as ve:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": str(ve)}}), 400
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "SERVER_ERROR", "message": str(e)}}), 500

@admin_billing_bp.route('/plans/<plan_id>', methods=['DELETE'])
@require_auth
def archive_admin_plan(plan_id):
    user = getattr(request, 'current_user', {})
    success = PlanService.archive_plan(plan_id)
    if success:
        AuditService.log_action(
            admin_uid=user.get('uid', 'admin'),
            admin_email=user.get('email', 'admin@andhrasofttech.com'),
            action="ARCHIVE_PLAN",
            resource_type="plan",
            resource_id=plan_id
        )
        return jsonify({"success": True, "message": f"Plan '{plan_id}' archived successfully (is_active=false). Historical records preserved."})
    return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Plan not found"}}), 404

# -----------------------------------------------------------------------------
# 2. Free Trial Settings
# -----------------------------------------------------------------------------
@admin_billing_bp.route('/trial-settings', methods=['GET'])
@require_auth
def get_trial_settings():
    settings = TrialService.get_trial_settings()
    trials = TrialService.get_all_trials(limit=50)
    return jsonify({
        "success": True,
        "data": {
            "settings": settings,
            "recent_trials": trials,
            "total_trials_count": len(trials)
        }
    })

@admin_billing_bp.route('/trial-settings', methods=['PUT'])
@require_auth
def update_trial_settings():
    user = getattr(request, 'current_user', {})
    payload = request.get_json() or {}
    updated = TrialService.update_trial_settings(payload)
    AuditService.log_action(
        admin_uid=user.get('uid', 'admin'),
        admin_email=user.get('email', 'admin@andhrasofttech.com'),
        action="UPDATE_TRIAL_SETTINGS",
        resource_type="trial_settings",
        details=updated
    )
    return jsonify({
        "success": True,
        "message": "Free Trial settings updated successfully",
        "data": updated
    })

# -----------------------------------------------------------------------------
# 3. Subscriptions Management
# -----------------------------------------------------------------------------
@admin_billing_bp.route('/subscriptions', methods=['GET'])
@require_auth
def get_admin_subscriptions():
    status_filter = request.args.get('status')
    subs = SubscriptionService.get_all_subscriptions(status_filter=status_filter)
    return jsonify({"success": True, "data": subs})

# -----------------------------------------------------------------------------
# 4. Payment Management
# -----------------------------------------------------------------------------
@admin_billing_bp.route('/payments', methods=['GET'])
@require_auth
def get_admin_payments():
    payments = PaymentService.get_all_payments()
    return jsonify({"success": True, "data": payments})

# -----------------------------------------------------------------------------
# 5. User Management for Admin
# -----------------------------------------------------------------------------
@admin_billing_bp.route('/users', methods=['GET'])
@require_auth
def get_admin_users():
    db = get_firestore_db()
    users = []
    try:
        for doc in db.collection('users').stream():
            d = doc.to_dict() or {}
            d['uid'] = doc.id
            d['id'] = doc.id
            users.append(d)
    except Exception as e:
        print(f"[AdminBilling] Stream users error: {e}")

    return jsonify({"success": True, "data": users})

# -----------------------------------------------------------------------------
# 6. Billing Analytics
# -----------------------------------------------------------------------------
@admin_billing_bp.route('/analytics', methods=['GET'])
@require_auth
def get_billing_analytics():
    """
    Computes comprehensive billing analytics:
    Active subscriptions, Monthly vs Yearly, Trial users, Completed trials,
    Payment stats (successful, failed, pending), gross collections, taxes, refunds, actual revenue.
    """
    db = get_firestore_db()

    active_subs_count = 0
    monthly_subs_count = 0
    yearly_subs_count = 0
    plan_distribution = {}

    try:
        for doc in db.collection('subscriptions').stream():
            d = doc.to_dict() or {}
            if d.get('status') == 'active':
                active_subs_count += 1
                if d.get('billing_cycle') == 'yearly':
                    yearly_subs_count += 1
                else:
                    monthly_subs_count += 1

                p_name = d.get('plan_name') or d.get('plan_id', 'unknown')
                plan_distribution[p_name] = plan_distribution.get(p_name, 0) + 1
    except Exception as e:
        print(f"[AdminAnalytics] Subs query error: {e}")

    # Trials stats
    total_trials = 0
    active_trials = 0
    completed_trials = 0
    expired_trials = 0

    try:
        for doc in db.collection('trials').stream():
            d = doc.to_dict() or {}
            total_trials += 1
            st = d.get('trial_status')
            if st == 'active':
                active_trials += 1
            elif st == 'completed':
                completed_trials += 1
            elif st == 'expired':
                expired_trials += 1
    except Exception as e:
        print(f"[AdminAnalytics] Trials query error: {e}")

    # Payments & Revenue
    gross_collections_paise = 0
    refunds_paise = 0
    successful_payments_count = 0
    failed_payments_count = 0
    pending_payments_count = 0

    try:
        for doc in db.collection('payments').stream():
            d = doc.to_dict() or {}
            st = d.get('status')
            amount = int(d.get('amount_paise', 0))

            if st == 'successful':
                successful_payments_count += 1
                gross_collections_paise += amount
            elif st == 'failed':
                failed_payments_count += 1
            elif st == 'refunded':
                refunds_paise += amount
            elif st in ('created', 'pending'):
                pending_payments_count += 1
    except Exception as e:
        print(f"[AdminAnalytics] Payments query error: {e}")

    tax_rate = 0.18  # 18% GST standard
    tax_collected_paise = int(gross_collections_paise * (tax_rate / (1 + tax_rate)))
    net_revenue_paise = max(0, gross_collections_paise - refunds_paise - tax_collected_paise)

    # Recent Audit Logs
    recent_logs = AuditService.get_recent_logs(limit=10)

    return jsonify({
        "success": True,
        "data": {
            "subscriptions": {
                "active_total": active_subs_count,
                "monthly_count": monthly_subs_count,
                "yearly_count": yearly_subs_count,
                "plan_distribution": plan_distribution
            },
            "trials": {
                "total_trials": total_trials,
                "active_trials": active_trials,
                "completed_trials": completed_trials,
                "expired_trials": expired_trials
            },
            "payments": {
                "successful_count": successful_payments_count,
                "failed_count": failed_payments_count,
                "pending_count": pending_payments_count
            },
            "revenue": {
                "gross_collections_paise": gross_collections_paise,
                "gross_collections_inr": round(gross_collections_paise / 100, 2),
                "refunds_paise": refunds_paise,
                "refunds_inr": round(refunds_paise / 100, 2),
                "taxes_paise": tax_collected_paise,
                "taxes_inr": round(tax_collected_paise / 100, 2),
                "net_revenue_paise": net_revenue_paise,
                "net_revenue_inr": round(net_revenue_paise / 100, 2),
                "currency": "INR"
            },
            "recent_audit_logs": recent_logs
        }
    })

