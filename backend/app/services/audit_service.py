"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
ADMIN AUDIT SERVICE
==============================================================================
Location: backend/app/services/audit_service.py
==============================================================================
"""

import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from ..config.firebase import get_firestore_db

class AuditService:
    @staticmethod
    def log_action(
        admin_uid: str,
        admin_email: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Records an admin mutation in the admin_audit_logs collection."""
        db = get_firestore_db()
        log_id = f"audit_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        log_doc = {
            "id": log_id,
            "admin_uid": admin_uid,
            "admin_email": admin_email,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "ip_address": ip_address,
            "timestamp": now_iso
        }

        try:
            db.collection('admin_audit_logs').document(log_id).set(log_doc)
        except Exception as e:
            print(f"[AuditService] Log action error: {e}")

        return log_doc

    @staticmethod
    def get_recent_logs(limit: int = 50):
        db = get_firestore_db()
        logs = []
        try:
            for doc in db.collection('admin_audit_logs').stream():
                data = doc.to_dict() or {}
                data['id'] = doc.id
                logs.append(data)
        except Exception as e:
            print(f"[AuditService] Get logs error: {e}")

        logs.sort(key=lambda x: str(x.get('timestamp', '')), reverse=True)
        return logs[:limit]

