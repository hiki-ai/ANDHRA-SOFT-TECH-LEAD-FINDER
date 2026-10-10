"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
CUSTOM SPREADSHEET COLUMNS REST API ROUTES
==============================================================================
Location: backend/app/routes/column_routes.py

CRUD operations for customizable spreadsheet columns persisted in Cloud Firestore.
==============================================================================
"""

import time
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth
from ..config.firebase import get_firestore_db

column_bp = Blueprint('columns', __name__, url_prefix='/api/v1/columns')

@column_bp.route('', methods=['GET'])
@require_auth
def list_columns():
    db = get_firestore_db()
    col_ref = db.collection('customColumns')

    columns = []
    try:
        for doc in col_ref.stream():
            data = doc.to_dict() or {}
            data['id'] = doc.id
            columns.append(data)
    except Exception as e:
        print(f"[ColumnRoutes] List error: {e}")

    # Sort by position ascending
    columns.sort(key=lambda x: int(x.get('position', 0)))

    return jsonify({
        "success": True,
        "data": columns
    })

@column_bp.route('', methods=['POST'])
@require_auth
def create_column():
    payload = request.get_json() or {}
    label = (payload.get('label') or payload.get('name') or '').strip()
    if not label:
        return jsonify({
            "success": False,
            "error": {"code": "VALIDATION_ERROR", "message": "Column label/name is required"}
        }), 400

    key = payload.get('key') or label.lower().replace(' ', '_').replace('-', '_')
    col_id = f"coldef_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    col_doc = {
        "id": col_id,
        "key": key,
        "name": key,
        "label": label,
        "data_type": payload.get('type') or payload.get('data_type') or 'text',
        "position": int(payload.get('position', 0)),
        "is_visible": bool(payload.get('is_visible', True)),
        "is_required": bool(payload.get('is_required', False)),
        "created_at": now_iso,
        "updated_at": now_iso
    }

    db = get_firestore_db()
    db.collection('customColumns').document(col_id).set(col_doc)

    return jsonify({
        "success": True,
        "data": col_doc,
        "message": f"Custom column '{label}' created successfully"
    }), 201

@column_bp.route('/<column_id>', methods=['PATCH', 'PUT'])
@require_auth
def update_column(column_id):
    payload = request.get_json() or {}
    db = get_firestore_db()
    doc_ref = db.collection('customColumns').document(column_id)
    doc = doc_ref.get()

    if not doc or not doc.to_dict():
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": f"Column '{column_id}' not found"}
        }), 404

    data = doc.to_dict()
    data.update(payload)
    data['updated_at'] = datetime.now(timezone.utc).isoformat()

    try:
        doc_ref.set(data, merge=True)
        data['id'] = column_id
        return jsonify({
            "success": True,
            "data": data,
            "message": "Column updated successfully"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {"code": "UPDATE_FAILED", "message": str(e)}
        }), 400

@column_bp.route('/<column_id>', methods=['DELETE'])
@require_auth
def delete_column(column_id):
    db = get_firestore_db()
    doc_ref = db.collection('customColumns').document(column_id)
    doc = doc_ref.get()

    if not doc or not doc.to_dict():
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": f"Column '{column_id}' not found"}
        }), 404

    try:
        doc_ref.delete()
        return jsonify({
            "success": True,
            "message": f"Column '{column_id}' deleted successfully"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {"code": "DELETE_FAILED", "message": str(e)}
        }), 400
