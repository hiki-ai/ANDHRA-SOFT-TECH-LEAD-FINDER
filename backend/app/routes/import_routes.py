"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
REAL EXCEL / CSV IMPORT SERVICE USING PANDAS & OPENPYXL
==============================================================================
Location: backend/app/routes/import_routes.py

Handles real spreadsheet uploads, schema detection, row previews, validation,
deduplication matching, and chunked batch commits to Cloud Firestore.
==============================================================================
"""

import io
import json
import time
import uuid
from datetime import datetime, timezone
import pandas as pd
from flask import Blueprint, jsonify, request
from ..middleware.firebase_auth import require_auth
from ..config.firebase import get_firestore_db
from ..services.duplicate_service import DuplicateService
from ..services.validation_service import ValidationService

import_bp = Blueprint('imports', __name__, url_prefix='/api/v1/imports')

ALLOWED_EXTENSIONS = ('.xlsx', '.xls', '.csv')
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25MB

def _suggest_field(col_name: str) -> str:
    c = col_name.strip().lower().replace('_', ' ').replace('-', ' ')
    if any(k in c for k in ['company', 'business', 'vendor name', 'shop name', 'firm', 'organization', 'name']):
        return 'business_name'
    if any(k in c for k in ['mobile', 'phone', 'telephone', 'contact number', 'cell']):
        return 'phone'
    if any(k in c for k in ['alt phone', 'alternate', 'secondary phone']):
        return 'alternate_phone'
    if any(k in c for k in ['email', 'mail']):
        return 'email'
    if any(k in c for k in ['city', 'town', 'district']):
        return 'city'
    if any(k in c for k in ['state', 'province']):
        return 'state'
    if any(k in c for k in ['pincode', 'pin code', 'zip', 'postal']):
        return 'pincode'
    if any(k in c for k in ['category', 'industry', 'type', 'sector']):
        return 'category'
    if any(k in c for k in ['website', 'web', 'url']):
        return 'website'
    if any(k in c for k in ['address', 'street', 'location']):
        return 'address'
    if any(k in c for k in ['rating', 'score']):
        return 'rating'
    return '__ignore__'

def _read_dataframe(file_storage) -> pd.DataFrame:
    filename = file_storage.filename or ''
    ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
    
    file_bytes = file_storage.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File size exceeds maximum allowed limit of 25MB.")
    
    stream = io.BytesIO(file_bytes)
    if ext == '.csv':
        df = pd.read_csv(stream, dtype=str)
    elif ext in ('.xlsx', '.xls'):
        df = pd.read_excel(stream, dtype=str)
    else:
        raise ValueError(f"Unsupported file format. Please upload .xlsx, .xls, or .csv files.")
    
    # Replace NaN with empty string
    return df.fillna('')

@import_bp.route('/preview', methods=['POST'])
@require_auth
def preview_import_file():
    if 'file' not in request.files:
        return jsonify({
            "success": False,
            "error": {"code": "FILE_REQUIRED", "message": "No file uploaded in 'file' form field."}
        }), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({
            "success": False,
            "error": {"code": "FILE_REQUIRED", "message": "Uploaded file is empty."}
        }), 400

    filename = file.filename
    if not any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
        return jsonify({
            "success": False,
            "error": {"code": "INVALID_FORMAT", "message": "Only .xlsx, .xls, and .csv files are supported."}
        }), 400

    try:
        df = _read_dataframe(file)
        columns = [str(c).strip() for c in df.columns]
        total_rows = len(df)

        suggested_mapping = {col: _suggest_field(col) for col in columns}

        # Preview first 5 rows as dictionaries
        preview_rows = df.head(5).to_dict(orient='records')

        return jsonify({
            "success": True,
            "data": {
                "filename": filename,
                "detected_rows": total_rows,
                "detected_columns": columns,
                "suggested_mapping": suggested_mapping,
                "preview": preview_rows
            }
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {"code": "PARSE_ERROR", "message": f"Could not read spreadsheet: {str(e)}"}
        }), 400

@import_bp.route('', methods=['POST'])
@require_auth
def execute_import():
    if 'file' not in request.files:
        return jsonify({
            "success": False,
            "error": {"code": "FILE_REQUIRED", "message": "Spreadsheet file required"}
        }), 400

    file = request.files['file']
    mapping_raw = request.form.get('mapping')
    mapping = {}
    if mapping_raw:
        try:
            mapping = json.loads(mapping_raw)
        except Exception:
            mapping = {}

    try:
        df = _read_dataframe(file)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {"code": "PARSE_ERROR", "message": str(e)}
        }), 400

    # If mapping is empty, auto-detect
    if not mapping:
        mapping = {str(col): _suggest_field(str(col)) for col in df.columns}

    db = get_firestore_db()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Load existing dedupe keys to detect duplicates
    existing_dedupe_keys = set()
    try:
        for doc in db.collection('vendors').stream():
            d = doc.to_dict() or {}
            k = d.get('dedupe_key')
            if k:
                existing_dedupe_keys.add(k)
    except Exception as e:
        print(f"[ImportRoutes] Dedupe check notice: {e}")

    records_to_commit = []
    inserted_count = 0
    duplicate_count = 0
    failed_count = 0

    for idx, row in df.iterrows():
        record = {}
        custom_fields = {}

        for excel_col, target_field in mapping.items():
            val = str(row.get(excel_col, '')).strip()
            if target_field == '__ignore__' or not val:
                continue
            if target_field.startswith('custom_') or target_field == '__custom__':
                custom_fields[excel_col] = val
            else:
                record[target_field] = val

        b_name = record.get('business_name', '').strip()
        if not b_name:
            failed_count += 1
            continue

        phone = str(record.get('phone', '')).strip()
        city = str(record.get('city', '')).strip() or 'Andhra Pradesh'
        dedupe_key = DuplicateService.generate_dedupe_key(b_name, phone, city)

        if dedupe_key in existing_dedupe_keys:
            duplicate_count += 1
            continue

        existing_dedupe_keys.add(dedupe_key)
        doc_id = f"ven_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"

        quality_score = ValidationService.calculate_quality_score({
            'business_name': b_name,
            'phone': phone,
            'city': city,
            'pincode': record.get('pincode', ''),
            'email': record.get('email', ''),
            'website': record.get('website', ''),
            'rating': record.get('rating', 0)
        })

        vendor_doc = {
            "id": doc_id,
            "business_name": b_name,
            "normalized_name": b_name.upper(),
            "category": record.get('category', 'General'),
            "subcategory": record.get('subcategory', ''),
            "phone": phone,
            "alternate_phone": record.get('alternate_phone', ''),
            "email": record.get('email', ''),
            "website": record.get('website', ''),
            "address": record.get('address', ''),
            "area": record.get('area', ''),
            "city": city,
            "district": record.get('district', ''),
            "state": record.get('state', 'Andhra Pradesh'),
            "pincode": record.get('pincode', ''),
            "rating": float(record.get('rating', 0.0) or 0.0),
            "review_count": int(record.get('review_count', 0) or 0),
            "source": f"Spreadsheet Import ({file.filename})",
            "status": "valid",
            "data_quality_score": quality_score,
            "dedupe_key": dedupe_key,
            "custom_fields": custom_fields,
            "created_at": now_iso,
            "updated_at": now_iso
        }
        records_to_commit.append(vendor_doc)
        inserted_count += 1

    # Chunked batch commit (<= 450 documents/commit respecting Firestore 500-limit)
    try:
        col_ref = db.collection('vendors')
        chunk_size = 450
        for i in range(0, len(records_to_commit), chunk_size):
            chunk = records_to_commit[i:i + chunk_size]
            batch = db.batch()
            for rec in chunk:
                batch.set(col_ref.document(rec['id']), rec)
            batch.commit()
    except Exception as e:
        print(f"[ImportRoutes] Batch write error: {e}")
        return jsonify({
            "success": False,
            "error": {"code": "DATABASE_ERROR", "message": f"Firestore batch commit failed: {str(e)}"}
        }), 500

    return jsonify({
        "success": True,
        "data": {
            "filename": file.filename,
            "total_rows": len(df),
            "inserted": inserted_count,
            "duplicate": duplicate_count,
            "failed": failed_count,
            "timestamp": now_iso
        },
        "message": f"Successfully processed {len(df)} rows: {inserted_count} inserted, {duplicate_count} duplicates skipped, {failed_count} invalid."
    })
