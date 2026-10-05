from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth
from ..config.database import SessionLocal
from ..models.collection import Collection

collection_bp = Blueprint('collections', __name__, url_prefix='/api/v1/collections')

@collection_bp.route('', methods=['GET'])
@require_auth
def list_collections():
    db = SessionLocal()
    try:
        collections = db.query(Collection).order_by(Collection.started_at.desc()).all()
        return jsonify({
            "success": True,
            "data": [
                {
                    "id": c.id,
                    "category": c.category,
                    "location": c.location,
                    "target_count": c.target_count,
                    "found": c.found,
                    "valid": c.valid,
                    "duplicate": c.duplicate,
                    "failed": c.failed,
                    "progress": c.progress,
                    "status": c.status,
                    "started_at": c.started_at.isoformat() if c.started_at else None,
                    "completed_at": c.completed_at.isoformat() if c.completed_at else None,
                } for c in collections
            ]
        })
    finally:
        db.close()

@collection_bp.route('', methods=['POST'])
@require_auth
def create_collection():
    payload = request.get_json() or {}
    category = payload.get('category')
    location = payload.get('location')
    target_count = int(payload.get('target_count', 1000))

    if not category or not location:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Category and location are required"}}), 400

    db = SessionLocal()
    try:
        job = Collection(
            category=category,
            location=location,
            target_count=target_count,
            status='pending'
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return jsonify({
            "success": True,
            "data": {
                "id": job.id,
                "category": job.category,
                "location": job.location,
                "target_count": job.target_count,
                "status": job.status
            },
            "message": "Collection job created successfully"
        }), 201
    finally:
        db.close()
