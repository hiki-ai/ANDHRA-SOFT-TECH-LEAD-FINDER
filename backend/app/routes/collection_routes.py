import time
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth
from ..config.firebase import get_firestore_db
from ..config.settings import Settings

collection_bp = Blueprint('collections', __name__, url_prefix='/api/v1/collections')

@collection_bp.route('', methods=['GET'])
@require_auth
def list_collections():
    db = get_firestore_db()
    col_ref = db.collection('collections')

    collections = []
    try:
        docs = col_ref.stream()
        for doc in docs:
            data = doc.to_dict()
            if not data:
                continue
            data['id'] = doc.id
            if not data.get('source_name'):
                data['source_name'] = data.get('current_source') or (
                    'Google Maps / Google Places API' if data.get('source') == 'google_places'
                    else (data.get('source') or 'Google Maps / Google Places API')
                )
            collections.append(data)
    except Exception as e:
        print(f"[CollectionRoutes] List error: {e}")

    # Sort descending by started_at if present
    collections.sort(key=lambda x: x.get('started_at', ''), reverse=True)

    return jsonify({
        "success": True,
        "data": collections
    })

@collection_bp.route('/<collection_id>', methods=['GET'])
@require_auth
def get_collection(collection_id):
    db = get_firestore_db()
    doc = db.collection('collections').document(collection_id).get()

    if not doc or not doc.to_dict():
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Collection not found"}}), 404

    data = doc.to_dict()
    data['id'] = doc.id
    if not data.get('source_name'):
        data['source_name'] = data.get('current_source') or (
            'Google Maps / Google Places API' if data.get('source') == 'google_places'
            else (data.get('source') or 'Google Maps / Google Places API')
        )
    return jsonify({
        "success": True,
        "data": data
    })

