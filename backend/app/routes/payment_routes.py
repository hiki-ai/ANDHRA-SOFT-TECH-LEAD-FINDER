"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
RAZORPAY STANDARD WEB CHECKOUT & PAYMENT API ROUTES
==============================================================================
Location: backend/app/routes/payment_routes.py
==============================================================================
"""

import json
import time
from typing import Optional, Dict, Any, Tuple
from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_user_auth
from ..services.payment_service import PaymentService
from ..services.plan_service import PlanService
from ..config.settings import Settings
from ..config.firebase import get_firestore_db, init_firebase_admin, is_live_firestore

payment_bp = Blueprint('payments', __name__, url_prefix='/api/payments')
standard_checkout_bp = Blueprint('standard_checkout', __name__, url_prefix='/api')


def check_request_auth() -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[Any, int]]]:
    """
    Validates Authorization header if present.
    Returns (user_info, error_response_tuple).
    - If header is present and invalid -> error_response is (jsonify(...), 401).
    - If header is missing -> user_info is None, error_response is None.
    - If header is valid -> user_info is dict, error_response is None.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        # Check if already authenticated by an upstream decorator
        current = getattr(request, 'current_user', None)
        if current and isinstance(current, dict) and current.get('uid'):
            return current, None
        return None, None

    if not auth_header.startswith('Bearer '):
        return None, (jsonify({
            "success": False,
            "error": {
                "code": "AUTH_INVALID_TOKEN",
                "message": "Authorization header format invalid. Must be 'Bearer <token>'"
            }
        }), 401)

    token = auth_header.split('Bearer ', 1)[1].strip()
    if not token:
        return None, (jsonify({
            "success": False,
            "error": {
                "code": "AUTH_INVALID_TOKEN",
                "message": "Bearer token must not be empty"
            }
        }), 401)

    # In testing mode, accept deterministic test tokens
    if Settings.TESTING:
        if token in ("test_admin_token", "test_user_token") or token.startswith("test_user_"):
            user_data = {
                "uid": "test_user_uid" if token != "test_admin_token" else "test_admin_uid",
                "email": "test_user@example.com" if token != "test_admin_token" else "admin@andhrasofttech.com",
                "role": "admin" if token == "test_admin_token" else "user"
            }
            request.current_user = user_data
            return user_data, None
        else:
            return None, (jsonify({
                "success": False,
                "error": {
                    "code": "AUTH_INVALID_TOKEN",
                    "message": "Invalid test authorization token"
                }
            }), 401)

    init_firebase_admin()
    import firebase_admin
    from firebase_admin import auth
    if firebase_admin._apps and is_live_firestore():
        try:
            decoded = auth.verify_id_token(token)
            user_data = {
                "uid": decoded.get('uid') or decoded.get('user_id'),
                "email": decoded.get('email', ''),
                "role": "admin" if decoded.get('admin') else "user",
                "claims": decoded
            }
            request.current_user = user_data
            return user_data, None
        except Exception as e:
            return None, (jsonify({
                "success": False,
                "error": {
                    "code": "AUTH_INVALID_TOKEN",
                    "message": f"Authentication token verification failed: {str(e)}"
                }
            }), 401)
    else:
        # Dev fallback JWT decode
        if token.startswith("ey"):
            try:
                import base64
                payload_part = token.split('.')[1]
                padded = payload_part + '=' * (-len(payload_part) % 4)
                claims = json.loads(base64.urlsafe_b64decode(padded.encode('utf-8')).decode('utf-8'))
                user_data = {
                    "uid": claims.get('user_id') or claims.get('uid') or claims.get('sub') or 'dev_user',
                    "email": claims.get('email', ''),
                    "role": "user"
                }
                request.current_user = user_data
                return user_data, None
            except Exception:
                return None, (jsonify({
                    "success": False,
                    "error": {
                        "code": "AUTH_INVALID_TOKEN",
                        "message": "Failed to decode JWT authorization token"
                    }
                }), 401)
        return None, (jsonify({
            "success": False,
            "error": {
                "code": "AUTH_INVALID_TOKEN",
                "message": "Invalid authorization token"
            }
        }), 401)


