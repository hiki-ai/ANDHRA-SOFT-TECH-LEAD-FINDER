from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth
from ..config.database import SessionLocal
from ..models.vendor import Vendor

vendor_bp = Blueprint('vendors', __name__, url_prefix='/api/v1/vendors')

@vendor_bp.route('', methods=['GET'])
@require_auth
def list_vendors():
    page = int(request.args.get('page', 1))
    limit = min(int(request.args.get('limit', 50)), 100)
    category = request.args.get('category')
    city = request.args.get('city')
    status = request.args.get('status')
    search = request.args.get('search')

    db = SessionLocal()
    try:
        query = db.query(Vendor)
        if category:
            query = query.filter(Vendor.category == category)
        if city:
            query = query.filter(Vendor.city == city)
        if status:
            query = query.filter(Vendor.status == status)
        if search:
            query = query.filter(Vendor.business_name.ilike(f"%{search}%"))

        total = query.count()
        vendors = query.offset((page - 1) * limit).limit(limit).all()

        return jsonify({
            "success": True,
            "data": {
                "items": [
                    {
                        "id": v.id,
                        "business_name": v.business_name,
                        "category": v.category,
                        "phone": v.phone,
                        "email": v.email,
                        "city": v.city,
                        "state": v.state,
                        "rating": v.rating,
                        "review_count": v.review_count,
                        "source": v.source,
                        "status": v.status,
                        "data_quality_score": v.data_quality_score,
                    } for v in vendors
                ],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": (total + limit - 1) // limit if total > 0 else 1
                }
            }
        })
    finally:
        db.close()

@vendor_bp.route('/<vendor_id>', methods=['GET'])
@require_auth
def get_vendor(vendor_id):
    db = SessionLocal()
    try:
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Vendor not found"}}), 404
        return jsonify({
            "success": True,
            "data": {
                "id": vendor.id,
                "business_name": vendor.business_name,
                "category": vendor.category,
                "subcategory": vendor.subcategory,
                "phone": vendor.phone,
                "alternate_phone": vendor.alternate_phone,
                "email": vendor.email,
                "website": vendor.website,
                "address": vendor.address,
                "area": vendor.area,
                "city": vendor.city,
                "district": vendor.district,
                "state": vendor.state,
                "pincode": vendor.pincode,
                "latitude": vendor.latitude,
                "longitude": vendor.longitude,
                "rating": vendor.rating,
                "review_count": vendor.review_count,
                "source": vendor.source,
                "status": vendor.status,
                "data_quality_score": vendor.data_quality_score,
                "custom_fields": vendor.custom_fields or {},
                "dedupe_key": vendor.dedupe_key
            }
        })
    finally:
        db.close()
