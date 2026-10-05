from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth

import_bp = Blueprint('imports', __name__, url_prefix='/api/v1/imports')

@import_bp.route('', methods=['POST'])
@require_auth
def upload_import_file():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": {"code": "FILE_REQUIRED", "message": "No file uploaded"}}), 400
    file = request.files['file']
    return jsonify({
        "success": True,
        "data": {
            "job_id": "imp_demo_101",
            "filename": file.filename,
            "detected_rows": 1320,
            "detected_columns": ["Company Name", "Industry", "Mobile", "Email ID", "Town/City", "State", "Zipcode"]
        }
    })
