"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
DYNAMIC BUSINESS CATEGORIES REST API
==============================================================================
Location: backend/app/routes/category_routes.py

Provides master business categories, persistent custom category storage
in Cloud Firestore, case-insensitive deduplication, and source search checks.
==============================================================================
"""

import re
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth
from ..config.firebase import get_firestore_db

category_bp = Blueprint('categories', __name__, url_prefix='/api/v1/categories')

# Canonical Master Default Categories (Preserving all previous + all requested categories)
DEFAULT_CATEGORIES = [
    # Core existing categories
    "Furniture",
    "Furniture Stores",
    "Restaurants & Cafes",
    "Hotels & Lodges",
    "Hotels & Hospitality",
    "Real Estate & Builders",
    "Real Estate",
    "Hospitals & Healthcare",
    "Hospitals and Clinics",
    "Schools & Educational Institutes",
    "Schools and Colleges",
    "Automobiles & Garages",
    "Automobile Dealers",
    "Automobile Repair and Garages",
    "Supermarkets and Grocery Stores",
    "Electronics & Appliances",
    "Electronics Stores",
    "Mobile Shops",
    "Textile & Garments",
    "Clothing and Fashion",
    "Beauty Salons and Spas",
    "Pharmacies",
    "Diagnostic Laboratories",
    "Dental Clinics",
    "Hardware & Construction",
    "Construction and Building Materials",
    "Electrical Shops",
    "Plumbing Services",
    "Interior Designers",
    "Travel Agencies",
    "Gyms and Fitness Centres",
    "Computer and IT Services",
    "Printing and Advertising",
    "Professional Services",
    "Other / Custom Category",
]


def normalize_category_name(name: str) -> str:
    """Normalizes category name by collapsing multiple spaces and stripping."""
    if not name:
        return ""
    # Collapse multiple whitespace characters into a single space
    cleaned = re.sub(r'\s+', ' ', name.strip())
    return cleaned


def _get_firestore_categories(db):
    """Fetches custom categories from Firestore 'categories' collection."""
    col_ref = db.collection('categories')
    custom_categories = []
    try:
        for doc in col_ref.stream():
            data = doc.to_dict() or {}
            c_name = data.get('name')
            if c_name:
                custom_categories.append({
                    "id": doc.id,
                    "name": normalize_category_name(c_name),
                    "is_custom": bool(data.get('is_custom', True)),
                    "created_at": data.get('created_at'),
                })
    except Exception as e:
        print(f"[CategoryRoutes] Error loading custom categories: {e}")
    return custom_categories


@category_bp.route('', methods=['GET'])
@require_auth
def list_categories():
    """
    Returns list of all available categories:
    Combines defaults with custom categories persisted in Cloud Firestore.
    Deduplicates case-insensitively and returns structured objects + list of names.
    """
    db = get_firestore_db()
    custom_items = _get_firestore_categories(db)

    # Use a case-insensitive map to deduplicate while preserving canonical casing
    seen_map = {}
    ordered_list = []

    # 1. Add canonical defaults
    for cat in DEFAULT_CATEGORIES:
        norm = normalize_category_name(cat)
        key = norm.lower()
        if key not in seen_map:
            entry = {
                "id": f"cat_{key.replace(' ', '_').replace('&', 'and')}",
                "name": norm,
                "is_custom": False,
            }
            seen_map[key] = entry
            ordered_list.append(entry)

    # 2. Add custom persisted categories
    for item in custom_items:
        key = item['name'].lower()
        if key not in seen_map:
            entry = {
                "id": item.get('id') or f"cat_custom_{uuid.uuid4().hex[:8]}",
                "name": item['name'],
                "is_custom": True,
                "created_at": item.get('created_at'),
            }
            seen_map[key] = entry
            ordered_list.append(entry)

    names = [c["name"] for c in ordered_list]

    return jsonify({
        "success": True,
        "data": ordered_list,
        "categories": names,
        "count": len(names),
    })


@category_bp.route('', methods=['POST'])
@require_auth
def create_category():
    """
    Saves a new custom category persistently in Firestore.
    Rejects blank, too short, or duplicate categories (case-insensitive).
    """
    payload = request.get_json() or {}
    raw_name = payload.get('name') or payload.get('category') or ''
    clean_name = normalize_category_name(raw_name)

    if not clean_name or len(clean_name) < 2:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Category name must be at least 2 characters long."
            }
        }), 400

    db = get_firestore_db()
    existing_custom = _get_firestore_categories(db)

    # Check case-insensitive duplicate against defaults and existing custom
    lower_target = clean_name.lower()
    for cat in DEFAULT_CATEGORIES:
        if cat.lower() == lower_target:
            return jsonify({
                "success": True,
                "data": {"name": cat, "is_custom": False},
                "message": f"Category '{cat}' is already present as a standard category."
            }), 200

    for item in existing_custom:
        if item['name'].lower() == lower_target:
            return jsonify({
                "success": True,
                "data": item,
                "message": f"Category '{item['name']}' already exists."
            }), 200

    # Save to Firestore
    cat_id = f"cat_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    doc_data = {
        "id": cat_id,
        "name": clean_name,
        "is_custom": True,
        "created_at": now_iso,
        "created_by": getattr(request, 'current_user', {}).get('uid', 'admin'),
    }

    try:
        db.collection('categories').document(cat_id).set(doc_data)
    except Exception as e:
        print(f"[CategoryRoutes] Save error: {e}")
        return jsonify({
            "success": False,
            "error": {
                "code": "PERSISTENCE_ERROR",
                "message": f"Could not persist custom category: {str(e)}"
            }
        }), 500

    return jsonify({
        "success": True,
        "data": doc_data,
        "message": f"Custom category '{clean_name}' saved successfully."
    }), 201
