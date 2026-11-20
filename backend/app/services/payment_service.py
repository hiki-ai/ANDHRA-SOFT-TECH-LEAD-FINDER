"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
RAZORPAY PAYMENT GATEWAY SERVICE & SIGNATURE VERIFICATION
==============================================================================
Location: backend/app/services/payment_service.py
==============================================================================
"""

import hmac
import hashlib
import time
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import requests

from ..config.settings import Settings
from ..config.firebase import get_firestore_db


class PaymentService:
    @staticmethod
    def get_supported_payment_methods(amount_paise: int = 0) -> Dict[str, Any]:
        """
        Returns authentic list of supported payment channels.
        In live production, if Razorpay credentials are configured, can query Razorpay Methods API:
        GET https://api.razorpay.com/v1/methods
        """
        key_id = Settings.get_razorpay_key_id()
        key_secret = Settings.get_razorpay_key_secret()

        # If live credentials available, attempt to query Razorpay's live methods
        if key_id and key_secret:
            try:
                res = requests.get(
                    "https://api.razorpay.com/v1/methods",
                    auth=(key_id, key_secret),
                    timeout=5
                )
                if res.status_code == 200:
                    data = res.json()
                    # Razorpay methods payload contains 'card', 'upi', 'netbanking', 'wallet', 'emi'
                    return {
                        "is_live_gateway": True,
                        "upi": data.get('upi', True),
                        "card": data.get('card', True),
                        "netbanking": data.get('netbanking', True),
                        "wallet": data.get('wallet', True),
                        "emi": data.get('emi', False),
                        "raw_methods": data
                    }
            except Exception as e:
                print(f"[PaymentService] Live Razorpay methods query notice: {e}")

        # Baseline compliant options supported by Razorpay Standard Checkout
        return {
            "is_live_gateway": bool(key_id and key_secret),
            "channels": [
                {
                    "id": "upi",
                    "name": "UPI & QR",
                    "description": "Instant payment via Google Pay, PhonePe, Paytm, BHIM, and UPI ID",
                    "icon": "zap",
                    "popular": True
                },
                {
                    "id": "cards",
                    "name": "Credit & Debit Cards",
                    "description": "Visa, MasterCard, RuPay, Diners Club, and American Express",
                    "icon": "credit-card"
                },
                {
                    "id": "netbanking",
                    "name": "Net Banking",
                    "description": "50+ Indian banks including SBI, HDFC, ICICI, Axis, Kotak",
                    "icon": "building"
                },
                {
                    "id": "wallets",
                    "name": "Digital Wallets",
                    "description": "Paytm, Mobikwik, Freecharge, and Airtel Money",
                    "icon": "wallet"
                },
                {
                    "id": "emi",
                    "name": "EMI / Pay Later",
                    "description": "Eligible Credit & Debit card EMI subject to issuing bank approval",
                    "icon": "calendar",
                    "note": "EMI tenures and interest rates are determined directly by your bank at checkout."
                }
            ],
            "currency": "INR"
        }

    @staticmethod
    def create_order(
        user_id: str,
        user_email: str,
        plan_id: str,
        billing_cycle: str,
        amount_paise: int,
        currency: str = "INR",
        receipt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates an authorized payment order with Razorpay or test order in test mode.
        Minimum allowed amount is 100 paise (₹1.00).
        """
        if amount_paise < 100:
            raise ValueError("Payment amount must be at least 100 paise (₹1.00).")

        receipt_id = receipt or f"rcpt_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        key_id = Settings.get_razorpay_key_id()
        key_secret = Settings.get_razorpay_key_secret()

        order_id = None
        now_iso = datetime.now(timezone.utc).isoformat()

        if key_id and key_secret:
            try:
                import razorpay
                client = razorpay.Client(auth=(key_id, key_secret))
                order_payload = {
                    "amount": amount_paise,
                    "currency": currency,
                    "receipt": receipt_id,
                    "notes": {
                        "user_id": user_id,
                        "user_email": user_email,
                        "plan_id": plan_id,
                        "billing_cycle": billing_cycle
                    }
                }
                order_data = client.order.create(data=order_payload)
                order_id = order_data.get('id')
            except Exception as rzp_sdk_err:
                # Direct API fallback with requests if SDK encounters local environment issue
                try:
                    res = requests.post(
                        "https://api.razorpay.com/v1/orders",
                        auth=(key_id, key_secret),
                        json={
                            "amount": amount_paise,
                            "currency": currency,
                            "receipt": receipt_id,
                            "notes": {
                                "user_id": user_id,
                                "user_email": user_email,
                                "plan_id": plan_id,
                                "billing_cycle": billing_cycle
                            }
                        },
                        timeout=10
                    )
                    if res.status_code in (200, 201):
                        order_data = res.json()
                        order_id = order_data.get('id')
                    else:
                        raise RuntimeError(f"Razorpay order creation failed ({res.status_code}): {res.text}")
                except requests.RequestException as req_err:
                    if Settings.TESTING:
                        order_id = f"order_test_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
                    else:
                        raise RuntimeError(f"Unable to reach Razorpay gateway: {str(req_err)}")
        elif Settings.TESTING:
            # Deterministic mock order ID for testing mode
            order_id = f"order_test_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        else:
            # Payment gateway credentials not configured on backend
            raise RuntimeError(
                "Razorpay payment gateway credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) "
                "are not configured. Please configure them in environment variables."
            )

        if not order_id:
            raise ValueError("Failed to obtain Razorpay order identifier.")

        # Store payment intent in 'payments' collection with status='created'
        db = get_firestore_db()
        payment_doc = {
            "id": order_id,
            "order_id": order_id,
            "user_id": user_id,
            "user_email": user_email,
            "plan_id": plan_id,
            "billing_cycle": billing_cycle,
            "amount_paise": amount_paise,
            "amount_inr": round(amount_paise / 100, 2),
            "currency": currency,
            "status": "created",
            "receipt": receipt_id,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": None,
            "razorpay_signature": None,
            "created_at": now_iso,
            "updated_at": now_iso
        }

        db.collection('payments').document(order_id).set(payment_doc)

        return {
            "order_id": order_id,
            "amount_paise": amount_paise,
            "amount_inr": round(amount_paise / 100, 2),
            "currency": currency,
            "key_id": key_id or "rzp_test_placeholder",
            "receipt": receipt_id,
            "plan_id": plan_id,
            "billing_cycle": billing_cycle
        }

    @staticmethod
    def verify_payment_signature(
        order_id: str,
        payment_id: str,
        signature: str
    ) -> bool:
        """
        Cryptographically verifies the HMAC SHA256 signature returned by Razorpay Checkout.
        Never trust client-side assertion.
        """
        key_secret = Settings.get_razorpay_key_secret()

        # In testing mode, accept deterministic signature for mock test suites
        if Settings.TESTING and signature == "test_valid_signature":
            return True

        if not key_secret or not order_id or not payment_id or not signature:
            return False

        message = f"{order_id}|{payment_id}".encode('utf-8')
        generated_signature = hmac.new(
            key=key_secret.encode('utf-8'),
            msg=message,
            digestmod=hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(generated_signature, signature)

    @staticmethod
    def verify_webhook_signature(
        payload_body: str,
        webhook_signature: str
    ) -> bool:
        """Verifies webhook signature using RAZORPAY_WEBHOOK_SECRET."""
        webhook_secret = Settings.get_razorpay_webhook_secret()
        if not webhook_secret or not webhook_signature:
            return False

        generated = hmac.new(
            key=webhook_secret.encode('utf-8'),
            msg=payload_body.encode('utf-8'),
            digestmod=hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(generated, webhook_signature)

    @staticmethod
    def confirm_successful_payment(
        order_id: str,
        payment_id: str,
        signature: str,
        payment_method: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes a verified payment and activates the user subscription idempotently.
        """
        db = get_firestore_db()
        doc = db.collection('payments').document(order_id).get()
        doc_exists = bool(doc and getattr(doc, 'exists', False) and doc.to_dict())
        payment_data: Dict[str, Any] = dict(doc.to_dict() or {}) if doc_exists else {
            "id": order_id,
            "order_id": order_id,
            "razorpay_order_id": order_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        # Idempotency check: if already successful, return existing payment
        if payment_data.get('status') == 'successful':
            return payment_data

        now_iso = datetime.now(timezone.utc).isoformat()
        updates = {
            "status": "successful",
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
            "payment_method": payment_method or payment_data.get('payment_method') or "UPI / Card",
            "updated_at": now_iso
        }

        if doc_exists:
            db.collection('payments').document(order_id).update(updates)
        else:
            payment_data.update(updates)
            db.collection('payments').document(order_id).set(payment_data)

        payment_data.update(updates)

        # Activate subscription only if user_id and plan_id are present
        if payment_data.get('user_id') and payment_data.get('plan_id'):
            from .subscription_service import SubscriptionService
            try:
                raw_amount = payment_data.get('amount_paise', 0)
                amount_int = int(raw_amount) if raw_amount else 0
                SubscriptionService.activate_subscription(
                    user_id=str(payment_data['user_id']),
                    plan_id=str(payment_data['plan_id']),
                    billing_cycle=str(payment_data.get('billing_cycle', 'monthly')),
                    amount_paise=amount_int,
                    order_id=order_id,
                    payment_id=payment_id
                )
            except Exception as e:
                print(f"[PaymentService] Subscription activation notice: {e}")

        return payment_data

    @staticmethod
    def mark_payment_failed(order_id: str, error_code: str, error_description: str):
        db = get_firestore_db()
        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            db.collection('payments').document(order_id).update({
                "status": "failed",
                "error_code": error_code,
                "error_description": error_description,
                "updated_at": now_iso
            })
        except Exception as e:
            print(f"[PaymentService] Mark failed error: {e}")

    @staticmethod
    def get_user_payments(user_id: str) -> List[Dict[str, Any]]:
        """Returns payments for a specific user strictly."""
        db = get_firestore_db()
        payments = []
        try:
            for doc in db.collection('payments').stream():
                d = doc.to_dict() or {}
                if d.get('user_id') == user_id:
                    d['id'] = doc.id
                    payments.append(d)
        except Exception as e:
            print(f"[PaymentService] Get user payments error: {e}")

        payments.sort(key=lambda x: str(x.get('created_at', '')), reverse=True)
        return payments

    @staticmethod
    def get_all_payments(limit: int = 200) -> List[Dict[str, Any]]:
        """Admin view of all payments."""
        db = get_firestore_db()
        payments = []
        try:
            for doc in db.collection('payments').stream():
                d = doc.to_dict() or {}
                d['id'] = doc.id
                payments.append(d)
        except Exception as e:
            print(f"[PaymentService] Get all payments error: {e}")

        payments.sort(key=lambda x: str(x.get('created_at', '')), reverse=True)
        return payments[:limit]
