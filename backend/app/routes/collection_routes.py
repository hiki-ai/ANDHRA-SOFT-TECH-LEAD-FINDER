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

    if not category or not location:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Category and location are required"}}), 400

    db = get_firestore_db()
    job_id = f"col_{int(time.time() * 1000)}"
    job_doc = {
        "id": job_id,
        "category": category,
        "location": location,
        "target_count": target_count,
        "found": 0,
        "valid": 0,
        "duplicate": 0,
        "failed": 0,
        "progress": 0,
        "status": "pending",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }

    db.collection('collections').document(job_id).set(job_doc)

    # Dispatch to internal worker service if WORKER_URL binding is configured
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
                },
                timeout=5
            )
        except Exception as e:
            print(f"[CollectionRoutes] Notice: Worker dispatch over binding failed ({Settings.WORKER_URL}): {e}")

    return jsonify({
        "success": True,
        "data": job_doc,
        "message": "Collection job created successfully in Firestore"
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
