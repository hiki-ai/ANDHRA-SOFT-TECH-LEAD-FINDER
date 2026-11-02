"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
FREE TRIAL SERVICE & ATOMIC LIMIT ENFORCEMENT
==============================================================================
Location: backend/app/services/trial_service.py
==============================================================================
"""

import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Tuple, List
from ..config.firebase import get_firestore_db
from ..models.billing_settings import DEFAULT_TRIAL_SETTINGS
from ..models.trial import Trial, DEFAULT_TRIAL_LIMIT

# Concurrency lock to prevent race conditions during simultaneous collection jobs
_trial_lock = threading.Lock()

class TrialService:
    @staticmethod
    def get_trial_settings() -> Dict[str, Any]:
        """Fetches global trial settings from admin_settings/trial_config or defaults."""
        db = get_firestore_db()
        try:
            doc = db.collection('admin_settings').document('trial_config').get()
            if doc and getattr(doc, 'exists', True) and doc.to_dict():
                return doc.to_dict() or dict(DEFAULT_TRIAL_SETTINGS)
        except Exception as e:
            print(f"[TrialService] Get settings notice: {e}")

        return dict(DEFAULT_TRIAL_SETTINGS)

    @staticmethod
    def update_trial_settings(settings_data: Dict[str, Any]) -> Dict[str, Any]:
        """Updates admin trial settings."""
        db = get_firestore_db()
        current = TrialService.get_trial_settings()
        current.update({
            "free_trial_enabled": bool(settings_data.get('free_trial_enabled', current.get('free_trial_enabled', True))),
            "default_trial_record_limit": int(settings_data.get('default_trial_record_limit', current.get('default_trial_record_limit', 30))),
            "trial_duration_days": int(settings_data.get('trial_duration_days', current.get('trial_duration_days', 14))),
            "prevent_duplicate_accounts": bool(settings_data.get('prevent_duplicate_accounts', current.get('prevent_duplicate_accounts', True))),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        db.collection('admin_settings').document('trial_config').set(current)
        return current

    @staticmethod
    def get_user_trial(user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves user trial record from trials collection."""
        db = get_firestore_db()
        try:
            doc = db.collection('trials').document(user_id).get()
            if doc and getattr(doc, 'exists', True) and doc.to_dict():
                data = doc.to_dict()
                data['user_id'] = user_id
                # Calculate live remaining
                limit = int(data.get('trial_limit', DEFAULT_TRIAL_LIMIT))
                used = int(data.get('trial_used', 0))
                data['trial_remaining'] = max(0, limit - used)

                # Check expiration
                expires_at = data.get('trial_expires_at')
                if expires_at and data.get('trial_status') == 'active':
                    try:
                        exp_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                        if datetime.now(timezone.utc) > exp_dt:
                            data['trial_status'] = 'expired'
                            db.collection('trials').document(user_id).update({"trial_status": "expired"})
                    except Exception:
                        pass

                return data
        except Exception as e:
            print(f"[TrialService] Get user trial error: {e}")
        return None

    @staticmethod
    def start_user_trial(user_id: str, user_email: Optional[str] = None) -> Dict[str, Any]:
        """Activates a free trial for an authenticated user."""
        with _trial_lock:
            existing = TrialService.get_user_trial(user_id)
            if existing:
                return existing

            settings = TrialService.get_trial_settings()
            if not settings.get('free_trial_enabled', True):
                raise ValueError("Free Trial program is currently disabled by administrator.")

            db = get_firestore_db()

            # Prevent obvious multi-account abuse by checking if user_email already had a trial
            if user_email and settings.get('prevent_duplicate_accounts', True):
                clean_email = user_email.strip().lower()
                for doc in db.collection('trials').stream():
                    d = doc.to_dict() or {}
                    if d.get('user_email', '').strip().lower() == clean_email:
                        raise ValueError("A free trial has already been registered with this email address.")

            now = datetime.now(timezone.utc)
            duration_days = int(settings.get('trial_duration_days', 14))
            expires_at = (now + timedelta(days=duration_days)).isoformat()
            limit = int(settings.get('default_trial_record_limit', DEFAULT_TRIAL_LIMIT))

            trial_doc = {
                "user_id": user_id,
                "user_email": (user_email or '').strip().lower(),
                "trial_status": "active",
                "trial_limit": limit,
                "trial_used": 0,
                "trial_remaining": limit,
                "trial_started_at": now.isoformat(),
                "trial_expires_at": expires_at,
                "trial_completed_at": None,
                "unique_vendor_hashes": []
            }

            db.collection('trials').document(user_id).set(trial_doc)
            return trial_doc

    @staticmethod
    def check_extraction_allowance(user_id: str) -> Tuple[bool, int, str]:
        """
        Determines if user can extract more records based on trial or paid subscription.
        Returns (can_extract, remaining_quota, status_message).
        """
        # 1. Check paid subscription first
        from .subscription_service import SubscriptionService
        sub = SubscriptionService.get_current_subscription(user_id)
        if sub and sub.get('status') == 'active':
            plan_id = str(sub.get('plan_id') or 'basic')
            from .plan_service import PlanService
            plan = PlanService.get_plan_by_id(plan_id)
            plan_limits = plan.get('limits', {}) if plan else {}
            ext_limit = plan_limits.get('extraction_limit', 5000)
            if ext_limit == -1:  # Unlimited
                return True, 999999, "active_subscription_unlimited"
            # Get current cycle usage
            used = SubscriptionService.get_cycle_usage(user_id, sub.get('started_at'))
            remaining = max(0, ext_limit - used)
            if remaining <= 0:
                return False, 0, "subscription_limit_reached"
            return True, remaining, "active_subscription"

        # 2. Check trial
        trial = TrialService.get_user_trial(user_id)
        if not trial:
            return False, 0, "no_trial_or_subscription"

        if trial.get('trial_status') == 'completed':
            return False, 0, "trial_limit_reached"

        if trial.get('trial_status') == 'expired':
            return False, 0, "trial_expired"

        if trial.get('trial_status') != 'active':
            return False, 0, "trial_inactive"

        remaining = int(trial.get('trial_remaining', 0))
        if remaining <= 0:
            return False, 0, "trial_limit_reached"

        return True, remaining, "trial_active"

    @staticmethod
    def record_trial_unique_records(user_id: str, new_dedupe_keys: List[str]) -> Dict[str, Any]:
        """
        Atomically records newly discovered unique vendor records against trial quota.
        Does NOT count repeated vendor dedupe keys.
        """
        with _trial_lock:
            trial = TrialService.get_user_trial(user_id)
            if not trial:
                raise ValueError("Trial not found for user")

            db = get_firestore_db()
            existing_hashes = set(trial.get('unique_vendor_hashes', []))
            added_keys = []

            for key in new_dedupe_keys:
                if key and key not in existing_hashes:
                    existing_hashes.add(key)
                    added_keys.append(key)

            if not added_keys:
                # No new unique records added
                return trial

            new_used = len(existing_hashes)
            limit = int(trial.get('trial_limit', DEFAULT_TRIAL_LIMIT))
            new_remaining = max(0, limit - new_used)

            updates = {
                "trial_used": new_used,
                "trial_remaining": new_remaining,
                "unique_vendor_hashes": list(existing_hashes)
            }

            if new_used >= limit:
                updates["trial_status"] = "completed"
                updates["trial_completed_at"] = datetime.now(timezone.utc).isoformat()

            db.collection('trials').document(user_id).update(updates)
            trial.update(updates)
            return trial

    @staticmethod
    def get_all_trials(limit: int = 100) -> List[Dict[str, Any]]:
        """Admin helper to inspect all trial records."""
        db = get_firestore_db()
        trials = []
        try:
            for doc in db.collection('trials').stream():
                data = doc.to_dict() or {}
                data['user_id'] = doc.id
                limit_val = int(data.get('trial_limit', DEFAULT_TRIAL_LIMIT))
                used_val = int(data.get('trial_used', 0))
                data['trial_remaining'] = max(0, limit_val - used_val)
                # do not expose entire hash array in summary
                data['unique_records_count'] = len(data.get('unique_vendor_hashes', []))
                data.pop('unique_vendor_hashes', None)
                trials.append(data)
        except Exception as e:
            print(f"[TrialService] Get all trials error: {e}")

        trials.sort(key=lambda x: str(x.get('trial_started_at', '')), reverse=True)
        return trials[:limit]

