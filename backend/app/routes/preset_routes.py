"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
TABLE PRESETS & COLUMN CONFIGURATION REST API ROUTES
==============================================================================
Location: backend/app/routes/preset_routes.py

Full CRUD operations for customizable table presets and column schemas
persisted in Cloud Firestore. Supports idempotent initial presets (Furniture Leads),
source capability audits, duplicate validation, and preset usage verification.
==============================================================================
"""

import os
import sys
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth
from ..config.firebase import get_firestore_db
from ..models.table_preset import (
    DEFAULT_COLUMNS,
    INITIAL_PRESETS,
    VALID_DATA_TYPES,
    build_furniture_leads_columns,
    build_all_columns,
)

# Ensure worker package is in python path for source capabilities
worker_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'worker'))
if os.path.isdir(worker_path) and worker_path not in sys.path:
    sys.path.insert(0, worker_path)

try:
    from collectors.source_capabilities import (
        SOURCE_FIELD_CAPABILITIES,
        check_source_capabilities,
        get_field_capability_info,
    )
except ImportError:
    SOURCE_FIELD_CAPABILITIES = {}
    def check_source_capabilities(source_id, columns):
        return {"is_valid": True, "blocking_errors": [], "warnings": []}
    def get_field_capability_info(source_id, key):
        return {"supported": True, "availability": "full"}


preset_bp = Blueprint('presets', __name__, url_prefix='/api/v1/presets')


def _ensure_default_presets(db):
    """
    Idempotently seeds canonical system presets (e.g. Furniture Leads)
    into the Cloud Firestore 'tablePresets' collection if not already stored.
    """
    col_ref = db.collection('tablePresets')
    for init_data in INITIAL_PRESETS:
        p_id = init_data['id']
        doc = col_ref.document(p_id).get()
        # If doc does not exist or has empty data, seed it
        if not doc or not getattr(doc, 'exists', True) or not doc.to_dict():
            now_iso = datetime.now(timezone.utc).isoformat()
            payload = dict(init_data)
            payload['created_at'] = now_iso
            payload['updated_at'] = now_iso
            col_ref.document(p_id).set(payload)


@preset_bp.route('', methods=['GET'])
@require_auth
def list_presets():
    """Lists all saved presets from Firestore, seeding defaults idempotently."""
    db = get_firestore_db()
    _ensure_default_presets(db)

    col_ref = db.collection('tablePresets')
    presets = []
    try:
        for doc in col_ref.stream():
            data = doc.to_dict() or {}
            data['id'] = doc.id
            presets.append(data)
    except Exception as e:
        print(f"[PresetRoutes] List error: {e}")

    # Sort system / default presets first, then by name
    def sort_key(p):
        is_default = 0 if p.get('is_default') else 1
        is_system = 0 if p.get('is_system') else 1
        return (is_default, is_system, p.get('name', '').lower())

    presets.sort(key=sort_key)

    return jsonify({
        "success": True,
        "data": presets,
        "default_columns": DEFAULT_COLUMNS,
        "source_capabilities": SOURCE_FIELD_CAPABILITIES,
    })


@preset_bp.route('/<preset_id>', methods=['GET'])
@require_auth
def get_preset(preset_id):
    """Retrieves a single preset by ID."""
    db = get_firestore_db()
    _ensure_default_presets(db)

    doc_ref = db.collection('tablePresets').document(preset_id)
    doc = doc_ref.get()
    if not doc or not getattr(doc, 'exists', True) or not doc.to_dict():
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": f"Preset '{preset_id}' not found."}
        }), 404

    data = doc.to_dict()
    data['id'] = preset_id
    return jsonify({
        "success": True,
        "data": data
    })


@preset_bp.route('', methods=['POST'])
@require_auth
def create_preset():
    """Creates a new table preset after validating column integrity."""
    payload = request.get_json() or {}
    name = (payload.get('name') or '').strip()
    if not name:
        return jsonify({
            "success": False,
            "error": {"code": "VALIDATION_ERROR", "message": "Preset name is required."}
        }), 400

    db = get_firestore_db()
    col_ref = db.collection('tablePresets')

    # Check for duplicate preset name
    for doc in col_ref.stream():
        d = doc.to_dict() or {}
        if d.get('name', '').strip().lower() == name.lower():
            return jsonify({
                "success": False,
                "error": {"code": "DUPLICATE_NAME", "message": f"A preset named '{name}' already exists."}
            }), 400

    # Parse and validate columns
    raw_columns = payload.get('columns') or []
    if not isinstance(raw_columns, list) or len(raw_columns) == 0:
        # Default to standard furniture leads columns if none provided
        raw_columns = build_furniture_leads_columns()

    # Validate duplicate column keys and labels
    seen_keys = set()
    seen_labels = set()
    validated_columns = []
    enabled_columns = []
    required_columns = []

    for idx, c in enumerate(raw_columns):
        key = (c.get('key') or c.get('name') or '').strip().lower().replace(' ', '_').replace('-', '_')
        label = (c.get('label') or c.get('name') or key).strip()
        dtype = (c.get('data_type') or c.get('type') or 'text').strip().lower()

        if not key or not label:
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_COLUMN", "message": f"Column at position {idx} lacks key or label."}
            }), 400

        if key in seen_keys:
            return jsonify({
                "success": False,
                "error": {"code": "DUPLICATE_KEY", "message": f"Duplicate column key '{key}' detected."}
            }), 400

        if label.lower() in seen_labels:
            return jsonify({
                "success": False,
                "error": {"code": "DUPLICATE_LABEL", "message": f"Duplicate column label '{label}' detected."}
            }), 400

        seen_keys.add(key)
        seen_labels.add(label.lower())

        is_enabled = bool(c.get('is_enabled', True))
        is_required = bool(c.get('is_required', False))
        is_custom = bool(c.get('is_custom', False))

        col_def = {
            "key": key,
            "name": key,
            "label": label,
            "data_type": dtype if dtype in VALID_DATA_TYPES else 'text',
            "position": idx,
            "is_enabled": is_enabled,
            "is_required": is_required,
            "is_custom": is_custom,
            "description": c.get('description', ''),
        }
        validated_columns.append(col_def)

        if is_enabled:
            enabled_columns.append(key)
        if is_required:
            required_columns.append(key)

    preset_id = f"preset_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = getattr(request, 'current_user', {}).get('uid', 'admin')

    new_preset = {
        "id": preset_id,
        "name": name,
        "description": payload.get('description', ''),
        "columns": validated_columns,
        "enabled_columns": enabled_columns,
        "required_columns": required_columns,
        "extraction_config": payload.get('extraction_config', {"source": "google_places", "enforce_required": True}),
        "export_config": payload.get('export_config', {"include_headers": True, "format": "xlsx"}),
        "is_system": False,
        "is_default": False,
        "user_id": user_id,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    col_ref.document(preset_id).set(new_preset)

    return jsonify({
        "success": True,
        "data": new_preset,
        "message": f"Table preset '{name}' created successfully."
    }), 201


@preset_bp.route('/<preset_id>', methods=['PUT', 'PATCH'])
@require_auth
def update_preset(preset_id):
    """Updates an existing table preset with validation."""
    db = get_firestore_db()
    _ensure_default_presets(db)
    doc_ref = db.collection('tablePresets').document(preset_id)
    doc = doc_ref.get()

    if not doc or not getattr(doc, 'exists', True) or not doc.to_dict():
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": f"Preset '{preset_id}' not found."}
        }), 404

    existing_data = doc.to_dict()
    payload = request.get_json() or {}

    # Check for name conflict if renaming
    new_name = (payload.get('name') or existing_data.get('name', '')).strip()
    if new_name and new_name.lower() != existing_data.get('name', '').lower():
        for other_doc in db.collection('tablePresets').stream():
            if other_doc.id != preset_id:
                d = other_doc.to_dict() or {}
                if d.get('name', '').strip().lower() == new_name.lower():
                    return jsonify({
                        "success": False,
                        "error": {"code": "DUPLICATE_NAME", "message": f"A preset named '{new_name}' already exists."}
                    }), 400

    # If updating columns, validate integrity
    validated_columns = existing_data.get('columns', [])
    enabled_columns = existing_data.get('enabled_columns', [])
    required_columns = existing_data.get('required_columns', [])

    if 'columns' in payload and isinstance(payload['columns'], list):
        seen_keys = set()
        seen_labels = set()
        validated_columns = []
        enabled_columns = []
        required_columns = []

        for idx, c in enumerate(payload['columns']):
            key = (c.get('key') or c.get('name') or '').strip().lower().replace(' ', '_').replace('-', '_')
            label = (c.get('label') or c.get('name') or key).strip()
            dtype = (c.get('data_type') or c.get('type') or 'text').strip().lower()

            if not key or not label:
                return jsonify({
                    "success": False,
                    "error": {"code": "INVALID_COLUMN", "message": f"Column at position {idx} lacks key or label."}
                }), 400

            if key in seen_keys:
                return jsonify({
                    "success": False,
                    "error": {"code": "DUPLICATE_KEY", "message": f"Duplicate column key '{key}' detected."}
                }), 400

            if label.lower() in seen_labels:
                return jsonify({
                    "success": False,
                    "error": {"code": "DUPLICATE_LABEL", "message": f"Duplicate column label '{label}' detected."}
                }), 400

            seen_keys.add(key)
            seen_labels.add(label.lower())

            is_enabled = bool(c.get('is_enabled', True))
            is_required = bool(c.get('is_required', False))
            is_custom = bool(c.get('is_custom', False))

            col_def = {
                "key": key,
                "name": key,
                "label": label,
                "data_type": dtype if dtype in VALID_DATA_TYPES else 'text',
                "position": idx,
                "is_enabled": is_enabled,
                "is_required": is_required,
                "is_custom": is_custom,
                "description": c.get('description', ''),
            }
            validated_columns.append(col_def)

            if is_enabled:
                enabled_columns.append(key)
            if is_required:
                required_columns.append(key)

    now_iso = datetime.now(timezone.utc).isoformat()
    updated_preset = dict(existing_data)
    updated_preset.update({
        "name": new_name or existing_data.get('name'),
        "description": payload.get('description', existing_data.get('description', '')),
        "columns": validated_columns,
        "enabled_columns": enabled_columns,
        "required_columns": required_columns,
        "updated_at": now_iso,
    })

    if 'extraction_config' in payload:
        updated_preset['extraction_config'] = payload['extraction_config']
    if 'export_config' in payload:
        updated_preset['export_config'] = payload['export_config']
    if 'is_default' in payload and bool(payload['is_default']):
        # If setting this preset as default, clear default from others
        for other_doc in db.collection('tablePresets').stream():
            if other_doc.id != preset_id:
                db.collection('tablePresets').document(other_doc.id).update({"is_default": False})
        updated_preset['is_default'] = True

    doc_ref.set(updated_preset, merge=True)
    updated_preset['id'] = preset_id

    return jsonify({
        "success": True,
        "data": updated_preset,
        "message": f"Preset '{new_name}' updated successfully."
    })


@preset_bp.route('/<preset_id>', methods=['DELETE'])
@require_auth
def delete_preset(preset_id):
    """
    Deletes a preset. Validates whether the preset is used in any collection jobs
    and warns or rejects if not explicitly forced.
    """
    db = get_firestore_db()
    doc_ref = db.collection('tablePresets').document(preset_id)
    doc = doc_ref.get()

    if not doc or not getattr(doc, 'exists', True) or not doc.to_dict():
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": f"Preset '{preset_id}' not found."}
        }), 404

    data = doc.to_dict()

    # Prevent deleting system default presets unless forced/reset
    if data.get('is_system') and preset_id == 'preset_furniture_leads':
        force = request.args.get('force', '').lower() == 'true'
        if not force:
            return jsonify({
                "success": False,
                "error": {
                    "code": "SYSTEM_PRESET_PROTECTED",
                    "message": "The system default 'Furniture Leads' preset cannot be permanently deleted. You can reset it to default instead."
                }
            }), 400

    # Check if preset is referenced by any active/past collection jobs
    used_collections = []
    try:
        for c_doc in db.collection('collections').stream():
            cd = c_doc.to_dict() or {}
            if cd.get('preset_id') == preset_id:
                used_collections.append(c_doc.id)
    except Exception as e:
        print(f"[PresetRoutes] Collection check error: {e}")

    force = request.args.get('force', '').lower() == 'true'
    if used_collections and not force:
        return jsonify({
            "success": False,
            "in_use": True,
            "collection_count": len(used_collections),
            "error": {
                "code": "PRESET_IN_USE",
                "message": f"Preset is currently associated with {len(used_collections)} collection job(s). Pass ?force=true to proceed with deletion."
            }
        }), 409

    doc_ref.delete()
    return jsonify({
        "success": True,
        "message": f"Preset '{data.get('name', preset_id)}' deleted successfully."
    })


@preset_bp.route('/init-defaults', methods=['POST'])
@require_auth
def reset_default_presets():
    """Explicitly resets or initializes standard system presets."""
    db = get_firestore_db()
    col_ref = db.collection('tablePresets')
    now_iso = datetime.now(timezone.utc).isoformat()

    for init_data in INITIAL_PRESETS:
        p_id = init_data['id']
        payload = dict(init_data)
        payload['created_at'] = now_iso
        payload['updated_at'] = now_iso
        col_ref.document(p_id).set(payload)

    return jsonify({
        "success": True,
        "message": "Default presets (including 'Furniture Leads') initialized successfully."
    })


@preset_bp.route('/check-column-usage', methods=['POST'])
@require_auth
def check_column_usage():
    """
    Checks if a column key is used by any saved preset.
    Returns list of preset names using the column to display in confirmation dialogs.
    """
    payload = request.get_json() or {}
    column_key = (payload.get('key') or payload.get('column_key') or '').strip().lower()

    if not column_key:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "column_key required"}}), 400

    db = get_firestore_db()
    used_in_presets = []

    try:
        for doc in db.collection('tablePresets').stream():
            p_data = doc.to_dict() or {}
            cols = p_data.get('columns', [])
            for c in cols:
                if c.get('key', '').lower() == column_key and c.get('is_enabled', True):
                    used_in_presets.append(p_data.get('name', doc.id))
                    break
    except Exception as e:
        print(f"[PresetRoutes] Usage check error: {e}")

    return jsonify({
        "success": True,
        "column_key": column_key,
        "in_use": len(used_in_presets) > 0,
        "used_in_presets": used_in_presets,
    })


@preset_bp.route('/capabilities', methods=['GET'])
@require_auth
def get_capabilities():
    """Returns the source capabilities matrix for registered connectors."""
    return jsonify({
        "success": True,
        "data": SOURCE_FIELD_CAPABILITIES,
    })
