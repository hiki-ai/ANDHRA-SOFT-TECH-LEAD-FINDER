"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
WORKER PROGRESS & FIRESTORE BATCH COMMIT SERVICE
==============================================================================
Location: worker/services/progress_service.py
==============================================================================
"""

import sys
import os
from typing import List, Dict, Any, Optional


class ProgressService:
    def __init__(self, db=None):
        self._db = db

    def get_db(self):
        if self._db is not None:
            return self._db

        # Try backend shared client first to share state during tests
        try:
            backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
            if backend_path not in sys.path:
                sys.path.insert(0, backend_path)
            from app.config.firebase import get_firestore_db
            self._db = get_firestore_db()
            return self._db
        except Exception:
            pass

        # Standalone initialization
        try:
            import firebase_admin
            from firebase_admin import firestore
            if not firebase_admin._apps:
                firebase_admin.initialize_app()
            self._db = firestore.client()
        except Exception as e:
            print(f"[Worker ProgressService] Firestore client notice: {e}")

        return self._db

    def update_job_progress(self, job_id: str, updates: Dict[str, Any]):
        """Updates live job document in Firestore collections collection."""
        db = self.get_db()
        if db is not None:
            try:
                db.collection('collections').document(job_id).update(updates)
            except Exception as e:
                print(f"[ProgressService] Failed to update job {job_id} telemetry: {e}")

    def commit_batch(self, job_id: str, records: List[Dict[str, Any]]):
        """
        Commits batch of records to Firestore 'vendors' collection
        in chunks <= 450 (strictly respecting Firestore's 500-limit).
        """
        if not records:
            return

        db = self.get_db()
        if db is not None:
            try:
                col_ref = db.collection('vendors')
                chunk_size = 450
                for i in range(0, len(records), chunk_size):
                    chunk = records[i:i + chunk_size]
                    batch = db.batch()
                    for record in chunk:
                        doc_id = record.get('id') or record.get('dedupe_key')
                        batch.set(col_ref.document(doc_id), record, merge=True)
                    batch.commit()
                print(f"[ProgressService] Committed {len(records)} records to Firestore for job {job_id}.")
            except Exception as e:
                print(f"[ProgressService] Firestore commit warning: {e}")
