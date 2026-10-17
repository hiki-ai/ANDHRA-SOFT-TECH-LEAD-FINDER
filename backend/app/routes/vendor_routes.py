"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
REAL VENDOR MANAGEMENT REST API ROUTES
==============================================================================
Location: backend/app/routes/vendor_routes.py

Full CRUD operations for Vendor leads stored in Cloud Firestore.
Supports server-side pagination, multi-field filtering, search, sorting,
deduplication key generation, and quality scoring.
==============================================================================
"""

import time
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth
from ..config.firebase import get_firestore_db
from ..services.duplicate_service import DuplicateService
from ..services.validation_service import ValidationService

vendor_bp = Blueprint('vendors', __name__, url_prefix='/api/v1/vendors')

@vendor_bp.route('', methods=['GET'])
@require_auth
def list_vendors():
    page = max(int(request.args.get('page', 1)), 1)
    limit_count = min(max(int(request.args.get('limit', 50)), 1), 100)
    category = request.args.get('category')
    city = request.args.get('city')
    status = request.args.get('status')
    collection_id = request.args.get('collection_id') or request.args.get('collection')
    search = request.args.get('search') or request.args.get('q')
    sort_by = request.args.get('sort_by', 'created_at')
    sort_dir = request.args.get('sort_dir', 'desc').lower()

    db = get_firestore_db()
    col_ref = db.collection('vendors')

    matching_vendors = []
    try:
        docs = col_ref.stream()
        for doc in docs:
            data = doc.to_dict()
            if not data:
                continue
            data['id'] = doc.id

            if collection_id and str(data.get('collection_id', '')).strip() != str(collection_id).strip():
                continue
            if category and str(data.get('category', '')).strip().lower() != category.strip().lower():
                continue
            if city and str(data.get('city', '')).strip().lower() != city.strip().lower():
                continue
            if status and str(data.get('status', '')).strip().lower() != status.strip().lower():
                continue
            if search:
                q = search.strip().lower()
                name = str(data.get('business_name', '')).lower()
                ph = str(data.get('phone', ''))
                c = str(data.get('city', '')).lower()
                em = str(data.get('email', '')).lower()
                if q not in name and q not in ph and q not in c and q not in em:
                    continue

            matching_vendors.append(data)
    except Exception as e:
        print(f"[VendorRoutes] Firestore query notice: {e}")

    # Sorting
    reverse = (sort_dir == 'desc')
    try:
        matching_vendors.sort(key=lambda x: str(x.get(sort_by, '')), reverse=reverse)
    except Exception:
        matching_vendors.sort(key=lambda x: str(x.get('created_at', '')), reverse=True)

    total = len(matching_vendors)
    start_idx = (page - 1) * limit_count
    end_idx = start_idx + limit_count
    paginated_items = matching_vendors[start_idx:end_idx]

    return jsonify({
        "success": True,
        "data": {
            "items": paginated_items,
            "pagination": {
                "page": page,
                "limit": limit_count,
                "total": total,
                "total_pages": (total + limit_count - 1) // limit_count if total > 0 else 1
            }
        }
    })

@vendor_bp.route('/search', methods=['GET'])
@require_auth
def search_vendors():
    query = (request.args.get('q') or '').strip().lower()
    db = get_firestore_db()
    col_ref = db.collection('vendors')

    results = []
    try:
        for doc in col_ref.stream():
            data = doc.to_dict()
            if not data:
                continue
            data['id'] = doc.id
            if (query in str(data.get('business_name', '')).lower() or
                query in str(data.get('phone', '')) or
                query in str(data.get('city', '')).lower() or
                query in str(data.get('category', '')).lower()):
                results.append(data)
                if len(results) >= 50:
                    break
    except Exception as e:
        print(f"[VendorSearch] Error: {e}")

    return jsonify({
        "success": True,
        "data": results
    })

@vendor_bp.route('/<vendor_id>', methods=['GET'])
@require_auth
def get_vendor(vendor_id):
    db = get_firestore_db()
    doc_ref = db.collection('vendors').document(vendor_id)
    doc = doc_ref.get()

    if not doc or not doc.to_dict():
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": f"Vendor '{vendor_id}' not found"}
        }), 404

    data = doc.to_dict()
    data['id'] = doc.id
    return jsonify({
        "success": True,
        "data": data
    })

@vendor_bp.route('', methods=['POST'])
@require_auth
def create_vendor():
    payload = request.get_json() or {}
    business_name = (payload.get('business_name') or '').strip()
    if not business_name:
        return jsonify({
            "success": False,
            "error": {"code": "VALIDATION_ERROR", "message": "business_name is required"}
        }), 400

    db = get_firestore_db()
    now_iso = datetime.now(timezone.utc).isoformat()

    doc_id = payload.get('id')
    if not doc_id:
        doc_id = f"ven_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"

    phone = str(payload.get('phone', '')).strip()
    city = str(payload.get('city', '')).strip()

    dedupe_key = DuplicateService.generate_dedupe_key(business_name, phone, city)
    quality_score = ValidationService.calculate_quality_score(payload)

    vendor_record = {
        "id": doc_id,
        "business_name": business_name,
        "normalized_name": business_name.upper(),
        "category": payload.get('category', 'General'),
        "subcategory": payload.get('subcategory', ''),
        "phone": phone,
        "alternate_phone": payload.get('alternate_phone', ''),
        "email": payload.get('email', ''),
        "website": payload.get('website', ''),
        "address": payload.get('address', ''),
        "area": payload.get('area', ''),
        "city": city or 'Andhra Pradesh',
        "district": payload.get('district', ''),
        "state": payload.get('state', 'Andhra Pradesh'),
        "pincode": payload.get('pincode', ''),
        "rating": float(payload.get('rating', 0.0)),
        "review_count": int(payload.get('review_count', 0)),
        "source": payload.get('source', 'Manual Entry'),
        "source_url": payload.get('source_url', ''),
        "status": payload.get('status', 'valid'),
        "data_quality_score": quality_score,
        "dedupe_key": dedupe_key,
        "custom_fields": payload.get('custom_fields', {}),
        "notes": payload.get('notes', ''),
        "created_at": payload.get('created_at', now_iso),
        "updated_at": now_iso,
    }

    db.collection('vendors').document(doc_id).set(vendor_record)

    return jsonify({
        "success": True,
        "data": vendor_record,
        "message": "Vendor created successfully in Firestore"
    }), 201

@vendor_bp.route('/<vendor_id>', methods=['PATCH', 'PUT'])
@require_auth
def update_vendor(vendor_id):
    payload = request.get_json() or {}
    db = get_firestore_db()
    doc_ref = db.collection('vendors').document(vendor_id)
    existing = doc_ref.get()

    if not existing or not existing.to_dict():
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": f"Vendor '{vendor_id}' not found"}
        }), 404

    current_data = existing.to_dict()
    current_data.update(payload)
    current_data['updated_at'] = datetime.now(timezone.utc).isoformat()

    # Recalculate score and dedupe key
    current_data['data_quality_score'] = ValidationService.calculate_quality_score(current_data)
    current_data['dedupe_key'] = DuplicateService.generate_dedupe_key(
        current_data.get('business_name', ''),
        str(current_data.get('phone', '')),
        str(current_data.get('city', ''))
    )

    try:
        doc_ref.set(current_data, merge=True)
        current_data['id'] = vendor_id
        return jsonify({
            "success": True,
            "data": current_data,
            "message": "Vendor updated successfully in Firestore"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {"code": "UPDATE_FAILED", "message": str(e)}
        }), 400

@vendor_bp.route('/<vendor_id>', methods=['DELETE'])
@require_auth
def delete_vendor(vendor_id):
    db = get_firestore_db()
    doc_ref = db.collection('vendors').document(vendor_id)
    doc = doc_ref.get()

    if not doc or not doc.to_dict():
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": f"Vendor '{vendor_id}' not found"}
        }), 404

    try:
        doc_ref.delete()
        return jsonify({
            "success": True,
            "message": f"Vendor '{vendor_id}' deleted successfully from Firestore"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {"code": "DELETE_FAILED", "message": str(e)}
        }), 400
