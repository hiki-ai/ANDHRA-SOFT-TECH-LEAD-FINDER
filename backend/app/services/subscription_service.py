"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
SUBSCRIPTION LIFECYCLE MANAGEMENT SERVICE
==============================================================================
Location: backend/app/services/subscription_service.py
==============================================================================
"""

import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from ..config.firebase import get_firestore_db
from .plan_service import PlanService


class SubscriptionService:
    @staticmethod
    def get_current_subscription(user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves user's active subscription.
        Checks for expiration; if expired, transitions status to 'expired'.
        """
        db = get_firestore_db()
        try:
            # Look for active subscriptions
            for doc in db.collection('subscriptions').stream():
                data = doc.to_dict() or {}
                if data.get('user_id') == user_id and data.get('status') == 'active':
                    data['id'] = doc.id

                    # Check expiration
                    expires_at = data.get('expires_at')
                    if expires_at:
                        try:
                            exp_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                            if datetime.now(timezone.utc) > exp_dt:
                                # Subscription expired
                                data['status'] = 'expired'
                                db.collection('subscriptions').document(doc.id).update({
                                    "status": "expired",
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                })
                                return None
                        except Exception:
                            pass

                    # Attach plan details
                    plan = PlanService.get_plan_by_id(data.get('plan_id'))
                    if plan:
                        data['plan_details'] = plan
                        data['plan_name'] = plan.get('name')

                    return data
        except Exception as e:
            print(f"[SubscriptionService] Get current subscription error: {e}")

        return None

    @staticmethod
    def activate_subscription(
        user_id: str,
        plan_id: str,
        billing_cycle: str,
        amount_paise: int,
        order_id: str,
        payment_id: str
    ) -> Dict[str, Any]:
        """
        Activates a paid plan for the user upon verified payment.
        Expires/replaces any previous active subscription.
        """
        db = get_firestore_db()
        now = datetime.now(timezone.utc)

        # 1. Archive previous active subscriptions for this user
        try:
            for doc in db.collection('subscriptions').stream():
                d = doc.to_dict() or {}
                if d.get('user_id') == user_id and d.get('status') == 'active':
                    db.collection('subscriptions').document(doc.id).update({
                        "status": "cancelled",
                        "cancelled_at": now.isoformat(),
                        "cancellation_reason": "Upgraded or renewed"
                    })
        except Exception as e:
            print(f"[SubscriptionService] Cancel previous sub notice: {e}")

        # 2. Calculate expiration
        if billing_cycle == 'yearly':
            expires_at = (now + timedelta(days=365)).isoformat()
        else:
            expires_at = (now + timedelta(days=30)).isoformat()

        plan = PlanService.get_plan_by_id(plan_id)
        plan_name = plan.get('name', plan_id.capitalize()) if plan else plan_id.capitalize()

        sub_id = f"sub_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        sub_doc = {
            "id": sub_id,
            "user_id": user_id,
            "plan_id": plan_id,
            "plan_name": plan_name,
            "billing_cycle": billing_cycle,
            "amount_paise": amount_paise,
            "status": "active",
            "started_at": now.isoformat(),
            "expires_at": expires_at,
            "cancelled_at": None,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }

        db.collection('subscriptions').document(sub_id).set(sub_doc)
        return sub_doc

    @staticmethod
    def cancel_subscription(user_id: str, subscription_id: Optional[str] = None) -> bool:
        """Cancels an active subscription without deleting customer data."""
        db = get_firestore_db()
        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            for doc in db.collection('subscriptions').stream():
                d = doc.to_dict() or {}
                if d.get('user_id') == user_id and d.get('status') == 'active':
                    if not subscription_id or doc.id == subscription_id:
                        db.collection('subscriptions').document(doc.id).update({
                            "status": "cancelled",
                            "cancelled_at": now_iso,
                            "updated_at": now_iso
                        })
                        return True
        except Exception as e:
            print(f"[SubscriptionService] Cancel error: {e}")
        return False

    @staticmethod
    def get_user_subscription_history(user_id: str) -> List[Dict[str, Any]]:
        """Returns all subscription records (active, expired, cancelled) for the user."""
        db = get_firestore_db()
        subs = []
        try:
            for doc in db.collection('subscriptions').stream():
                d = doc.to_dict() or {}
                if d.get('user_id') == user_id:
                    d['id'] = doc.id
                    subs.append(d)
        except Exception as e:
            print(f"[SubscriptionService] User sub history error: {e}")

        subs.sort(key=lambda x: str(x.get('started_at', '')), reverse=True)
        return subs

    @staticmethod
    def get_all_subscriptions(limit: int = 200, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Admin helper to view and filter subscriptions."""
        db = get_firestore_db()
        subs = []
        try:
            for doc in db.collection('subscriptions').stream():
                d = doc.to_dict() or {}
                d['id'] = doc.id
                if not status_filter or d.get('status') == status_filter:
                    subs.append(d)
        except Exception as e:
            print(f"[SubscriptionService] Get all subs error: {e}")

        subs.sort(key=lambda x: str(x.get('started_at', '')), reverse=True)
        return subs[:limit]

    @staticmethod
    def get_cycle_usage(user_id: str, cycle_start_iso: Optional[str] = None) -> int:
        """Calculates total valid vendor records extracted by user within current billing period."""
        db = get_firestore_db()
        count = 0
        try:
            for doc in db.collection('vendors').stream():
                d = doc.to_dict() or {}
                if d.get('user_id') == user_id:
                    if cycle_start_iso:
                        created_at = d.get('created_at', '')
                        if created_at >= cycle_start_iso:
                            count += 1
                    else:
                        count += 1
        except Exception as e:
            print(f"[SubscriptionService] Cycle usage count notice: {e}")
        return count

