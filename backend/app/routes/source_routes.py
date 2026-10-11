"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
DATA SOURCES REST API ROUTES
==============================================================================
Location: backend/app/routes/source_routes.py

Returns availability, configuration status, and capabilities for registered
data source connectors (Google Places, Justdial, Magicpin).
==============================================================================
"""

import os
import sys
from flask import Blueprint, jsonify
from ..middleware.firebase_auth import require_auth

source_bp = Blueprint('sources', __name__, url_prefix='/api/v1/sources')

# Ensure worker package is in python path
worker_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'worker'))
if os.path.isdir(worker_path) and worker_path not in sys.path:
    sys.path.insert(0, worker_path)


@source_bp.route('', methods=['GET'])
@require_auth
def list_sources():
    try:
        from collectors.source_manager import SourceManager
        sm = SourceManager()
        sources = sm.list_sources()
    except Exception as e:
        print(f"[SourceRoutes] Error resolving sources: {e}")
        from ..config.settings import Settings
        has_google_key = bool(Settings.get_google_maps_api_key() and len(Settings.get_google_maps_api_key()) >= 15)
        sources = [
            {
                "id": "google_places",
                "name": "Google Maps / Google Places API",
                "status": "active" if has_google_key else "not_configured",
                "is_available": has_google_key,
                "required_keys": ["GOOGLE_MAPS_API_KEY"],
                "per_query_limit": 60,
                "rate_limit": "Max 60 places per query (Google Maps Platform official 3-page quota)",
                "message": (
                    "Google Maps Platform Places API is configured and operational."
                    if has_google_key
                    else "GOOGLE_MAPS_API_KEY is not configured in the server environment. Please set GOOGLE_MAPS_API_KEY in your Render environment variables."
                )
            },
            {
                "id": "justdial",
                "name": "Justdial (Enterprise Partner / License Required)",
                "status": "authorization_required",
                "is_available": False,
                "required_keys": ["JUSTDIAL_API_KEY"],
                "rate_limit": "Commercial enterprise feed agreement required",
                "message": "Justdial does not provide a public developer API. An authorized Enterprise Partner Agreement or licensed commercial data feed is required to activate this connector."
            },
            {
                "id": "magicpin",
                "name": "Magicpin (Merchant Partner / License Required)",
                "status": "authorization_required",
                "is_available": False,
                "required_keys": ["MAGICPIN_API_KEY"],
                "rate_limit": "Commercial merchant feed agreement required",
                "message": "Magicpin does not provide an open public directory API. Official Merchant Partner API credentials or licensed dataset integration is required to activate this connector."
            }
        ]

    return jsonify({
        "success": True,
        "data": sources
    })
