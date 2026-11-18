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
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import pandas as pd
from flask import Blueprint, jsonify, request, send_file
from ..middleware.firebase_auth import require_auth
from ..config.firebase import get_firestore_db

export_bp = Blueprint('exports', __name__, url_prefix='/api/v1/exports')

# In-memory export cache for multi-stage async downloads
_export_cache: Dict[str, Dict[str, Any]] = {}

@export_bp.route('', methods=['POST'])
@require_auth
def create_export():
    payload = request.get_json() or {}
    category = payload.get('category')
    city = payload.get('city')
    status = payload.get('status')
    search = payload.get('search')
    collection_id = payload.get('collection_id')
    preset_id = payload.get('preset_id')
    export_format = str(payload.get('format', 'xlsx')).lower()

    db = get_firestore_db()
    if db is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "DATABASE_UNAVAILABLE",
                "message": "Cloud Firestore database service is unavailable."
            }
        }), 503

    # Determine column schema configuration from collection snapshot or preset
    active_columns: List[Dict[str, Any]] = []
    collection_name: Optional[str] = None

    if collection_id:
        c_doc = db.collection('collections').document(collection_id).get()
        if c_doc and getattr(c_doc, 'exists', True):
            c_data = c_doc.to_dict() or {}
            collection_name = c_data.get('name') or c_data.get('category')
            preset_cols = c_data.get('preset_columns')
            if isinstance(preset_cols, list):
                active_columns = [dict(c) for c in preset_cols if isinstance(c, dict) and c.get('is_enabled', True)]
            elif c_data.get('preset_id'):
                preset_id = preset_id or c_data.get('preset_id')

    if not active_columns and preset_id:
        p_doc = db.collection('tablePresets').document(preset_id).get()
        if p_doc and getattr(p_doc, 'exists', True):
            p_data = p_doc.to_dict() or {}
            cols = p_data.get('columns', [])
            if isinstance(cols, list):
                active_columns = [dict(c) for c in cols if isinstance(c, dict) and c.get('is_enabled', True)]
        else:
            from ..models.table_preset import INITIAL_PRESETS
            matched = next((p for p in INITIAL_PRESETS if p.get('id') == preset_id), None)
            if matched and isinstance(matched.get('columns'), list):
                active_columns = [dict(c) for c in matched['columns'] if isinstance(c, dict) and c.get('is_enabled', True)]

    # If no preset resolved, use standard default columns
    if not active_columns:
        from ..models.table_preset import DEFAULT_COLUMNS
        active_columns = [dict(c) for c in DEFAULT_COLUMNS if isinstance(c, dict)]

    col_ref = db.collection('vendors')
    rows: List[Dict[str, Any]] = []
    discovered_custom_keys: set = set()

    try:
        for doc in col_ref.stream():
            data = doc.to_dict() or {}
            data['id'] = doc.id

            doc_col_id = data.get('collection_id') or ''
            if collection_id and doc_col_id.strip() != collection_id.strip():
                continue

            doc_category = data.get('category') or ''
            if category and doc_category.strip().lower() != category.strip().lower():
                continue

            doc_city = data.get('city') or ''
            if city and doc_city.strip().lower() != city.strip().lower():
                continue

            doc_status = data.get('status') or ''
            if status and doc_status.strip().lower() != status.strip().lower():
                continue

            if search:
                q = search.strip().lower()
                name = (data.get('business_name') or '').lower()
                ph = data.get('phone') or ''
                c = (data.get('city') or '').lower()
                if q not in name and q not in ph and q not in c:
                    continue

            # Check for extra custom fields not in active_columns
            if 'custom_fields' in data and isinstance(data['custom_fields'], dict):
                for cf_k in data['custom_fields'].keys():
                    if not any((c.get('key') == cf_k or c.get('name') == cf_k or c.get('label') == cf_k) for c in active_columns):
                        discovered_custom_keys.add(cf_k)

            # Map fields according to configured preset column order & labels
            row: Dict[str, Any] = {}
            for col in active_columns:
                k = col.get('key') or col.get('name')
                if not k:
                    continue
                label = str(col.get('label') or k)
                val = data.get(k)
                if val is None and k == 'source_id':
                    val = data.get('place_id')
                elif val is None and k == 'place_id':
                    val = data.get('source_id')
                if val is None and 'custom_fields' in data and isinstance(data['custom_fields'], dict):
                    val = data['custom_fields'].get(k) or data['custom_fields'].get(label)
                if val is None:
                    val = data.get(label)
                row[label] = "" if val is None else val

            # Also populate any discovered custom keys
            if 'custom_fields' in data and isinstance(data['custom_fields'], dict):
                for cf_k, cf_v in data['custom_fields'].items():
                    if cf_k not in row:
                        row[cf_k] = "" if cf_v is None else cf_v

            rows.append(row)
    except Exception as e:
        print(f"[ExportRoutes] Query error: {e}")

    # Guaranteed ordered headers matching exact configured columns + discovered custom columns
    ordered_headers: List[str] = []
    for col in active_columns:
        header_name = str(col.get('label') or col.get('key') or col.get('name') or '').strip()
        if header_name and header_name not in ordered_headers:
            ordered_headers.append(header_name)

    if not preset_id:
        for extra_k in sorted(discovered_custom_keys):
            extra_header = str(extra_k).strip()
            if extra_header and extra_header not in ordered_headers:
                ordered_headers.append(extra_header)

    df = pd.DataFrame(rows)
    if ordered_headers:
        df = df.reindex(columns=ordered_headers, fill_value="")

    export_id = f"exp_{int(time.time() * 1000)}"

    # Generate meaningful filename (e.g. AST_Imported_Leads_2026-11-18.xlsx or AST_Furniture_Leads_2026-11-18.xlsx)
    raw_title = collection_name or category or 'Leads'
    clean_title = re.sub(r'[^a-zA-Z0-9_-]', '_', raw_title).strip('_')
    date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    stream = io.BytesIO()
    if export_format == 'csv':
        df.to_csv(stream, index=False, encoding='utf-8')
        mimetype = 'text/csv'
        filename = f"AST_{clean_title}_{date_str}.csv"
    else:
        with pd.ExcelWriter(stream, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Vendors')
            # Auto-adjust column widths for premium XLSX aesthetic
            try:
                ws = writer.sheets['Vendors']
                for col in ws.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    col_letter = col[0].column_letter
                    ws.column_dimensions[col_letter].width = max(max_len + 3, 12)
            except Exception:
                pass

        mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = f"AST_{clean_title}_{date_str}.xlsx"

    stream.seek(0)
    file_bytes = stream.getvalue()

    _export_cache[export_id] = {
        "bytes": file_bytes,
        "mimetype": mimetype,
        "filename": filename,
        "row_count": len(rows),
        "columns": ordered_headers,
        "created_at": time.time()
    }

    # Evict cache entries older than 30 minutes
    now = time.time()
    for k in list(_export_cache.keys()):
        entry = _export_cache.get(k)
        if entry and (now - float(entry.get('created_at', 0.0)) > 1800):
            _export_cache.pop(k, None)

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
def download_export(export_id: str):
    export_entry = _export_cache.get(export_id)
    if not export_entry or not isinstance(export_entry, dict):
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": "Export file expired or not found. Please trigger a new export."}
        }), 404

    raw_bytes = export_entry.get('bytes')
    file_bytes = raw_bytes if isinstance(raw_bytes, bytes) else bytes(raw_bytes or b'')
    mimetype = str(export_entry.get('mimetype') or 'application/octet-stream')
    filename = str(export_entry.get('filename') or f"{export_id}.xlsx")

    return send_file(
        io.BytesIO(file_bytes),
        mimetype=mimetype,
        as_attachment=True,
        download_name=filename
    )
