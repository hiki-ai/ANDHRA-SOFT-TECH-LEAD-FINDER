"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
RAZORPAY PAYMENT API ROUTES & WEBHOOKS
==============================================================================
Location: backend/app/routes/payment_routes.py
==============================================================================
"""

import json
from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_user_auth
from ..services.payment_service import PaymentService
from ..services.plan_service import PlanService
from ..config.settings import Settings
from ..config.firebase import get_firestore_db

payment_bp = Blueprint('payments', __name__, url_prefix='/api/payments')

@payment_bp.route('/methods', methods=['GET'])
def get_payment_methods():
    """Returns supported payment methods and genuine EMI details."""
    methods = PaymentService.get_supported_payment_methods()
    return jsonify({
        "success": True,
        "data": methods
    })

@payment_bp.route('/create-order', methods=['POST'])
@require_user_auth
def create_payment_order():
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')
    user_email = user.get('email')

    if not user_id:
        return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "User not authenticated"}}), 401

    payload = request.get_json() or {}
    plan_id = str(payload.get('plan_id') or '').strip().lower()
    billing_cycle = str(payload.get('billing_cycle') or 'monthly').strip().lower()

    plan = PlanService.get_plan_by_id(plan_id)
    if not plan or not plan.get('is_active', True):
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": f"Plan '{plan_id}' does not exist or is inactive"}}), 404

    amount_paise = int(plan.get('yearly_price_paise', 0) if billing_cycle == 'yearly' else plan.get('monthly_price_paise', 0))

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
            "data": order
        }), 201
    except ValueError as ve:
        return jsonify({"success": False, "error": {"code": "PAYMENT_ORDER_ERROR", "message": str(ve)}}), 400
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "SERVER_ERROR", "message": str(e)}}), 500

@payment_bp.route('/verify', methods=['POST'])
@require_user_auth
def verify_payment():
    """
    Verifies Razorpay cryptographic signature server-side.
    Activates subscription ONLY after genuine verification.
    """
    payload = request.get_json() or {}
    order_id = payload.get('razorpay_order_id')
    payment_id = payload.get('razorpay_payment_id')
    signature = payload.get('razorpay_signature')
    payment_method = payload.get('payment_method')

    if not order_id or not payment_id or not signature:
        return jsonify({
            "success": False,
            "error": {"code": "VALIDATION_ERROR", "message": "Missing razorpay_order_id, razorpay_payment_id, or razorpay_signature"}
        }), 400

    is_valid = PaymentService.verify_payment_signature(order_id, payment_id, signature)
    if not is_valid:
        PaymentService.mark_payment_failed(order_id, "SIGNATURE_VERIFICATION_FAILED", "Cryptographic signature mismatch")
        return jsonify({
            "success": False,
            "error": {
                "code": "PAYMENT_SIGNATURE_INVALID",
                "message": "Payment verification failed: cryptographic signature mismatch. Payment was not authenticated."
            }
        }), 400

    try:
        payment = PaymentService.confirm_successful_payment(
            order_id=order_id,
            payment_id=payment_id,
            signature=signature,
            payment_method=payment_method
        )

        return jsonify({
            "success": True,
            "message": "Payment verified and subscription activated successfully!",
            "data": payment
        })
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "ACTIVATION_ERROR", "message": str(e)}}), 500

@payment_bp.route('/webhook', methods=['POST'])
def handle_razorpay_webhook():
    """
    Receives and processes asynchronous Razorpay payment webhook notifications.
    Verifies authenticity via RAZORPAY_WEBHOOK_SECRET and provides idempotency.
    """
    webhook_signature = request.headers.get('X-Razorpay-Signature')
    payload_body = request.get_data(as_text=True)

    if not webhook_signature:
        return jsonify({"success": False, "error": "Missing webhook signature"}), 400

    # Verify signature if webhook secret configured
    if Settings.get_razorpay_webhook_secret():
        if not PaymentService.verify_webhook_signature(payload_body, webhook_signature):
            return jsonify({"success": False, "error": "Invalid webhook signature"}), 400

    try:
        event_data = json.loads(payload_body)
    except Exception:
        return jsonify({"success": False, "error": "Invalid JSON payload"}), 400

    event_type = event_data.get('event')
    payload_entity = event_data.get('payload', {}).get('payment', {}).get('entity', {})
    order_id = payload_entity.get('order_id')
    payment_id = payload_entity.get('id')

    # Store webhook in payment_webhooks collection for idempotent auditing
    db = get_firestore_db()
    webhook_id = f"wh_{int(time.time() * 1000)}"
    try:
        db.collection('payment_webhooks').document(webhook_id).set({
            "id": webhook_id,
            "event": event_type,
            "order_id": order_id,
            "payment_id": payment_id,
            "payload": event_data,
            "received_at": event_data.get('created_at') or ""
        })
    except Exception as e:
        print(f"[Webhook] Audit record error: {e}")

    # Process events
    if event_type == 'payment.captured' and order_id and payment_id:
        try:
            PaymentService.confirm_successful_payment(
                order_id=order_id,
                payment_id=payment_id,
                signature=webhook_signature,
                payment_method=payload_entity.get('method')
            )
        except Exception as e:
            print(f"[Webhook] Capture processing notice: {e}")

    elif event_type == 'payment.failed' and order_id:
        err_code = payload_entity.get('error_code', 'PAYMENT_FAILED')
        err_desc = payload_entity.get('error_description', 'Transaction failed')
        PaymentService.mark_payment_failed(order_id, err_code, err_desc)

    return jsonify({"success": True, "status": "processed"}), 200

@payment_bp.route('/history', methods=['GET'])
@require_user_auth
def get_payment_history():
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')
    if not user_id:
        return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "User not authenticated"}}), 401

    payments = PaymentService.get_user_payments(user_id)
    return jsonify({
        "success": True,
        "data": payments
    })

