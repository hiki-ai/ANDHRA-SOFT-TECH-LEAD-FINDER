"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
REAL EXCEL / CSV IMPORT SERVICE USING PANDAS & OPENPYXL
==============================================================================
Location: backend/app/routes/import_routes.py

Handles spreadsheet uploads, schema detection, row previews, validation,
deduplication matching, collection creation, and chunked batch commits to Cloud Firestore.
==============================================================================
"""

import io
import json
import os
import re
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
    if any(k in c for k in ['alt phone', 'alternate', 'secondary phone', 'other phone']):
        return 'alternate_phone'
    if any(k in c for k in ['mobile', 'phone', 'telephone', 'contact number', 'cell', 'contact']):
        return 'phone'
    if any(k in c for k in ['email', 'mail', 'e-mail']):
        return 'email'
    if any(k in c for k in ['website', 'web', 'url', 'site', 'link', 'homepage']):
        return 'website'
    if any(k in c for k in ['linkedin', 'linkedin url', 'profile']):
        return 'linkedin'
    if any(k in c for k in ['city', 'town', 'village', 'district']):
        return 'city'
    if any(k in c for k in ['state', 'province']):
        return 'state'
    if any(k in c for k in ['pincode', 'pin code', 'zip', 'postal', 'zipcode']):
        return 'pincode'
    if any(k in c for k in ['subcategory', 'sub-category', 'sub category']):
        return 'subcategory'
    if any(k in c for k in ['category', 'industry', 'type', 'sector', 'trade']):
        return 'category'
    if any(k in c for k in ['address', 'street', 'location', 'place']):
        return 'address'
    if any(k in c for k in ['rating', 'score', 'stars']):
        return 'rating'
    if any(k in c for k in ['review_count', 'reviews', 'review']):
        return 'review_count'
    return '__custom__'

def _read_dataframe(file_storage) -> pd.DataFrame:
    filename = file_storage.filename or ''
    ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
    
    file_bytes = file_storage.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError("File size exceeds maximum allowed limit of 25MB.")
    
    stream = io.BytesIO(file_bytes)
    if ext == '.csv':
        df = pd.read_csv(stream, dtype=str)
    elif ext in ('.xlsx', '.xls'):
        df = pd.read_excel(stream, dtype=str)
    else:
        raise ValueError("Unsupported file format. Please upload .xlsx, .xls, or .csv files.")
    
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
        columns = [c.strip() for c in df.columns]
        total_rows = len(df)

        if total_rows == 0:
            return jsonify({
                "success": False,
                "error": {"code": "EMPTY_FILE", "message": "Spreadsheet contains no data rows."}
            }), 400

        suggested_mapping = {col: _suggest_field(col) for col in columns}

        # Analyze row validity and detect internal duplicates
        seen_keys = set()
        duplicate_count = 0
        valid_count = 0
        invalid_count = 0

        for _, row in df.iterrows():
            # Check for business name
            name = ''
            phone = ''
            city = ''
            for col in columns:
                target = suggested_mapping.get(col, '')
                val = str(row[col]).strip() if col in row and pd.notna(row[col]) else ''
                if target == 'business_name' and val:
                    name = val
                elif target == 'phone' and val:
                    phone = val
                elif target == 'city' and val:
                    city = val

            if not name:
                # Check if any identifier exists
                if phone:
                    name = f"Contact {phone}"
                    valid_count += 1
                else:
                    invalid_count += 1
                    continue
            else:
                valid_count += 1

            dedupe_key = DuplicateService.generate_dedupe_key(name, phone, city)
            if dedupe_key in seen_keys:
                duplicate_count += 1
            else:
                seen_keys.add(dedupe_key)

        # Preview first 5 rows as dictionaries
        preview_rows = df.head(5).to_dict(orient='records')

        # Suggested collection name
        base_name = filename.rsplit('.', 1)[0] if '.' in filename else filename
        suggested_collection_name = f"Imported - {base_name}"

        return jsonify({
            "success": True,
            "data": {
                "filename": filename,
                "detected_rows": total_rows,
                "valid_rows": valid_count - duplicate_count,
                "duplicate_rows": duplicate_count,
                "invalid_rows": invalid_count,
                "detected_columns": columns,
                "suggested_mapping": suggested_mapping,
                "suggested_collection_name": suggested_collection_name,
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
    if not file or not file.filename:
        return jsonify({
            "success": False,
            "error": {"code": "FILE_REQUIRED", "message": "Spreadsheet file required"}
        }), 400

    filename: str = file.filename
    user = getattr(request, 'current_user', {})
    user_id = user.get('uid')

    mapping_raw = request.form.get('mapping')
    mapping = {}
    if mapping_raw:
        try:
            mapping = json.loads(mapping_raw)
        except Exception:
            mapping = {}

    collection_name = (request.form.get('collection_name') or '').strip()
    skip_duplicates_raw = request.form.get('skip_duplicates') or 'true'
    skip_duplicates = skip_duplicates_raw.strip().lower() in ('true', '1', 'yes')

    try:
        df = _read_dataframe(file)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {"code": "PARSE_ERROR", "message": str(e)}
        }), 400

    if len(df) == 0:
        return jsonify({
            "success": False,
            "error": {"code": "EMPTY_FILE", "message": "Spreadsheet contains no data rows."}
        }), 400

    # Auto-detect mapping if not supplied
    if not mapping:
        mapping = {col: _suggest_field(col) for col in df.columns}

    # Generate collection identity
    if not collection_name:
        base_name = filename.rsplit('.', 1)[0] if '.' in filename else filename
        collection_name = f"Imported - {base_name}"

    col_id = f"col_{int(time.time() * 1000)}_{uuid.uuid4().hex[:4]}"

    db = get_firestore_db()
    if db is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "DATABASE_UNAVAILABLE",
                "message": "Cloud Firestore database service is unavailable."
            }
        }), 503

    now_iso = datetime.now(timezone.utc).isoformat()

    # Build preset_columns snapshot for this imported collection
    preset_columns = []
    for col_name in df.columns:
        target_field = mapping.get(col_name) or _suggest_field(col_name)
        if target_field == '__ignore__':
            continue
        clean_key = target_field if not target_field.startswith('__custom__') else f"custom_{re.sub(r'[^a-zA-Z0-9_]', '_', col_name.lower()).strip('_')}"
        preset_columns.append({
            "key": clean_key,
            "name": clean_key,
            "label": col_name,
            "data_type": "text",
            "is_enabled": True,
            "is_required": clean_key == "business_name"
        })

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

    seen_file_keys = set()
    records_to_commit = []
    inserted_count = 0
    duplicate_count = 0
    failed_count = 0

    for idx, row in df.iterrows():
        record = {}
        custom_fields = {}

        for excel_col, target_field in mapping.items():
            if excel_col in row:
                raw_val = row[excel_col]
                if isinstance(raw_val, pd.Series):
                    raw_val = raw_val.iloc[0]
                val = str(raw_val).strip() if pd.notna(raw_val) else ''
            else:
                val = ''

            if target_field == '__ignore__' or not val:
                continue
            if target_field.startswith('custom_') or target_field == '__custom__':
                clean_custom_key = f"custom_{re.sub(r'[^a-zA-Z0-9_]', '_', excel_col.lower()).strip('_')}"
                custom_fields[excel_col] = val
                custom_fields[clean_custom_key] = val
                record[clean_custom_key] = val
            else:
                record[target_field] = val

        b_name = record.get('business_name', '').strip()
        phone = record.get('phone', '').strip()
        city = record.get('city', '').strip() or 'Andhra Pradesh'

        # If business name is missing, attempt fallback or count as failed
        if not b_name:
            if phone or record.get('email'):
                b_name = record.get('email') or f"Contact {phone}"
            else:
                failed_count += 1
                continue

        dedupe_key = DuplicateService.generate_dedupe_key(b_name, phone, city)
        is_duplicate = (dedupe_key in existing_dedupe_keys) or (dedupe_key in seen_file_keys)

        if is_duplicate:
            duplicate_count += 1
            if skip_duplicates:
                continue

        seen_file_keys.add(dedupe_key)
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
            "collection_id": col_id,
            "user_id": user_id,
            "business_name": b_name,
            "normalized_name": b_name.upper(),
            "category": record.get('category', collection_name),
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
            "source": f"Spreadsheet Import ({filename})",
            "status": "valid",
            "data_quality_score": quality_score,
            "dedupe_key": dedupe_key,
            "custom_fields": custom_fields,
            "created_at": now_iso,
            "updated_at": now_iso
        }

        # Stamp custom columns directly on vendor document for instant display
        for ck, cv in custom_fields.items():
            if ck not in vendor_doc:
                vendor_doc[ck] = cv

        records_to_commit.append(vendor_doc)
        inserted_count += 1

    # Chunked batch commit of vendor leads (<= 450 documents/commit respecting Firestore 500-limit)
    try:
        col_ref = db.collection('vendors')
        if col_ref is None:
            raise RuntimeError("Database collection 'vendors' reference could not be created.")
        chunk_size = 450
        for i in range(0, len(records_to_commit), chunk_size):
            chunk = records_to_commit[i:i + chunk_size]
            batch = db.batch()
            if batch is None:
                raise RuntimeError("Database batch could not be created.")
            for rec in chunk:
                batch.set(col_ref.document(rec['id']), rec)
            batch.commit()
    except Exception as e:
        print(f"[ImportRoutes] Batch write error: {e}")
        return jsonify({
            "success": False,
            "error": {"code": "DATABASE_ERROR", "message": f"Firestore batch commit failed: {str(e)}"}
        }), 500

    # Create Collection Document in Firestore 'collections' collection
    collection_doc = {
        "id": col_id,
        "name": collection_name,
        "category": collection_name,
        "location": f"Imported ({filename})",
        "target_count": len(df),
        "source": "excel_import",
        "source_name": f"Excel Import ({filename})",
        "current_source": f"Excel Import ({filename})",
        "filename": filename,
        "type": "import",
        "user_id": user_id,
        "preset_id": "preset_imported",
        "preset_name": collection_name,
        "preset_columns": preset_columns,
        "found": len(df),
        "found_count": len(df),
        "valid": inserted_count,
        "valid_count": inserted_count,
        "duplicate": duplicate_count,
        "duplicate_count": duplicate_count,
        "failed": failed_count,
        "failed_count": failed_count,
        "progress": 100,
        "status": "completed",
        "error_message": None,
        "started_at": now_iso,
        "completed_at": now_iso,
        "updated_at": now_iso
    }

    try:
        db.collection('collections').document(col_id).set(collection_doc)
    except Exception as col_err:
        print(f"[ImportRoutes] Notice: Could not save collection document: {col_err}")

    return jsonify({
        "success": True,
        "data": {
            "collection_id": col_id,
            "collection_name": collection_name,
            "filename": filename,
            "total_rows": len(df),
            "inserted": inserted_count,
            "duplicate": duplicate_count,
            "failed": failed_count,
            "timestamp": now_iso
        },
        "message": f"Successfully created collection '{collection_name}' with {inserted_count} record(s) imported ({duplicate_count} duplicate(s) handled, {failed_count} invalid)."
    })