def handle_create_order_request():
    """
    Unified order creation handler.
    Supports:
      1. Standard Razorpay checkout: { amount (paise), currency, receipt }
      2. SaaS subscription checkout: { plan_id, billing_cycle }
    Validates minimum amount (>= 100 paise) and authenticates when required.
    """
    # 1. Check authentication if header present
    user_info, auth_err = check_request_auth()
    if auth_err:
        return auth_err

    payload = request.get_json(silent=True) or {}

    amount_input = payload.get('amount')
    plan_id = str(payload.get('plan_id') or '').strip().lower()
    billing_cycle = str(payload.get('billing_cycle') or 'monthly').strip().lower()
    currency = str(payload.get('currency') or 'INR').upper()
    receipt = payload.get('receipt')

    amount_paise = None

    if amount_input is not None:
        try:
            amount_paise = int(amount_input)
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_AMOUNT",
                    "message": "Amount must be a valid number of paise (minimum 100)."
                }
            }), 400

        # Reject amounts less than 100 paise (₹1.00) with HTTP 400
        if amount_paise < 100:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_AMOUNT",
                    "message": "Payment amount must be at least 100 paise (₹1.00)."
                }
            }), 400

        user_id = user_info.get('uid') if user_info else str(payload.get('user_id') or 'guest_user')
        user_email = user_info.get('email') if user_info else str(payload.get('user_email') or '')

    elif plan_id:
        if not user_info and not payload.get('user_id'):
            return jsonify({
                "success": False,
                "error": {
                    "code": "AUTH_REQUIRED",
                    "message": "User authentication required to checkout a subscription plan."
                }
            }), 401

        user_id = user_info.get('uid') if user_info else str(payload.get('user_id') or '')
        user_email = user_info.get('email') if user_info else str(payload.get('user_email') or '')

        plan = PlanService.get_plan_by_id(plan_id)
        if not plan or not plan.get('is_active', True):
            return jsonify({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Plan '{plan_id}' does not exist or is inactive"
                }
            }), 404

        amount_paise = int(plan.get('yearly_price_paise', 0) if billing_cycle == 'yearly' else plan.get('monthly_price_paise', 0))
        if amount_paise < 100:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_AMOUNT",
                    "message": "Payment amount must be at least 100 paise (₹1.00)."
                }
            }), 400
    else:
        return jsonify({
            "success": False,
            "error": {
                "code": "MISSING_REQUIRED_FIELDS",
                "message": "Missing required field: provide 'amount' in paise or 'plan_id'."
            }
        }), 400

    try:
        order = PaymentService.create_order(
            user_id=str(user_id or ''),
            user_email=str(user_email or ''),
            plan_id=plan_id,
            billing_cycle=billing_cycle,
            amount_paise=amount_paise,
            currency=currency,
            receipt=receipt
        )
        return jsonify({
            "order_id": order.get('order_id'),
            "amount": order.get('amount_paise'),
            "currency": order.get('currency', 'INR'),
            "key_id": order.get('key_id'),
            "receipt": order.get('receipt'),
            "plan_id": plan_id,
            "billing_cycle": billing_cycle,
            "success": True,
            "data": order
        }), 201
    except ValueError as ve:
        err_msg = str(ve)
        code = "INVALID_AMOUNT" if "100 paise" in err_msg else "PAYMENT_ORDER_ERROR"
        return jsonify({"success": False, "error": {"code": code, "message": err_msg}}), 400
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "RAZORPAY_API_ERROR", "message": str(e)}}), 500


def handle_verify_payment_request():
    """
    Unified payment signature verification handler.
    Verifies HMAC-SHA256 signature server-side using RAZORPAY_KEY_SECRET.
    Rejects invalid signatures with HTTP 400 and does NOT mark as paid.
    """
    # 1. Check authentication if header present
    _, auth_err = check_request_auth()
    if auth_err:
        return auth_err

    payload = request.get_json(silent=True) or {}
    order_id = payload.get('razorpay_order_id') or payload.get('order_id')
    payment_id = payload.get('razorpay_payment_id') or payload.get('payment_id')
    signature = payload.get('razorpay_signature') or payload.get('signature')
    payment_method = payload.get('payment_method')

    # Missing fields check
    if not order_id or not payment_id or not signature:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Missing required fields: order_id, payment_id, and signature are all required."
            }
        }), 400

    # Cryptographic HMAC SHA256 verification
    is_valid = PaymentService.verify_payment_signature(str(order_id), str(payment_id), str(signature))
    if not is_valid:
        PaymentService.mark_payment_failed(
            str(order_id),
            "SIGNATURE_VERIFICATION_FAILED",
            "Cryptographic signature mismatch"
        )
        return jsonify({
            "success": False,
            "error": {
                "code": "PAYMENT_SIGNATURE_INVALID",
                "message": "Payment verification failed: cryptographic signature mismatch. Payment was not authenticated."
            }
        }), 400

    try:
        payment = PaymentService.confirm_successful_payment(
            order_id=str(order_id),
            payment_id=str(payment_id),
            signature=str(signature),
            payment_method=payment_method
        )

        return jsonify({
            "success": True,
            "message": "Payment verified and processed successfully!",
            "order_id": str(order_id),
            "payment_id": str(payment_id),
            "data": payment
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "ACTIVATION_ERROR", "message": str(e)}}), 500


# ==============================================================================
# STANDARD CHECKOUT BLUEPRINT ROUTES (/api/...)
# ==============================================================================

@standard_checkout_bp.route('/create-order', methods=['POST'])
def standard_create_order():
    """Standard checkout endpoint: POST /api/create-order"""
    return handle_create_order_request()


@standard_checkout_bp.route('/verify-payment', methods=['POST'])
@standard_checkout_bp.route('/verify', methods=['POST'])
def standard_verify_payment():
    """Standard checkout endpoint: POST /api/verify-payment"""
    return handle_verify_payment_request()


# ==============================================================================
# PAYMENTS BLUEPRINT ROUTES (/api/payments/...)
# ==============================================================================

@payment_bp.route('/methods', methods=['GET'])
def get_payment_methods():
    """Returns supported payment methods and genuine EMI details."""
    methods = PaymentService.get_supported_payment_methods()
    return jsonify({
        "success": True,
        "data": methods
    })


@payment_bp.route('/create-order', methods=['POST'])
def payment_create_order():
    """Payment order endpoint: POST /api/payments/create-order"""
    return handle_create_order_request()


@payment_bp.route('/verify', methods=['POST'])
@payment_bp.route('/verify-payment', methods=['POST'])
def payment_verify():
    """Payment verification endpoint: POST /api/payments/verify & /verify-payment"""
    return handle_verify_payment_request()


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
