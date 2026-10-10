"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
REAL EXCEL / CSV EXPORT SERVICE USING PANDAS & OPENPYXL
==============================================================================
Location: backend/app/routes/export_routes.py

Streams real XLSX / CSV vendor lead spreadsheets directly from Cloud Firestore.
Zero dummy records.
==============================================================================
"""

import io
import time
from datetime import datetime, timezone
import pandas as pd
from flask import Blueprint, jsonify, request, send_file
from ..middleware.firebase_auth import require_auth
from ..config.firebase import get_firestore_db

export_bp = Blueprint('exports', __name__, url_prefix='/api/v1/exports')

# In-memory export cache for multi-stage async downloads
_export_cache = {}

@export_bp.route('', methods=['POST'])
@require_auth
def create_export():
    payload = request.get_json() or {}
    category = payload.get('category')
    city = payload.get('city')
    status = payload.get('status')
    search = payload.get('search')
    export_format = payload.get('format', 'xlsx').lower()

    db = get_firestore_db()
    col_ref = db.collection('vendors')

    rows = []
    try:
        for doc in col_ref.stream():
            data = doc.to_dict() or {}
            data['id'] = doc.id

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
                if q not in name and q not in ph and q not in c:
                    continue

            rows.append({
                "Vendor ID": data.get('id', ''),
                "Business Name": data.get('business_name', ''),
                "Category": data.get('category', ''),
                "Subcategory": data.get('subcategory', ''),
                "Primary Phone": data.get('phone', ''),
                "Alternate Phone": data.get('alternate_phone', ''),
                "Email": data.get('email', ''),
                "Website": data.get('website', ''),
                "Address": data.get('address', ''),
                "Area": data.get('area', ''),
                "City": data.get('city', ''),
                "District": data.get('district', ''),
                "State": data.get('state', 'Andhra Pradesh'),
                "Pincode": data.get('pincode', ''),
                "Rating": data.get('rating', 0.0),
                "Review Count": data.get('review_count', 0),
                "Source": data.get('source', ''),
                "Status": data.get('status', 'valid'),
                "Data Quality Score": data.get('data_quality_score', 0),
                "Dedupe Key": data.get('dedupe_key', ''),
                "Created At": data.get('created_at', ''),
            })
    except Exception as e:
        print(f"[ExportRoutes] Query error: {e}")

    df = pd.DataFrame(rows)
    export_id = f"exp_{int(time.time() * 1000)}"

    stream = io.BytesIO()
    if export_format == 'csv':
        df.to_csv(stream, index=False, encoding='utf-8')
        mimetype = 'text/csv'
        filename = f"andhra_soft_tech_leads_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    else:
        with pd.ExcelWriter(stream, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Vendors')
        mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = f"andhra_soft_tech_leads_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"

    stream.seek(0)
    file_bytes = stream.getvalue()

    _export_cache[export_id] = {
        "bytes": file_bytes,
        "mimetype": mimetype,
        "filename": filename,
        "row_count": len(rows),
        "created_at": time.time()
    }

    # Evict cache entries older than 30 minutes
    now = time.time()
    for k in list(_export_cache.keys()):
        if now - _export_cache[k]['created_at'] > 1800:
            del _export_cache[k]

    return jsonify({
        "success": True,
        "data": {
            "export_id": export_id,
            "filename": filename,
            "row_count": len(rows),
            "status": "completed",
            "download_url": f"/api/v1/exports/{export_id}/download"
        },
        "message": f"Generated export spreadsheet containing {len(rows)} record(s)."
    })

@export_bp.route('/<export_id>/download', methods=['GET'])
def download_export(export_id):
    export_entry = _export_cache.get(export_id)
    if not export_entry:
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": "Export file expired or not found. Please trigger a new export."}
        }), 404

    return send_file(
        io.BytesIO(export_entry['bytes']),
        mimetype=export_entry['mimetype'],
        as_attachment=True,
        download_name=export_entry['filename']
    )
