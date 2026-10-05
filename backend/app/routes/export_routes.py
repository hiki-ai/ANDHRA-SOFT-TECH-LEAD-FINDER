from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth

export_bp = Blueprint('exports', __name__, url_prefix='/api/v1/exports')

@export_bp.route('', methods=['POST'])
@require_auth
def trigger_export():
    payload = request.get_json() or {}
    return jsonify({
        "success": True,
        "data": {
            "export_id": "exp_demo_202",
            "status": "completed",
            "download_url": "/api/v1/exports/exp_demo_202/download"
        },
        "message": "Export created successfully"
    })
