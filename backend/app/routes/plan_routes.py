"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
PUBLIC PLANS & BILLING SETTINGS ROUTES
==============================================================================
Location: backend/app/routes/plan_routes.py
==============================================================================
"""

from flask import Blueprint, jsonify
from ..services.plan_service import PlanService
from ..services.trial_service import TrialService

plan_bp = Blueprint('plans', __name__, url_prefix='/api/plans')
public_bp = Blueprint('public', __name__, url_prefix='/api/public')

@plan_bp.route('', methods=['GET'])
def get_public_plans():
    """
    Returns all active premium plans dynamically from Cloud Firestore.
    Monetary amounts are provided in both integer paise and INR.
    """
    plans = PlanService.get_active_plans()
    formatted = []
    for p in plans:
        m_paise = int(p.get('monthly_price_paise', 0))
        y_paise = int(p.get('yearly_price_paise', 0))
        if not m_paise and p.get('monthly_price_inr'):
            m_paise = int(round(float(p.get('monthly_price_inr')) * 100))
        if not y_paise and p.get('yearly_price_inr'):
            y_paise = int(round(float(p.get('yearly_price_inr')) * 100))

        name = p.get('name') or p.get('display_name') or p.get('plan_id', '')
        formatted.append({
            "plan_id": p.get('plan_id') or p.get('id'),
            "id": p.get('plan_id') or p.get('id'),
            "name": name,
            "display_name": name,
            "description": p.get('description', ''),
            "monthly_price_paise": m_paise,
            "monthly_price_inr": round(m_paise / 100, 2),
            "yearly_price_paise": y_paise,
            "yearly_price_inr": round(y_paise / 100, 2),
            "discount_label": p.get('discount_label', 'Save 17%'),
            "features": p.get('features', []),
            "limits": p.get('limits', {}),
            "is_active": p.get('is_active', True),
            "is_popular": p.get('is_popular', False),
            "display_order": p.get('display_order', 99),
            "cta_text": p.get('cta_text', 'Choose Plan')
        })

    return jsonify({
        "success": True,
        "data": formatted
    })

@public_bp.route('/settings', methods=['GET'])
def get_public_settings():
    """Returns safe public settings for pricing page (free trial config, currency)."""
    trial_settings = TrialService.get_trial_settings()
    return jsonify({
        "success": True,
        "data": {
            "free_trial_enabled": trial_settings.get('free_trial_enabled', True),
            "default_trial_record_limit": trial_settings.get('default_trial_record_limit', 30),
            "trial_duration_days": trial_settings.get('trial_duration_days', 14),
            "currency": trial_settings.get('currency', 'INR')
        }
    })
