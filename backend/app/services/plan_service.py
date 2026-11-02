"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
PLAN SERVICE
==============================================================================
Location: backend/app/services/plan_service.py
==============================================================================
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from ..config.firebase import get_firestore_db
from ..models.plan import INITIAL_PLANS, Plan


class PlanService:
    @staticmethod
    def initialize_plans():
        """Idempotently seeds default plans into Cloud Firestore if not already present."""
        db = get_firestore_db()
        plans_col = db.collection('plans')
        try:
            for p in INITIAL_PLANS:
                p_id = p['plan_id']
                doc = plans_col.document(p_id).get()
                if not doc or not getattr(doc, 'exists', True) or not doc.to_dict():
                    data = dict(p)
                    data['updated_at'] = datetime.now(timezone.utc).isoformat()
                    plans_col.document(p_id).set(data)
        except Exception as e:
            print(f"[PlanService] Initialize plans notice: {e}")

    @staticmethod
    def get_active_plans() -> List[Dict[str, Any]]:
        """Returns all active plans ordered by display_order for public pricing."""
        PlanService.initialize_plans()
        db = get_firestore_db()
        plans = []
        try:
            for doc in db.collection('plans').stream():
                data = doc.to_dict() or {}
                if data.get('is_active', True):
                    data['id'] = doc.id
                    plans.append(data)
        except Exception as e:
            print(f"[PlanService] Fetch active plans error: {e}")
            plans = [dict(p) for p in INITIAL_PLANS if p.get('is_active', True)]

        # Fallback if DB was empty
        if not plans:
            plans = [dict(p) for p in INITIAL_PLANS if p.get('is_active', True)]

        plans.sort(key=lambda x: int(x.get('display_order', 99)))
        return plans

    @staticmethod
    def get_all_plans() -> List[Dict[str, Any]]:
        """Returns all plans (including inactive/archived) for Admin management."""
        PlanService.initialize_plans()
        db = get_firestore_db()
        plans = []
        try:
            for doc in db.collection('plans').stream():
                data = doc.to_dict() or {}
                data['id'] = doc.id
                plans.append(data)
        except Exception as e:
            print(f"[PlanService] Fetch all plans error: {e}")
            plans = [dict(p) for p in INITIAL_PLANS]

        if not plans:
            plans = [dict(p) for p in INITIAL_PLANS]

        plans.sort(key=lambda x: int(x.get('display_order', 99)))
        return plans

    @staticmethod
    def get_plan_by_id(plan_id: str) -> Optional[Dict[str, Any]]:
        PlanService.initialize_plans()
        db = get_firestore_db()
        try:
            doc = db.collection('plans').document(plan_id).get()
            if doc and getattr(doc, 'exists', True) and doc.to_dict():
                d = doc.to_dict()
                d['id'] = doc.id
                return d
        except Exception as e:
            print(f"[PlanService] Get plan error: {e}")

        # Check fallback
        matched = next((p for p in INITIAL_PLANS if p['plan_id'] == plan_id), None)
        return dict(matched) if matched else None

    @staticmethod
    def save_plan(plan_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates or updates a plan. Preserves monetary values in integer paise."""
        db = get_firestore_db()
        plan_id = str(plan_data.get('plan_id') or '').strip().lower()
        if not plan_id:
            raise ValueError("Plan ID is required")

        monthly_price_paise = int(plan_data.get('monthly_price_paise', 0))
        yearly_price_paise = int(plan_data.get('yearly_price_paise', 0))

        doc_data = {
            "plan_id": plan_id,
            "name": str(plan_data.get('name') or plan_id.capitalize()),
            "description": str(plan_data.get('description') or ''),
            "monthly_price_paise": monthly_price_paise,
            "yearly_price_paise": yearly_price_paise,
            "discount_label": str(plan_data.get('discount_label') or 'Save 17%'),
            "features": list(plan_data.get('features') or []),
            "limits": dict(plan_data.get('limits') or {}),
            "is_active": bool(plan_data.get('is_active', True)),
            "is_popular": bool(plan_data.get('is_popular', False)),
            "display_order": int(plan_data.get('display_order', 1)),
            "cta_text": str(plan_data.get('cta_text') or 'Choose Plan'),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        db.collection('plans').document(plan_id).set(doc_data)
        doc_data['id'] = plan_id
        return doc_data

    @staticmethod
    def archive_plan(plan_id: str) -> bool:
        """Archives a plan by setting is_active=False. Does NOT delete historical data."""
        db = get_firestore_db()
        plan = PlanService.get_plan_by_id(plan_id)
        if not plan:
            return False
        db.collection('plans').document(plan_id).update({
            "is_active": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        return True

