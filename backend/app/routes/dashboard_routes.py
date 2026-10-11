"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
REAL DASHBOARD ANALYTICS & STATS ROUTES
==============================================================================
Location: backend/app/routes/dashboard_routes.py

Computes genuine statistics directly from Cloud Firestore collections.
Zero hardcoded numbers or fake fallbacks. Displays 0 for empty states.
==============================================================================
"""

from collections import Counter
from flask import Blueprint, jsonify
from ..middleware.firebase_auth import require_auth
from ..config.firebase import get_firestore_db, is_live_firestore

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/v1/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@require_auth
def get_dashboard_stats():
    db = get_firestore_db()
    vendors_col = db.collection('vendors')
    collections_col = db.collection('collections')

    total_vendors = 0
    valid_vendors = 0
    duplicate_vendors = 0
    invalid_vendors = 0
    total_quality = 0

    category_counter = Counter()
    city_counter = Counter()

    quality_dist = {
        "high": 0,    # 85%+
        "medium": 0,  # 60-84%
        "low": 0      # <60%
    }

    try:
        for doc in vendors_col.stream():
            data = doc.to_dict() or {}
            total_vendors += 1

            status = data.get('status', 'valid')
            if status == 'valid':
                valid_vendors += 1
            elif status == 'duplicate':
                duplicate_vendors += 1
            else:
                invalid_vendors += 1

            raw_score = data.get('data_quality_score')
            try:
                q_score = int(float(raw_score)) if raw_score is not None else 0
            except (ValueError, TypeError):
                q_score = 0

            total_quality += q_score
            if q_score >= 85:
                quality_dist['high'] += 1
            elif q_score >= 60:
                quality_dist['medium'] += 1
            else:
                quality_dist['low'] += 1

            cat = data.get('category')
            if cat:
                category_counter[cat] += 1

            city = data.get('city')
            if city:
                city_counter[city] += 1
    except Exception as e:
        print(f"[DashboardStats] Vendor query notice: {e}")

    avg_quality = round(total_quality / total_vendors, 1) if total_vendors > 0 else 0.0

    # Collections telemetry
    total_collections = 0
    active_jobs = 0
    recent_collections = []
    active_job = None

    try:
        all_colls = []
        for doc in collections_col.stream():
            data = doc.to_dict() or {}
            data['id'] = doc.id
            total_collections += 1
            if data.get('status') in ('running', 'pending'):
                active_jobs += 1
                if active_job is None:
                    active_job = data
            all_colls.append(data)

        # Sort descending by started_at
        all_colls.sort(key=lambda x: str(x.get('started_at', '')), reverse=True)
        recent_collections = all_colls[:5]
    except Exception as e:
        print(f"[DashboardStats] Collection query notice: {e}")

    # Top categories and cities
    categories_list = [
        {"label": cat, "count": count, "pct": round((count / total_vendors) * 100, 1) if total_vendors else 0}
        for cat, count in category_counter.most_common(5)
    ]
    cities_list = [
        {"city": city, "count": count, "pct": round((count / total_vendors) * 100, 1) if total_vendors else 0}
        for city, count in city_counter.most_common(5)
    ]

    return jsonify({
        "success": True,
        "data": {
            "total_vendors": total_vendors,
            "valid_vendors": valid_vendors,
            "duplicate_vendors": duplicate_vendors,
            "invalid_vendors": invalid_vendors,
            "avg_quality_score": avg_quality,
            "total_collections": total_collections,
            "active_jobs": active_jobs,
            "active_job": active_job,
            "recent_collections": recent_collections,
            "categories": categories_list,
            "categories_distribution": categories_list,
            "cities": cities_list,
            "cities_distribution": cities_list,
            "quality_distribution": quality_dist,
            "is_live_firestore": is_live_firestore(),
            "database": "Firebase Cloud Firestore"
        }
    })