@collection_bp.route('', methods=['POST'])
@require_auth
def create_collection():
    payload = request.get_json() or {}
    category = payload.get('category')
    location = payload.get('location')
    target_count = int(payload.get('target_count', 1000))
    source = (payload.get('source') or 'google_places').strip().lower()
    preset_id = (payload.get('preset_id') or 'preset_furniture_leads').strip()

    if not category or not location:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Category and location are required"}}), 400

    db = get_firestore_db()
    job_id = f"col_{int(time.time() * 1000)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Resolve preset schema and snapshot
    from ..models.table_preset import INITIAL_PRESETS, build_furniture_leads_columns
    preset_doc = db.collection('tablePresets').document(preset_id).get()
    preset_data = preset_doc.to_dict() if preset_doc and getattr(preset_doc, 'exists', True) else None

    if not preset_data:
        # Match against initial presets or fallback to Furniture Leads
        matched = next((p for p in INITIAL_PRESETS if p['id'] == preset_id), None)
        preset_data = matched or INITIAL_PRESETS[0]
        preset_id = preset_data['id']

    preset_name = preset_data.get('name', 'Furniture Leads')
    # Use client provided column snapshot if valid, otherwise derive enabled columns from preset
    preset_columns = payload.get('preset_columns')
    if not preset_columns or not isinstance(preset_columns, list):
        preset_columns = [c for c in preset_data.get('columns', []) if c.get('is_enabled', True)]

    # Resolve connector and check availability
    import sys
    import os
    import threading

    worker_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'worker'))
    if os.path.isdir(worker_dir) and worker_dir not in sys.path:
        sys.path.insert(0, worker_dir)

    source_name = "Google Maps / Google Places API"
    connector_ready = False
    connector_error = ""

    try:
        from collectors.source_manager import SourceManager
        sm = SourceManager()
        connector = sm.get_connector(source)
        source_name = connector.get_source_name()
        connector_ready = connector.is_configured()
        if not connector_ready:
            st = connector.get_status()
            connector_error = f"{st.get('status', 'not_configured').upper()}: {st.get('message', 'Connector not configured')}"
    except Exception as e:
        connector_error = f"Source manager error: {str(e)}"

    # Audit source capabilities against required columns of the preset
    try:
        from collectors.source_capabilities import check_source_capabilities
        cap_audit = check_source_capabilities(source, preset_columns)
        if not cap_audit.get('is_valid', True):
            blocking = cap_audit.get('blocking_errors', [])
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNSUPPORTED_REQUIRED_COLUMN",
                    "message": "; ".join(blocking) if blocking else "Required columns are not supported by the selected source.",
                    "details": blocking,
                }
            }), 400
    except Exception as cap_err:
        print(f"[CollectionRoutes] Capability audit notice: {cap_err}")

    # If connector is not configured, do not start worker; return clear failure state (201)
    if not connector_ready:
        job_doc = {
            "id": job_id,
            "category": category,
            "location": location,
            "target_count": target_count,
            "source": source,
            "source_name": source_name,
            "current_source": source_name,
            "preset_id": preset_id,
            "preset_name": preset_name,
            "preset_columns": preset_columns,
            "found": 0,
            "found_count": 0,
            "valid": 0,
            "valid_count": 0,
            "duplicate": 0,
            "duplicate_count": 0,
            "failed": 0,
            "failed_count": 0,
            "progress": 0,
            "status": "failed",
            "error_message": connector_error,
            "started_at": now_iso,
            "completed_at": now_iso,
            "updated_at": now_iso,
        }
        db.collection('collections').document(job_id).set(job_doc)
        return jsonify({
            "success": True,
            "data": job_doc,
            "message": f"Job created but marked failed: {connector_error}"
        }), 201

    job_doc = {
        "id": job_id,
        "category": category,
        "location": location,
        "target_count": target_count,
        "source": source,
        "source_name": source_name,
        "current_source": source_name,
        "preset_id": preset_id,
        "preset_name": preset_name,
        "preset_columns": preset_columns,
        "found": 0,
        "found_count": 0,
        "valid": 0,
        "valid_count": 0,
        "duplicate": 0,
        "duplicate_count": 0,
        "failed": 0,
        "failed_count": 0,
        "progress": 0,
        "status": "pending",
        "error_message": None,
        "started_at": now_iso,
        "completed_at": None,
        "updated_at": now_iso,
    }

    db.collection('collections').document(job_id).set(job_doc)

    # Dispatch to worker service if WORKER_URL is configured, else execute via daemon thread
    if Settings.WORKER_URL:
        try:
            import requests
            from urllib.parse import urljoin
            worker_endpoint = urljoin(Settings.WORKER_URL.rstrip('/') + '/', 'jobs')
            requests.post(
                worker_endpoint,
                json={
                    "job_id": job_id,
                    "category": category,
                    "location": location,
                    "target_count": target_count,
                    "source": source,
                    "preset_id": preset_id,
                    "preset_columns": preset_columns,
                },
                timeout=5
            )
        except Exception as e:
            print(f"[CollectionRoutes] Notice: Worker dispatch over binding failed ({Settings.WORKER_URL}): {e}")
    else:
        def _run_worker():
            try:
                from services.collection_worker import CollectionWorker
                worker = CollectionWorker(db=db)
                worker.process_job(
                    job_id,
                    category,
                    location,
                    target_count,
                    source=source,
                    preset_id=preset_id,
                    preset_columns=preset_columns
                )
            except Exception as thread_err:
                print(f"[CollectionRoutes] Worker thread execution error: {thread_err}")
                now_fail_iso = datetime.now(timezone.utc).isoformat()
                try:
                    db.collection('collections').document(job_id).update({
                        "status": "failed",
                        "error_message": f"Worker execution failure: {str(thread_err)}",
                        "completed_at": now_fail_iso,
                        "updated_at": now_fail_iso,
                    })
                except Exception:
                    pass

        threading.Thread(target=_run_worker, daemon=True).start()

    return jsonify({
        "success": True,
        "data": job_doc,
        "message": "Collection job created and queued for processing"
    }), 201

@collection_bp.route('/<collection_id>/pause', methods=['POST'])
@require_auth
def pause_collection(collection_id):
    db = get_firestore_db()
    db.collection('collections').document(collection_id).update({"status": "paused"})
    return jsonify({"success": True, "message": "Collection paused"})

@collection_bp.route('/<collection_id>/resume', methods=['POST'])
@require_auth
def resume_collection(collection_id):
    db = get_firestore_db()
    db.collection('collections').document(collection_id).update({"status": "running"})
    return jsonify({"success": True, "message": "Collection resumed"})

@collection_bp.route('/<collection_id>/cancel', methods=['POST'])
@require_auth
def cancel_collection(collection_id):
    db = get_firestore_db()
    db.collection('collections').document(collection_id).update({"status": "cancelled"})
    return jsonify({"success": True, "message": "Collection cancelled"})
