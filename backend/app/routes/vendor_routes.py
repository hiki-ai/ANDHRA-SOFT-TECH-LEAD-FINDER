from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth
from ..config.firebase import get_firestore_db

vendor_bp = Blueprint('vendors', __name__, url_prefix='/api/v1/vendors')

@vendor_bp.route('', methods=['GET'])
@require_auth
def list_vendors():
    page = int(request.args.get('page', 1))
    limit_count = min(int(request.args.get('limit', 50)), 100)
    category = request.args.get('category')
    city = request.args.get('city')
    status = request.args.get('status')
    search = request.args.get('search')

    db = get_firestore_db()
    col_ref = db.collection('vendors')

    # Stream matching documents
    all_vendors = []
    try:
        docs = col_ref.stream()
        for doc in docs:
            data = doc.to_dict()
            if not data:
                continue
            data['id'] = doc.id
            
            # Filter in Python for flexible multi-field filtering & searching
            if category and data.get('category') != category:
                continue
            if city and data.get('city') != city:
                continue
            if status and data.get('status') != status:
                continue
            if search:
                name = data.get('business_name', '').lower()
                ph = str(data.get('phone', ''))
                c = data.get('city', '').lower()
                q = search.lower()
                if q not in name and q not in ph and q not in c:
                    continue

            all_vendors.append(data)
    except Exception as e:
        print(f"[VendorRoutes] Firestore query error: {e}")

    total = len(all_vendors)
    start_idx = (page - 1) * limit_count
    end_idx = start_idx + limit_count
    paginated_items = all_vendors[start_idx:end_idx]

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

@vendor_bp.route('/<vendor_id>', methods=['GET'])
@require_auth
def get_vendor(vendor_id):
    db = get_firestore_db()
    doc_ref = db.collection('vendors').document(vendor_id)
    doc = doc_ref.get()

    if not doc or not doc.to_dict():
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Vendor not found"}}), 404

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
    if not payload.get('business_name'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "business_name is required"}}), 400

    db = get_firestore_db()
    doc_id = payload.get('id') or f"ven_{int(__import__('time').time() * 1000)}"
    doc_ref = db.collection('vendors').document(doc_id)
    
    payload['id'] = doc_id
    payload['status'] = payload.get('status', 'valid')
    payload['data_quality_score'] = payload.get('data_quality_score', 85)
    doc_ref.set(payload)

    return jsonify({
        "success": True,
        "data": payload,
        "message": "Vendor created successfully in Firestore"
    }), 201

@vendor_bp.route('/<vendor_id>', methods=['PATCH', 'PUT'])
@require_auth
def update_vendor(vendor_id):
    payload = request.get_json() or {}
    db = get_firestore_db()
    doc_ref = db.collection('vendors').document(vendor_id)

    try:
        doc_ref.update(payload)
        return jsonify({
            "success": True,
            "data": {"id": vendor_id, **payload},
            "message": "Vendor updated successfully in Firestore"
        })
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "UPDATE_FAILED", "message": str(e)}}), 400

@vendor_bp.route('/<vendor_id>', methods=['DELETE'])
@require_auth
def delete_vendor(vendor_id):
    db = get_firestore_db()
    doc_ref = db.collection('vendors').document(vendor_id)
    try:
        doc_ref.delete()
        return jsonify({
            "success": True,
            "message": "Vendor deleted successfully from Firestore"
        })
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "DELETE_FAILED", "message": str(e)}}), 400

@vendor_bp.route('/search', methods=['GET'])
@require_auth
def search_vendors():
    query = request.args.get('q', '').lower()
    db = get_firestore_db()
    col_ref = db.collection('vendors')

    results = []
    try:
        for doc in col_ref.stream():
            data = doc.to_dict()
            if not data:
                continue
            data['id'] = doc.id
            if (query in data.get('business_name', '').lower() or
                query in str(data.get('phone', '')) or
                query in data.get('city', '').lower()):
                results.append(data)
    except Exception as e:
        print(f"[VendorSearch] Error: {e}")

    return jsonify({
        "success": True,
        "data": results[:50]
    })
